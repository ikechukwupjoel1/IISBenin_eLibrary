import { useEffect, useState, useCallback } from 'react';
import { Star, MessageSquare, Edit2, Trash2, Plus, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { LoadingSkeleton } from './ui/LoadingSkeleton';
import { AnimatedCounter } from './ui/AnimatedCounter';

type Review = {
  id: string;
  book_id: string;
  user_id: string;
  rating: number;
  review_text: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  user_profiles: {
    full_name: string;
    role: string;
  };
  books: {
    title: string;
    author_publisher: string;
  };
};

type Book = {
  id: string;
  title: string;
  author_publisher: string;
};

export function Reviews() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'reviews' | 'reports'>('reviews');
  const [reviews, setReviews] = useState<Review[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingReview, setEditingReview] = useState<Review | null>(null);
  const [selectedBook, setSelectedBook] = useState('');
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState('');

  const loadReviews = useCallback(async () => {
    try {
      // Load two types of reviews:
      // 1. User's own reviews (any status - pending, approved, rejected)
      // 2. Other users' APPROVED reviews only
      
      const userId = profile?.id;
      
      if (!userId) {
        console.log('No user ID available');
        setReviews([]);
        setLoading(false);
        return;
      }

      // Get user's own reviews (all statuses)
      const { data: myReviews, error: myError } = await supabase
        .from('reviews')
        .select(`
          *,
          user_profiles!reviews_user_id_fkey (
            full_name,
            role
          ),
          books (
            title,
            author_publisher
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (myError) {
        console.error('Error loading my reviews:', myError);
      }

      // Get other users' approved reviews only
      const { data: approvedReviews, error: approvedError } = await supabase
        .from('reviews')
        .select(`
          *,
          user_profiles!reviews_user_id_fkey (
            full_name,
            role
          ),
          books (
            title,
            author_publisher
          )
        `)
        .neq('user_id', userId)
        .eq('status', 'approved')
        .order('created_at', { ascending: false });

      if (approvedError) {
        console.error('Error loading approved reviews:', approvedError);
      }

      // Combine both arrays and remove duplicates
      const allReviews = [...(myReviews || []), ...(approvedReviews || [])];
      
      // Sort by created_at descending
      allReviews.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      console.log('Loaded reviews:', {
        myReviews: myReviews?.length || 0,
        approvedReviews: approvedReviews?.length || 0,
        total: allReviews.length
      });
      
      setReviews(allReviews);
    } catch (err) {
      console.error('Exception loading reviews:', err);
    } finally {
      setLoading(false);
    }
  }, [profile?.id]);

  const loadBooks = useCallback(async () => {
    const { data, error } = await supabase
      .from('books')
      .select('id, title, author_publisher')
      .order('title');

    if (error) {
      console.error('Error loading books:', error);
    } else {
      setBooks(data || []);
    }
  }, []);

  useEffect(() => {
    loadReviews();
    loadBooks();
  }, [loadReviews, loadBooks]);

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!profile || !selectedBook || !reviewText.trim()) {
      toast.error('Please fill in all fields');
      return;
    }

    if (editingReview) {
      const { error } = await supabase
        .from('reviews')
        .update({
          rating,
          review_text: reviewText,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingReview.id);

      if (error) {
        toast.error('Error updating review: ' + error.message);
      } else {
        toast.success('Review updated successfully!');
        closeModal();
        loadReviews();
      }
    } else {
      const { data, error } = await supabase.from('reviews').insert({
        book_id: selectedBook,
        user_id: profile.id,
        rating,
        review_text: reviewText,
        status: 'pending',
      }).select();

      if (error) {
        console.error('Error creating review:', error);
        toast.error('Error creating review: ' + error.message);
      } else {
        console.log('Review created successfully:', data);
        toast.success('Review submitted! It will be visible once approved by a librarian.');
        closeModal();
        await loadReviews();
      }
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (!confirm('Are you sure you want to delete this review?')) return;

    const { error } = await supabase.from('reviews').delete().eq('id', reviewId);

    if (error) {
      toast.error('Error deleting review: ' + error.message);
    } else {
      toast.success('Review deleted successfully');
      loadReviews();
    }
  };

  const openEditModal = (review: Review) => {
    setEditingReview(review);
    setSelectedBook(review.book_id);
    setRating(review.rating);
    setReviewText(review.review_text);
    setShowAddModal(true);
  };

  const closeModal = () => {
    setShowAddModal(false);
    setEditingReview(null);
    setSelectedBook('');
    setRating(5);
    setReviewText('');
  };

  const renderStars = (currentRating: number, interactive: boolean = false, onRate?: (rating: number) => void) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => interactive && onRate && onRate(star)}
            disabled={!interactive}
            className={`${interactive ? 'cursor-pointer hover:scale-110' : 'cursor-default'} transition-transform`}
          >
            <Star
              className={`h-5 w-5 ${
                star <= currentRating
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'fill-none text-gray-300'
              }`}
            />
          </button>
        ))}
      </div>
    );
  };

  if (loading) {
    return <LoadingSkeleton type="list" />;
  }

  return (
    <div className="space-y-6">
      {/* Tab Switcher */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('reviews')}
            className={`pb-3 px-4 font-medium transition-all border-b-2 ${
              activeTab === 'reviews'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Book Reviews
            </div>
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`pb-3 px-4 font-medium transition-all border-b-2 ${
              activeTab === 'reports'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Book Reports
            </div>
          </button>
        </div>
      </div>

      {/* Reviews Tab Content */}
      {activeTab === 'reviews' && (
        <>
          {/* Header */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/30 dark:to-blue-800/30 p-3 rounded-xl">
            <MessageSquare className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Book Reviews</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">Share your thoughts on books</p>
          </div>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-300 shadow-md hover:shadow-lg active:scale-95 min-h-[44px]"
        >
          <Plus className="h-5 w-5" />
          Write Review
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl p-6 border border-blue-200 dark:border-blue-800 animate-fade-in">
          <div className="flex items-center gap-3 mb-2">
            <MessageSquare className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Reviews</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            <AnimatedCounter value={reviews.length} />
          </p>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-xl p-6 border border-green-200 dark:border-green-800 animate-fade-in" style={{ animationDelay: '100ms' }}>
          <div className="flex items-center gap-3 mb-2">
            <Star className="h-5 w-5 text-green-600 dark:text-green-400" />
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Average Rating</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {reviews.length > 0 ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1) : '0.0'}
          </p>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-xl p-6 border border-purple-200 dark:border-purple-800 animate-fade-in" style={{ animationDelay: '200ms' }}>
          <div className="flex items-center gap-3 mb-2">
            <FileText className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Approved</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            <AnimatedCounter value={reviews.filter(r => r.status === 'approved').length} />
          </p>
        </div>
      </div>

      {reviews.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center transition-all duration-300 hover:shadow-lg">
          <MessageSquare className="h-16 w-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No Reviews Yet</h3>
          <p className="text-gray-500 dark:text-gray-400">Be the first to review a book</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review, index) => (
            <div 
              key={review.id} 
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 transition-all duration-300 hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-600 hover:-translate-y-1 animate-fade-in"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900 dark:text-white text-lg">
                      {review.books.title}
                    </h3>
                    {profile?.id === review.user_id && (
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        review.status === 'pending' 
                          ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' 
                          : review.status === 'approved'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                          : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                      }`}>
                        {review.status === 'pending' ? '⏳ Pending' : 
                         review.status === 'approved' ? '✓ Approved' : 
                         '✗ Rejected'}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{review.books.author_publisher}</p>
                  {renderStars(review.rating)}
                </div>
                {profile?.id === review.user_id && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEditModal(review)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteReview(review.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>

              <p className="text-gray-700 mb-4">{review.review_text}</p>

              <div className="flex items-center justify-between text-sm text-gray-500">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-700">{review.user_profiles.full_name}</span>
                  <span>•</span>
                  <span className="capitalize">{review.user_profiles.role}</span>
                </div>
                <span>{new Date(review.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 p-6 max-w-2xl w-full animate-scale-in">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/30 dark:to-blue-800/30 rounded-lg">
                  <MessageSquare className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {editingReview ? 'Edit Review' : 'Write a Review'}
                </h3>
              </div>
              <button
                onClick={closeModal}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

          <form onSubmit={handleSubmitReview} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Select Book
                </label>
                <select
                  value={selectedBook}
                  onChange={(e) => setSelectedBook(e.target.value)}
                  disabled={!!editingReview}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-4 focus:ring-blue-300 dark:focus:ring-blue-600 focus:outline-none transition-all duration-200 disabled:bg-gray-100 dark:disabled:bg-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-white min-h-[44px]"
                >
                  <option value="">Choose a book...</option>
                  {books.map((book) => (
                    <option key={book.id} value={book.id}>
                      {book.title} - {book.author_publisher}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Rating</label>
                {renderStars(rating, true, setRating)}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Your Review
                </label>
                <textarea
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-4 focus:ring-blue-300 dark:focus:ring-blue-600 focus:outline-none transition-all duration-200 resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Share your thoughts about this book..."
                />
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="submit"
                  className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-300 shadow-md hover:shadow-lg active:scale-95 min-h-[44px] font-medium"
                >
                  {editingReview ? 'Update Review' : 'Submit Review'}
                </button>
                <button
                  type="button"
                  onClick={closeModal}
                  className="border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 px-6 py-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 active:scale-95 min-h-[44px] font-medium"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
        </>
      )}

      {/* Book Reports Tab Content */}
      {activeTab === 'reports' && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 text-center">
            <FileText className="h-16 w-16 mx-auto mb-4 text-blue-600 dark:text-blue-400" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Book Reports System</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Manage book reports, reviewers, and moderation tools
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto mt-6">
              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg transition-all duration-300 hover:shadow-md hover:scale-105 animate-fade-in" style={{ animationDelay: '100ms' }}>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Report Submission</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">Students submit detailed book reports</p>
              </div>
              
              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg transition-all duration-300 hover:shadow-md hover:scale-105 animate-fade-in" style={{ animationDelay: '200ms' }}>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Review System</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">Teachers review and grade reports</p>
              </div>
              
              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg transition-all duration-300 hover:shadow-md hover:scale-105 animate-fade-in" style={{ animationDelay: '300ms' }}>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Reviewer Management</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">Assign reviewers to reports</p>
              </div>
              
              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg transition-all duration-300 hover:shadow-md hover:scale-105 animate-fade-in" style={{ animationDelay: '400ms' }}>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Moderation Tools</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">Monitor and moderate content</p>
              </div>
            </div>
            
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-6">
              Note: This feature requires student borrow records to function. Access book report forms from the Borrowing System tab.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
