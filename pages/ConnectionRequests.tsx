import React, { useEffect, useState } from 'react';
import { PageLoader } from '../components/LoadingScreen';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  getPendingRequests, 
  getSentRequests, 
  acceptConnectionRequest, 
  rejectConnectionRequest,
  cancelConnectionRequest 
} from '../services/connections';
import { ConnectionRequest } from '../types/chat';
import { database } from '../services/firebase';
import { ref, get } from 'firebase/database';
import { UserCircle, CheckCircle, XCircle, Clock, ArrowLeft, Loader } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import Avatar from '../components/Avatar';

const ConnectionRequests: React.FC = () => {
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [pendingRequests, setPendingRequests] = useState<ConnectionRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<ConnectionRequest[]>([]);
  const [userDetails, setUserDetails] = useState<{ [key: string]: any }>({});
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUser?.uid) return;

    setLoading(true);

    // Listen to pending requests (incoming)
    const unsubscribePending = getPendingRequests(currentUser.uid, (requests) => {
      // Remove duplicates based on request ID
      const uniqueRequests = requests.filter((request, index, self) =>
        index === self.findIndex(r => r.id === request.id)
      );
      setPendingRequests(uniqueRequests);
      // Load user details for each request
      uniqueRequests.forEach(request => {
        loadUserDetails(request.fromUserId);
      });
    });

    // Listen to sent requests (outgoing)
    const unsubscribeSent = getSentRequests(currentUser.uid, (requests) => {
      // Remove duplicates based on request ID
      const uniqueRequests = requests.filter((request, index, self) =>
        index === self.findIndex(r => r.id === request.id)
      );
      setSentRequests(uniqueRequests);
      // Load user details for each request
      uniqueRequests.forEach(request => {
        loadUserDetails(request.toUserId);
      });
      setLoading(false);
    });

    return () => {
      unsubscribePending();
      unsubscribeSent();
    };
  }, [currentUser?.uid]);

  const loadUserDetails = async (userId: string) => {
    if (userDetails[userId]) return;

    try {
      const userProfileRef = ref(database, `userProfiles/${userId}`);
      const profileSnapshot = await get(userProfileRef);
      
      if (profileSnapshot.exists()) {
        setUserDetails(prev => ({
          ...prev,
          [userId]: profileSnapshot.val()
        }));
      } else {
        // Fallback to users collection
        const userRef = ref(database, `users/${userId}`);
        const snapshot = await get(userRef);
        if (snapshot.exists()) {
          const userData = snapshot.val();
          setUserDetails(prev => ({
            ...prev,
            [userId]: {
              userName: userData.settings?.userName || userData.displayName || 'Unknown User',
              photoURL: userData.photoURL || null,
              gender: userData.gender || userData.settings?.gender || null,
              isOnline: false
            }
          }));
        }
      }
    } catch (error) {
      console.error('Error loading user details:', error);
    }
  };

  const handleAccept = async (requestId: string) => {
    if (!currentUser?.uid) return;
    setProcessingId(requestId);

    try {
      await acceptConnectionRequest(requestId);
      showToast({ type: 'success', title: 'Connection request accepted! You can now chat with this devotee.' });
      
      // Requests will auto-update via the real-time listener
      // The accepted request will be filtered out automatically
    } catch (error) {
      console.error('Error accepting request:', error);
      showToast({ type: 'error', title: 'Failed to accept connection request. Please try again.' });
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (requestId: string) => {
    if (!currentUser?.uid) return;
    setProcessingId(requestId);

    try {
      await rejectConnectionRequest(requestId);
      showToast({ type: 'info', title: 'Connection request declined.' });
    } catch (error) {
      console.error('Error rejecting request:', error);
      showToast({ type: 'error', title: 'Failed to decline connection request. Please try again.' });
    } finally {
      setProcessingId(null);
    }
  };

  const handleCancel = async (requestId: string) => {
    setProcessingId(requestId);

    try {
      await cancelConnectionRequest(requestId);
      showToast({ type: 'info', title: 'Connection request cancelled.' });
    } catch (error) {
      console.error('Error cancelling request:', error);
      showToast({ type: 'error', title: 'Failed to cancel connection request. Please try again.' });
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) return <PageLoader label="Loading requests…" />;

  const when = (ts: number) =>
    new Date(ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

  const Section: React.FC<{ title: string; count: number; empty: string; children: React.ReactNode }> = ({ title, count, empty, children }) => (
    <section className="mt-6">
      <h2 className="mb-2.5 flex items-center gap-2 px-1 text-sm font-semibold text-maroon-900">
        {title}
        {count > 0 && <span className="rounded-full bg-brand-600 px-2 py-0.5 text-[11px] font-bold text-white">{count}</span>}
      </h2>
      {count === 0 ? (
        <div className="rounded-3xl bg-white px-6 py-9 text-center shadow-soft ring-1 ring-sandal-200">
          <UserCircle size={34} className="mx-auto text-sandal-400" />
          <p className="mt-2 text-sm text-maroon-900/55">{empty}</p>
        </div>
      ) : (
        <ul className="space-y-2.5">{children}</ul>
      )}
    </section>
  );

  return (
    <div className="mx-auto max-w-2xl">
      <button onClick={() => navigate('/community')} className="inline-flex items-center gap-1.5 text-sm font-medium text-maroon-900/60 transition hover:text-maroon-900" style={{ minHeight: 0 }}>
        <ArrowLeft size={16} /> Devotees
      </button>

      <Section title="Received" count={pendingRequests.length} empty="No requests waiting for you">
        {pendingRequests.map((request) => {
          const u = userDetails[request.fromUserId];
          const name = u?.userName || u?.displayName || 'Devotee';
          const busy = processingId === request.id;
          return (
            <li key={request.id} className="rounded-3xl bg-white p-4 shadow-soft ring-1 ring-sandal-200">
              <div className="flex items-start gap-3">
                <Avatar gender={u?.gender} name={name} className="h-11 w-11" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-semibold text-maroon-900">{name}</p>
                  <p className="text-xs text-maroon-900/45">{when(request.timestamp)}</p>
                  {request.message && <p className="mt-1.5 rounded-xl bg-sandal-50 px-3 py-2 text-sm text-maroon-900/70">{request.message}</p>}
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <button onClick={() => handleReject(request.id)} disabled={busy} className="btn-secondary flex-1 disabled:opacity-50">
                  <XCircle size={16} /> Decline
                </button>
                <button onClick={() => handleAccept(request.id)} disabled={busy} className="btn-primary flex-1 disabled:opacity-50">
                  {busy ? <Loader size={16} className="animate-spin" /> : <CheckCircle size={16} />} Accept
                </button>
              </div>
            </li>
          );
        })}
      </Section>

      <Section title="Sent" count={sentRequests.length} empty="You have not sent any requests">
        {sentRequests.map((request) => {
          const u = userDetails[request.toUserId];
          const name = u?.userName || u?.displayName || 'Devotee';
          const busy = processingId === request.id;
          return (
            <li key={request.id} className="flex items-center gap-3 rounded-3xl bg-white p-3.5 shadow-soft ring-1 ring-sandal-200">
              <Avatar gender={u?.gender} name={name} className="h-11 w-11" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-semibold text-maroon-900">{name}</p>
                <p className="flex items-center gap-1.5 text-xs text-maroon-900/45">
                  <Clock size={12} className="text-marigold-500" /> Waiting · {when(request.timestamp)}
                </p>
              </div>
              <button onClick={() => handleCancel(request.id)} disabled={busy} className="btn-secondary btn-sm shrink-0 disabled:opacity-50">
                {busy ? <Loader size={14} className="animate-spin" /> : 'Cancel'}
              </button>
            </li>
          );
        })}
      </Section>
    </div>
  );
};

export default ConnectionRequests;
