import React, { useEffect, useState } from 'react';
import { PageLoader } from '../components/LoadingScreen';
import { UserProfile, ConnectionStatus } from '../types/chat';
import { getAllUsers, searchUsers, createOrGetChat } from '../services/chat';
import { useAuth } from '../contexts/AuthContext';
import { useUserData } from '../contexts/UserDataContext';
import { Users, Search, MessageCircle, X, UserPlus, UserMinus, Check, HelpCircle, MapPin, BookOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import UserProfileModal from '../components/UserProfileModal';
import Avatar from '../components/Avatar';
import { 
  getConnectionStatus, 
  sendConnectionRequest, 
  getUserConnections,
  getPendingRequests,
  removeConnection,
  listenToUserConnections
} from '../services/connections';
import { useToast } from '../contexts/ToastContext';

const Community: React.FC = () => {
  const { user } = useAuth();
  const { userSettings } = useUserData();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    onlineOnly: false,
    guruName: 'All',
    iskconCenter: 'All',
  });
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'connected' | 'explore'>('connected');
  const [connectionStatuses, setConnectionStatuses] = useState<{ [key: string]: ConnectionStatus }>({});
  const [connectedUserIds, setConnectedUserIds] = useState<string[]>([]);
  const [pendingRequestCount, setPendingRequestCount] = useState(0);
  const [selectedProfile, setSelectedProfile] = useState<UserProfile | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [removingConnection, setRemovingConnection] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const unsubscribe = getAllUsers((fetchedUsers) => {
      console.log('✅ Fetched users with profiles:', fetchedUsers.length, 'users');
      console.log('📋 User details:', fetchedUsers.map(u => ({ 
        uid: u.uid, 
        name: u.userName, 
        guru: u.guruName, 
        center: u.iskconCenter,
        messagingPrivacy: u.messagingPrivacy 
      })));
      
      // Exclude current user (getAllUsers already filters for valid profiles)
      const validUsers = fetchedUsers.filter(u => u.uid !== user.uid);
      console.log('👥 Valid users (excluding current user):', validUsers.length);
      
      setUsers(validUsers);
      setFilteredUsers(validUsers);
      setLoading(false);
    });

    // Set a timeout to stop loading even if data doesn't arrive
    const timeout = setTimeout(() => {
      setLoading(false);
    }, 5000);

    return () => {
      unsubscribe();
      clearTimeout(timeout);
    };
  }, [user]);

  useEffect(() => {
    const applyFilters = () => {
      // ACID COMPLIANCE: Split users into Connected and Explore FIRST
      // This ensures every user appears in exactly ONE tab (Atomicity + Consistency)
      const connected = users.filter(u => connectedUserIds.includes(u.uid));
      const explore = users.filter(u => !connectedUserIds.includes(u.uid));
      
      // Start with ALL users in the current view
      let filtered = view === 'connected' ? connected : explore;

      // Only apply filters if user has actively set them
      const hasActiveFilters = searchTerm || 
                                filters.onlineOnly || 
                                (filters.guruName && filters.guruName !== 'All') || 
                                (filters.iskconCenter && filters.iskconCenter !== 'All');

      if (hasActiveFilters) {
        // Apply search term filter
        if (searchTerm) {
          filtered = filtered.filter(u =>
            u.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            u.guruName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            u.iskconCenter?.toLowerCase().includes(searchTerm.toLowerCase())
          );
        }

        // Apply online filter
        if (filters.onlineOnly) {
          filtered = filtered.filter(u => u.isOnline);
        }

        // Apply guru filter
        if (filters.guruName && filters.guruName !== 'All') {
          if (filters.guruName === 'Not Specified') {
            filtered = filtered.filter(u => !u.guruName || u.guruName === 'Not Specified' || u.guruName === '' || u.guruName.toLowerCase() === 'n/a');
          } else {
            filtered = filtered.filter(u => u.guruName === filters.guruName);
          }
        }

        // Apply ISKCON center filter
        if (filters.iskconCenter && filters.iskconCenter !== 'All') {
          if (filters.iskconCenter === 'Not Specified') {
            filtered = filtered.filter(u => !u.iskconCenter || u.iskconCenter === 'Not Specified' || u.iskconCenter === '' || u.iskconCenter.toLowerCase() === 'n/a');
          } else {
            filtered = filtered.filter(u => u.iskconCenter === filters.iskconCenter);
          }
        }

        console.log(`🔍 ${view === 'connected' ? 'Connected' : 'Explore'} tab: ${filtered.length} users match criteria (from ${view === 'connected' ? connected.length : explore.length} total in this tab)`);
      } else {
        console.log(`👥 ${view === 'connected' ? 'Connected' : 'Explore'} tab: Showing all ${filtered.length} users (no filters active)`);
      }

      setFilteredUsers(filtered);
    };

    applyFilters();
  }, [searchTerm, filters, users, connectedUserIds, view]);

  // Load connections and statuses
  useEffect(() => {
    if (!user?.uid) return;

    // Listen to connections in real-time
    const unsubscribeConnections = listenToUserConnections(user.uid, (connectionIds) => {
      setConnectedUserIds(connectionIds);
      
      // Also refresh connection statuses when connections change
      if (users.length > 0) {
        const loadStatuses = async () => {
          const statuses: { [key: string]: ConnectionStatus } = {};
          for (const u of users) {
            const status = await getConnectionStatus(user.uid, u.uid);
            statuses[u.uid] = status;
          }
          setConnectionStatuses(statuses);
        };
        loadStatuses();
      }
    });

    // Get pending requests count
    const unsubscribePending = getPendingRequests(user.uid, (requests) => {
      setPendingRequestCount(requests.length);
    });

    return () => {
      unsubscribeConnections();
      unsubscribePending();
    };
  }, [user?.uid, users]);

  // Load connection status for each user
  useEffect(() => {
    if (!user?.uid || users.length === 0) return;

    const loadStatuses = async () => {
      const statuses: { [key: string]: ConnectionStatus } = {};
      for (const u of users) {
        const status = await getConnectionStatus(user.uid, u.uid);
        statuses[u.uid] = status;
      }
      setConnectionStatuses(statuses);
    };

    loadStatuses();
  }, [user?.uid, users]);

  const handleStartChat = async (otherUserId: string) => {
    if (!user) return;

    try {
      const chatId = await createOrGetChat(user.uid, otherUserId);
      navigate(`/chat/${chatId}`);
    } catch (error) {
      console.error('Error creating chat:', error);
      showToast({ type: 'error', title: 'Unable to start chat. Please make sure you are connected with this devotee.' });
    }
  };

  const handleConnect = async (otherUserId: string, otherUserName: string, otherUserPhoto?: string) => {
    if (!user?.uid || !userSettings?.userName) return;

    try {
      await sendConnectionRequest(
        user.uid,
        userSettings.userName,
        user.photoURL || undefined,
        otherUserId,
        otherUserName,
        undefined // optional message
      );
      showToast({ type: 'success', title: 'Connection request sent!' });
      
      // Update status locally for immediate UI feedback
      setConnectionStatuses(prev => ({
        ...prev,
        [otherUserId]: 'pending'
      }));
    } catch (error) {
      console.error('Error sending connection request:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to send connection request';
      showToast({ type: 'error', title: errorMessage });
    }
  };

  const handleRemoveConnection = async (otherUserId: string, otherUserName: string) => {
    if (!user?.uid) return;

    const confirmed = confirm(`Are you sure you want to remove ${otherUserName} from your connections?`);
    if (!confirmed) return;

    setRemovingConnection(otherUserId);

    try {
      await removeConnection(user.uid, otherUserId);
      showToast({ type: 'info', title: 'Connection removed.' });
      
      // Update local state
      setConnectedUserIds(prev => prev.filter(id => id !== otherUserId));
      setConnectionStatuses(prev => ({
        ...prev,
        [otherUserId]: 'none'
      }));
    } catch (error) {
      console.error('Error removing connection:', error);
      showToast({ type: 'error', title: 'Failed to remove connection. Please try again.' });
    } finally {
      setRemovingConnection(null);
    }
  };

  const uniqueGurus = Array.from(new Set(users.map(u => u.guruName)))
    .filter(Boolean)
    .filter((g): g is string => typeof g === 'string' && g !== 'Not Specified' && g.toLowerCase() !== 'n/a');
  
  const uniqueCenters = Array.from(new Set(users.map(u => u.iskconCenter)))
    .filter(Boolean)
    .filter((c): c is string => typeof c === 'string' && c !== 'Not Specified' && c.toLowerCase() !== 'n/a');
  
  const hasUsersWithoutGuru = users.some(u => !u.guruName || u.guruName === 'Not Specified' || u.guruName === '' || u.guruName.toLowerCase() === 'n/a');
  const hasUsersWithoutCenter = users.some(u => !u.iskconCenter || u.iskconCenter === 'Not Specified' || u.iskconCenter === '' || u.iskconCenter.toLowerCase() === 'n/a');

  const getOnlineCount = () => filteredUsers.filter(u => u.isOnline).length;
  const getTimeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  const renderConnectionButton = (profile: UserProfile) => {
    const status = connectionStatuses[profile.uid];
    const canMessageDirectly = profile.messagingPrivacy === 'everyone';
    const sideMessageBtn = canMessageDirectly ? (
      <button
        onClick={() => handleStartChat(profile.uid)}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-brand-700 ring-1 ring-amber-200 transition hover:bg-amber-100"
        title="Send a message"
        aria-label="Send a message"
      >
        <MessageCircle size={17} />
      </button>
    ) : null;

    if (status === 'connected') {
      return (
        <div className="flex gap-2">
          <button onClick={() => handleStartChat(profile.uid)} className="btn-primary h-10 flex-1">
            <MessageCircle size={16} /> Message
          </button>
          <button
            onClick={() => handleRemoveConnection(profile.uid, profile.userName)}
            disabled={removingConnection === profile.uid}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-maroon-900/40 ring-1 ring-sandal-200 transition hover:bg-sandal-100 hover:text-maroon-700 disabled:opacity-40"
            title="Remove connection"
            aria-label="Remove connection"
          >
            <UserMinus size={16} />
          </button>
        </div>
      );
    }

    if (status === 'pending') {
      return (
        <div className="flex gap-2">
          <span className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl bg-sandal-100 text-sm font-semibold text-maroon-700 ring-1 ring-sandal-200">
            <Check size={16} /> Request sent
          </span>
          {sideMessageBtn}
        </div>
      );
    }

    return (
      <div className="flex gap-2">
        <button onClick={() => handleConnect(profile.uid, profile.userName, profile.photoURL)} className="btn-primary h-10 flex-1">
          <UserPlus size={16} /> Connect
        </button>
        {sideMessageBtn}
      </div>
    );
  };

  const connectedUsers = users.filter((u) => connectedUserIds.includes(u.uid));
  const exploreUsers = users.filter((u) => !connectedUserIds.includes(u.uid));
  const displayUsers = filteredUsers; // already filtered for the current tab
  const activeFilters = (filters.onlineOnly ? 1 : 0) + (filters.guruName !== 'All' ? 1 : 0) + (filters.iskconCenter !== 'All' ? 1 : 0);
  const known = (v?: string) => (v && v.toLowerCase() !== 'n/a' && v !== 'Not Specified' ? v : '');
  const onlineCount = users.filter((u) => u.isOnline).length;

  if (loading) return <PageLoader label="Finding devotees…" />;

  const chipCls = (active: boolean) =>
    `inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-4 text-sm font-medium transition ${
      active ? 'bg-amber-100 text-maroon-900 ring-1 ring-marigold-400' : 'bg-white text-maroon-800 ring-1 ring-sandal-300 hover:bg-sandal-100'
    }`;
  const selectChipCls = (active: boolean) =>
    `h-9 max-w-[11rem] shrink-0 cursor-pointer truncate rounded-full border-0 pl-4 pr-8 text-sm font-medium outline-none ring-1 transition focus:ring-2 focus:ring-marigold-400 leading-[2.25rem] ${
      active ? 'bg-amber-100 text-maroon-900 ring-marigold-400' : 'bg-white text-maroon-800 ring-sandal-300'
    }`;

  const quickLinks = [
    { label: 'Messages', icon: MessageCircle, to: '/chats', count: 0 },
    { label: 'Requests', icon: UserPlus, to: '/connection-requests', count: pendingRequestCount },
    { label: 'Forum', icon: HelpCircle, to: '/questions', count: 0 },
  ];

  return (
    <div className="mx-auto w-full max-w-5xl animate-rise-in">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-maroon-900">Community</h1>
        <p className="mt-0.5 text-sm text-maroon-900/60">Meet devotees, make friends and grow together in Krishna consciousness.</p>
      </div>

      {/* Quick links */}
      <div className="mt-4 grid grid-cols-3 gap-2 sm:max-w-md sm:gap-3">
        {quickLinks.map(({ label, icon: Icon, to, count }) => (
          <button
            key={label}
            onClick={() => navigate(to)}
            className="relative flex flex-col items-center justify-center gap-1.5 rounded-2xl bg-white px-2 py-3 shadow-soft ring-1 ring-sandal-200 transition hover:-translate-y-0.5 hover:shadow-card hover:ring-amber-200"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-50 text-brand-600">
              <Icon size={18} />
            </span>
            <span className="text-[13px] font-semibold text-maroon-900">{label}</span>
            {count > 0 && (
              <span className="absolute right-2 top-2 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-brand-600 px-1.5 text-[11px] font-bold text-white">
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Search */}
      <label className="mt-5 flex h-12 items-center gap-2.5 rounded-2xl bg-white px-4 shadow-soft ring-1 ring-sandal-200 focus-within:ring-2 focus-within:ring-marigold-400">
        <Search size={18} className="shrink-0 text-maroon-900/40" />
        <input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by name, teacher or temple"
          className="w-full min-w-0 bg-transparent text-[15px] text-maroon-900 outline-none placeholder:text-maroon-900/40"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="-mr-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-maroon-900/40 hover:bg-sandal-100"
            aria-label="Clear search"
          >
            <X size={16} />
          </button>
        )}
      </label>

      {/* Tabs */}
      <div className="mt-4 grid grid-cols-2 rounded-2xl bg-sandal-100 p-1 ring-1 ring-sandal-200 sm:inline-grid" role="tablist">
        {(
          [
            { id: 'connected', label: 'My connections', count: connectedUsers.length },
            { id: 'explore', label: 'Find devotees', count: exploreUsers.length },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={view === t.id}
            onClick={() => setView(t.id)}
            className={`flex h-10 min-w-0 items-center justify-center gap-1.5 rounded-xl px-3 text-sm font-semibold transition sm:px-5 ${
              view === t.id ? 'bg-white text-maroon-900 shadow-soft' : 'text-maroon-900/55 hover:text-maroon-900'
            }`}
          >
            <span className="truncate">{t.label}</span>
            <span className={`text-xs font-medium ${view === t.id ? 'text-brand-600' : 'text-maroon-900/40'}`}>{t.count}</span>
          </button>
        ))}
      </div>

      {/* Filter chips */}
      <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 py-1 scrollbar-none sm:mx-0 sm:flex-wrap sm:px-0">
        <button
          onClick={() => setFilters({ ...filters, onlineOnly: !filters.onlineOnly })}
          className={chipCls(filters.onlineOnly)}
          aria-pressed={filters.onlineOnly}
        >
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          Online now
          {onlineCount > 0 && <span className="text-xs text-maroon-900/45">{onlineCount}</span>}
        </button>
        {(uniqueGurus.length > 0 || hasUsersWithoutGuru) && (
          <select
            aria-label="Filter by teacher"
            value={filters.guruName}
            onChange={(e) => setFilters({ ...filters, guruName: e.target.value })}
            className={selectChipCls(filters.guruName !== 'All')}
          >
            <option value="All">Any teacher</option>
            {uniqueGurus.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
            {hasUsersWithoutGuru && <option value="Not Specified">Not specified</option>}
          </select>
        )}
        {(uniqueCenters.length > 0 || hasUsersWithoutCenter) && (
          <select
            aria-label="Filter by temple"
            value={filters.iskconCenter}
            onChange={(e) => setFilters({ ...filters, iskconCenter: e.target.value })}
            className={selectChipCls(filters.iskconCenter !== 'All')}
          >
            <option value="All">Any temple</option>
            {uniqueCenters.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
            {hasUsersWithoutCenter && <option value="Not Specified">Not specified</option>}
          </select>
        )}
        {activeFilters > 0 && (
          <button
            onClick={() => setFilters({ onlineOnly: false, guruName: 'All', iskconCenter: 'All' })}
            className="inline-flex h-9 shrink-0 items-center gap-1 rounded-full px-3 text-sm font-medium text-brand-700 hover:bg-amber-50"
          >
            <X size={14} /> Clear
          </button>
        )}
      </div>

      {/* Devotees */}
      {displayUsers.length === 0 ? (
        <div className="mt-4 rounded-3xl bg-white px-6 py-12 text-center shadow-soft ring-1 ring-sandal-200">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 text-brand-600 ring-1 ring-amber-200">
            <Users size={24} />
          </span>
          {view === 'connected' && !searchTerm && activeFilters === 0 ? (
            <>
              <h2 className="mt-4 text-base font-semibold text-maroon-900">No connections yet</h2>
              <p className="mx-auto mt-1 max-w-xs text-sm text-maroon-900/60">Find devotees near you or from your temple and send them a request.</p>
              <button onClick={() => setView('explore')} className="btn-primary mt-5 h-11 px-5">
                <UserPlus size={17} /> Find devotees
              </button>
            </>
          ) : (
            <>
              <h2 className="mt-4 text-base font-semibold text-maroon-900">No devotees found</h2>
              <p className="mt-1 text-sm text-maroon-900/60">Try a different search or clear the filters.</p>
              {activeFilters > 0 && (
                <button onClick={() => setFilters({ onlineOnly: false, guruName: 'All', iskconCenter: 'All' })} className="btn-secondary mt-5 h-10">
                  Clear filters
                </button>
              )}
            </>
          )}
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {displayUsers.map((profile) => {
            const temple = known(profile.iskconCenter);
            const teacher = known(profile.guruName);
            return (
              <div
                key={profile.uid}
                onClick={() => {
                  setSelectedProfile(profile);
                  setShowProfileModal(true);
                }}
                className="flex cursor-pointer flex-col rounded-2xl bg-white p-3 shadow-soft ring-1 ring-sandal-200 transition hover:-translate-y-0.5 hover:shadow-card hover:ring-amber-200"
              >
                <div className="flex items-center gap-2.5">
                  <div className="relative shrink-0">
                    <Avatar src={profile.photoURL} name={profile.userName} className="h-11 w-11 ring-2 ring-amber-100" textClassName="text-base" />
                    {profile.isOnline && <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-white" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-semibold text-maroon-900">{profile.userName || 'Devotee'}</h3>
                    <p className={`text-[11px] ${profile.isOnline ? 'font-medium text-emerald-700' : 'text-maroon-900/45'}`}>
                      {profile.isOnline ? 'Online now' : profile.lastSeen ? `Active ${getTimeAgo(profile.lastSeen)}` : 'Devotee'}
                    </p>
                  </div>
                </div>

                {(temple || teacher) && (
                  <div className="mt-2 space-y-1 text-[12px] text-maroon-900/70">
                    {temple && (
                      <p className="flex items-center gap-1.5">
                        <MapPin size={12} className="shrink-0 text-marigold-500" />
                        <span className="truncate">{temple}</span>
                      </p>
                    )}
                    {teacher && (
                      <p className="flex items-center gap-1.5">
                        <BookOpen size={12} className="shrink-0 text-marigold-500" />
                        <span className="truncate">{teacher}</span>
                      </p>
                    )}
                  </div>
                )}
                {profile.bio && <p className="mt-1.5 line-clamp-2 text-[12px] text-maroon-900/55">{profile.bio}</p>}

                <div className="mt-auto pt-3" onClick={(e) => e.stopPropagation()}>
                  {renderConnectionButton(profile)}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedProfile && (
        <UserProfileModal
          profile={selectedProfile}
          isOpen={showProfileModal}
          onClose={() => {
            setShowProfileModal(false);
            setSelectedProfile(null);
          }}
          showChatButton={connectionStatuses[selectedProfile.uid] === 'connected'}
          onStartChat={
            connectionStatuses[selectedProfile.uid] === 'connected'
              ? () => {
                  handleStartChat(selectedProfile.uid);
                  setShowProfileModal(false);
                }
              : undefined
          }
        />
      )}
    </div>
  );
};

export default Community;
