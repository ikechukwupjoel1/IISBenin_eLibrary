import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Clock, Bell, Users, X, Check, AlertCircle, BookOpen, Calendar } from 'lucide-react';

interface WaitlistEntry {
  id: string;
  book_id: string;
  user_id: string;
  position: number;
  status: 'waiting' | 'notified' | 'cancelled';
  created_at: string;
  notified_at?: string;
  book_title: string;
  book_author: string;
  user_name: string;
  estimated_wait_days: number;
}

interface BookWaitlist {
  book_id: string;
  book_title: string;
  book_author: string;
  total_waiting: number;
  user_position?: number;
  user_entry_id?: string;
  estimated_return_date?: string;
}

export default function WaitingList({ userId, userRole }: { userId: string; userRole: string }) {
  const [myWaitlist, setMyWaitlist] = useState<WaitlistEntry[]>([]);
  const [allWaitlists, setAllWaitlists] = useState<BookWaitlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'my' | 'all'>('my');

  useEffect(() => {
    fetchMyWaitlist();
    if (userRole === 'librarian' || userRole === 'admin') {
      fetchAllWaitlists();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, userRole]);

  const fetchMyWaitlist = async () => {
    try {
      setLoading(true);

      const { data: waitlistData, error: waitlistError } = await supabase
        .from('book_waitlist')
        .select(`
          *,
          books(title, author)
        `)
        .eq('user_id', userId)
        .in('status', ['waiting', 'notified'])
        .order('created_at', { ascending: true });

      if (waitlistError) throw waitlistError;

      // Calculate positions and estimated wait times
      const entriesWithDetails = await Promise.all(
        (waitlistData || []).map(async (entry) => {
          // Get position in queue
          const { data: earlierEntries } = await supabase
            .from('book_waitlist')
            .select('id')
            .eq('book_id', entry.book_id)
            .eq('status', 'waiting')
            .lt('created_at', entry.created_at);

          const position = (earlierEntries?.length || 0) + 1;

          // Estimate wait time based on average return time
          const { data: recentBorrows } = await supabase
            .from('borrows')
            .select('borrow_date, return_date')
            .eq('book_id', entry.book_id)
            .eq('status', 'returned')
            .not('return_date', 'is', null)
            .order('return_date', { ascending: false })
            .limit(10);

          let estimatedWaitDays = position * 14; // Default: 14 days per person

          if (recentBorrows && recentBorrows.length > 0) {
            const avgDays = recentBorrows.reduce((sum, borrow) => {
              const borrowDate = new Date(borrow.borrow_date);
              const returnDate = new Date(borrow.return_date!);
              const days = Math.ceil((returnDate.getTime() - borrowDate.getTime()) / (1000 * 60 * 60 * 24));
              return sum + days;
            }, 0) / recentBorrows.length;

            estimatedWaitDays = Math.ceil(position * avgDays);
          }

          return {
            ...entry,
            book_title: entry.books?.title || 'Unknown Book',
            book_author: entry.books?.author || 'Unknown Author',
            user_name: '',
            position,
            estimated_wait_days: estimatedWaitDays,
          };
        })
      );

      setMyWaitlist(entriesWithDetails);
    } catch (error) {
      console.error('Error fetching waitlist:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllWaitlists = async () => {
    try {
      // Get all books with waiting users
      const { data: waitlistData, error: waitlistError } = await supabase
        .from('book_waitlist')
        .select(`
          book_id,
          books(title, author)
        `)
        .eq('status', 'waiting');

      if (waitlistError) throw waitlistError;

      // Group by book and count
      const bookCounts = new Map<string, { title: string; author: string; count: number }>();

      waitlistData?.forEach((entry: { book_id: string; books?: { title: string; author: string } }) => {
        if (bookCounts.has(entry.book_id)) {
          bookCounts.get(entry.book_id)!.count++;
        } else {
          bookCounts.set(entry.book_id, {
            title: entry.books?.title || 'Unknown Book',
            author: entry.books?.author || 'Unknown Author',
            count: 1,
          });
        }
      });

      const waitlists: BookWaitlist[] = Array.from(bookCounts.entries()).map(([bookId, data]) => ({
        book_id: bookId,
        book_title: data.title,
        book_author: data.author,
        total_waiting: data.count,
      }));

      setAllWaitlists(waitlists.sort((a, b) => b.total_waiting - a.total_waiting));
    } catch (error) {
      console.error('Error fetching all waitlists:', error);
    }
  };

  const joinWaitlist = async (bookId: string) => {
    try {
      // Check if already in waitlist
      const { data: existing } = await supabase
        .from('book_waitlist')
        .select('id')
        .eq('book_id', bookId)
        .eq('user_id', userId)
        .in('status', ['waiting', 'notified'])
        .single();

      if (existing) {
        alert('You are already in the waitlist for this book');
        return;
      }

      const { error } = await supabase
        .from('book_waitlist')
        .insert([{
          book_id: bookId,
          user_id: userId,
          status: 'waiting',
        }]);

      if (error) throw error;

      fetchMyWaitlist();
      alert('Successfully joined the waitlist!');
    } catch (error) {
      console.error('Error joining waitlist:', error);
      alert('Failed to join waitlist');
    }
  };

  const cancelWaitlist = async (entryId: string) => {
    if (!confirm('Are you sure you want to leave this waitlist?')) return;

    try {
      const { error } = await supabase
        .from('book_waitlist')
        .update({ status: 'cancelled' })
        .eq('id', entryId);

      if (error) throw error;

      fetchMyWaitlist();
      alert('Successfully left the waitlist');
    } catch (error) {
      console.error('Error cancelling waitlist:', error);
      alert('Failed to cancel waitlist entry');
    }
  };

  const notifyNextUser = async (bookId: string) => {
    try {
      // Get next waiting user
      const { data: nextEntry, error: fetchError } = await supabase
        .from('book_waitlist')
        .select('*')
        .eq('book_id', bookId)
        .eq('status', 'waiting')
        .order('created_at', { ascending: true })
        .limit(1)
        .single();

      if (fetchError || !nextEntry) {
        alert('No users waiting for this book');
        return;
      }

      // Update status to notified
      const { error: updateError } = await supabase
        .from('book_waitlist')
        .update({
          status: 'notified',
          notified_at: new Date().toISOString(),
        })
        .eq('id', nextEntry.id);

      if (updateError) throw updateError;

      // Send notification (would integrate with notification system)
      const { error: notifError } = await supabase
        .from('notifications')
        .insert([{
          user_id: nextEntry.user_id,
          type: 'book_available',
          title: 'Book Available',
          message: `The book you were waiting for is now available for borrowing!`,
          data: { book_id: bookId },
        }]);

      if (notifError) console.error('Error sending notification:', notifError);

      fetchAllWaitlists();
      alert('User notified successfully!');
    } catch (error) {
      console.error('Error notifying user:', error);
      alert('Failed to notify user');
    }
  };

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
      <div className="bg-gradient-to-r from-orange-600 to-red-600 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2">Book Waiting Lists</h2>
            <p className="text-orange-100">
              {userRole === 'librarian' || userRole === 'admin'
                ? 'Manage waiting lists and notify users'
                : 'Join queues for books and track your position'}
            </p>
          </div>
          <Clock className="w-16 h-16 opacity-80" />
        </div>
      </div>

      {/* Navigation for Librarians */}
      {(userRole === 'librarian' || userRole === 'admin') && (
        <div className="flex gap-2">
          <button
            onClick={() => setView('my')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              view === 'my'
                ? 'bg-orange-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            My Waitlists
          </button>
          <button
            onClick={() => setView('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              view === 'all'
                ? 'bg-orange-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            All Waitlists (Librarian)
          </button>
        </div>
      )}

      {/* My Waitlists */}
      {view === 'my' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-gray-900">Your Waiting Lists</h3>
            <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-semibold">
              {myWaitlist.length} {myWaitlist.length === 1 ? 'book' : 'books'}
            </span>
          </div>

          {myWaitlist.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg shadow">
              <Clock className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-600">You're not waiting for any books</p>
              <p className="text-sm text-gray-500 mt-2">
                Join a waiting list when a book is currently borrowed
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {myWaitlist.map((entry) => (
                <div key={entry.id} className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-start gap-4">
                        <BookOpen className="w-12 h-12 text-orange-600 flex-shrink-0" />
                        <div className="flex-1">
                          <h4 className="text-lg font-semibold text-gray-900 mb-1">
                            {entry.book_title}
                          </h4>
                          <p className="text-sm text-gray-600 mb-3">{entry.book_author}</p>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                            <div className="flex items-center gap-2">
                              <Users className="w-5 h-5 text-gray-400" />
                              <div>
                                <p className="text-xs text-gray-500">Queue Position</p>
                                <p className="font-semibold text-gray-900">#{entry.position}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="w-5 h-5 text-gray-400" />
                              <div>
                                <p className="text-xs text-gray-500">Estimated Wait</p>
                                <p className="font-semibold text-gray-900">
                                  {entry.estimated_wait_days} days
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Calendar className="w-5 h-5 text-gray-400" />
                              <div>
                                <p className="text-xs text-gray-500">Joined</p>
                                <p className="font-semibold text-gray-900">
                                  {new Date(entry.created_at).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                          </div>

                          {entry.status === 'notified' && (
                            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                              <Bell className="w-5 h-5 text-green-600" />
                              <div>
                                <p className="text-sm font-semibold text-green-900">
                                  Book Available!
                                </p>
                                <p className="text-xs text-green-700">
                                  You've been notified. Borrow it soon!
                                </p>
                              </div>
                            </div>
                          )}

                          {entry.status === 'waiting' && entry.position === 1 && (
                            <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                              <AlertCircle className="w-5 h-5 text-blue-600" />
                              <p className="text-sm text-blue-900">
                                You're next in line! We'll notify you when available.
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => cancelWaitlist(entry.id)}
                      className="ml-4 p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Leave waitlist"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* All Waitlists (Librarian View) */}
      {view === 'all' && (userRole === 'librarian' || userRole === 'admin') && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-gray-900">All Waiting Lists</h3>
            <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold">
              {allWaitlists.length} {allWaitlists.length === 1 ? 'book' : 'books'} with waitlists
            </span>
          </div>

          {allWaitlists.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg shadow">
              <Users className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-600">No active waiting lists</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Book
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Author
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Waiting Users
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {allWaitlists.map((waitlist) => (
                    <tr key={waitlist.book_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900">{waitlist.book_title}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600">{waitlist.book_author}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-gray-400" />
                          <span className="text-sm font-semibold text-gray-900">
                            {waitlist.total_waiting}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => notifyNextUser(waitlist.book_id)}
                          className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
                        >
                          <Bell className="w-4 h-4" />
                          Notify Next User
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-900">
            <p className="font-semibold mb-1">How Waiting Lists Work</p>
            <ul className="list-disc list-inside space-y-1 text-blue-800">
              <li>Join the waitlist when a book is currently borrowed</li>
              <li>You'll receive a notification when the book becomes available</li>
              <li>Your position moves up as people ahead of you borrow the book</li>
              <li>Estimated wait time is based on average borrow duration</li>
              <li>You can cancel your spot anytime</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

// Export function to be used in book details
export const JoinWaitlistButton = ({ bookId, userId }: { bookId: string; userId: string }) => {
  const [joining, setJoining] = useState(false);
  const [inWaitlist, setInWaitlist] = useState(false);

  useEffect(() => {
    checkWaitlistStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookId, userId]);

  const checkWaitlistStatus = async () => {
    try {
      const { data } = await supabase
        .from('book_waitlist')
        .select('id')
        .eq('book_id', bookId)
        .eq('user_id', userId)
        .in('status', ['waiting', 'notified'])
        .single();

      setInWaitlist(!!data);
    } catch (error) {
      console.error('Error checking waitlist status:', error);
    }
  };

  const handleJoinWaitlist = async () => {
    if (inWaitlist) return;

    setJoining(true);
    try {
      const { error } = await supabase
        .from('book_waitlist')
        .insert([{
          book_id: bookId,
          user_id: userId,
          status: 'waiting',
        }]);

      if (error) throw error;

      setInWaitlist(true);
      alert('Successfully joined the waitlist!');
    } catch (error) {
      console.error('Error joining waitlist:', error);
      alert('Failed to join waitlist');
    } finally {
      setJoining(false);
    }
  };

  return (
    <button
      onClick={handleJoinWaitlist}
      disabled={joining || inWaitlist}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
        inWaitlist
          ? 'bg-green-100 text-green-700 cursor-default'
          : 'bg-orange-600 text-white hover:bg-orange-700 disabled:bg-gray-300'
      }`}
    >
      {inWaitlist ? (
        <>
          <Check className="w-4 h-4" />
          In Waitlist
        </>
      ) : (
        <>
          <Clock className="w-4 h-4" />
          {joining ? 'Joining...' : 'Join Waitlist'}
        </>
      )}
    </button>
  );
};
