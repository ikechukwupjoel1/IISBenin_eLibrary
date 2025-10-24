import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Shield, ThumbsUp, Flag, CheckCircle, XCircle, Eye, Star, AlertTriangle, Search } from 'lucide-react';

interface Review {
  id: string;
  book_id: string;
  user_id: string;
  rating: number;
  review_text: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  moderated_at?: string;
  moderated_by?: string;
  book_title: string;
  user_name: string;
  likes_count: number;
  reports_count: number;
  flagged: boolean;
}

interface ModerationStats {
  total_reviews: number;
  pending_reviews: number;
  approved_reviews: number;
  rejected_reviews: number;
  reported_reviews: number;
  avg_rating: number;
}

export default function ReviewModeration({ userId, userRole }: { userId: string; userRole: string }) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<ModerationStats>({
    total_reviews: 0,
    pending_reviews: 0,
    approved_reviews: 0,
    rejected_reviews: 0,
    reported_reviews: 0,
    avg_rating: 0,
  });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'reported'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const isLibrarian = userRole === 'librarian' || userRole === 'admin';

  useEffect(() => {
    fetchReviews();
    fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const fetchReviews = async () => {
    try {
      setLoading(true);

      let query = supabase
        .from('reviews')
        .select(`
          *,
          books(title),
          user_profiles!reviews_user_id_fkey(full_name),
          review_likes(count),
          review_reports(count)
        `)
        .order('created_at', { ascending: false });

      if (filter !== 'all' && filter !== 'reported') {
        query = query.eq('status', filter);
      }

      const { data: reviewsData, error: reviewsError } = await query;

      console.log('Review Moderation - Raw data:', reviewsData);
      console.log('Review Moderation - Error:', reviewsError);
      console.log('Review Moderation - Filter:', filter);

      if (reviewsError) throw reviewsError;

      let formattedReviews = (reviewsData || []).map(r => ({
        ...r,
        book_title: r.books?.title || 'Unknown Book',
        user_name: r.user_profiles?.full_name || 'Anonymous',
        likes_count: r.review_likes?.[0]?.count || 0,
        reports_count: r.review_reports?.[0]?.count || 0,
        flagged: (r.review_reports?.[0]?.count || 0) >= 3,
      }));

      if (filter === 'reported') {
        formattedReviews = formattedReviews.filter(r => r.reports_count > 0);
      }

      console.log('Review Moderation - Formatted reviews:', formattedReviews);
      console.log('Review Moderation - Count:', formattedReviews.length);

      setReviews(formattedReviews);
    } catch (error) {
      console.error('Error fetching reviews:', error);
      alert('Error loading reviews: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const { data: allReviews, error } = await supabase
        .from('reviews')
        .select(`
          status,
          rating,
          review_reports(count)
        `);

      if (error) throw error;

      const stats: ModerationStats = {
        total_reviews: allReviews?.length || 0,
        pending_reviews: allReviews?.filter(r => r.status === 'pending').length || 0,
        approved_reviews: allReviews?.filter(r => r.status === 'approved').length || 0,
        rejected_reviews: allReviews?.filter(r => r.status === 'rejected').length || 0,
        reported_reviews: allReviews?.filter(r => (r.review_reports?.[0]?.count || 0) > 0).length || 0,
        avg_rating: allReviews && allReviews.length > 0
          ? allReviews.reduce((sum, r) => sum + (r.rating || 0), 0) / allReviews.length
          : 0,
      };

      setStats(stats);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const moderateReview = async (reviewId: string, action: 'approve' | 'reject') => {
    if (!isLibrarian) return;

    try {
      const { error } = await supabase
        .from('reviews')
        .update({
          status: action === 'approve' ? 'approved' : 'rejected',
          moderated_at: new Date().toISOString(),
          moderated_by: userId,
        })
        .eq('id', reviewId);

      if (error) throw error;

      fetchReviews();
      fetchStats();
      setShowDetailModal(false);
      alert(`Review ${action}d successfully!`);
    } catch (error) {
      console.error('Error moderating review:', error);
      alert('Failed to moderate review');
    }
  };

  const deleteReview = async (reviewId: string) => {
    if (!isLibrarian) return;
    if (!confirm('Are you sure you want to delete this review? This action cannot be undone.')) return;

    try {
      const { error } = await supabase
        .from('reviews')
        .delete()
        .eq('id', reviewId);

      if (error) throw error;

      fetchReviews();
      fetchStats();
      setShowDetailModal(false);
      alert('Review deleted successfully');
    } catch (error) {
      console.error('Error deleting review:', error);
      alert('Failed to delete review');
    }
  };

  const filteredReviews = reviews.filter(review => {
    const matchesSearch = 
      review.book_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      review.user_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      review.review_text.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesSearch;
  });

  if (!isLibrarian) {
    return (
      <div className="text-center py-12">
        <Shield className="w-16 h-16 mx-auto mb-4 text-gray-400" />
        <p className="text-gray-600">This feature is only available to librarians</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2">Review Moderation</h2>
            <p className="text-indigo-100">Manage and moderate user reviews for quality control</p>
          </div>
          <Shield className="w-16 h-16 opacity-80" />
        </div>
      </div>

      {/* Stats Dashboard */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between mb-2">
            <Eye className="w-6 h-6 text-gray-600" />
            <span className="text-2xl font-bold text-gray-900">{stats.total_reviews}</span>
          </div>
          <p className="text-xs text-gray-600">Total Reviews</p>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between mb-2">
            <AlertTriangle className="w-6 h-6 text-yellow-600" />
            <span className="text-2xl font-bold text-gray-900">{stats.pending_reviews}</span>
          </div>
          <p className="text-xs text-gray-600">Pending</p>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between mb-2">
            <CheckCircle className="w-6 h-6 text-green-600" />
            <span className="text-2xl font-bold text-gray-900">{stats.approved_reviews}</span>
          </div>
          <p className="text-xs text-gray-600">Approved</p>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between mb-2">
            <XCircle className="w-6 h-6 text-red-600" />
            <span className="text-2xl font-bold text-gray-900">{stats.rejected_reviews}</span>
          </div>
          <p className="text-xs text-gray-600">Rejected</p>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between mb-2">
            <Flag className="w-6 h-6 text-orange-600" />
            <span className="text-2xl font-bold text-gray-900">{stats.reported_reviews}</span>
          </div>
          <p className="text-xs text-gray-600">Reported</p>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between mb-2">
            <Star className="w-6 h-6 text-yellow-500" />
            <span className="text-2xl font-bold text-gray-900">{stats.avg_rating.toFixed(1)}</span>
          </div>
          <p className="text-xs text-gray-600">Avg Rating</p>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex flex-wrap gap-2">
            {['all', 'pending', 'approved', 'rejected', 'reported'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f as typeof filter)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors capitalize ${
                  filter === f
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search reviews..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Reviews List */}
      <div className="space-y-3">
        {filteredReviews.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <Eye className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600">No reviews found</p>
          </div>
        ) : (
          filteredReviews.map((review) => (
            <div
              key={review.id}
              className={`bg-white rounded-lg shadow p-6 border-l-4 ${
                review.flagged
                  ? 'border-red-500'
                  : review.status === 'pending'
                  ? 'border-yellow-500'
                  : review.status === 'approved'
                  ? 'border-green-500'
                  : 'border-gray-300'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="font-semibold text-gray-900">{review.book_title}</h4>
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-4 h-4 ${
                            i < review.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                    <span
                      className={`px-2 py-1 rounded text-xs font-semibold ${
                        review.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-700'
                          : review.status === 'approved'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {review.status}
                    </span>
                  </div>

                  <p className="text-sm text-gray-600 mb-2">By: {review.user_name}</p>
                  <p className="text-gray-700 mb-3 line-clamp-2">{review.review_text}</p>

                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <ThumbsUp className="w-4 h-4" />
                      {review.likes_count} likes
                    </div>
                    {review.reports_count > 0 && (
                      <div className="flex items-center gap-1 text-red-600 font-semibold">
                        <Flag className="w-4 h-4" />
                        {review.reports_count} reports
                      </div>
                    )}
                    <span>{new Date(review.created_at).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="flex flex-col gap-2 ml-4">
                  <button
                    onClick={() => {
                      setSelectedReview(review);
                      setShowDetailModal(true);
                    }}
                    className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium"
                  >
                    View Details
                  </button>
                  {review.status === 'pending' && (
                    <>
                      <button
                        onClick={() => moderateReview(review.id, 'approve')}
                        className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium flex items-center gap-1"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Approve
                      </button>
                      <button
                        onClick={() => moderateReview(review.id, 'reject')}
                        className="px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium flex items-center gap-1"
                      >
                        <XCircle className="w-4 h-4" />
                        Reject
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedReview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-xl max-w-2xl w-full my-4 sm:my-8 shadow-2xl max-h-[95vh] sm:max-h-[90vh] flex flex-col">
            {/* Fixed Header */}
            <div className="flex items-center justify-between p-4 sm:p-6 pb-3 border-b border-gray-200 flex-shrink-0">
              <h3 className="text-lg sm:text-xl font-bold text-gray-900">Review Details</h3>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100 min-w-[44px] min-h-[44px] flex items-center justify-center"
              >
                <XCircle className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="overflow-y-auto flex-1 px-4 sm:px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Book</label>
                <p className="text-gray-900 font-semibold">{selectedReview.book_title}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reviewer</label>
                <p className="text-gray-900">{selectedReview.user_name}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rating</label>
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-5 h-5 ${
                        i < selectedReview.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
                      }`}
                    />
                  ))}
                  <span className="ml-2 text-gray-600">({selectedReview.rating}/5)</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Review Text</label>
                <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">{selectedReview.review_text}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <span
                    className={`inline-block px-3 py-1 rounded text-sm font-semibold ${
                      selectedReview.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-700'
                        : selectedReview.status === 'approved'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {selectedReview.status}
                  </span>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Created</label>
                  <p className="text-gray-900 text-sm">{new Date(selectedReview.created_at).toLocaleString()}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Likes</label>
                  <div className="flex items-center gap-2">
                    <ThumbsUp className="w-5 h-5 text-blue-600" />
                    <span className="text-gray-900 font-semibold">{selectedReview.likes_count}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reports</label>
                  <div className="flex items-center gap-2">
                    <Flag className={`w-5 h-5 ${selectedReview.reports_count > 0 ? 'text-red-600' : 'text-gray-400'}`} />
                    <span className={`font-semibold ${selectedReview.reports_count > 0 ? 'text-red-600' : 'text-gray-900'}`}>
                      {selectedReview.reports_count}
                    </span>
                  </div>
                </div>
              </div>

              {selectedReview.reports_count >= 3 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
                  <p className="text-sm text-red-900 font-semibold">
                    This review has been flagged multiple times and requires immediate attention
                  </p>
                </div>
              )}
            </div>

            {/* Fixed Footer */}
            <div className="flex flex-col sm:flex-row gap-3 p-4 sm:p-6 pt-3 border-t border-gray-200 flex-shrink-0 bg-gray-50">
              {selectedReview.status === 'pending' && (
                <>
                  <button
                    onClick={() => moderateReview(selectedReview.id, 'approve')}
                    className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-2 min-h-[44px] font-medium"
                  >
                    <CheckCircle className="w-5 h-5" />
                    Approve
                  </button>
                  <button
                    onClick={() => moderateReview(selectedReview.id, 'reject')}
                    className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center justify-center gap-2 min-h-[44px] font-medium"
                  >
                    <XCircle className="w-5 h-5" />
                    Reject
                  </button>
                </>
              )}
              <button
                onClick={() => deleteReview(selectedReview.id)}
                className="px-4 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-800 min-h-[44px] font-medium"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex gap-3">
          <Shield className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-900">
            <p className="font-semibold mb-1">Moderation Guidelines</p>
            <ul className="list-disc list-inside space-y-1 text-blue-800">
              <li>Reviews with 3+ reports are automatically flagged for review</li>
              <li>Approve reviews that are constructive and appropriate</li>
              <li>Reject reviews containing hate speech, spam, or irrelevant content</li>
              <li>Pending reviews won't appear publicly until approved</li>
              <li>Delete reviews that violate community guidelines severely</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

// Component for users to like reviews
export const ReviewLikeButton = ({ reviewId, userId }: { reviewId: string; userId: string }) => {
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkLikeStatus();
    fetchLikesCount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reviewId, userId]);

  const checkLikeStatus = async () => {
    try {
      const { data } = await supabase
        .from('review_likes')
        .select('id')
        .eq('review_id', reviewId)
        .eq('user_id', userId)
        .single();

      setLiked(!!data);
    } catch {
      // Not liked
    }
  };

  const fetchLikesCount = async () => {
    try {
      const { count } = await supabase
        .from('review_likes')
        .select('*', { count: 'exact', head: true })
        .eq('review_id', reviewId);

      setLikesCount(count || 0);
    } catch (error) {
      console.error('Error fetching likes count:', error);
    }
  };

  const toggleLike = async () => {
    if (loading) return;
    setLoading(true);

    try {
      if (liked) {
        const { error } = await supabase
          .from('review_likes')
          .delete()
          .eq('review_id', reviewId)
          .eq('user_id', userId);

        if (error) throw error;
        setLiked(false);
        setLikesCount(prev => prev - 1);
      } else {
        const { error } = await supabase
          .from('review_likes')
          .insert([{ review_id: reviewId, user_id: userId }]);

        if (error) throw error;
        setLiked(true);
        setLikesCount(prev => prev + 1);
      }
    } catch (error) {
      console.error('Error toggling like:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={toggleLike}
      disabled={loading}
      className={`flex items-center gap-1 text-sm font-medium transition-colors ${
        liked ? 'text-blue-600' : 'text-gray-500 hover:text-blue-600'
      }`}
    >
      <ThumbsUp className={`w-4 h-4 ${liked ? 'fill-current' : ''}`} />
      {likesCount}
    </button>
  );
};

// Component for users to report reviews
export const ReportReviewButton = ({ reviewId, userId }: { reviewId: string; userId: string }) => {
  const [reported, setReported] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reason, setReason] = useState('');

  useEffect(() => {
    checkReportStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reviewId, userId]);

  const checkReportStatus = async () => {
    try {
      const { data } = await supabase
        .from('review_reports')
        .select('id')
        .eq('review_id', reviewId)
        .eq('user_id', userId)
        .single();

      setReported(!!data);
    } catch {
      // Not reported
    }
  };

  const submitReport = async () => {
    if (!reason.trim()) {
      alert('Please provide a reason for reporting');
      return;
    }

    try {
      const { error } = await supabase
        .from('review_reports')
        .insert([{
          review_id: reviewId,
          user_id: userId,
          reason: reason,
        }]);

      if (error) throw error;

      setReported(true);
      setShowReportModal(false);
      alert('Report submitted. Thank you for helping maintain quality.');
    } catch (error) {
      console.error('Error reporting review:', error);
      alert('Failed to submit report');
    }
  };

  if (reported) {
    return (
      <span className="text-xs text-gray-500 flex items-center gap-1">
        <Flag className="w-3 h-3" />
        Reported
      </span>
    );
  }

  return (
    <>
      <button
        onClick={() => setShowReportModal(true)}
        className="text-xs text-gray-500 hover:text-red-600 flex items-center gap-1"
      >
        <Flag className="w-3 h-3" />
        Report
      </button>

      {showReportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Report Review</h3>
            <p className="text-sm text-gray-600 mb-4">
              Please tell us why you're reporting this review
            </p>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Reason for reporting..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
              rows={4}
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setShowReportModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={submitReport}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Submit Report
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
