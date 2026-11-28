import { ref, push, set, get, onValue, off, update, query, orderByChild, limitToLast, serverTimestamp, onDisconnect, remove } from 'firebase/database';
import { database } from './firebase';
import { UserProfile, Chat, ChatMessage, TypingStatus } from '../types/chat';
import { encryptMessage, decryptMessage, isEncrypted } from './encryption';
import { getPresencePath, getPublicProfile, subscribeDirectory } from './privacy';
import { auth } from './firebase';
import { queuePush } from './push';

// ============= USER PROFILES & PRESENCE =============

export const createUserProfile = async (uid: string, profile: Omit<UserProfile, 'uid' | 'isOnline' | 'lastSeen' | 'joinedDate'>) => {
  try {
    const userProfile: UserProfile = {
      ...profile,
      uid,
      isOnline: true,
      lastSeen: Date.now(),
      joinedDate: Date.now(),
    };
    
    // Use update() instead of set() to preserve child nodes (entries, settings, journal, usage)
    await update(ref(database, `users/${uid}`), userProfile);
    
    // Also sync messagingPrivacy to settings if provided
    if (profile.messagingPrivacy) {
      await update(ref(database, `users/${uid}/settings`), {
        messagingPrivacy: profile.messagingPrivacy
      });
    }
    
    await setUserOnlineStatus(uid, true);
  } catch (error) {
    console.error('Error creating user profile:', error);
    throw error; // Re-throw to handle in calling code
  }
};

export const updateUserProfile = async (uid: string, updates: Partial<UserProfile>) => {
  await update(ref(database, `users/${uid}`), updates);
};

// Profile fields live directly under users/{uid}, next to large sub-trees
// (entries, chantingSessions, feedbacks…). Fetch only the fields we need
// instead of downloading the whole user node.
const PROFILE_FIELDS = [
  'uid', 'userName', 'guruName', 'iskconCenter', 'photoURL', 'gender', 'isOnline', 'lastSeen', 'bio',
  'joinedDate', 'createdAt', 'email', 'showGuruName', 'showIskconCenter', 'showLastSeen',
  'showEmail', 'messagingPrivacy', 'connections', 'connectionCount',
] as const;

export const getUserProfile = async (uid: string, viewerGender?: 'male' | 'female'): Promise<UserProfile | null> => {
  try {
    if (auth.currentUser && uid !== auth.currentUser.uid) {
      const pub = await getPublicProfile(uid, viewerGender);
      if (pub) return pub;
    }
    const snaps = await Promise.allSettled(PROFILE_FIELDS.map((f) => get(ref(database, `users/${uid}/${f}`))));
    const data: Record<string, unknown> = {};
    snaps.forEach((r, i) => {
      if (r.status === 'fulfilled' && r.value.exists()) data[PROFILE_FIELDS[i]] = r.value.val();
    });
    // A valid profile must have a userName (the node may only contain entries/settings)
    if (!data.userName) return null;
    if (!data.uid) data.uid = uid;
    return data as unknown as UserProfile;
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }
};

/**
 * Devotee directory. Reads privacy-filtered cards (publicProfiles + the viewer's circle).
 * While older accounts have not yet published a card, the legacy `users` read (only allowed
 * under the old rules) fills the gaps, still honouring each user's visibility choice.
 */
export const getAllUsers = (callback: (users: UserProfile[]) => void, viewerGender?: 'male' | 'female') => {
  let cards: UserProfile[] = [];
  let legacy: UserProfile[] = [];
  const emit = () => {
    const seen = new Set(cards.map((u) => u.uid));
    callback([...cards, ...legacy.filter((u) => !seen.has(u.uid))]);
  };
  const offCards = subscribeDirectory(viewerGender, (u) => ((cards = u), emit()));

  let cancelled = false;
  get(ref(database, 'users'))
    .then((snapshot) => {
      if (cancelled) return;
      const list: UserProfile[] = [];
      snapshot.forEach((child) => {
        const d = child.val();
        if (!d?.userName) return;
        const st = d.settings || {};
        const gender = st.gender || d.gender;
        if (st.profileVisibility === 'same-gender' && gender !== viewerGender) return;
        const showLastSeen = st.showLastSeen ?? d.showLastSeen;
        list.push({
          uid: d.uid || child.key!,
          userName: d.userName,
          guruName: st.showGuruName === false ? '' : d.guruName || '',
          iskconCenter: st.showIskconCenter === false ? '' : d.iskconCenter || '',
          photoURL: d.photoURL,
          gender,
          showGuruName: st.showGuruName ?? d.showGuruName,
          showIskconCenter: st.showIskconCenter ?? d.showIskconCenter,
          showLastSeen,
          isOnline: showLastSeen === false ? false : d.isOnline || false,
          lastSeen: d.lastSeen || 0,
          joinedDate: d.joinedDate || 0,
          messagingPrivacy: st.messagingPrivacy || d.messagingPrivacy || 'everyone',
          requestsFrom: st.requestsFrom || 'everyone',
        });
      });
      legacy = list;
      emit();
    })
    .catch(() => undefined); // locked down by the new rules — cards only

  return () => {
    cancelled = true;
    offCards();
  };
};

