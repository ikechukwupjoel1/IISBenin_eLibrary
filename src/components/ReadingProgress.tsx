import { useEffect, useState } from 'react';
import { BookOpen, Calendar, Clock, TrendingUp, Save, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { LoadingSkeleton } from './ui/LoadingSkeleton';

type BorrowedBook = {
  id: string;
  book_id: string;
  due_date: string;
  books: {
    title: string;
    author_publisher: string;
  } | null;
};

type ProgressSession = {
  id: string;
  borrow_record_id: string;
  current_page: number;
  total_pages: number | null;
  percentage_complete: number;
  session_date: string;
  pages_read_today: number;
  time_spent_minutes: number;
  book_title?: string;
};

export function ReadingProgress() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeBorrows, setActiveBorrows] = useState<BorrowedBook[]>([]);
  const [progressSessions, setProgressSessions] = useState<ProgressSession[]>([]);
  const [selectedBorrow, setSelectedBorrow] = useState<string | null>(null);
  const [showUpdateForm, setShowUpdateForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    current_page: 0,
    pages_read_today: 0,
    time_spent_minutes: 0,
  });

  useEffect(() => {
    loadData();
  }, [profile]);

  const loadData = async () => {
    if (!profile) return;

    setLoading(true);
    try {
      // Load active borrows for this user
      const borrowQuery = supabase
        .from('borrow_records')
        .select(`
          id,
          book_id,
          due_date,
          books (title, author_publisher)
        `)
        .eq('status', 'active');

      if (profile.role === 'student') {
        borrowQuery.eq('student_id', profile.student_id);
      } else if (profile.role === 'staff') {
        borrowQuery.eq('staff_id', profile.staff_id);
      }

      const { data: borrowsData, error: borrowsError } = await borrowQuery;

      if (borrowsError) throw borrowsError;
      
      // Type assertion to handle Supabase join result
      const typedBorrows = (borrowsData || []).map(borrow => ({
        ...borrow,
        books: Array.isArray(borrow.books) ? borrow.books[0] : borrow.books
      })) as BorrowedBook[];
      
      setActiveBorrows(typedBorrows);

      // Load recent progress sessions
      const { data: progressData, error: progressError } = await supabase
        .from('reading_progress')
        .select('*')
        .eq('user_id', profile.id)
        .order('session_date', { ascending: false })
        .limit(20);

      if (progressError) throw progressError;

      // Enrich with book titles
      const enrichedProgress = (progressData || []).map((session) => {
        const borrow = (borrowsData || []).find((b) => b.id === session.borrow_record_id);
        return {
          ...session,
          book_title: borrow?.books?.title || 'Unknown Book',
        };
      });

      setProgressSessions(enrichedProgress);
    } catch (error) {
      console.error('Error loading progress data:', error);
      toast.error('Failed to load reading progress');
    } finally {
      setLoading(false);
    }
  };

  const handleBorrowSelect = (borrowId: string) => {
    setSelectedBorrow(borrowId);
    setShowUpdateForm(true);

    // Load existing progress for this borrow
    const existingProgress = progressSessions.find(
      (p) => p.borrow_record_id === borrowId && p.session_date === new Date().toISOString().split('T')[0]
    );

    if (existingProgress) {
      setFormData({
        current_page: existingProgress.current_page,
        pages_read_today: existingProgress.pages_read_today,
        time_spent_minutes: existingProgress.time_spent_minutes,
      });
    } else {
      // Check for last session to get current_page
      const lastSession = progressSessions
        .filter((p) => p.borrow_record_id === borrowId)
        .sort((a, b) => new Date(b.session_date).getTime() - new Date(a.session_date).getTime())[0];

      setFormData({
        current_page: lastSession?.current_page || 0,
        pages_read_today: 0,
        time_spent_minutes: 0,
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBorrow || !profile) return;

    const borrow = activeBorrows.find((b) => b.id === selectedBorrow);
    if (!borrow || !borrow.books) return;

    // Since books table doesn't have total_pages, calculate percentage based on current_page only
    const percentageComplete = Math.min(Math.round((formData.current_page / 100) * 100), 100);

    setSubmitting(true);
    try {
      const { error } = await supabase.from('reading_progress').upsert({
        borrow_record_id: selectedBorrow,
        user_id: profile.id,
        book_id: borrow.book_id,
        current_page: formData.current_page,
        percentage_complete: percentageComplete,
        session_date: new Date().toISOString().split('T')[0],
        pages_read_today: formData.pages_read_today,
        time_spent_minutes: formData.time_spent_minutes,
        last_updated: new Date().toISOString(),
      }, {
        onConflict: 'borrow_record_id,session_date'
      });

      if (error) throw error;

      toast.success('Reading progress updated!');
      setShowUpdateForm(false);
      setSelectedBorrow(null);
      loadData();
    } catch (error) {
      console.error('Error updating progress:', error);
      const message = error instanceof Error ? error.message : 'Failed to update progress';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <BookOpen className="w-8 h-8 text-blue-600" />
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Reading Progress Tracker</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">Track your daily reading sessions and progress</p>
        </div>
      </div>

      {/* Active Books - Card Selection */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-blue-600" />
          Currently Reading
        </h3>

        {activeBorrows.length === 0 ? (
          <p className="text-gray-600 dark:text-gray-400 text-center py-8">
            No active borrowed books. Borrow a book to start tracking your reading!
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeBorrows.filter((b) => b.books).map((borrow) => {
              const latestProgress = progressSessions.find(
                (p) => p.borrow_record_id === borrow.id
              );
              const percentage = latestProgress?.percentage_complete || 0;

              return (
                <button
                  key={borrow.id}
                  onClick={() => handleBorrowSelect(borrow.id)}
                  className="text-left p-4 border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500 hover:shadow-md transition-all"
                >
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                    {borrow.books!.title}
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    by {borrow.books!.author_publisher}
                  </p>

                  {/* Progress Bar */}
                  <div className="mt-2">
                    <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
                      <span>{percentage}% complete</span>
                      <span>
                        Page {latestProgress?.current_page || 0}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>

                  <div className="mt-2 text-xs text-blue-600 font-medium">
                    Click to update progress →
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent Sessions */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-green-600" />
          Recent Reading Sessions
        </h3>

        {progressSessions.length === 0 ? (
          <p className="text-gray-600 dark:text-gray-400 text-center py-8">
            No reading sessions yet. Start tracking your progress!
          </p>
        ) : (
          <div className="space-y-3">
            {progressSessions.slice(0, 10).map((session) => (
              <div
                key={session.id}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
              >
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900 dark:text-white">
                    {session.book_title}
                  </h4>
                  <div className="flex items-center gap-4 mt-1 text-sm text-gray-600 dark:text-gray-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {new Date(session.session_date).toLocaleDateString()}
                    </span>
                    <span className="flex items-center gap-1">
                      <TrendingUp className="w-4 h-4" />
                      {session.pages_read_today} pages
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {session.time_spent_minutes} min
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-blue-600">
                    {session.percentage_complete}%
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Page {session.current_page}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Update Progress Modal */}
      {showUpdateForm && selectedBorrow && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Save className="w-6 h-6 text-blue-600" />
                Update Reading Progress
              </h3>
              <button
                onClick={() => {
                  setShowUpdateForm(false);
                  setSelectedBorrow(null);
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Current Page
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.current_page}
                  onChange={(e) => setFormData({ ...formData, current_page: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Pages Read Today
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.pages_read_today}
                  onChange={(e) => setFormData({ ...formData, pages_read_today: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Time Spent (minutes)
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.time_spent_minutes}
                  onChange={(e) => setFormData({ ...formData, time_spent_minutes: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  required
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-300 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Saving...' : 'Save Progress'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowUpdateForm(false);
                    setSelectedBorrow(null);
                  }}
                  className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
