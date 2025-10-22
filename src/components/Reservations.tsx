import React, { useEffect, useState } from 'react';
import { BookMarked, Calendar, Clock, X, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

type Reservation = {
  id: string;
  book_id: string;
  status: string;
  reserved_at: string;
  expires_at: string;
  fulfilled_at: string | null;
  books: {
    title: string;
    author_publisher: string;
  };
};

type Book = {
  id: string;
  title: string;
  author_publisher: string;
  status: string;
};

export function Reservations() {
  const { profile } = useAuth();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [showReserveModal, setShowReserveModal] = useState(false);
  const [selectedBook, setSelectedBook] = useState<string>('');
  const [materialTypeFilter, setMaterialTypeFilter] = useState<'all' | 'physical' | 'ebook' | 'electronic'>('all');

  useEffect(() => {
    loadReservations();
    loadAvailableBooks();
  }, [profile]);

  const loadReservations = async () => {
    if (!profile) return;

    const { data, error } = await supabase
      .from('reservations')
      .select(`
        *,
        books (
          title,
          author_publisher
        )
      `)
      .eq('user_id', profile.id)
      .order('reserved_at', { ascending: false });

    if (error) {
      console.error('Error loading reservations:', error);
    } else {
      setReservations(data || []);
    }
    setLoading(false);
  };

  const loadAvailableBooks = async () => {
    // Only show books that are currently borrowed (not available)
    // Users can reserve books that are currently checked out
    const { data, error } = await supabase
      .from('books')
      .select('*')
      .neq('status', 'available') // Show books that are NOT available
      .order('title');

    if (error) {
      console.error('Error loading books:', error);
    } else {
      setBooks(data || []);
    }
  };

  const handleReserveBook = async () => {
    if (!selectedBook || !profile) return;

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const { error } = await supabase.from('reservations').insert({
      book_id: selectedBook,
      user_id: profile.id,
      expires_at: expiresAt.toISOString(),
    });

    if (error) {
      alert('Error creating reservation: ' + error.message);
    } else {
      setShowReserveModal(false);
      setSelectedBook('');
      loadReservations();
      loadAvailableBooks();
    }
  };

  const handleCancelReservation = async (reservationId: string) => {
    const { error } = await supabase
      .from('reservations')
      .update({ status: 'cancelled' })
      .eq('id', reservationId);

    if (error) {
      alert('Error cancelling reservation: ' + error.message);
    } else {
      loadReservations();
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'fulfilled':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'expired':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'fulfilled':
        return <CheckCircle className="h-4 w-4" />;
      case 'cancelled':
      case 'expired':
        return <XCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">My Reservations</h2>
        <button
          onClick={() => setShowReserveModal(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <BookMarked className="h-5 w-5" />
          Reserve Book
        </button>
      </div>

      {reservations.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <BookMarked className="h-16 w-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Reservations Yet</h3>
          <p className="text-gray-500">Reserve books that are currently borrowed to get notified when they become available</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {reservations.map((reservation) => (
            <div key={reservation.id} className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-1">
                    {reservation.books.title}
                  </h3>
                  <p className="text-sm text-gray-600">{reservation.books.author_publisher}</p>
                </div>
                <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(reservation.status)}`}>
                  {getStatusIcon(reservation.status)}
                  <span className="capitalize">{reservation.status}</span>
                </div>
              </div>

              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>Reserved: {new Date(reservation.reserved_at).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>Expires: {new Date(reservation.expires_at).toLocaleDateString()}</span>
                </div>
                {reservation.fulfilled_at && (
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    <span>Fulfilled: {new Date(reservation.fulfilled_at).toLocaleDateString()}</span>
                  </div>
                )}
              </div>

              {reservation.status === 'pending' && (
                <button
                  onClick={() => handleCancelReservation(reservation.id)}
                  className="mt-4 w-full flex items-center justify-center gap-2 bg-red-50 text-red-700 px-4 py-2 rounded-lg hover:bg-red-100 transition-colors"
                >
                  <X className="h-4 w-4" />
                  Cancel Reservation
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {showReserveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Reserve a Book</h3>
              <button
                onClick={() => setShowReserveModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Material Type
                </label>
                <select
                  value={materialTypeFilter}
                  onChange={(e) => setMaterialTypeFilter(e.target.value as typeof materialTypeFilter)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Materials</option>
                  <option value="physical">Physical Books Only</option>
                  <option value="ebook">eBooks Only</option>
                  <option value="electronic">Electronic Materials Only</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Book
                </label>
                <select
                  value={selectedBook}
                  onChange={(e) => setSelectedBook(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Choose a book...</option>
                  {books
                    .filter((book) => {
                      if (materialTypeFilter === 'all') return true;
                      if (materialTypeFilter === 'physical') {
                        const category = book.author_publisher?.toLowerCase() || '';
                        return !category.includes('ebook') && !category.includes('electronic');
                      }
                      if (materialTypeFilter === 'ebook') {
                        return book.author_publisher?.toLowerCase().includes('ebook');
                      }
                      if (materialTypeFilter === 'electronic') {
                        return book.author_publisher?.toLowerCase().includes('electronic');
                      }
                      return true;
                    })
                    .map((book) => (
                    <option key={book.id} value={book.id}>
                      {book.title} - {book.author_publisher}
                    </option>
                  ))}
                </select>
              </div>

              {books.length === 0 && (
                <p className="text-sm text-gray-500 text-center">
                  No borrowed books available for reservation
                </p>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => setShowReserveModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReserveBook}
                  disabled={!selectedBook}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Reserve
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
