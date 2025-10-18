import React, { useEffect, useState } from 'react';
import { BookOpen, Calendar, Clock, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

type BorrowedBook = {
  id: string;
  book_id: string;
  borrow_date: string;
  due_date: string;
  return_date: string | null;
  status: string;
  renewal_count: number;
  max_renewals: number;
  books: {
    title: string;
    author_publisher: string;
    category: string;
    isbn: string;
  };
};

type ReservedBook = {
  id: string;
  book_id: string;
  status: string;
  reserved_at: string;
  expires_at: string;
  books: {
    title: string;
    author_publisher: string;
  };
};

export function MyBooks() {
  const { profile } = useAuth();
  const [currentLoans, setCurrentLoans] = useState<BorrowedBook[]>([]);
  const [history, setHistory] = useState<BorrowedBook[]>([]);
  const [reservations, setReservations] = useState<ReservedBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'current' | 'history' | 'reservations'>('current');

  useEffect(() => {
    if (profile) {
      loadData();
    }
  }, [profile]);

  const loadData = async () => {
    setLoading(true);
    await Promise.all([loadCurrentLoans(), loadHistory(), loadReservations()]);
    setLoading(false);
  };

  const loadCurrentLoans = async () => {
    if (!profile?.student_id && !profile?.staff_id) return;

    const column = profile.student_id ? 'student_id' : 'staff_id';
    const id = profile.student_id || profile.staff_id;

    const { data, error } = await supabase
      .from('borrow_records')
      .select(`
        *,
        books (
          title,
          author_publisher,
          category,
          isbn
        )
      `)
      .eq(column, id)
      .eq('status', 'active')
      .order('due_date', { ascending: true });

    if (!error && data) {
      setCurrentLoans(data as any);
    }
  };

  const loadHistory = async () => {
    if (!profile?.student_id && !profile?.staff_id) return;

    const column = profile.student_id ? 'student_id' : 'staff_id';
    const id = profile.student_id || profile.staff_id;

    const { data, error } = await supabase
      .from('borrow_records')
      .select(`
        *,
        books (
          title,
          author_publisher,
          category,
          isbn
        )
      `)
      .eq(column, id)
      .eq('status', 'completed')
      .order('return_date', { ascending: false })
      .limit(20);

    if (!error && data) {
      setHistory(data as any);
    }
  };

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
      .in('status', ['pending', 'fulfilled'])
      .order('reserved_at', { ascending: false });

    if (!error && data) {
      setReservations(data as any);
    }
  };

  const handleRenew = async (borrowId: string, currentDueDate: string, renewalCount: number, maxRenewals: number) => {
    if (renewalCount >= maxRenewals) {
      toast.error('Maximum renewals reached for this book');
      return;
    }

    const newDueDate = new Date(currentDueDate);
    newDueDate.setDate(newDueDate.getDate() + 14);

    const { error: recordError } = await supabase
      .from('borrow_records')
      .update({
        due_date: newDueDate.toISOString(),
        renewal_count: renewalCount + 1,
      })
      .eq('id', borrowId);

    if (recordError) {
      toast.error('Failed to renew book');
      return;
    }

    const { error: historyError } = await supabase
      .from('renewal_history')
      .insert({
        borrow_record_id: borrowId,
        renewed_by: profile?.id,
        old_due_date: currentDueDate,
        new_due_date: newDueDate.toISOString(),
      });

    if (historyError) {
      console.error('Failed to log renewal:', historyError);
    }

    toast.success('Book renewed successfully!');
    loadCurrentLoans();
  };

  const getDaysUntilDue = (dueDate: string) => {
    const due = new Date(dueDate);
    const now = new Date();
    const diffTime = due.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getDueDateColor = (dueDate: string) => {
    const days = getDaysUntilDue(dueDate);
    if (days < 0) return 'text-red-600 bg-red-50 border-red-200';
    if (days <= 3) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-green-600 bg-green-50 border-green-200';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="bg-blue-100 p-3 rounded-xl">
          <BookOpen className="h-6 w-6 text-blue-600" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">My Books</h2>
          <p className="text-sm text-gray-600">Manage your borrowed books and reservations</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('current')}
            className={`flex-1 px-6 py-4 font-medium transition-colors ${
              activeTab === 'current'
                ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            Current Loans ({currentLoans.length})
          </button>
          <button
            onClick={() => setActiveTab('reservations')}
            className={`flex-1 px-6 py-4 font-medium transition-colors ${
              activeTab === 'reservations'
                ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            Reservations ({reservations.length})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 px-6 py-4 font-medium transition-colors ${
              activeTab === 'history'
                ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            History ({history.length})
          </button>
        </div>

        <div className="p-6">
          {activeTab === 'current' && (
            <div className="space-y-4">
              {currentLoans.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <BookOpen className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg font-medium">No books currently borrowed</p>
                  <p className="text-sm mt-1">Visit the library to borrow books</p>
                </div>
              ) : (
                currentLoans.map((loan) => {
                  const daysUntilDue = getDaysUntilDue(loan.due_date);
                  const isOverdue = daysUntilDue < 0;
                  const canRenew = loan.renewal_count < loan.max_renewals;

                  return (
                    <div
                      key={loan.id}
                      className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 text-lg">{loan.books.title}</h3>
                          <p className="text-sm text-gray-600 mt-1">{loan.books.author_publisher}</p>
                          {loan.books.category && (
                            <span className="inline-block mt-2 px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded">
                              {loan.books.category}
                            </span>
                          )}

                          <div className="mt-4 space-y-2">
                            <div className="flex items-center gap-2 text-sm">
                              <Calendar className="h-4 w-4 text-gray-400" />
                              <span className="text-gray-600">Borrowed:</span>
                              <span className="font-medium text-gray-900">{formatDate(loan.borrow_date)}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <Clock className="h-4 w-4 text-gray-400" />
                              <span className="text-gray-600">Due:</span>
                              <span className={`font-medium px-2 py-1 rounded ${getDueDateColor(loan.due_date)}`}>
                                {formatDate(loan.due_date)}
                                {isOverdue
                                  ? ` (${Math.abs(daysUntilDue)} days overdue)`
                                  : daysUntilDue <= 3
                                  ? ` (${daysUntilDue} days left)`
                                  : ''}
                              </span>
                            </div>
                            {loan.renewal_count > 0 && (
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <RefreshCw className="h-4 w-4" />
                                <span>
                                  Renewed {loan.renewal_count} time{loan.renewal_count > 1 ? 's' : ''}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="ml-4">
                          {isOverdue ? (
                            <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm font-medium">
                              <AlertCircle className="h-4 w-4" />
                              <span>Overdue</span>
                            </div>
                          ) : canRenew ? (
                            <button
                              onClick={() =>
                                handleRenew(loan.id, loan.due_date, loan.renewal_count, loan.max_renewals)
                              }
                              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                            >
                              <RefreshCw className="h-4 w-4" />
                              Renew
                            </button>
                          ) : (
                            <div className="text-sm text-gray-500">
                              Max renewals reached
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {activeTab === 'reservations' && (
            <div className="space-y-4">
              {reservations.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Calendar className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg font-medium">No active reservations</p>
                  <p className="text-sm mt-1">Reserve books when they're not available</p>
                </div>
              ) : (
                reservations.map((reservation) => (
                  <div
                    key={reservation.id}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 text-lg">{reservation.books.title}</h3>
                        <p className="text-sm text-gray-600 mt-1">{reservation.books.author_publisher}</p>

                        <div className="mt-4 space-y-2">
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="h-4 w-4 text-gray-400" />
                            <span className="text-gray-600">Reserved:</span>
                            <span className="font-medium text-gray-900">{formatDate(reservation.reserved_at)}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Clock className="h-4 w-4 text-gray-400" />
                            <span className="text-gray-600">Expires:</span>
                            <span className="font-medium text-gray-900">{formatDate(reservation.expires_at)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="ml-4">
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-medium ${
                            reservation.status === 'fulfilled'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-yellow-100 text-yellow-700'
                          }`}
                        >
                          {reservation.status === 'fulfilled' ? 'Ready for Pickup' : 'Pending'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-4">
              {history.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <CheckCircle className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg font-medium">No borrowing history</p>
                  <p className="text-sm mt-1">Your past borrowed books will appear here</p>
                </div>
              ) : (
                history.map((record) => (
                  <div
                    key={record.id}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow bg-gray-50"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{record.books.title}</h3>
                        <p className="text-sm text-gray-600 mt-1">{record.books.author_publisher}</p>

                        <div className="mt-3 space-y-1 text-sm text-gray-600">
                          <div className="flex items-center gap-2">
                            <span>Borrowed: {formatDate(record.borrow_date)}</span>
                            <span>•</span>
                            <span>Returned: {formatDate(record.return_date!)}</span>
                          </div>
                          {record.renewal_count > 0 && (
                            <div className="flex items-center gap-2">
                              <RefreshCw className="h-3 w-3" />
                              <span>Renewed {record.renewal_count} time{record.renewal_count > 1 ? 's' : ''}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="ml-4">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
