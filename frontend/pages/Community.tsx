import React, { useEffect, useState } from 'react';
import { PageLoader } from '../components/LoadingScreen';
import { UserProfile, ConnectionStatus } from '../types/chat';
import { getAllUsers, searchUsers, createOrGetChat } from '../services/chat';
import { useAuth } from '../contexts/AuthContext';
import { useUserData } from '../contexts/UserDataContext';
import { Users, Search, MessageCircle, X, UserPlus, UserCheck, UserMinus, Check, HelpCircle, MapPin, BookOpen, ChevronDown } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import UserProfileModal from '../components/UserProfileModal';
import Avatar from '../components/Avatar';
import CollapsibleSearch from '../components/CollapsibleSearch';
import { 
  getConnectionStatus, 
  sendConnectionRequest, 
  getUserConnections,
  getPendingRequests,
  removeConnection,
  listenToUserConnections
} from '../services/connections';
import { useToast } from '../contexts/ToastContext';
import { listenBlocked, canSendRequestTo } from '../services/privacy';

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
  const [openUid, setOpenUid] = useState<string | null>(null);
  const location = useLocation();
  const [view, setView] = useState<'connected' | 'explore'>(
    (location.state as { view?: 'connected' | 'explore' } | null)?.view === 'explore' ? 'explore' : 'connected'
  );
  const [connectionStatuses, setConnectionStatuses] = useState<{ [key: string]: ConnectionStatus }>({});
  const [connectedUserIds, setConnectedUserIds] = useState<string[]>([]);
  const [pendingRequestCount, setPendingRequestCount] = useState(0);
  const [selectedProfile, setSelectedProfile] = useState<UserProfile | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [removingConnection, setRemovingConnection] = useState<string | null>(null);

  // Devotees I have blocked are hidden from me
  const [blockedIds, setBlockedIds] = useState<string[]>([]);
  const blockedRef = React.useRef<string[]>([]);
  blockedRef.current = blockedIds;
  useEffect(() => {
    if (!user || user.uid === 'guest') return;
    return listenBlocked(user.uid, setBlockedIds);
  }, [user]);

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
      const validUsers = fetchedUsers.filter(u => u.uid !== user.uid && !blockedRef.current.includes(u.uid));
      console.log('👥 Valid users (excluding current user):', validUsers.length);
      
      setUsers(validUsers);
      setFilteredUsers(validUsers);
      setLoading(false);
    }, userSettings?.gender);

    // Set a timeout to stop loading even if data doesn't arrive
    const timeout = setTimeout(() => {
      setLoading(false);
    }, 5000);

    return () => {
      unsubscribe();
      clearTimeout(timeout);
    };
  }, [user, userSettings?.gender]);

  useEffect(() => {
    const applyFilters = () => {
      // ACID COMPLIANCE: Split users into Connected and Explore FIRST
      // This ensures every user appears in exactly ONE tab (Atomicity + Consistency)
      const connected = users.filter(u => connectedUserIds.includes(u.uid));
      const explore = users.filter(u => !connectedUserIds.includes(u.uid));
      
      // Start with ALL users in the current view
      let filtered = (view === 'connected' ? connected : explore).filter(u => !blockedIds.includes(u.uid));

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
            (u.showGuruName !== false && u.guruName?.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (u.showIskconCenter !== false && u.iskconCenter?.toLowerCase().includes(searchTerm.toLowerCase()))
          );
        }

        // Apply online filter
        if (filters.onlineOnly) {
          filtered = filtered.filter(u => u.isOnline && u.showLastSeen !== false && connectionStatuses[u.uid] === 'connected');
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

      // Explore lists devotees alphabetically
      if (view === 'explore') {
        filtered = [...filtered].sort((a, b) => (a.userName || '').localeCompare(b.userName || '', undefined, { sensitivity: 'base' }));
      }

      setFilteredUsers(filtered);
    };

    applyFilters();
  }, [searchTerm, filters, users, connectedUserIds, view, connectionStatuses, blockedIds]);

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
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-sandal-100 text-brand-700 ring-1 ring-sandal-200 transition hover:bg-sandal-200 active:scale-95 motion-reduce:transform-none"
        title="Send a message"
        aria-label="Send a message"
        style={{ minHeight: 0 }}
      >
        <MessageCircle size={18} />
      </button>
    ) : null;

    if (status === 'connected') {
      return (
        <div className="flex gap-2">
          <button onClick={() => handleStartChat(profile.uid)} className="btn-primary h-11 flex-1 rounded-full" style={{ minHeight: 0 }}>
            <MessageCircle size={17} /> Message
          </button>
          <button
            onClick={() => handleRemoveConnection(profile.uid, profile.userName)}
            disabled={removingConnection === profile.uid}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-maroon-900/45 ring-1 ring-sandal-200 transition hover:bg-sandal-100 hover:text-maroon-700 disabled:opacity-40"
            title="Remove connection"
            aria-label="Remove connection"
            style={{ minHeight: 0 }}
          >
            <UserMinus size={17} />
          </button>
        </div>
      );
    }

    if (status === 'pending') {
      return (
        <div className="flex gap-2">
          <span className="inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-full bg-sandal-100 text-sm font-semibold text-maroon-700 ring-1 ring-sandal-200">
            <Check size={16} /> Request sent
          </span>
          {sideMessageBtn}
        </div>
      );
    }

    if (!canSendRequestTo(profile, userSettings?.gender)) {
      return (
        <div className="flex gap-2">
          <span className="inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-full bg-sandal-50 px-3 text-center text-xs font-semibold text-maroon-900/55 ring-1 ring-sandal-200">
            Not accepting requests
          </span>
          {sideMessageBtn}
        </div>
      );
    }

    return (
      <div className="flex gap-2">
        <button onClick={() => handleConnect(profile.uid, profile.userName, profile.photoURL)} className="btn-primary h-11 flex-1 rounded-full" style={{ minHeight: 0 }}>
          <UserPlus size={17} /> Connect
        </button>
        {sideMessageBtn}
      </div>
    );
  };

  const connectedUsers = users.filter((u) => connectedUserIds.includes(u.uid));
  const exploreUsers = users.filter((u) => !connectedUserIds.includes(u.uid));
  const displayUsers = filteredUsers; // already filtered for the current tab
  const activeFilters = filters.onlineOnly ? 1 : 0;
  const known = (v?: string) => (v && v.toLowerCase() !== 'n/a' && v !== 'Not Specified' ? v : '');
  const canSeeStatus = (u: UserProfile) => connectionStatuses[u.uid] === 'connected' && u.showLastSeen !== false;
  const onlineCount = users.filter((u) => u.isOnline && canSeeStatus(u)).length;

  if (loading) return <PageLoader label="Finding devotees…" />;

  return (
    <div className="mx-auto w-full max-w-5xl animate-rise-in motion-reduce:animate-none">
      {/* Segmented tabs + requests */}
      <div className="flex items-center gap-2">
        <div className="grid min-w-0 flex-1 grid-cols-2 gap-1 rounded-2xl bg-sandal-200/60 p-1 sm:max-w-md" role="tablist" aria-label="Devotees">
          {(
            [
              { id: 'connected', label: 'Connections', count: connectedUsers.length },
              { id: 'explore', label: 'Explore', count: exploreUsers.length },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={view === t.id}
              onClick={() => setView(t.id)}
              className={`flex h-10 min-w-0 items-center justify-center gap-1.5 rounded-xl px-1.5 text-[13.5px] font-semibold transition-colors duration-200 motion-reduce:transition-none sm:px-4 sm:text-sm ${
                view === t.id ? 'bg-white text-maroon-900 shadow-soft' : 'text-maroon-900/55 hover:text-maroon-900'
              }`}
              style={{ minHeight: 0 }}
            >
              <span className="truncate">{t.label}</span>
              {t.id === 'connected' && t.count > 0 && (
                <span
                  className={`flex h-[18px] min-w-[18px] shrink-0 items-center justify-center rounded-full px-1 text-[10.5px] font-bold leading-none ${
                    view === t.id ? 'bg-brand-100 text-brand-700' : 'bg-white/70 text-maroon-900/50'
                  }`}
                >
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>
        <button
          onClick={() => navigate('/connection-requests')}
          className="relative inline-flex h-12 shrink-0 items-center gap-1.5 rounded-2xl bg-white px-3.5 text-sm font-semibold text-brand-700 shadow-soft ring-1 ring-sandal-200 transition hover:bg-sandal-50 active:scale-95 motion-reduce:transform-none"
          aria-label={pendingRequestCount > 0 ? `${pendingRequestCount} connection requests` : 'Connection requests'}
          style={{ minHeight: 0 }}
        >
          <UserCheck size={17} />
          <span className="hidden min-[380px]:inline">Requests</span>
          {pendingRequestCount > 0 && (
            <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-brand-600 px-1.5 text-[11px] font-bold leading-none text-white">
              {pendingRequestCount}
            </span>
          )}
        </button>
      </div>

      {/* Online filter + search (search is an icon until tapped) */}
      <div className="mt-3 flex items-center justify-between gap-2">
        <p className="hidden min-w-0 truncate pl-1 text-xs font-medium text-maroon-900/50 min-[400px]:block">
          {view === 'connected' ? 'Your connections' : 'Devotees in the community'}
        </p>
        <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
          <button
            onClick={() => setFilters({ ...filters, onlineOnly: !filters.onlineOnly })}
            aria-pressed={filters.onlineOnly}
            className={`inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-semibold shadow-soft ring-1 transition-colors ${
              filters.onlineOnly ? 'bg-emerald-50 text-emerald-800 ring-emerald-300' : 'bg-white text-maroon-800 ring-sandal-200 hover:bg-sandal-50'
            }`}
            style={{ minHeight: 0 }}
          >
            <span className={`h-2 w-2 rounded-full ${filters.onlineOnly ? 'bg-emerald-500' : 'bg-emerald-500/70'}`} />
            Online
            {onlineCount > 0 && <span className="text-xs font-medium opacity-60">{onlineCount}</span>}
          </button>
          <CollapsibleSearch value={searchTerm} onChange={setSearchTerm} placeholder="Search devotees" />
        </div>
      </div>

      {/* Devotees */}
      {displayUsers.length === 0 ? (
        <div className="mt-4 flex flex-col items-center rounded-3xl bg-white px-6 py-12 text-center shadow-soft ring-1 ring-sandal-200">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-sandal-100 to-sandal-200 text-brand-600">
            {view === 'connected' && !searchTerm && activeFilters === 0 ? <Users size={28} strokeWidth={1.7} /> : <Search size={26} strokeWidth={1.7} />}
          </span>
          {view === 'connected' && !searchTerm && activeFilters === 0 ? (
            <>
              <h2 className="mt-4 text-base font-semibold text-maroon-900">No connections yet</h2>
              <p className="mt-1.5 max-w-[17rem] text-sm leading-relaxed text-maroon-900/60">Find devotees near you or from your temple and send them a request.</p>
              <button onClick={() => setView('explore')} className="btn-primary mt-5 h-11 rounded-full px-6" style={{ minHeight: 0 }}>
                <UserPlus size={17} /> Explore
              </button>
            </>
          ) : (
            <>
              <h2 className="mt-4 text-base font-semibold text-maroon-900">No devotees found</h2>
              <p className="mt-1.5 max-w-[17rem] text-sm leading-relaxed text-maroon-900/60">Try a different search or clear the filters.</p>
              {activeFilters > 0 && (
                <button onClick={() => setFilters({ ...filters, onlineOnly: false })} className="btn-secondary mt-5 h-10 rounded-full">
                  Clear filters
                </button>
              )}
            </>
          )}
        </div>
      ) : (
        <div className="mt-3 grid grid-cols-1 items-start gap-2.5 md:grid-cols-2 xl:grid-cols-3">
          {displayUsers.map((profile) => {
            const temple = profile.showIskconCenter === false ? '' : known(profile.iskconCenter);
            const teacher = profile.showGuruName === false ? '' : known(profile.guruName);
            const open = openUid === profile.uid;
            return (
              <div
                key={profile.uid}
                className={`overflow-hidden rounded-[20px] bg-white ring-1 transition-shadow duration-200 ${open ? 'shadow-card ring-marigold-400/40' : 'shadow-soft ring-sandal-200'}`}
              >
                <div className="flex items-center gap-2 pr-2">
                  <button
                    type="button"
                    onClick={() => setOpenUid(open ? null : profile.uid)}
                    aria-expanded={open}
                    className="flex min-w-0 flex-1 items-center gap-3 py-3 pl-3.5 text-left"
                    style={{ minHeight: 0 }}
                  >
                    <div className="relative shrink-0">
                      <Avatar gender={profile.gender} name={profile.userName} className="h-11 w-11" textClassName="text-sm" />
                      {canSeeStatus(profile) && profile.isOnline && (
                        <span className="absolute -bottom-px -right-px h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-white" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-[15px] font-semibold leading-tight text-maroon-900">{profile.userName || 'Devotee'}</h3>
                      {canSeeStatus(profile) ? (
                        <p className={`mt-0.5 truncate text-xs leading-tight ${profile.isOnline ? 'font-medium text-emerald-700' : 'text-maroon-900/50'}`}>
                          {profile.isOnline ? 'Online now' : profile.lastSeen ? `Active ${getTimeAgo(profile.lastSeen)}` : 'Connected'}
                        </p>
                      ) : (
                        <p className="mt-0.5 flex min-w-0 items-center gap-1 text-xs leading-tight text-maroon-900/50">
                          {temple && <MapPin size={11} className="shrink-0" />}
                          <span className="truncate">{temple || 'Devotee'}</span>
                        </p>
                      )}
                    </div>
                  </button>

                  {/* Quick action — always visible, no need to expand the card */}
                  {connectionStatuses[profile.uid] === 'connected' ? (
                    <button
                      type="button"
                      onClick={() => handleStartChat(profile.uid)}
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sandal-100 text-brand-700 ring-1 ring-sandal-200 transition hover:bg-sandal-200 active:scale-95 motion-reduce:transform-none"
                      aria-label="Message"
                      title="Message"
                      style={{ minHeight: 0 }}
                    >
                      <MessageCircle size={18} />
                    </button>
                  ) : connectionStatuses[profile.uid] === 'pending' ? (
                    <span className="inline-flex h-9 shrink-0 items-center gap-1 rounded-full bg-sandal-100 px-3 text-xs font-semibold text-maroon-700 ring-1 ring-sandal-200">
                      <Check size={13} /> Sent
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleConnect(profile.uid, profile.userName, profile.photoURL)}
                      className="inline-flex h-9 shrink-0 items-center gap-1 rounded-full bg-brand-600 px-3.5 text-xs font-semibold text-white shadow-sm transition hover:bg-brand-700 active:scale-95 motion-reduce:transform-none"
                      style={{ minHeight: 0 }}
                    >
                      <UserPlus size={14} /> Connect
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setOpenUid(open ? null : profile.uid)}
                    className="flex h-9 w-8 shrink-0 items-center justify-center rounded-full text-maroon-900/40 transition-colors hover:bg-sandal-100 hover:text-maroon-800"
                    aria-label={open ? 'Collapse' : 'Expand'}
                    style={{ minHeight: 0 }}
                  >
                    <ChevronDown size={18} className={`transition-transform duration-300 motion-reduce:transition-none ${open ? 'rotate-180' : ''}`} />
                  </button>
                </div>

                <div className={`grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                  <div className="min-h-0 overflow-hidden">
                    <div className="mx-3.5 space-y-3 border-t border-sandal-200/70 pb-3.5 pt-3">
                      <div className="space-y-2 text-[13px] text-maroon-900/70">
                        {teacher && (
                          <p className="flex items-start gap-2">
                            <BookOpen size={15} className="mt-0.5 shrink-0 text-brand-600/80" />
                            <span className="min-w-0 break-words">
                              Guided by <span className="font-semibold text-maroon-900">{teacher}</span>
                            </span>
                          </p>
                        )}
                        {temple && (
                          <p className="flex items-start gap-2">
                            <MapPin size={15} className="mt-0.5 shrink-0 text-brand-600/80" />
                            <span className="min-w-0 break-words">
                              Connected to <span className="font-semibold text-maroon-900">{temple}</span>
                            </span>
                          </p>
                        )}
                        {!teacher && !temple && <p className="text-maroon-900/45">No details shared yet</p>}
                      </div>
                      {profile.bio && (
                        <p className="rounded-xl bg-sandal-50 px-3 py-2 text-[13px] italic leading-relaxed text-maroon-900/65 ring-1 ring-sandal-200/60">“{profile.bio}”</p>
                      )}
                      <div className="space-y-2">
                        {renderConnectionButton(profile)}
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedProfile(profile);
                            setShowProfileModal(true);
                          }}
                          className="flex h-10 w-full items-center justify-center rounded-full text-sm font-semibold text-maroon-800 transition-colors hover:bg-sandal-100"
                          style={{ minHeight: 0 }}
                        >
                          View full profile
                        </button>
                      </div>
                    </div>
                  </div>
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
          showStatus={connectionStatuses[selectedProfile.uid] === 'connected'}
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
