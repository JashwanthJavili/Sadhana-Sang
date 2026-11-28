import React from 'react';
import { createPortal } from 'react-dom';
import { UserProfile } from '../types/chat';
import { X, MessageCircle, MapPin, Calendar, BookOpen, UserRound } from 'lucide-react';
import Avatar from './Avatar';

interface UserProfileModalProps {
  profile: UserProfile | null;
  isOpen: boolean;
  onClose: () => void;
  onStartChat?: (userId: string) => void;
  showChatButton?: boolean;
  /** Online / last-seen is only for devotees who are connected */
  showStatus?: boolean;
}

const known = (v?: string) => (v && v.toLowerCase() !== 'n/a' && v !== 'Not Specified' ? v : '');

const timeAgo = (ts: number) => {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} hr ago`;
  return `${Math.floor(s / 86400)} days ago`;
};

const UserProfileModal: React.FC<UserProfileModalProps> = ({ profile, isOpen, onClose, onStartChat, showChatButton = true, showStatus = true }) => {
  if (!isOpen || !profile) return null;

  const showGuru = profile.showGuruName !== false;
  const showCenter = profile.showIskconCenter !== false;

  const rows = [
    showGuru && { Icon: UserRound, label: 'Teacher', value: known(profile.guruName) || 'Not shared' },
    showCenter && { Icon: MapPin, label: 'Temple', value: known(profile.iskconCenter) || 'Not shared' },
    profile.createdAt && { Icon: Calendar, label: 'Joined', value: new Date(profile.createdAt).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) },
  ].filter(Boolean) as { Icon: React.ComponentType<any>; label: string; value: string }[];

  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label="Devotee profile">
      <div className="absolute inset-0 animate-fadeIn bg-maroon-900/30 backdrop-blur-[2px] motion-reduce:animate-none" onClick={onClose} />
      <div
        style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}
        className="relative max-h-[90dvh] w-full animate-rise-in overflow-y-auto rounded-t-[28px] bg-white shadow-lift motion-reduce:animate-none sm:max-w-sm sm:rounded-[28px]"
      >
        <span className="absolute left-1/2 top-2 z-10 h-1 w-10 -translate-x-1/2 rounded-full bg-maroon-900/15 sm:hidden" aria-hidden="true" />
        <button onClick={onClose} className="icon-btn absolute right-3 top-3 z-10 rounded-full bg-white/85 text-maroon-800 shadow-soft hover:bg-white" aria-label="Close">
          <X size={18} />
        </button>

        {/* Top */}
        <div className="bg-gradient-to-b from-sandal-200 via-sandal-100 to-white px-6 pb-5 pt-9 text-center">
          <div className="relative mx-auto h-24 w-24">
            <span className="block h-24 w-24 overflow-hidden rounded-full ring-4 ring-white shadow-lift">
              <Avatar gender={profile.gender} name={profile.userName} className="h-full w-full" />
            </span>
            {showStatus && profile.showLastSeen !== false && (
              <span className={`absolute bottom-1 right-1 h-5 w-5 rounded-full ring-4 ring-white ${profile.isOnline ? 'bg-emerald-500' : 'bg-stone-300'}`} />
            )}
          </div>
          <h3 className="mt-3 break-words text-xl font-semibold text-maroon-900">{profile.userName || 'Devotee'}</h3>
          {showStatus && profile.showLastSeen !== false && (
            <p className={`mt-0.5 text-sm font-medium ${profile.isOnline ? 'text-emerald-600' : 'text-maroon-900/45'}`}>
              {profile.isOnline ? 'Online now' : `Last seen ${timeAgo(profile.lastSeen)}`}
            </p>
          )}
        </div>

        <div className="space-y-4 px-6">
          {profile.bio && (
            <div className="rounded-2xl bg-sandal-50 p-4 ring-1 ring-sandal-200/70">
              <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-brand-600">
                <BookOpen size={13} /> About
              </p>
              <p className="break-words text-sm italic leading-relaxed text-maroon-900/75">“{profile.bio}”</p>
            </div>
          )}

          {rows.length > 0 ? (
            <ul className="divide-y divide-sandal-200/70 overflow-hidden rounded-2xl ring-1 ring-sandal-200">
              {rows.map(({ Icon, label, value }) => (
                <li key={label} className="flex items-center gap-3 px-4 py-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sandal-100 text-brand-600">
                    <Icon size={17} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs text-maroon-900/45">{label}</span>
                    <span className="block truncate text-sm font-semibold text-maroon-900">{value}</span>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-center text-sm italic text-maroon-900/45">This devotee keeps these details private</p>
          )}

          {showChatButton && onStartChat && (
            <button
              onClick={() => {
                onStartChat(profile.uid);
                onClose();
              }}
              className="btn-primary h-12 w-full rounded-full"
            >
              <MessageCircle size={17} /> Send a message
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default UserProfileModal;
