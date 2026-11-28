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
import { ArrowLeft, Send, Smile, MoreVertical, Lock, X, CornerUpLeft, Check, CheckCheck } from 'lucide-react';
import Avatar from '../components/Avatar';
import { PageLoader } from '../components/LoadingScreen';
import UserProfileModal from '../components/UserProfileModal';
import ChatOptionsMenu from '../components/ChatOptionsMenu';
import { blockUser, reportUser } from '../services/privacy';
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
          // Only the privacy-filtered public card is readable — never the private user node
          const paths = [`publicProfiles/${otherUserId2}`, `circleProfiles/female/${otherUserId2}`, `circleProfiles/male/${otherUserId2}`];
          const offs = paths.map((p) =>
            onValueFn(
              dbRef(database, p),
              (snapshot) => {
                const data = snapshot.val();
                if (data?.userName) setOtherUser((prev) => ({ ...(prev || {}), ...data, uid: otherUserId2 }));
              },
              () => undefined
            )
          );
          const unsubscribeProfile = () => offs.forEach((off) => off());
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
      showToast({ type: 'error', title: 'Failed to send message. Please try again.' });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // auto-grow the composer (max ~5 lines)
  useEffect(() => {
    const el = messageInputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  }, [messageText]);

  const addEmoji =(emoji: string) => {
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
    <div className="relative mx-auto flex h-[100dvh] max-w-3xl flex-col overflow-hidden bg-sandal-100 sm:h-[calc(100dvh-2rem)] sm:rounded-3xl sm:shadow-card sm:ring-1 sm:ring-sandal-200">
      {/* Header */}
      <div style={{ paddingTop: "max(0.5rem, env(safe-area-inset-top))" }} className="relative z-10 flex shrink-0 items-center gap-1 border-b border-sandal-200/80 bg-white/95 px-1.5 pb-2 shadow-[0_1px_8px_-4px_rgba(67,27,17,0.12)] backdrop-blur-md sm:px-3">
        <button onClick={() => navigate('/chats')} className="icon-btn rounded-full text-maroon-800 hover:bg-sandal-100 hover:text-maroon-900" aria-label="Back to messages">
          <ArrowLeft size={21} />
        </button>

        {otherUser ? (
          <button onClick={() => setShowProfileModal(true)} className="flex min-w-0 flex-1 items-center gap-2.5 rounded-2xl px-1.5 py-1 text-left transition-colors hover:bg-sandal-50 active:bg-sandal-100" style={{ minHeight: 0 }}>
            <span className="relative shrink-0">
              <span className="block h-10 w-10 overflow-hidden rounded-full ring-2 ring-sandal-100">
                <Avatar gender={otherUser.gender} name={otherUser.userName} className="h-full w-full" />
              </span>
              {otherUser.showLastSeen !== false && (
                <span className={`absolute -bottom-px -right-px h-3 w-3 rounded-full ring-2 ring-white ${otherUser.isOnline ? 'bg-emerald-500' : 'bg-stone-300'}`} />
              )}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[15.5px] font-semibold leading-5 text-maroon-900">{otherUser.userName || 'Devotee'}</span>
              <span className={`block truncate text-[12px] leading-4 ${isOtherUserTyping ? 'font-medium text-brand-600' : otherUser.isOnline ? 'font-medium text-emerald-600' : 'text-maroon-900/50'}`}>
                {isOtherUserTyping ? 'typing…' : otherUser.showLastSeen === false ? '\u00a0' : otherUser.isOnline ? 'Online' : 'Offline'}
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

        <button onClick={() => setShowOptionsMenu(true)} className="icon-btn rounded-full text-maroon-800 hover:bg-sandal-100 hover:text-maroon-900" aria-label="Chat options">
          <MoreVertical size={20} />
        </button>
      </div>

      {/* Messages — warm paper with a faint dotted texture */}
      <div
        className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-2.5 pb-3 pt-3 sm:px-5"
        style={{
          backgroundImage:
            'radial-gradient(rgba(138,59,42,0.07) 1px, transparent 1.2px), linear-gradient(180deg, #FBF5EA 0%, #FFFCF7 100%)',
          backgroundSize: '18px 18px, 100% 100%',
        }}
      >
        <div className="mb-2 flex justify-center">
          <span className="inline-flex max-w-[90%] items-center gap-1.5 rounded-xl bg-amber-50/95 px-3 py-1.5 text-center text-[11px] font-medium leading-4 text-maroon-700/80 shadow-soft ring-1 ring-amber-200/70">
            <Lock size={11} className="shrink-0" /> Messages are private and encrypted
          </span>
        </div>

        {loading ? (
          <PageLoader label="Opening chat…" />
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-3xl shadow-card ring-1 ring-sandal-200" aria-hidden="true">
              🙏
            </span>
            <p className="mt-4 text-base font-semibold text-maroon-900">Say Hare Krishna</p>
            <p className="mt-1 max-w-[16rem] text-sm leading-relaxed text-maroon-900/55">Start your chat with {otherUser?.userName || 'this devotee'}</p>
          </div>
        ) : (
          <>
            {messages.map((message, index) => {
              const own = message.senderId === user.uid;
              const newDay = index === 0 || new Date(messages[index - 1].timestamp).toDateString() !== new Date(message.timestamp).toDateString();
              const grouped = !newDay && messages[index - 1].senderId === message.senderId;
              const next = messages[index + 1];
              // last bubble of a run from the same sender gets the tail
              const tail = !next || next.senderId !== message.senderId || new Date(next.timestamp).toDateString() !== new Date(message.timestamp).toDateString();
              const shape = own
                ? `rounded-[18px] ${grouped ? 'rounded-tr-md' : ''} ${tail ? 'rounded-br-none' : 'rounded-br-md'}`
                : `rounded-[18px] ${grouped ? 'rounded-tl-md' : ''} ${tail ? 'rounded-bl-none' : 'rounded-bl-md'}`;
              return (
                <div key={message.id}>
                  {newDay && (
                    <div className="my-3.5 flex justify-center">
                      <span className="rounded-lg bg-white/90 px-3 py-1 text-[11px] font-semibold tracking-wide text-maroon-900/55 shadow-soft ring-1 ring-sandal-200/70 backdrop-blur-sm">
                        {dayLabel(message.timestamp)}
                      </span>
                    </div>
                  )}

                  <div className={`group flex items-end gap-1 ${own ? 'flex-row-reverse pl-8 pr-1.5' : 'pl-1.5 pr-8'} ${index === 0 || newDay ? '' : grouped ? 'mt-[3px]' : 'mt-2.5'}`}>
                    <div
                      className={`relative min-w-0 max-w-[85%] px-3 pb-1 pt-1.5 sm:max-w-[75%] ${shape} ${
                        own
                          ? 'bg-gradient-to-br from-brand-500 to-brand-600 text-white shadow-[0_1px_2px_rgba(124,45,18,0.18)]'
                          : 'bg-white text-maroon-900 shadow-[0_1px_2px_rgba(67,27,17,0.1)]'
                      }`}
                    >
                      {tail && (
                        <svg
                          viewBox="0 0 8 13"
                          aria-hidden="true"
                          className={`absolute bottom-0 h-[13px] w-2 ${own ? '-right-[7px] text-brand-600' : '-left-[7px] -scale-x-100 text-white'}`}
                        >
                          <path d="M0 0v13h8C4.5 12 1.2 8.5 0 0z" fill="currentColor" />
                        </svg>
                      )}
                      {message.replyTo && (
                        <div className={`mb-1 mt-0.5 rounded-xl border-l-[3px] px-2.5 py-1.5 ${own ? 'border-white/70 bg-black/10' : 'border-brand-400 bg-sandal-100'}`}>
                          <p className={`truncate text-[11.5px] font-semibold ${own ? 'text-white' : 'text-brand-700'}`}>{message.replyTo.senderName}</p>
                          <p className={`truncate text-xs ${own ? 'text-white/85' : 'text-maroon-900/60'}`}>{message.replyTo.text}</p>
                        </div>
                      )}
                      <p className="whitespace-pre-wrap break-words text-[15px] leading-[1.4] [overflow-wrap:anywhere]">{decryptedMessages.get(message.id) || '…'}</p>
                      <div className={`mt-0.5 flex items-center justify-end gap-1 text-[10.5px] leading-4 tabular-nums ${own ? 'text-white/75' : 'text-maroon-900/45'}`}>
                        <span>{new Date(message.timestamp).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}</span>
                        {own &&
                          (message.read ? (
                            <CheckCheck size={15} strokeWidth={2.4} className="text-white" aria-label="Seen" />
                          ) : (
                            <Check size={15} strokeWidth={2.4} className="text-white/60" aria-label="Sent" />
                          ))}
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setReplyingTo(message);
                        messageInputRef.current?.focus();
                      }}
                      className="mb-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/70 text-maroon-900/45 opacity-0 shadow-soft transition hover:bg-white hover:text-brand-600 focus-visible:opacity-100 group-hover:opacity-100 [@media(hover:none)]:hidden"
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
              <div className="mt-2.5 flex justify-start pl-1.5" aria-live="polite">
                <div className="relative rounded-[18px] rounded-bl-none bg-white px-4 py-3 shadow-[0_1px_2px_rgba(67,27,17,0.1)]">
                  <svg viewBox="0 0 8 13" aria-hidden="true" className="absolute -left-[7px] bottom-0 h-[13px] w-2 -scale-x-100 text-white">
                    <path d="M0 0v13h8C4.5 12 1.2 8.5 0 0z" fill="currentColor" />
                  </svg>
                  <span className="sr-only">{otherUser?.userName || 'Devotee'} is typing</span>
                  <div className="flex gap-1.5" aria-hidden="true">
                    {[0, 150, 300].map((d) => (
                      <span key={d} className="h-2 w-2 animate-bounce rounded-full bg-brand-400/80 motion-reduce:animate-none" style={{ animationDelay: `${d}ms` }} />
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
        <div className="flex shrink-0 animate-slideDown items-center gap-2 border-t border-sandal-200/80 bg-white px-3 pb-1 pt-2 motion-reduce:animate-none">
          <CornerUpLeft size={17} className="shrink-0 text-brand-600" aria-hidden="true" />
          <div className="min-w-0 flex-1 rounded-xl border-l-[3px] border-brand-500 bg-sandal-100 px-3 py-1.5">
            <p className="truncate text-[11.5px] font-semibold text-brand-700">Replying to {replyingTo.senderName}</p>
            <p className="truncate text-xs text-maroon-900/60">{decryptedMessages.get(replyingTo.id) || replyingTo.text}</p>
          </div>
          <button onClick={() => setReplyingTo(null)} className="icon-btn h-9 w-9 rounded-full hover:bg-sandal-100" aria-label="Cancel reply">
            <X size={17} />
          </button>
        </div>
      )}

      {/* Emoji row */}
      {showEmojiPicker && (
        <div className="flex shrink-0 gap-0.5 overflow-x-auto border-t border-sandal-200/80 bg-white px-2 py-1.5 scrollbar-none">
          {quickEmojis.map((emoji) => (
            <button key={emoji} onClick={() => addEmoji(emoji)} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[22px] transition hover:bg-sandal-100 active:scale-90 motion-reduce:transform-none" style={{ minHeight: 0 }}>
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* Composer */}
      <div className="flex shrink-0 items-end gap-2 border-t border-sandal-200/80 bg-white px-2.5 pt-2 sm:px-3" style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}>
        <div className="flex min-w-0 flex-1 items-end rounded-[22px] bg-sandal-50 ring-1 ring-sandal-200 transition focus-within:bg-white focus-within:ring-2 focus-within:ring-marigold-400">
        <button
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors ${showEmojiPicker ? 'text-brand-600' : 'text-maroon-900/45 hover:text-maroon-800'}`}
          aria-label="Emoji"
          aria-pressed={showEmojiPicker}
          style={{ minHeight: 0 }}
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
          className="max-h-[120px] min-h-[44px] min-w-0 flex-1 resize-none border-0 bg-transparent py-[11px] pr-4 text-[15px] leading-[22px] text-maroon-900 outline-none scrollbar-none placeholder:text-maroon-900/40"
        />
        </div>
        <button
          onClick={handleSendMessage}
          disabled={!messageText.trim()}
          aria-label="Send"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white shadow-glow transition hover:bg-brand-700 active:scale-95 disabled:bg-sandal-200 disabled:text-maroon-900/35 disabled:shadow-none motion-reduce:transform-none"
          style={{ minHeight: 0 }}
        >
          <Send size={19} className="-ml-0.5 translate-x-px" />
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
          onBlock={async (report) => {
            try {
              if (!user) return;
              await blockUser(user.uid, otherUser.uid);
              if (report) await reportUser(user.uid, otherUser.uid, otherUser.userName || '', 'Reported from chat');
              showToast({ type: 'success', title: `${otherUser.userName || 'Devotee'} is blocked`, message: report ? 'Thank you — the admin will review.' : undefined });
              navigate('/chats');
            } catch (error) {
              console.error('Error blocking user:', error);
              showToast({ type: 'error', title: 'Could not block' });
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
