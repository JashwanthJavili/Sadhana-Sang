import React, { useEffect, useState } from 'react';
import { UserPlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getPendingRequests } from '../services/connections';

const ConnectionRequestsIcon: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (!user?.uid) return;

    // Subscribe to pending requests updates
    const unsubscribe = getPendingRequests(user.uid, (requests) => {
      setPendingCount(requests.length);
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user]);

  const handleClick = () => {
    navigate('/connection-requests');
  };

  // Don't render if no pending requests
  if (pendingCount === 0) {
    return null;
  }

  return (
    <button
      onClick={handleClick}
      className="header-icon-btn"
      aria-label="Connection requests"
      title="Connection Requests"
    >
      <UserPlus size={19} />
      {pendingCount > 0 && (
        <span className="absolute right-1.5 top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-brand-600 px-1 text-[9px] font-bold leading-none text-white ring-2 ring-sandal-50">
          {pendingCount > 9 ? '9+' : pendingCount}
        </span>
      )}
    </button>
  );
};

export default ConnectionRequestsIcon;
