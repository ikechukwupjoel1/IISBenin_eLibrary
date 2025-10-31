import { useEffect, useState } from 'react';
import { FileText, CheckCircle, XCircle, RefreshCw, Star, Calendar, User } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { LoadingSkeleton } from './ui/LoadingSkeleton';

type BookReport = {
  id: string;
  borrow_record_id: string;
  book_id: string;
  user_id: string;
  title: string;
  summary: string;
  favorite_part: string;
  main_characters: string;
  lessons_learned: string;
  rating: number;
  completion_percentage: number;
  status: 'pending' | 'approved' | 'rejected' | 'revision_needed';
  quality_score: number | null;
  points_awarded: number;
  librarian_feedback: string | null;
  created_at: string;
  user_profiles: {
    full_name: string;
    role: string;
  };
  books: {
    title: string;
    author_publisher: string;
    category: string;
  };
};

export function BookReportReview() {
  const { profile } = useAuth();
  const [reports, setReports] = useState<BookReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<BookReport | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const [reviewData, setReviewData] = useState({
    quality_score: 80,
    feedback: '',
    action: 'approve' as 'approve' | 'reject' | 'revision'
  });

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('book_reports')
        .select(`
          *,
          user_profiles!book_reports_user_id_fkey (
            full_name,
            role
          ),
          books (
            title,
            author_publisher,
            category
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReports(data || []);
    } catch (error) {
      console.error('Error loading reports:', error);
      toast.error('Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async () => {
    if (!selectedReport) return;

    if (reviewData.action === 'approve' && !reviewData.quality_score) {
      toast.error('Please assign a quality score');
      return;
    }

    setReviewing(true);
    try {
      let updates: {
        reviewed_by: string | undefined;
        reviewed_at: string;
        librarian_feedback: string | null;
        status?: string;
        quality_score?: number;
        points_awarded?: number;
      } = {
        reviewed_by: profile?.id,
        reviewed_at: new Date().toISOString(),
        librarian_feedback: reviewData.feedback || null
      };

      if (reviewData.action === 'approve') {
        // Calculate points based on quality and completion
        const basePoints = 10;
        const qualityBonus = Math.floor(reviewData.quality_score / 10);
        let completionBonus = 0;
        if (selectedReport.completion_percentage === 100) completionBonus = 5;
        else if (selectedReport.completion_percentage >= 80) completionBonus = 3;
        else if (selectedReport.completion_percentage >= 50) completionBonus = 1;

        const totalPoints = basePoints + qualityBonus + completionBonus;

        updates = {
          ...updates,
          status: 'approved',
          quality_score: reviewData.quality_score,
          points_awarded: totalPoints
        };
      } else if (reviewData.action === 'revision') {
        updates.status = 'revision_needed';
      } else {
        updates.status = 'rejected';
      }

      const { error } = await supabase
        .from('book_reports')
        .update(updates)
        .eq('id', selectedReport.id);

      if (error) throw error;

      toast.success(`Report ${updates.status}`);
      setSelectedReport(null);
      setReviewData({ quality_score: 80, feedback: '', action: 'approve' });
      loadReports();
    } catch (error) {
      console.error('Error reviewing report:', error);
      toast.error('Failed to submit review');
    } finally {
      setReviewing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
      approved: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
      rejected: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
      revision_needed: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400'
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles]}`}>
        {status.replace('_', ' ').toUpperCase()}
      </span>
    );
  };

  const wordCount = (text: string) => text.trim().split(/\s+/).filter(w => w.length > 0).length;

  if (loading) {
    return <LoadingSkeleton type="list" />;
  }

  const pendingReports = reports.filter(r => r.status === 'pending');
  const reviewedReports = reports.filter(r => r.status !== 'pending');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Book Report Reviews</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {pendingReports.length} pending report{pendingReports.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={loadReports}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Pending Reports */}
      {pendingReports.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Pending Reviews
          </h3>
          <div className="grid gap-4">
            {pendingReports.map((report) => (
              <div
                key={report.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:border-indigo-500 dark:hover:border-indigo-400 cursor-pointer transition-colors"
                onClick={() => setSelectedReport(report)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <FileText className="w-5 h-5 text-indigo-600" />
                      <h4 className="font-semibold text-gray-900 dark:text-white">
                        {report.books.title}
                      </h4>
                      {getStatusBadge(report.status)}
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 dark:text-gray-400">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        {report.user_profiles.full_name}
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        {new Date(report.created_at).toLocaleDateString()}
                      </div>
                      <div className="flex items-center gap-2">
                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        {report.rating}/5
                      </div>
                      <div>
                        Completion: {report.completion_percentage}%
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 line-clamp-2">
                      {report.summary.substring(0, 150)}...
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reviewed Reports */}
      {reviewedReports.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Reviewed Reports
          </h3>
          <div className="grid gap-4">
            {reviewedReports.map((report) => (
              <div
                key={report.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <FileText className="w-5 h-5 text-gray-400" />
                      <h4 className="font-semibold text-gray-900 dark:text-white">
                        {report.books.title}
                      </h4>
                      {getStatusBadge(report.status)}
                      {report.status === 'approved' && (
                        <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400">
                          +{report.points_awarded} points
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {report.user_profiles.full_name} • {new Date(report.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {reports.length === 0 && (
        <div className="text-center py-12">
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">No reports submitted yet</p>
        </div>
      )}

      {/* Review Modal */}
      {selectedReport && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full my-8 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 z-10">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                    Review Book Report
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {selectedReport.books.title} by {selectedReport.user_profiles.full_name}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedReport(null)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Report Content */}
            <div className="p-6 space-y-6">
              {/* Meta Info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Student</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {selectedReport.user_profiles.full_name}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Rating</p>
                  <div className="flex items-center gap-1">
                    {[...Array(selectedReport.rating)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Completion</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {selectedReport.completion_percentage}%
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Submitted</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {new Date(selectedReport.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Summary */}
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                  Summary ({wordCount(selectedReport.summary)} words)
                </h4>
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {selectedReport.summary}
                </p>
              </div>

              {/* Favorite Part */}
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                  Favorite Part
                </h4>
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {selectedReport.favorite_part}
                </p>
              </div>

              {/* Main Characters */}
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                  Main Characters
                </h4>
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {selectedReport.main_characters}
                </p>
              </div>

              {/* Lessons Learned */}
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                  Lessons Learned
                </h4>
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {selectedReport.lessons_learned}
                </p>
              </div>

              {/* Review Form */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-6 space-y-4">
                <h4 className="font-semibold text-gray-900 dark:text-white">Your Review</h4>

                {/* Action */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Decision
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        checked={reviewData.action === 'approve'}
                        onChange={() => setReviewData({ ...reviewData, action: 'approve' })}
                        className="w-4 h-4 text-indigo-600"
                      />
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="text-sm text-gray-700 dark:text-gray-300">Approve</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        checked={reviewData.action === 'revision'}
                        onChange={() => setReviewData({ ...reviewData, action: 'revision' })}
                        className="w-4 h-4 text-indigo-600"
                      />
                      <RefreshCw className="w-4 h-4 text-orange-600" />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        Request Revision
                      </span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        checked={reviewData.action === 'reject'}
                        onChange={() => setReviewData({ ...reviewData, action: 'reject' })}
                        className="w-4 h-4 text-indigo-600"
                      />
                      <XCircle className="w-4 h-4 text-red-600" />
                      <span className="text-sm text-gray-700 dark:text-gray-300">Reject</span>
                    </label>
                  </div>
                </div>

                {/* Quality Score */}
                {reviewData.action === 'approve' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Quality Score (0-100%)
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      value={reviewData.quality_score}
                      onChange={(e) =>
                        setReviewData({ ...reviewData, quality_score: parseInt(e.target.value) })
                      }
                      className="w-full"
                    />
                    <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mt-1">
                      <span>Poor (0%)</span>
                      <span className="font-medium text-indigo-600">
                        {reviewData.quality_score}%
                      </span>
                      <span>Excellent (100%)</span>
                    </div>
                    <div className="mt-2 p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                      <p className="text-sm text-indigo-900 dark:text-indigo-200">
                        <strong>Estimated Points:</strong>{' '}
                        {10 + Math.floor(reviewData.quality_score / 10) + 
                          (selectedReport.completion_percentage === 100 ? 5 :
                           selectedReport.completion_percentage >= 80 ? 3 :
                           selectedReport.completion_percentage >= 50 ? 1 : 0)} points
                      </p>
                    </div>
                  </div>
                )}

                {/* Feedback */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Feedback {reviewData.action === 'revision' && <span className="text-red-500">*</span>}
                  </label>
                  <textarea
                    value={reviewData.feedback}
                    onChange={(e) => setReviewData({ ...reviewData, feedback: e.target.value })}
                    placeholder={
                      reviewData.action === 'approve'
                        ? 'Great work! Your analysis was insightful...'
                        : reviewData.action === 'revision'
                        ? 'Please add more details about...'
                        : 'This report needs improvement because...'
                    }
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>

                {/* Buttons */}
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => setSelectedReport(null)}
                    className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleReview}
                    disabled={reviewing}
                    className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {reviewing ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      'Submit Review'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
