import React, { useEffect, useState } from 'react';
import { Star, MessageSquare, Edit2, Trash2, Plus, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

type Review = {
  id: string;
  book_id: string;
  user_id: string;
  rating: number;
  review_text: string;
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
  const [reviews, setReviews] = useState<Review[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingReview, setEditingReview] = useState<Review | null>(null);
  const [selectedBook, setSelectedBook] = useState('');
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState('');

  useEffect(() => {
    loadReviews();
    loadBooks();
  }, []);

  const loadReviews = async () => {
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select(`
          *,
          user_profiles (
            full_name,
            role
          ),
          books (
            title,
            author_publisher
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading reviews:', error);
        alert('Error loading reviews: ' + error.message);
      } else {
        console.log('Loaded reviews:', data);
        setReviews(data || []);
      }
    } catch (err) {
      console.error('Exception loading reviews:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadBooks = async () => {
    const { data, error } = await supabase
      .from('books')
      .select('id, title, author_publisher')
      .order('title');

    if (error) {
      console.error('Error loading books:', error);
    } else {
      setBooks(data || []);
    }
  };

  const handleSubmitReview = async () => {
    if (!profile || !selectedBook || !reviewText.trim()) {
      alert('Please fill in all fields');
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
        alert('Error updating review: ' + error.message);
      } else {
        closeModal();
        loadReviews();
      }
    } else {
      const { data, error } = await supabase.from('reviews').insert({
        book_id: selectedBook,
        user_id: profile.id,
        rating,
        review_text: reviewText,
        status: 'approved', // Explicitly set status
      }).select();

      if (error) {
        console.error('Error creating review:', error);
        alert('Error creating review: ' + error.message);
      } else {
        console.log('Review created successfully:', data);
        alert('Review submitted successfully!');
        closeModal();
        await loadReviews(); // Wait for reviews to reload
      }
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (!confirm('Are you sure you want to delete this review?')) return;

    const { error } = await supabase.from('reviews').delete().eq('id', reviewId);

    if (error) {
      alert('Error deleting review: ' + error.message);
    } else {
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
    return <div className="text-center py-12">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-blue-100 p-3 rounded-xl">
            <MessageSquare className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Book Reviews</h2>
            <p className="text-sm text-gray-600">Share your thoughts on books</p>
          </div>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-5 w-5" />
          Write Review
        </button>
      </div>

      {reviews.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <MessageSquare className="h-16 w-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Reviews Yet</h3>
          <p className="text-gray-500">Be the first to review a book</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <div key={review.id} className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 text-lg mb-1">
                    {review.books.title}
                  </h3>
                  <p className="text-sm text-gray-600 mb-2">{review.books.author_publisher}</p>
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-lg w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">
                {editingReview ? 'Edit Review' : 'Write a Review'}
              </h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Book
                </label>
                <select
                  value={selectedBook}
                  onChange={(e) => setSelectedBook(e.target.value)}
                  disabled={!!editingReview}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
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
                <label className="block text-sm font-medium text-gray-700 mb-2">Rating</label>
                {renderStars(rating, true, setRating)}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Review
                </label>
                <textarea
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  placeholder="Share your thoughts about this book..."
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={closeModal}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitReview}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {editingReview ? 'Update' : 'Submit'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
