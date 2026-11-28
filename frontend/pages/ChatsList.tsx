import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Chat } from '../types/chat';
import { getUserChats, getLastMessagePreview } from '../services/chat';
import { Search, UserPlus, Lock, X, Users, MessageCircle, CheckCheck } from 'lucide-react';
import Avatar from '../components/Avatar';
import { PageLoader } from '../components/LoadingScreen';
import { isEncrypted } from '../services/encryption';
import { getUserConnections } from '../services/connections';

const isBlank = (v?: string) => !v || v.toLowerCase() === 'n/a' || v === 'Not Specified';

const timeLabel = (ts: number) => {
  const d = new Date(ts);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
  const days = Math.floor((now.getTime() - ts) / 86_400_000);
  if (days < 7) return days <= 1 ? 'Yesterday' : d.toLocaleDateString('en-IN', { weekday: 'short' });
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

const seg = (active: boolean) =>
  `relative inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-[10px] px-4 text-sm font-semibold transition-colors duration-200 motion-reduce:transition-none sm:flex-none ${
    active ? 'bg-white text-maroon-900 shadow-soft' : 'text-maroon-900/55 hover:text-maroon-900'
  }`;

const ChatsList: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [allChats, setAllChats] = useState<Chat[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [unreadOnly, setUnreadOnly] = useState(false);

  useEffect(() => {
    if (!user) return;
    const unsubscribe = getUserChats(user.uid, (fetched) => {
      setAllChats(fetched);
      setLoading(false);
    });
    const timeout = setTimeout(() => setLoading(false), 5000);
    return () => {
      unsubscribe();
      clearTimeout(timeout);
    };
  }, [user]);

  // readable last-message text, keyed by chat id + timestamp
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const fetched = React.useRef<Set<string>>(new Set());
  useEffect(() => {
    allChats.forEach((c) => {
      if (!c.lastMessage) return;
      const key = c.id + ':' + c.lastMessage.timestamp;
      if (fetched.current.has(key)) return;
      fetched.current.add(key);
      getLastMessagePreview(c.id)
        .then((t) => t && setPreviews((p) => ({ ...p, [c.id]: t })))
        .catch(() => fetched.current.delete(key));
    });
  }, [allChats]);

  // Explore → Connections when the user has any, otherwise straight to Explore
  const goToCommunity = async () => {
    let view: 'connected' | 'explore' = 'explore';
    if (user) {
      try {
        view = (await getUserConnections(user.uid)).length > 0 ? 'connected' : 'explore';
      } catch {
        /* fall back to explore */
      }
    }
    navigate('/community', { state: { view } });
  };

  // a chat with no message yet is not a conversation — leave it out
  const chats = useMemo(() => allChats.filter((c) => !!c.lastMessage), [allChats]);

  const other = (chat: Chat) => {
    const id = chat.participants.find((p) => p !== user?.uid);
    return id ? chat.participantDetails[id] : null;
  };

  const unreadOf = (chat: Chat) => (user ? chat.unreadCount?.[user.uid] || 0 : 0);

  // derived from the live list — no polling
  const unreadChats = chats.filter((c) => unreadOf(c) > 0).length;

  const shown = chats.filter((chat) => {
    const o = other(chat);
    if (!o) return false;
    if (unreadOnly && unreadOf(chat) === 0) return false;
    const q = searchTerm.trim().toLowerCase();
    const matchesSearch = !q || o.userName.toLowerCase().includes(q) || (o.guruName || '').toLowerCase().includes(q) || (o.iskconCenter || '').toLowerCase().includes(q);
    return matchesSearch;
  });

  if (loading) return <PageLoader label="Opening your messages…" />;

  return (
    <div className="mx-auto w-full max-w-3xl animate-rise-in motion-reduce:animate-none">
      {/* Toolbar + search stay pinned under the app header while the list scrolls */}
      <div className="sticky top-[calc(4rem+env(safe-area-inset-top))] z-20 -mx-4 bg-stone-50/90 px-4 pb-3 pt-1 backdrop-blur-md sm:top-[calc(72px+env(safe-area-inset-top))] sm:-mx-6 sm:px-6">
        <div className="flex items-center gap-2">
          <div className="flex min-w-0 flex-1 gap-1 rounded-xl bg-sandal-200/60 p-1 sm:max-w-[16rem]" role="tablist" aria-label="Filter conversations">
            <button role="tab" aria-selected={!unreadOnly} onClick={() => setUnreadOnly(false)} className={seg(!unreadOnly)} style={{ minHeight: 0 }}>
              All
            </button>
            <button role="tab" aria-selected={unreadOnly} onClick={() => setUnreadOnly(true)} className={seg(unreadOnly)} style={{ minHeight: 0 }}>
              Unread
              {unreadChats > 0 && (
                <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-brand-600 px-1.5 text-[10.5px] font-bold leading-none text-white">
                  {unreadChats}
                </span>
              )}
            </button>
          </div>
          <div className="hidden flex-1 sm:block" />
          <button
            onClick={goToCommunity}
            className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-xl bg-white px-3.5 text-sm font-semibold text-brand-700 shadow-soft ring-1 ring-sandal-200 transition hover:bg-sandal-50 active:scale-95 motion-reduce:transform-none"
            style={{ minHeight: 0 }}
          >
            <Users size={17} /> Explore
          </button>
        </div>

        {chats.length > 0 && (
          <label className="mt-2.5 flex h-11 items-center gap-2.5 rounded-full bg-white px-4 shadow-soft ring-1 ring-sandal-200 transition focus-within:ring-2 focus-within:ring-marigold-400">
            <Search size={17} className="shrink-0 text-maroon-900/40" />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search chats"
              aria-label="Search chats"
              className="h-full w-full min-w-0 bg-transparent text-[15px] text-maroon-900 outline-none placeholder:text-maroon-900/40"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="-mr-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-maroon-900/45 transition hover:bg-sandal-100 hover:text-maroon-900"
                aria-label="Clear search"
                style={{ minHeight: 0 }}
              >
                <X size={16} />
              </button>
            )}
          </label>
        )}
      </div>

      {chats.length === 0 ? (
        <div className="mt-2 flex flex-col items-center rounded-3xl bg-white px-6 py-14 text-center shadow-soft ring-1 ring-sandal-200">
          <span className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-sandal-100 to-sandal-200 text-brand-600">
            <MessageCircle size={34} strokeWidth={1.6} />
            <span className="absolute -right-0.5 -top-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-white text-sm shadow-soft ring-1 ring-sandal-200" aria-hidden="true">
              🙏
            </span>
          </span>
          <h2 className="mt-5 text-lg font-semibold text-maroon-900">No messages yet</h2>
          <p className="mt-1.5 max-w-[17rem] text-sm leading-relaxed text-maroon-900/60">
            Connect with devotees in the community, then start a conversation here.
          </p>
          <button onClick={goToCommunity} className="btn-primary mt-6 h-11 px-6">
            <UserPlus size={17} /> Explore
          </button>
        </div>
      ) : shown.length === 0 ? (
        <div className="mt-2 flex flex-col items-center rounded-3xl bg-white px-6 py-12 text-center shadow-soft ring-1 ring-sandal-200">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-sandal-100 text-maroon-900/45">
            {unreadOnly ? <CheckCheck size={24} /> : <Search size={22} />}
          </span>
          <p className="mt-4 text-[15px] font-semibold text-maroon-900">{unreadOnly ? 'You are all caught up' : 'No conversation found'}</p>
          <p className="mt-1 text-sm text-maroon-900/55">{unreadOnly ? 'There are no unread messages.' : 'Try a different search.'}</p>
        </div>
      ) : (
        <ul className="mt-1 overflow-hidden rounded-3xl bg-white py-1 shadow-soft ring-1 ring-sandal-200">
          {shown.map((chat) => {
            const o = other(chat);
            if (!o) return null;
            const unread = unreadOf(chat);
            const last = chat.lastMessage;
            const text = previews[chat.id];
            const locked = !!last && !text && (last.text === '[Encrypted Message]' || isEncrypted(last.text || ''));
            const temple = !isBlank(o.iskconCenter) ? o.iskconCenter : '';
            return (
              <li key={chat.id} className="group">
                <button
                  onClick={() => navigate(`/chat/${chat.id}`)}
                  className="flex w-full items-center gap-3 pl-4 text-left transition-colors hover:bg-sandal-50 active:bg-sandal-100"
                  style={{ minHeight: 0 }}
                >
                  <Avatar gender={o.gender} name={o.userName} className="h-[52px] w-[52px] shrink-0" textClassName="text-base" />
                  {/* divider is inset: it lives under the text, not under the avatar */}
                  <span className="flex min-h-[76px] min-w-0 flex-1 flex-col justify-center gap-1 border-b border-sandal-200/70 py-3 pr-4 group-last:border-transparent">
                    <span className="flex items-baseline gap-2">
                      <span className={`min-w-0 flex-1 truncate text-[15.5px] leading-tight text-maroon-900 ${unread ? 'font-bold' : 'font-semibold'}`}>
                        {o.userName}
                      </span>
                      {last && (
                        <span className={`shrink-0 text-[11.5px] tabular-nums ${unread ? 'font-semibold text-brand-600' : 'text-maroon-900/45'}`}>
                          {timeLabel(last.timestamp)}
                        </span>
                      )}
                    </span>
                    <span className="flex items-center gap-2">
                      <span className={`flex min-w-0 flex-1 items-center gap-1 text-[13.5px] leading-snug ${unread ? 'font-medium text-maroon-900/80' : 'text-maroon-900/55'}`}>
                        {last ? (
                          <>
                            {last.senderId === user?.uid && <span className="shrink-0 text-maroon-900/45">You:</span>}
                            {locked ? (
                              <>
                                <Lock size={12} className="shrink-0 opacity-70" />
                                <span className="truncate">Message</span>
                              </>
                            ) : (
                              <span className="truncate">{text || last.text}</span>
                            )}
                          </>
                        ) : (
                          <span className="truncate italic">{temple || 'Say Hare Krishna'}</span>
                        )}
                      </span>
                      {unread > 0 && (
                        <span className="flex h-[22px] min-w-[22px] shrink-0 items-center justify-center rounded-full bg-brand-600 px-1.5 text-[11px] font-bold leading-none text-white shadow-[0_2px_6px_-1px_rgba(234,88,12,0.5)]">
                          {unread > 99 ? '99+' : unread}
                        </span>
                      )}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default ChatsList;