export const setUserOnlineStatus = async (uid: string, isOnline: boolean) => {
  try {
    const userStatusRef = ref(database, `users/${uid}`);
    
    await update(userStatusRef, {
      isOnline,
      lastSeen: Date.now(),
    });
    const presence = getPresencePath();
    if (presence) {
      const cardRef = ref(database, presence);
      await update(cardRef, { isOnline, lastSeen: Date.now() }).catch(() => undefined);
      if (isOnline) onDisconnect(cardRef).update({ isOnline: false, lastSeen: Date.now() }).catch(() => undefined);
    }
    
    // Set up automatic offline detection when user disconnects
    if (isOnline) {
      const offlineData = {
        isOnline: false,
        lastSeen: Date.now(),
      };
      
      onDisconnect(userStatusRef).update(offlineData);
    }
  } catch (error) {
    console.warn('Unable to update online status:', error);
    // Don't throw - online status is not critical
  }
};

/**
 * Live total of unread messages for a user. One realtime listener replaces
 * repeated full downloads of /chats; returns an unsubscribe function.
 */
export const subscribeToUnreadCount = (userId: string, callback: (count: number) => void) =>
  subscribeMyChats(userId, (chats) => callback(chats.reduce((t, c) => t + (c.unreadCount?.[userId] || 0), 0)));

/* Private chat index: userChats/{uid}/{chatId} = true. Chats are only readable by their participants. */
const indexChat = (chatId: string, participants: string[]) =>
  Promise.all(participants.map((p) => set(ref(database, `userChats/${p}/${chatId}`), true).catch(() => undefined)));

const backfilled = new Set<string>();
/** One-time: index chats created before the index existed (works only while old rules allow it). */
const backfillChatIndex = async (userId: string) => {
  if (backfilled.has(userId)) return;
  backfilled.add(userId);
  try {
    const snap = await get(ref(database, 'chats'));
    const jobs: Promise<unknown>[] = [];
    snap.forEach((c) => {
      const chat = c.val() as Chat;
      if (Array.isArray(chat?.participants) && chat.participants.includes(userId)) jobs.push(indexChat(c.key!, chat.participants));
    });
    await Promise.all(jobs);
  } catch {
    /* new rules: nothing to backfill from the client */
  }
};

/** Live list of this user's chats via the private index. */
const subscribeMyChats = (userId: string, cb: (chats: Chat[]) => void) => {
  const chatOffs = new Map<string, () => void>();
  const chats = new Map<string, Chat>();
  const emit = () => {
    const list = [...chats.values()].filter((c) => Array.isArray(c?.participants) && c.participants.includes(userId));
    list.sort((a, b) => (b.lastMessage?.timestamp || b.updatedAt) - (a.lastMessage?.timestamp || a.updatedAt));
    cb(list);
  };
  backfillChatIndex(userId);
  const offIndex = onValue(
    ref(database, `userChats/${userId}`),
    (snap) => {
      const ids = new Set(Object.keys(snap.val() || {}));
      chatOffs.forEach((off, id) => {
        if (!ids.has(id)) {
          off();
          chatOffs.delete(id);
          chats.delete(id);
        }
      });
      ids.forEach((id) => {
        if (chatOffs.has(id)) return;
        chatOffs.set(
          id,
          onValue(
            ref(database, `chats/${id}`),
            (c) => {
              if (c.exists()) chats.set(id, { ...(c.val() as Chat), id });
              else chats.delete(id);
              emit();
            },
            () => (chats.delete(id), emit())
          )
        );
      });
      emit();
    },
    () => cb([])
  );
  return () => {
    offIndex();
    chatOffs.forEach((off) => off());
  };
};

