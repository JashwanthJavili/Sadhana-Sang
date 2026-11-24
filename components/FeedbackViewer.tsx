import React, { useState, useEffect } from 'react';
import { PageLoader } from './LoadingScreen';
import { MessageCircle, Star, Search, Calendar, Mail, CheckCircle, Clock, AlertCircle, Download, X } from 'lucide-react';
import { ref, onValue, update } from 'firebase/database';
import { db } from '../services/firebase';
import SelectField from './SelectField';

interface Feedback {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  rating: number;
  category: string;
  message: string;
  timestamp: number;
  status: 'new' | 'reviewed' | 'resolved';
  language: string;
}

const FeedbackViewer: React.FC = () => {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [filteredFeedbacks, setFilteredFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [ratingFilter, setRatingFilter] = useState<string>('all');
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);

  useEffect(() => {
    // Listen to all users' feedback from users/{userId}/feedbacks path
    const usersRef = ref(db, 'users');
    const unsubscribe = onValue(usersRef, (snapshot) => {
      const usersData = snapshot.val();
      const feedbackList: Feedback[] = [];
      
      if (usersData) {
        // Iterate through all users
        Object.entries(usersData).forEach(([userId, userData]: [string, any]) => {
          if (userData.feedbacks) {
            // Iterate through each user's feedback
            Object.entries(userData.feedbacks).forEach(([feedbackId, feedback]: [string, any]) => {
              feedbackList.push({
                id: `${userId}_${feedbackId}`,
                userId,
                ...feedback,
              });
            });
          }
        });
        
        // Sort by timestamp (newest first)
        feedbackList.sort((a, b) => b.timestamp - a.timestamp);
        setFeedbacks(feedbackList);
        setFilteredFeedbacks(feedbackList);
      } else {
        setFeedbacks([]);
        setFilteredFeedbacks([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Apply filters
  useEffect(() => {
    let filtered = [...feedbacks];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(f => 
        f.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.userEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.message.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(f => f.status === statusFilter);
    }

    // Category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(f => f.category === categoryFilter);
    }

    // Rating filter
    if (ratingFilter !== 'all') {
      const rating = parseInt(ratingFilter);
      filtered = filtered.filter(f => f.rating === rating);
    }

    setFilteredFeedbacks(filtered);
  }, [feedbacks, searchTerm, statusFilter, categoryFilter, ratingFilter]);

  const updateFeedbackStatus = async (feedbackId: string, newStatus: 'new' | 'reviewed' | 'resolved') => {
    try {
      // feedbackId is in format: userId_feedbackKey
      const [userId, feedbackKey] = feedbackId.split('_');
      const feedbackRef = ref(db, `users/${userId}/feedbacks/${feedbackKey}`);
      await update(feedbackRef, { status: newStatus });
      console.log(`✅ Feedback ${feedbackId} marked as ${newStatus}`);
    } catch (error) {
      console.error('Error updating feedback status:', error);
    }
  };

  const exportFeedback = () => {
    const dataStr = JSON.stringify(filteredFeedbacks, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `feedback-export-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      feature: 'bg-brand-50 text-brand-700 ring-brand-200',
      bug: 'bg-red-50 text-red-700 ring-red-200',
      general: 'bg-sandal-100 text-maroon-900/70 ring-sandal-200',
      spiritual: 'bg-marigold-50 text-marigold-700 ring-marigold-200',
      usability: 'bg-marigold-50 text-marigold-700 ring-marigold-200',
      other: 'bg-sandal-100 text-maroon-900/70 ring-sandal-200',
    };
    return colors[category] || colors.other;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'new': return <AlertCircle className="w-4 h-4 text-brand-600" />;
      case 'reviewed': return <Clock className="w-4 h-4 text-marigold-600" />;
      case 'resolved': return <CheckCircle className="w-4 h-4 text-green-600" />;
      default: return null;
    }
  };

  const stats = {
    total: feedbacks.length,
    new: feedbacks.filter(f => f.status === 'new').length,
    reviewed: feedbacks.filter(f => f.status === 'reviewed').length,
    resolved: feedbacks.filter(f => f.status === 'resolved').length,
    avgRating: feedbacks.length > 0
      ? (feedbacks.reduce((sum, f) => sum + f.rating, 0) / feedbacks.length).toFixed(1)
      : '0.0',
  };

  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

  const renderStars = (rating: number, size: string) => (
    <div className="flex items-center gap-0.5">
      {[...Array(5)].map((_, i) => (
        <Star
          key={i}
          className={`${size} ${i < rating ? 'text-marigold-500 fill-marigold-500' : 'text-sandal-300'}`}
        />
      ))}
    </div>
  );

  if (loading) return <PageLoader label="Loading feedback…" />;

  const statTiles = [
    { label: 'Total', value: stats.total },
    { label: 'New', value: stats.new },
    { label: 'Reviewed', value: stats.reviewed },
    { label: 'Resolved', value: stats.resolved },
  ];

  return (
    <div className="space-y-4 min-w-0">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {statTiles.map(t => (
          <div key={t.label} className="rounded-2xl border border-sandal-200 bg-white p-4 shadow-soft">
            <p className="text-xs text-maroon-900/50">{t.label}</p>
            <p className="text-xl font-semibold text-maroon-900">{t.value}</p>
          </div>
        ))}
        <div className="col-span-2 sm:col-span-1 rounded-2xl border border-sandal-200 bg-white p-4 shadow-soft">
          <p className="text-xs text-maroon-900/50">Avg rating</p>
          <p className="text-xl font-semibold text-maroon-900">{stats.avgRating} ★</p>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-sandal-200 bg-white p-4 shadow-soft">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="sm:col-span-2 min-w-0">
            <label className="block text-xs text-maroon-900/50 mb-1.5">
              <Search className="inline w-3.5 h-3.5 mr-1" /> Search
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, email, message..."
              className="w-full h-11 px-3 rounded-xl border border-sandal-200 outline-none focus:ring-2 focus:ring-marigold-400/40"
            />
          </div>

          <SelectField
            label="Status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="new">New</option>
            <option value="reviewed">Reviewed</option>
            <option value="resolved">Resolved</option>
          </SelectField>

          <SelectField
            label="Category"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="all">All Categories</option>
            <option value="feature">Feature Request</option>
            <option value="bug">Bug Report</option>
            <option value="general">General</option>
            <option value="spiritual">Spiritual</option>
            <option value="usability">Usability</option>
            <option value="other">Other</option>
          </SelectField>

          <SelectField
            label="Rating"
            value={ratingFilter}
            onChange={(e) => setRatingFilter(e.target.value)}
          >
            <option value="all">All Ratings</option>
            <option value="5">⭐⭐⭐⭐⭐ (5)</option>
            <option value="4">⭐⭐⭐⭐ (4)</option>
            <option value="3">⭐⭐⭐ (3)</option>
            <option value="2">⭐⭐ (2)</option>
            <option value="1">⭐ (1)</option>
          </SelectField>
        </div>

        <div className="mt-3 flex flex-wrap justify-between items-center gap-2">
          <p className="text-xs text-maroon-900/50">
            Showing <span className="font-semibold text-maroon-900">{filteredFeedbacks.length}</span> of {feedbacks.length} feedback items
          </p>
          <button
            onClick={exportFeedback}
            style={{ minHeight: 0 }}
            className="h-10 px-4 inline-flex items-center gap-2 rounded-xl bg-brand-600 text-white text-sm font-semibold"
          >
            <Download className="w-4 h-4" />
            Export JSON
          </button>
        </div>
      </div>

      {/* Feedback List */}
      {filteredFeedbacks.length === 0 ? (
        <div className="rounded-2xl border border-sandal-200 bg-white p-8 shadow-soft text-center">
          <MessageCircle className="w-10 h-10 text-sandal-300 mx-auto mb-3" />
          <p className="text-base font-semibold text-maroon-900">No feedback found</p>
          <p className="text-xs text-maroon-900/50 mt-1">Try adjusting your filters</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {filteredFeedbacks.map((feedback) => (
            <div
              key={feedback.id}
              className="min-w-0 rounded-2xl border border-sandal-200 bg-white p-4 shadow-soft hover:border-marigold-300 transition-colors cursor-pointer space-y-2.5"
              onClick={() => setSelectedFeedback(feedback)}
            >
              <div className="min-w-0">
                <p className="font-semibold text-maroon-900 truncate">{feedback.userName}</p>
                <p className="text-xs text-maroon-900/50 truncate flex items-center gap-1">
                  <Mail className="w-3 h-3 shrink-0" />
                  <span className="truncate">{feedback.userEmail}</span>
                </p>
                <p className="text-xs text-maroon-900/50 truncate flex items-center gap-1">
                  <Calendar className="w-3 h-3 shrink-0" />
                  <span className="truncate">{new Date(feedback.timestamp).toLocaleString()}</span>
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {renderStars(feedback.rating, 'w-4 h-4')}
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ring-1 ${getCategoryColor(feedback.category)}`}>
                  {cap(feedback.category)}
                </span>
                <span className="flex items-center gap-1">
                  {getStatusIcon(feedback.status)}
                  <span className="text-xs font-semibold capitalize text-maroon-900/70">{feedback.status}</span>
                </span>
              </div>

              {feedback.message && (
                <p className="text-sm text-maroon-900/80 line-clamp-2 break-words">
                  {feedback.message}
                </p>
              )}

              {(feedback.status === 'new' || feedback.status === 'reviewed') && (
                <div className="pt-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      updateFeedbackStatus(feedback.id, feedback.status === 'new' ? 'reviewed' : 'resolved');
                    }}
                    style={{ minHeight: 0 }}
                    className="h-10 px-4 rounded-xl bg-brand-600 text-white text-sm font-semibold"
                  >
                    {feedback.status === 'new' ? 'Mark Reviewed' : 'Mark Resolved'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Detailed Feedback Modal */}
      {selectedFeedback && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-[100000] sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-soft w-full sm:max-w-lg max-h-[90dvh] overflow-y-auto">
            <div className="flex justify-between items-center gap-3 p-4 border-b border-sandal-200">
              <h3 className="text-base font-semibold text-maroon-900">Feedback Details</h3>
              <button
                onClick={() => setSelectedFeedback(null)}
                style={{ minHeight: 0 }}
                className="h-9 w-9 shrink-0 inline-flex items-center justify-center rounded-xl hover:bg-sandal-100"
                aria-label="Close"
              >
                <X className="w-5 h-5 text-maroon-900/70" />
              </button>
            </div>

            <div className="p-4 space-y-4 min-w-0">
              <div className="rounded-2xl border border-sandal-200 p-4 space-y-1 min-w-0">
                <p className="font-semibold text-maroon-900 truncate">{selectedFeedback.userName}</p>
                <p className="text-xs text-maroon-900/50 break-all">{selectedFeedback.userEmail}</p>
                <p className="text-xs text-maroon-900/50">{new Date(selectedFeedback.timestamp).toLocaleString()}</p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {renderStars(selectedFeedback.rating, 'w-6 h-6')}
                <span className="text-sm font-semibold text-maroon-900">{selectedFeedback.rating}/5</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-maroon-900/50 mb-1">Category</p>
                  <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ring-1 ${getCategoryColor(selectedFeedback.category)}`}>
                    {cap(selectedFeedback.category)}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-maroon-900/50 mb-1">Status</p>
                  <div className="flex items-center gap-1.5">
                    {getStatusIcon(selectedFeedback.status)}
                    <span className="text-sm font-semibold capitalize text-maroon-900">{selectedFeedback.status}</span>
                  </div>
                </div>
              </div>

              {selectedFeedback.message && (
                <div>
                  <p className="text-xs text-maroon-900/50 mb-1">Message</p>
                  <div className="bg-sandal-50 rounded-xl p-3">
                    <p className="text-sm text-maroon-900 whitespace-pre-wrap break-words">
                      {selectedFeedback.message}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex flex-col-reverse sm:flex-row gap-2 pt-3 border-t border-sandal-200">
                <button
                  onClick={() => setSelectedFeedback(null)}
                  style={{ minHeight: 0 }}
                  className="h-10 px-4 rounded-xl bg-white ring-1 ring-sandal-200 text-maroon-900/70 text-sm font-semibold"
                >
                  Close
                </button>
                {selectedFeedback.status === 'new' && (
                  <button
                    onClick={() => {
                      updateFeedbackStatus(selectedFeedback.id, 'reviewed');
                      setSelectedFeedback(null);
                    }}
                    style={{ minHeight: 0 }}
                    className="h-10 px-4 sm:flex-1 rounded-xl bg-brand-600 text-white text-sm font-semibold"
                  >
                    Mark as Reviewed
                  </button>
                )}
                {selectedFeedback.status === 'reviewed' && (
                  <button
                    onClick={() => {
                      updateFeedbackStatus(selectedFeedback.id, 'resolved');
                      setSelectedFeedback(null);
                    }}
                    style={{ minHeight: 0 }}
                    className="h-10 px-4 sm:flex-1 rounded-xl bg-brand-600 text-white text-sm font-semibold"
                  >
                    Mark as Resolved
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FeedbackViewer;
