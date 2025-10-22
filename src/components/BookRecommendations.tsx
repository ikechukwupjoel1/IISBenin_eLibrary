import React, { useEffect, useState } from 'react';
import { BookOpen, TrendingUp, Star, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

type Recommendation = {
  id: string;
  title: string;
  author: string;
  category: string;
  isbn: string;
  borrow_count?: number;
  avg_rating?: number;
  reason: string;
};

export function BookRecommendations() {
  const { profile } = useAuth();
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'personal' | 'popular' | 'category'>('personal');

  useEffect(() => {
    loadRecommendations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, profile]);

  const loadRecommendations = async () => {
    setLoading(true);

    if (activeTab === 'personal' && profile) {
      await loadPersonalRecommendations();
    } else if (activeTab === 'popular') {
      await loadPopularBooks();
    } else if (activeTab === 'category') {
      await loadCategoryRecommendations();
    }

    setLoading(false);
  };

  const loadPersonalRecommendations = async () => {
    if (!profile) return;

    try {
      // Get user's borrow history
      const { data: userBorrows } = await supabase
        .from('borrow_records')
        .select('book_id')
        .or(`student_id.eq.${profile.student_id || ''},staff_id.eq.${profile.staff_id || ''}`)
        .limit(10);

      if (!userBorrows || userBorrows.length === 0) {
        // No history, show popular instead
        await loadPopularBooks();
        return;
      }

      const userBookIds = userBorrows.map(b => b.book_id);

      // Find what other users who borrowed these books also borrowed
      const { data: similarBorrows } = await supabase
        .from('borrow_records')
        .select('book_id, student_id, staff_id')
        .in('book_id', userBookIds)
        .neq('student_id', profile.student_id || '')
        .neq('staff_id', profile.staff_id || '')
        .limit(50);

      if (!similarBorrows) return;

      // Count frequency of co-borrowed books
      const bookFrequency: { [key: string]: number } = {};
      similarBorrows.forEach(borrow => {
        if (!userBookIds.includes(borrow.book_id)) {
          bookFrequency[borrow.book_id] = (bookFrequency[borrow.book_id] || 0) + 1;
        }
      });

      // Get top recommended books
      const topBookIds = Object.entries(bookFrequency)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([id]) => id);

      if (topBookIds.length === 0) {
        await loadPopularBooks();
        return;
      }

      const { data: books } = await supabase
        .from('books')
        .select('id, title, author, category, isbn')
        .in('id', topBookIds)
        .eq('status', 'available');

      if (books) {
        setRecommendations(books.map(book => ({
          ...book,
          reason: 'Students who borrowed your books also read this'
        })));
      }
    } catch (error) {
      console.error('Error loading personal recommendations:', error);
      await loadPopularBooks();
    }
  };

  const loadPopularBooks = async () => {
    try {
      // Get most borrowed books
      const { data: borrowCounts } = await supabase
        .from('borrow_records')
        .select('book_id')
        .eq('status', 'completed');

      const bookCounts: { [key: string]: number } = {};
      borrowCounts?.forEach(record => {
        bookCounts[record.book_id] = (bookCounts[record.book_id] || 0) + 1;
      });

      const topBookIds = Object.entries(bookCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([id]) => id);

      if (topBookIds.length === 0) {
        setRecommendations([]);
        return;
      }

      const { data: books } = await supabase
        .from('books')
        .select('id, title, author, category, isbn')
        .in('id', topBookIds)
        .eq('status', 'available');

      if (books) {
        setRecommendations(books.map((book, index) => ({
          ...book,
          borrow_count: bookCounts[book.id],
          reason: `#${index + 1} Most borrowed book`
        })));
      }
    } catch (error) {
      console.error('Error loading popular books:', error);
    }
  };

  const loadCategoryRecommendations = async () => {
    if (!profile) return;

    try {
      // Get user's favorite categories
      const { data: userBorrows } = await supabase
        .from('borrow_records')
        .select('book_id')
        .or(`student_id.eq.${profile.student_id || ''},staff_id.eq.${profile.staff_id || ''}`)
        .limit(20);

      if (!userBorrows || userBorrows.length === 0) {
        await loadPopularBooks();
        return;
      }

      const bookIds = userBorrows.map(b => b.book_id);

      const { data: userBooks } = await supabase
        .from('books')
        .select('category')
        .in('id', bookIds);

      // Find most common categories
      const categoryCounts: { [key: string]: number } = {};
      userBooks?.forEach(book => {
        if (book.category) {
          categoryCounts[book.category] = (categoryCounts[book.category] || 0) + 1;
        }
      });

      const topCategories = Object.entries(categoryCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([cat]) => cat);

      if (topCategories.length === 0) {
        await loadPopularBooks();
        return;
      }

      // Get books from favorite categories that user hasn't borrowed
      const { data: recommendations } = await supabase
        .from('books')
        .select('id, title, author, category, isbn')
        .in('category', topCategories)
        .not('id', 'in', `(${bookIds.join(',')})`)
        .eq('status', 'available')
        .limit(10);

      if (recommendations) {
        setRecommendations(recommendations.map(book => ({
          ...book,
          reason: `Based on your interest in ${book.category}`
        })));
      }
    } catch (error) {
      console.error('Error loading category recommendations:', error);
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading recommendations...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-purple-100 p-3 rounded-xl">
            <TrendingUp className="h-6 w-6 text-purple-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Book Recommendations</h2>
            <p className="text-sm text-gray-600">Discover your next great read</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('personal')}
          className={`px-4 py-2 font-medium transition-colors border-b-2 ${
            activeTab === 'personal'
              ? 'border-purple-600 text-purple-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            For You
          </div>
        </button>
        <button
          onClick={() => setActiveTab('popular')}
          className={`px-4 py-2 font-medium transition-colors border-b-2 ${
            activeTab === 'popular'
              ? 'border-purple-600 text-purple-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          <div className="flex items-center gap-2">
            <Star className="h-4 w-4" />
            Popular
          </div>
        </button>
        <button
          onClick={() => setActiveTab('category')}
          className={`px-4 py-2 font-medium transition-colors border-b-2 ${
            activeTab === 'category'
              ? 'border-purple-600 text-purple-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Your Interests
          </div>
        </button>
      </div>

      {/* Recommendations Grid */}
      {recommendations.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <BookOpen className="h-16 w-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No recommendations yet</h3>
          <p className="text-gray-500">
            {activeTab === 'personal'
              ? 'Start borrowing books to get personalized recommendations'
              : 'Check back later for recommendations'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {recommendations.map((book) => (
            <div
              key={book.id}
              className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-12 h-16 bg-gradient-to-br from-purple-400 to-purple-600 rounded flex items-center justify-center">
                  <BookOpen className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">{book.title}</h3>
                  <p className="text-sm text-gray-600 truncate">{book.author}</p>
                  {book.category && (
                    <span className="inline-block mt-1 px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded">
                      {book.category}
                    </span>
                  )}
                  {book.borrow_count && (
                    <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
                      <Users className="h-3 w-3" />
                      <span>{book.borrow_count} borrows</span>
                    </div>
                  )}
                  <p className="text-xs text-purple-600 mt-2 italic">{book.reason}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
