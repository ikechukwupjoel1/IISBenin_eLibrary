import { useEffect, useState } from 'react';
import { BookMarked, Calendar, Clock, X, CheckCircle, XCircle, Plus, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { LoadingSkeleton } from './ui/LoadingSkeleton';

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
      toast.error('Failed to load reservations');
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
      toast.error('Error creating reservation: ' + error.message);
    } else {
      toast.success('Book reserved successfully!');
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
      toast.error('Error cancelling reservation: ' + error.message);
    } else {
      toast.success('Reservation cancelled');
      loadReservations();
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800';
      case 'fulfilled':
        return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/20 dark:text-gray-400 dark:border-gray-800';
      case 'expired':
        return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/20 dark:text-gray-400 dark:border-gray-800';
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
    return <LoadingSkeleton type="list" />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">My Reservations</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {reservations.filter(r => r.status === 'pending').length} active reservation{reservations.filter(r => r.status === 'pending').length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => setShowReserveModal(true)}
          className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-300 shadow-md hover:shadow-lg active:scale-95 min-h-[44px]"
        >
          <Plus className="h-5 w-5" />
          Reserve Book
        </button>
      </div>

      {reservations.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center transition-all duration-300 hover:shadow-lg">
          <BookMarked className="h-16 w-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No Reservations Yet</h3>
          <p className="text-gray-500 dark:text-gray-400">Reserve books that are currently borrowed to get notified when they become available</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {reservations.map((reservation) => (
            <div key={reservation.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 transition-all duration-300 hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-600">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                    {reservation.books.title}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{reservation.books.author_publisher}</p>
                </div>
                <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(reservation.status)}`}>
                  {getStatusIcon(reservation.status)}
                  <span className="capitalize">{reservation.status}</span>
                </div>
              </div>

              <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
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
                  className="mt-4 w-full flex items-center justify-center gap-2 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 px-4 py-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-all duration-200 active:scale-95"
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
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 transition-all duration-300 animate-scale-in">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/30 dark:to-blue-800/30 rounded-lg">
              <BookMarked className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Reserve a Book</h3>
          </div>

          <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Material Type
                </label>
                <select
                  value={materialTypeFilter}
                  onChange={(e) => setMaterialTypeFilter(e.target.value as typeof materialTypeFilter)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-4 focus:ring-blue-300 dark:focus:ring-blue-600 focus:outline-none transition-all duration-200 bg-white dark:bg-gray-700 text-gray-900 dark:text-white min-h-[44px]"
                >
                  <option value="all">All Materials</option>
                  <option value="physical">Physical Books Only</option>
                  <option value="ebook">eBooks Only</option>
                  <option value="electronic">Electronic Materials Only</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Select Book
                </label>
                <select
                  value={selectedBook}
                  onChange={(e) => setSelectedBook(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-4 focus:ring-blue-300 dark:focus:ring-blue-600 focus:outline-none transition-all duration-200 bg-white dark:bg-gray-700 text-gray-900 dark:text-white min-h-[44px]"
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
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                  No borrowed books available for reservation
                </p>
              )}

              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleReserveBook}
                  disabled={!selectedBook}
                  className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-300 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-md active:scale-95 min-h-[44px] font-medium"
                >
                  Reserve Book
                </button>
                <button
                  onClick={() => setShowReserveModal(false)}
                  className="border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 px-6 py-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 active:scale-95 min-h-[44px] font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
      )}
    </div>
  );
}
