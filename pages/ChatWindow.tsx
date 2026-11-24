import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Chat as ChatType, ChatMessage, UserProfile } from '../types/chat';
import {
  getChatMessages,
  sendMessage,
  markMessagesAsRead,
  getTypingStatus,
  setTypingStatus,
  getUserProfile,
  clearChatMessages,
  deleteChat,
  exportChatMessages,
} from '../services/chat';
import { removeConnection } from '../services/connections';
import { decryptMessage, isEncrypted } from '../services/encryption';
import { ArrowLeft, Send, Smile, MoreVertical, Lock, MessageCircle, X, CornerUpLeft } from 'lucide-react';
import Avatar from '../components/Avatar';
import { PageLoader } from '../components/LoadingScreen';
import UserProfileModal from '../components/UserProfileModal';
import ChatOptionsMenu from '../components/ChatOptionsMenu';
import { useToast } from '../contexts/ToastContext';

const ChatWindow: React.FC = () => {
  const { chatId } = useParams<{ chatId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageInputRef = useRef<HTMLTextAreaElement>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [decryptedMessages, setDecryptedMessages] = useState<Map<string, string>>(new Map());
  const [messageText, setMessageText] = useState('');
  const [otherUser, setOtherUser] = useState<UserProfile | null>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<UserProfile | null>(null);
  const [typingUsers, setTypingUsers] = useState<Record<string, boolean>>({});
  const [isTyping, setIsTyping] = useState(false);
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [loading, setLoading] = useState(true);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Common emojis for quick access
  const quickEmojis = ['🙏', '🕉️', '📿', '🌺', '🔱', '❤️', '😊', '🌟', '✨', '🌸'];

  useEffect(() => {
    if (!chatId || !user) return;

    // Load current user's profile
    const loadCurrentUserProfile = async () => {
      const profile = await getUserProfile(user.uid);
      if (profile) {
        setCurrentUserProfile(profile);
      }
    };
    loadCurrentUserProfile();

    // Load messages
    const unsubscribeMessages = getChatMessages(chatId, (fetchedMessages) => {
      setMessages(fetchedMessages);
      setLoading(false);
      scrollToBottom();
      
      // Decrypt messages in background
      fetchedMessages.forEach(async (msg) => {
        if (isEncrypted(msg.text)) {
          try {
            const decrypted = await decryptMessage(msg.text, msg.senderId);
            setDecryptedMessages(prev => new Map(prev).set(msg.id, decrypted));
          } catch (error) {
            console.error('Failed to decrypt message:', error);
            setDecryptedMessages(prev => new Map(prev).set(msg.id, '🔒 [Encrypted Message]'));
          }
        } else {
          // Store plain text as-is for backward compatibility
          setDecryptedMessages(prev => new Map(prev).set(msg.id, msg.text));
        }
      });
    });

    // Load typing status
    const unsubscribeTyping = getTypingStatus(chatId, setTypingUsers);

    // Mark messages as read
    markMessagesAsRead(chatId, user.uid);

    // Load other user's profile - try chat data first for instant display
    const loadOtherUser = async () => {
      const { ref: dbRef, onValue: onValueFn, get: getFn } = await import('firebase/database');
      const { database } = await import('../services/firebase');
      
      // First try to get from chat participantDetails for instant display
      const chatRef = dbRef(database, `chats/${chatId}`);
      const chatSnapshot = await getFn(chatRef);
      
      if (chatSnapshot.exists()) {
        const chatData = chatSnapshot.val();
        const otherUserId = chatData.participants.find((id: string) => id !== user.uid);
        
        if (otherUserId && chatData.participantDetails?.[otherUserId]) {
          // Set initial data from chat (instant)
          const initialData = chatData.participantDetails[otherUserId];
          setOtherUser({
            uid: otherUserId,
            userName: initialData.userName,
            photoURL: initialData.photoURL,
            guruName: initialData.guruName,
            iskconCenter: initialData.iskconCenter,
            isOnline: false,
            lastSeen: Date.now(),
            joinedDate: Date.now()
          });
        }
        
        // Then listen to full profile for updates
        const otherUserId2 = chatData.participants.find((id: string) => id !== user.uid);
        if (otherUserId2) {
          const userProfileRef = dbRef(database, `users/${otherUserId2}`);
          const unsubscribeProfile = onValueFn(userProfileRef, (snapshot) => {
            if (snapshot.exists()) {
              const data = snapshot.val();
              if (data.userName) {
                setOtherUser(data);
              }
            }
          });
          return unsubscribeProfile;
        }
      }
    };

    let unsubscribeProfile: (() => void) | undefined;
    loadOtherUser().then(unsub => {
      if (unsub) unsubscribeProfile = unsub;
    });

    return () => {
      unsubscribeMessages();
      unsubscribeTyping();
      if (unsubscribeProfile) unsubscribeProfile();
      if (chatId && user) {
        setTypingStatus(chatId, user.uid, false);
      }
    };
  }, [chatId, user]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleTyping = () => {
    if (!chatId || !user) return;

    if (!isTyping) {
      setIsTyping(true);
      setTypingStatus(chatId, user.uid, true);
    }

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      setTypingStatus(chatId, user.uid, false);
    }, 2000);
  };

  const handleSendMessage = async () => {
    if (!messageText.trim() || !chatId || !user) return;

    try {
      // Use userName from profile, fallback to displayName if not loaded yet
      const senderName = currentUserProfile?.userName || user.displayName || 'Anonymous';
      
      await sendMessage(
        chatId,
        user.uid,
        senderName,
        messageText.trim(),
        'text',
        replyingTo
          ? {
              messageId: replyingTo.id,
              text: replyingTo.text,
              senderName: replyingTo.senderName,
            }
          : undefined
      );

      setMessageText('');
      setReplyingTo(null);
      setIsTyping(false);
      setTypingStatus(chatId, user.uid, false);
      messageInputRef.current?.focus();
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. Please try again.');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const addEmoji = (emoji: string) => {
    setMessageText((prev) => prev + emoji);
    setShowEmojiPicker(false);
    messageInputRef.current?.focus();
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    if (isToday) {
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' +
        date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    }
  };

  const isOtherUserTyping = Object.entries(typingUsers).some(
    ([userId, typing]) => userId !== user?.uid && typing
  );

  if (!user) return null;

  const dayLabel = (ts: number) =>
    new Date(ts).toDateString() === new Date().toDateString()
      ? 'Today'
      : new Date(ts).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });

  return (
    <div className="mx-auto flex h-[calc(100dvh-4rem)] max-w-3xl flex-col overflow-hidden bg-sandal-50 sm:h-[calc(100dvh-72px-2rem)] sm:rounded-3xl sm:shadow-card sm:ring-1 sm:ring-sandal-200">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-sandal-200 bg-white px-3 py-2.5 sm:px-4">
        <button onClick={() => navigate('/chats')} className="icon-btn" aria-label="Back to messages">
          <ArrowLeft size={20} />
        </button>

        {otherUser ? (
          <button onClick={() => setShowProfileModal(true)} className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl px-1 py-1 text-left transition hover:bg-sandal-50" style={{ minHeight: 0 }}>
            <span className="relative shrink-0">
              <span className="block h-10 w-10 overflow-hidden rounded-full ring-2 ring-amber-100">
                <Avatar gender={otherUser.gender} name={otherUser.userName} className="h-full w-full" />
              </span>
              <span className={`absolute bottom-0 right-0 h-3 w-3 rounded-full ring-2 ring-white ${otherUser.isOnline ? 'bg-emerald-500' : 'bg-stone-300'}`} />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[15px] font-semibold text-maroon-900">{otherUser.userName || 'Devotee'}</span>
              <span className={`block text-xs font-medium ${isOtherUserTyping ? 'text-brand-600' : otherUser.isOnline ? 'text-emerald-600' : 'text-maroon-900/45'}`}>
                {isOtherUserTyping ? 'typing…' : otherUser.isOnline ? 'Online' : 'Offline'}
              </span>
            </span>
          </button>
        ) : (
          <div className="flex flex-1 items-center gap-3 px-1">
            <div className="h-10 w-10 animate-pulse rounded-full bg-sandal-200" />
            <div className="space-y-1.5">
              <div className="h-3.5 w-28 animate-pulse rounded bg-sandal-200" />
              <div className="h-3 w-16 animate-pulse rounded bg-sandal-100" />
            </div>
          </div>
        )}

        <button onClick={() => setShowOptionsMenu(true)} className="icon-btn" aria-label="Chat options">
          <MoreVertical size={20} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 space-y-1.5 overflow-y-auto px-3 py-4 sm:px-6">
        <div className="mb-3 flex justify-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-medium text-emerald-700 ring-1 ring-emerald-200">
            <Lock size={11} /> Messages are private and encrypted
          </span>
        </div>

        {loading ? (
          <PageLoader label="Opening chat…" />
        ) : messages.length === 0 ? (
          <div className="flex h-[55%] flex-col items-center justify-center text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-brand-500">
              <MessageCircle size={30} />
            </span>
            <p className="mt-4 text-base font-semibold text-maroon-900">Say Hare Krishna 🙏</p>
            <p className="mt-1 text-sm text-maroon-900/55">Start your chat with {otherUser?.userName || 'this devotee'}</p>
          </div>
        ) : (
          <>
            {messages.map((message, index) => {
              const own = message.senderId === user.uid;
              const newDay = index === 0 || new Date(messages[index - 1].timestamp).toDateString() !== new Date(message.timestamp).toDateString();
              const grouped = !newDay && messages[index - 1].senderId === message.senderId;
              return (
                <div key={message.id}>
                  {newDay && (
                    <div className="my-4 flex justify-center">
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-maroon-900/55 ring-1 ring-sandal-200">{dayLabel(message.timestamp)}</span>
                    </div>
                  )}

                  <div className={`group flex items-end gap-1.5 ${own ? 'flex-row-reverse' : ''} ${grouped ? '' : 'mt-2'}`}>
                    <div
                      className={`max-w-[80%] overflow-hidden rounded-2xl px-3.5 py-2 shadow-sm sm:max-w-[70%] ${
                        own ? 'rounded-br-md bg-gradient-to-br from-marigold-400 to-brand-500 text-white' : 'rounded-bl-md bg-white text-maroon-900 ring-1 ring-sandal-200'
                      }`}
                    >
                      {message.replyTo && (
                        <div className={`mb-1.5 rounded-lg border-l-4 px-2.5 py-1.5 ${own ? 'border-white/60 bg-white/20' : 'border-brand-400 bg-amber-50'}`}>
                          <p className={`text-[11px] font-semibold ${own ? 'text-white' : 'text-brand-600'}`}>{message.replyTo.senderName}</p>
                          <p className={`truncate text-xs ${own ? 'text-white/90' : 'text-maroon-900/60'}`}>{message.replyTo.text}</p>
                        </div>
                      )}
                      <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed">{decryptedMessages.get(message.id) || '…'}</p>
                      <div className={`mt-0.5 flex items-center justify-end gap-1.5 text-[11px] ${own ? 'text-white/85' : 'text-maroon-900/40'}`}>
                        <span>{new Date(message.timestamp).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}</span>
                        {own && <span aria-label={message.read ? 'Seen' : 'Sent'}>{message.read ? '✓✓' : '✓'}</span>}
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setReplyingTo(message);
                        messageInputRef.current?.focus();
                      }}
                      className="mb-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-maroon-900/40 opacity-0 transition hover:bg-white hover:text-brand-600 group-hover:opacity-100 [@media(hover:none)]:opacity-50"
                      aria-label="Reply"
                      style={{ minHeight: 0 }}
                    >
                      <CornerUpLeft size={15} />
                    </button>
                  </div>
                </div>
              );
            })}

            {isOtherUserTyping && (
              <div className="flex justify-start">
                <div className="mt-2 rounded-2xl rounded-bl-md bg-white px-4 py-3 shadow-sm ring-1 ring-sandal-200">
                  <div className="flex gap-1.5">
                    {[0, 150, 300].map((d) => (
                      <span key={d} className="h-2 w-2 animate-bounce rounded-full bg-brand-400" style={{ animationDelay: `${d}ms` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Reply preview */}
      {replyingTo && (
        <div className="flex items-center gap-3 border-t border-sandal-200 bg-white px-4 py-2.5">
          <div className="min-w-0 flex-1 rounded-lg border-l-4 border-brand-400 bg-amber-50 px-3 py-1.5">
            <p className="text-[11px] font-semibold text-brand-600">Replying to {replyingTo.senderName}</p>
            <p className="truncate text-xs text-maroon-900/60">{decryptedMessages.get(replyingTo.id) || replyingTo.text}</p>
          </div>
          <button onClick={() => setReplyingTo(null)} className="icon-btn" aria-label="Cancel reply">
            <X size={17} />
          </button>
        </div>
      )}

      {/* Emoji row */}
      {showEmojiPicker && (
        <div className="flex gap-1 overflow-x-auto border-t border-sandal-200 bg-white px-3 py-2 scrollbar-none">
          {quickEmojis.map((emoji) => (
            <button key={emoji} onClick={() => addEmoji(emoji)} className="shrink-0 rounded-xl p-2 text-2xl transition hover:bg-amber-50 active:scale-90" style={{ minHeight: 0 }}>
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* Composer */}
      <div className="flex items-end gap-2 border-t border-sandal-200 bg-white px-3 py-3" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
        <button
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          className={`icon-btn shrink-0 ${showEmojiPicker ? 'bg-amber-100 text-brand-600' : ''}`}
          aria-label="Emoji"
        >
          <Smile size={22} />
        </button>
        <textarea
          ref={messageInputRef}
          value={messageText}
          onChange={(e) => {
            setMessageText(e.target.value);
            handleTyping();
          }}
          onKeyDown={handleKeyPress}
          placeholder="Type a message"
          rows={1}
          className="max-h-32 min-h-[44px] flex-1 resize-none rounded-2xl border border-sandal-300 bg-sandal-50 px-4 py-2.5 text-[15px] text-maroon-900 outline-none transition placeholder:text-maroon-900/35 focus:border-marigold-400 focus:bg-white focus:ring-4 focus:ring-marigold-400/20"
        />
        <button
          onClick={handleSendMessage}
          disabled={!messageText.trim()}
          aria-label="Send"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-marigold-400 to-brand-500 text-white shadow-[0_8px_18px_-8px_rgba(238,154,30,0.9)] transition hover:brightness-105 active:scale-95 disabled:from-sandal-200 disabled:to-sandal-200 disabled:text-maroon-900/30 disabled:shadow-none"
          style={{ minHeight: 0 }}
        >
          <Send size={19} />
        </button>
      </div>

      <UserProfileModal profile={otherUser} isOpen={showProfileModal} onClose={() => setShowProfileModal(false)} showChatButton={false} />

      {otherUser && chatId && (
        <ChatOptionsMenu
          chatId={chatId}
          otherUserId={otherUser.uid}
          otherUserName={otherUser.userName || 'Unknown User'}
          isOpen={showOptionsMenu}
          onClose={() => setShowOptionsMenu(false)}
          onClearChat={async () => {
            try {
              await clearChatMessages(chatId);
              showToast({ type: 'success', title: 'Chat cleared successfully' });
              setMessages([]);
            } catch (error) {
              console.error('Error clearing chat:', error);
              showToast({ type: 'error', title: 'Failed to clear chat' });
            }
          }}
          onDeleteChat={async () => {
            try {
              if (!user) return;
              await deleteChat(chatId, user.uid);
              showToast({ type: 'success', title: 'Chat deleted successfully' });
              navigate('/chats');
            } catch (error) {
              console.error('Error deleting chat:', error);
              showToast({ type: 'error', title: 'Failed to delete chat' });
            }
          }}
          onRemoveConnection={async () => {
            try {
              if (!user) return;
              await removeConnection(user.uid, otherUser.uid);
              showToast({ type: 'success', title: 'Connection removed' });
              navigate('/chats');
            } catch (error) {
              console.error('Error removing connection:', error);
              showToast({ type: 'error', title: 'Failed to remove connection' });
            }
          }}
          onExportChat={async () => {
            try {
              if (!user) return;
              await exportChatMessages(chatId, user.uid, otherUser.userName || 'Unknown User');
              showToast({ type: 'success', title: 'Chat exported successfully' });
            } catch (error) {
              console.error('Error exporting chat:', error);
              showToast({ type: 'error', title: 'Failed to export chat' });
            }
          }}
        />
      )}
    </div>
  );
};

export default ChatWindow;
