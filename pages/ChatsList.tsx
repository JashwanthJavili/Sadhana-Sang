import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Chat } from '../types/chat';
import { getUserChats } from '../services/chat';
import { MessageCircle, Search, UserPlus, Lock, X, Users } from 'lucide-react';
import Avatar from '../components/Avatar';
import CollapsibleSearch from '../components/CollapsibleSearch';
import { PageLoader } from '../components/LoadingScreen';
import { isEncrypted } from '../services/encryption';

const isBlank = (v?: string) => !v || v.toLowerCase() === 'n/a' || v === 'Not Specified';

const timeLabel = (ts: number) => {
  const d = new Date(ts);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
  const days = Math.floor((now.getTime() - ts) / 86_400_000);
  if (days < 7) return days <= 1 ? 'Yesterday' : d.toLocaleDateString('en-IN', { weekday: 'short' });
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

const chipCls = (active: boolean) =>
  `inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-4 text-sm font-medium transition ${
    active ? 'bg-brand-600 text-white shadow-sm' : 'bg-white text-maroon-800 ring-1 ring-sandal-300 hover:bg-sandal-100'
  }`;

const selectChipCls = (active: boolean) =>
  `h-9 max-w-[11rem] shrink-0 cursor-pointer truncate rounded-full border-0 py-0 pl-4 pr-8 text-sm font-medium outline-none ring-1 transition focus:ring-2 focus:ring-marigold-400 ${
    active ? 'bg-amber-100 text-maroon-900 ring-marigold-400' : 'bg-white text-maroon-800 ring-sandal-300'
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

  // a chat with no message yet is not a conversation — leave it out
  const chats = useMemo(() => allChats.filter((c) => !!c.lastMessage), [allChats]);

  const other = (chat: Chat) => {
    const id = chat.participants.find((p) => p !== user?.uid);
    return id ? chat.participantDetails[id] : null;
  };

  const unreadOf = (chat: Chat) => (user ? chat.unreadCount?.[user.uid] || 0 : 0);

  // derived from the live list — no polling
  const totalUnread = chats.reduce((sum, c) => sum + unreadOf(c), 0);
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
    <div className="mx-auto w-full max-w-3xl animate-rise-in">
      {/* Toolbar — the page title is already in the top bar */}
      <div className="flex items-center gap-2">
        <div className="-mx-1 flex min-w-0 flex-1 gap-2 overflow-x-auto px-1 py-1 scrollbar-none">
          <button onClick={() => setUnreadOnly(false)} className={chipCls(!unreadOnly)}>
            All
          </button>
          <button onClick={() => setUnreadOnly(true)} className={chipCls(unreadOnly)}>
            Unread
            {unreadChats > 0 && (
              <span className={`rounded-full px-1.5 text-[11px] font-bold ${unreadOnly ? 'bg-white/25 text-white' : 'bg-brand-600 text-white'}`}>{unreadChats}</span>
            )}
          </button>
        </div>
        {chats.length > 0 && <CollapsibleSearch value={searchTerm} onChange={setSearchTerm} placeholder="Search chats" />}
        <button
          onClick={() => navigate('/community')}
          className="flex h-12 w-14 shrink-0 flex-col items-center justify-center gap-0.5 rounded-2xl bg-brand-600 text-white shadow-soft transition hover:bg-brand-700 active:scale-95"
          aria-label="Find devotees"
          style={{ minHeight: 0 }}
        >
          <Users size={18} />
          <span className="text-[10px] font-semibold leading-none">Devotees</span>
        </button>
      </div>

      {chats.length === 0 ? (
        /* Empty state */
        <div className="mt-6 rounded-3xl bg-white px-6 py-12 text-center shadow-card ring-1 ring-sandal-200">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-50 text-brand-600 ring-1 ring-amber-200">
            <MessageCircle size={28} />
          </span>
          <h2 className="mt-4 text-lg font-semibold text-maroon-900">No messages yet</h2>
          <p className="mx-auto mt-1 max-w-xs text-sm text-maroon-900/60">
            Connect with devotees in the community, then start a conversation here.
          </p>
          <button onClick={() => navigate('/community')} className="btn-primary mt-6 h-11 px-5">
            <UserPlus size={17} /> Find devotees
          </button>
        </div>
      ) : (
        <>
          {/* Conversations */}
          {shown.length === 0 ? (
            <div className="mt-3 rounded-3xl bg-white px-6 py-10 text-center ring-1 ring-sandal-200">
              <p className="text-sm font-medium text-maroon-900/70">{unreadOnly ? 'You are all caught up' : 'No conversation found'}</p>
              <p className="mt-1 text-xs text-maroon-900/45">{unreadOnly ? 'There are no unread messages.' : 'Try a different search.'}</p>
            </div>
          ) : (
            <ul className="mt-3 overflow-hidden rounded-3xl bg-white shadow-card ring-1 ring-sandal-200">
              {shown.map((chat, i) => {
                const o = other(chat);
                if (!o) return null;
                const unread = unreadOf(chat);
                const last = chat.lastMessage;
                const locked = !!last && (last.text === '[Encrypted Message]' || isEncrypted(last.text || ''));
                const temple = !isBlank(o.iskconCenter) ? o.iskconCenter : '';
                return (
                  <li key={chat.id}>
                    <button
                      onClick={() => navigate(`/chat/${chat.id}`)}
                      className={`flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-sandal-50 active:bg-sandal-100 ${unread ? 'bg-amber-50/50' : ''}`}
                    >
                      <Avatar gender={o.gender} name={o.userName} className="h-12 w-12 ring-2 ring-amber-100" textClassName="text-base" />
                      <span className="flex min-w-0 flex-1 flex-col py-0.5">
                        <span className="flex items-baseline justify-between gap-2">
                          <span className={`truncate text-[15px] text-maroon-900 ${unread ? 'font-semibold' : 'font-medium'}`}>{o.userName}</span>
                          {last && (
                            <span className={`shrink-0 text-xs ${unread ? 'font-semibold text-brand-600' : 'text-maroon-900/40'}`}>{timeLabel(last.timestamp)}</span>
                          )}
                        </span>
                        <span className="mt-0.5 flex items-center justify-between gap-2">
                          <span className={`flex min-w-0 items-center gap-1 text-sm ${unread ? 'font-medium text-maroon-900/80' : 'text-maroon-900/50'}`}>
                            {last ? (
                              <>
                                {last.senderId === user?.uid && <span className="shrink-0 text-maroon-900/40">You:</span>}
                                {locked ? (
                                  <>
                                    <Lock size={13} className="shrink-0" />
                                    <span className="truncate">Message</span>
                                  </>
                                ) : (
                                  <span className="truncate">{last.text}</span>
                                )}
                              </>
                            ) : (
                              <span className="truncate italic text-maroon-900/40">{temple || 'Say Hare Krishna'}</span>
                            )}
                          </span>
                          {unread > 0 && (
                            <span className="flex h-5 min-w-[20px] shrink-0 items-center justify-center rounded-full bg-brand-600 px-1.5 text-[11px] font-bold text-white">
                              {unread > 99 ? '99+' : unread}
                            </span>
                          )}
                        </span>
                      </span>
                    </button>
                    {i < shown.length - 1 && <div className="ml-[76px] h-px bg-sandal-200/70" />}
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </div>
  );
};

export default ChatsList;