// ============= CHAT MANAGEMENT =============

export const createOrGetChat = async (currentUserId: string, otherUserId: string): Promise<string> => {
  try {
    console.log(`🔍 Creating/getting chat between ${currentUserId} and ${otherUserId}`);
    
    // Check if chat already exists
    const chatsRef = ref(database, 'chats');
    const snapshot = await get(chatsRef);
    
    if (snapshot.exists()) {
      const chats = snapshot.val();
      for (const [chatId, chat] of Object.entries(chats as Record<string, Chat>)) {
        // Strict validation
        if (!chat || !chat.participants || !Array.isArray(chat.participants)) {
          console.warn(`⚠️ Skipping invalid chat ${chatId}:`, chat);
          continue;
        }
        
        if (chat.participants.includes(currentUserId) && chat.participants.includes(otherUserId)) {
          console.log(`✅ Found existing chat: ${chatId}`);
          return chatId;
        }
      }
    }
    
    console.log(`📝 Creating new chat...`);
    
    // Create new chat
    const currentUser = await getUserProfile(currentUserId);
    const otherUser = await getUserProfile(otherUserId);
    
    if (!currentUser || !otherUser) {
      throw new Error('User profiles not found');
    }
    
    const newChatRef = push(ref(database, 'chats'));
    const chatId = newChatRef.key!;
    
    const newChat: Chat = {
      id: chatId,
      participants: [currentUserId, otherUserId],
      participantDetails: {
        [currentUserId]: {
          userName: currentUser.userName,
          photoURL: currentUser.photoURL,
          gender: currentUser.gender ?? null,
          guruName: currentUser.guruName,
          iskconCenter: currentUser.iskconCenter,
        },
        [otherUserId]: {
          userName: otherUser.userName,
          photoURL: otherUser.photoURL,
          gender: otherUser.gender ?? null,
          guruName: otherUser.guruName,
          iskconCenter: otherUser.iskconCenter,
        },
      },
      unreadCount: {
        [currentUserId]: 0,
        [otherUserId]: 0,
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    
    await set(newChatRef, JSON.parse(JSON.stringify(newChat)));
    await indexChat(chatId, [currentUserId, otherUserId]);
    return chatId;
  } catch (error) {
    console.error('Error creating/getting chat:', error);
    throw error; // Re-throw to handle in UI
  }
};

export const getUserChats = (userId: string, callback: (chats: Chat[]) => void) => subscribeMyChats(userId, callback);

// ============= MESSAGING =============

export const sendMessage = async (
  chatId: string,
  senderId: string,
  senderName: string,
  text: string,
  type: 'text' | 'image' | 'quote' = 'text',
  replyTo?: ChatMessage['replyTo']
) => {
  const messagesRef = ref(database, `messages/${chatId}`);
  const newMessageRef = push(messagesRef);
  
  // Encrypt the message text before storing
  const encryptedText = await encryptMessage(text, senderId);
  
  const message: ChatMessage = {
    id: newMessageRef.key!,
    chatId,
    senderId,
    senderName,
    text: encryptedText, // Store encrypted text
    timestamp: Date.now(),
    read: false,
    type,
    ...(replyTo && { replyTo }), // Only include replyTo if it exists
  };
  
  await set(newMessageRef, message);
  queuePush({ type: 'message', chatId }, senderId);
  
  // Update chat's last message and unread counts
  const chatRef = ref(database, `chats/${chatId}`);
  const chatSnapshot = await get(chatRef);
  
  if (chatSnapshot.exists()) {
    const chat = chatSnapshot.val() as Chat;
    
    // Validate chat has participants array
    if (!chat || !chat.participants || !Array.isArray(chat.participants)) {
      console.warn('⚠️ Chat has invalid participants, skipping unread count update');
      return message;
    }
    
    const updates: any = {
      lastMessage: {
        text: '[Encrypted Message]', // Don't expose encrypted content in preview
        timestamp: Date.now(),
        senderId,
      },
      updatedAt: Date.now(),
    };
    
    // Increment unread count for other participants
    chat.participants.forEach((participantId) => {
      if (participantId !== senderId) {
        updates[`unreadCount/${participantId}`] = (chat.unreadCount[participantId] || 0) + 1;
      }
    });
    
    await update(chatRef, updates);
  }
  
  return message;
};

export const getChatMessages = (chatId: string, callback: (messages: ChatMessage[]) => void) => {
  const messagesRef = query(ref(database, `messages/${chatId}`), orderByChild('timestamp'));
  
  onValue(messagesRef, (snapshot) => {
    const messages: ChatMessage[] = [];
    snapshot.forEach((childSnapshot) => {
      messages.push(childSnapshot.val());
    });
    callback(messages);
  });
  
  return () => off(messagesRef);
};

export const markMessagesAsRead = async (chatId: string, userId: string) => {
  // Reset unread count for this user
  await update(ref(database, `chats/${chatId}/unreadCount`), {
    [userId]: 0,
  });
  
  // Mark all messages in chat as read
  const messagesRef = ref(database, `messages/${chatId}`);
  const snapshot = await get(messagesRef);
  
  if (snapshot.exists()) {
    const updates: any = {};
    snapshot.forEach((childSnapshot) => {
      const message = childSnapshot.val() as ChatMessage;
      if (message.senderId !== userId && !message.read) {
        updates[`${childSnapshot.key}/read`] = true;
      }
    });
    
    if (Object.keys(updates).length > 0) {
      await update(messagesRef, updates);
    }
  }
};

// ============= TYPING INDICATOR =============

export const setTypingStatus = async (chatId: string, userId: string, isTyping: boolean) => {
  const typingRef = ref(database, `typing/${chatId}/${userId}`);
  
  if (isTyping) {
    await set(typingRef, {
      isTyping: true,
      timestamp: Date.now(),
    });
    
    // Auto-remove typing status after 3 seconds
    setTimeout(async () => {
      await remove(typingRef);
    }, 3000);
  } else {
    await remove(typingRef);
  }
};

export const getTypingStatus = (chatId: string, callback: (typingUsers: Record<string, boolean>) => void) => {
  const typingRef = ref(database, `typing/${chatId}`);
  
  onValue(typingRef, (snapshot) => {
    const typingUsers: Record<string, boolean> = {};
    if (snapshot.exists()) {
      const data = snapshot.val();
      Object.entries(data).forEach(([userId, status]: [string, any]) => {
        if (status.isTyping && Date.now() - status.timestamp < 5000) {
          typingUsers[userId] = true;
        }
      });
    }
    callback(typingUsers);
  });
  
  return () => off(typingRef);
};

// ============= SEARCH & FILTER =============

export const searchUsers = async (
  searchTerm: string,
  filters?: { guruName?: string; iskconCenter?: string; onlineOnly?: boolean },
  viewerGender?: 'male' | 'female'
): Promise<UserProfile[]> => {
  const users = await new Promise<UserProfile[]>((resolve) => {
    const off = subscribeDirectory(viewerGender, (u) => {
      resolve(u);
      setTimeout(off, 0);
    });
  });
  const q = searchTerm.toLowerCase();
  return users.filter(
    (u) =>
      (!q || u.userName?.toLowerCase().includes(q) || u.guruName?.toLowerCase().includes(q) || u.iskconCenter?.toLowerCase().includes(q)) &&
      (!filters?.guruName || u.guruName === filters.guruName) &&
      (!filters?.iskconCenter || u.iskconCenter === filters.iskconCenter) &&
      (!filters?.onlineOnly || u.isOnline)
  );
};

// ============= CHAT MANAGEMENT =============

/**
 * Debug function to check for corrupted chats
 * Use in console: window.checkCorruptedChats()
 */
export const checkCorruptedChats = async () => {
  console.log('🔍 Checking for corrupted chats...');
  const chatsRef = ref(database, 'chats');
  const snapshot = await get(chatsRef);
  
  if (!snapshot.exists()) {
    console.log('✅ No chats found');
    return;
  }
  
  let corrupted = 0;
  let valid = 0;
  
  snapshot.forEach((childSnapshot) => {
    const chatId = childSnapshot.key!;
    const chat = childSnapshot.val();
    
    if (!chat || !chat.participants || !Array.isArray(chat.participants)) {
      console.warn(`⚠️ Corrupted chat ${chatId}:`, chat);
      corrupted++;
    } else {
      valid++;
    }
  });
  
  console.log(`✅ Valid chats: ${valid}`);
  console.log(`⚠️ Corrupted chats: ${corrupted}`);
};

// Make it available on window for console debugging
if (typeof window !== 'undefined') {
  (window as any).checkCorruptedChats = checkCorruptedChats;
}

/**
 * Clear all messages in a chat (keeps the chat but removes messages)
 */
export const clearChatMessages = async (chatId: string): Promise<void> => {
  try {
    const messagesRef = ref(database, `messages/${chatId}`);
    await remove(messagesRef);
    
    // Update chat's lastMessage
    const chatRef = ref(database, `chats/${chatId}`);
    await update(chatRef, {
      lastMessage: 'Chat cleared',
      lastMessageTime: Date.now()
    });
  } catch (error) {
    console.error('Error clearing chat messages:', error);
    throw error;
  }
};

/**
 * Delete entire chat and all its data
 */
export const deleteChat = async (chatId: string, userId: string): Promise<void> => {
  try {
    // Remove messages
    const messagesRef = ref(database, `messages/${chatId}`);
    await remove(messagesRef);
    
    // Remove typing indicators
    const typingRef = ref(database, `typing/${chatId}`);
    await remove(typingRef);
    
    // Remove chat and its index entries
    const chatRef = ref(database, `chats/${chatId}`);
    const participants = ((await get(ref(database, `chats/${chatId}/participants`))).val() || [userId]) as string[];
    await Promise.all(participants.map((p) => remove(ref(database, `userChats/${p}/${chatId}`)).catch(() => undefined)));
    await remove(chatRef);
  } catch (error) {
    console.error('Error deleting chat:', error);
    throw error;
  }
};

/**
 * Export chat messages as text file
 */
export const exportChatMessages = async (chatId: string, currentUserId: string, otherUserName: string): Promise<void> => {
  try {
    const messagesRef = ref(database, `messages/${chatId}`);
    const snapshot = await get(messagesRef);
    
    if (!snapshot.exists()) {
      throw new Error('No messages to export');
    }
    
    const messages: ChatMessage[] = [];
    snapshot.forEach((childSnapshot) => {
      messages.push({ id: childSnapshot.key!, ...childSnapshot.val() });
    });
    
    // Sort by timestamp
    messages.sort((a, b) => a.timestamp - b.timestamp);
    
    // Format as text
    let textContent = `Chat with ${otherUserName}\n`;
    textContent += `Exported on ${new Date().toLocaleString()}\n`;
    textContent += '='.repeat(50) + '\n\n';
    
    for (const msg of messages) {
      const date = new Date(msg.timestamp).toLocaleString();
      const sender = msg.senderId === currentUserId ? 'You' : otherUserName;
      
      // Decrypt message if encrypted
      let messageText = msg.text;
      if (isEncrypted(msg.text)) {
        try {
          messageText = await decryptMessage(msg.text, msg.senderId);
        } catch (error) {
          console.error('Failed to decrypt message for export:', error);
          messageText = '[Encrypted Message]';
        }
      }
      
      textContent += `[${date}] ${sender}:\n${messageText}\n\n`;
    }
    
    // Create and download file
    const blob = new Blob([textContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-with-${otherUserName.replace(/\s+/g, '-')}-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error exporting chat:', error);
    throw error;
  }
};

/** Last message of a chat as readable text (for the chat list preview). */
export const getLastMessagePreview = async (chatId: string): Promise<string | null> => {
  const snap = await get(query(ref(database, `messages/${chatId}`), orderByChild('timestamp'), limitToLast(1)));
  let msg: ChatMessage | null = null;
  snap.forEach((c) => {
    msg = c.val();
  });
  if (!msg) return null;
  const m = msg as ChatMessage;
  if (!isEncrypted(m.text || '')) return m.text || null;
  try {
    return await decryptMessage(m.text, m.senderId);
  } catch {
    return null;
  }
};
