import { useEffect, useState } from 'react';
import { TrendingUp, BookOpen, Users, AlertCircle, Calendar, BarChart3, PieChart, Activity } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

type AnalyticsPeriod = 'week' | 'month' | 'year';

type BorrowStats = {
  totalBorrows: number;
  activeBorrows: number;
  returned: number;
  overdue: number;
};

type PopularBook = {
  id: string;
  title: string;
  author: string;
  category: string;
  borrow_count: number;
};

type CategoryStats = {
  category: string;
  count: number;
  percentage: number;
};

type UserActivity = {
  date: string;
  borrows: number;
  returns: number;
  new_users: number;
};

export function LibrarianAnalytics() {
  const { profile } = useAuth();
  const [period, setPeriod] = useState<AnalyticsPeriod>('month');
  const [loading, setLoading] = useState(true);
  const [borrowStats, setBorrowStats] = useState<BorrowStats>({
    totalBorrows: 0,
    activeBorrows: 0,
    returned: 0,
    overdue: 0,
  });
  const [popularBooks, setPopularBooks] = useState<PopularBook[]>([]);
  const [categoryStats, setCategoryStats] = useState<CategoryStats[]>([]);
  const [userActivity, setUserActivity] = useState<UserActivity[]>([]);

  useEffect(() => {
    if (profile?.role === 'librarian') {
      loadAnalytics();
    }
  }, [period, profile]);

  const getDateRange = () => {
    const now = new Date();
    const start = new Date();

    if (period === 'week') {
      start.setDate(now.getDate() - 7);
    } else if (period === 'month') {
      start.setDate(now.getDate() - 30);
    } else {
      start.setFullYear(now.getFullYear() - 1);
    }

    return { start: start.toISOString(), end: now.toISOString() };
  };

  const loadAnalytics = async () => {
    setLoading(true);
    const { start, end } = getDateRange();

    try {
      // Load all analytics in parallel for better performance
      await Promise.all([
        loadBorrowStats(start, end),
        loadPopularBooks(start, end),
        loadCategoryStats(start, end),
        loadUserActivity(start, end),
      ]);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadBorrowStats = async (start: string, end: string) => {
    // Use count queries for better performance - no need to fetch all data
    const [allBorrowsResult, activeBorrowsResult, returnedResult, overdueResult] = await Promise.all([
      // Total borrows in period
      supabase
        .from('borrow_records')
        .select('*', { count: 'exact', head: true })
        .gte('borrowed_at', start)
        .lte('borrowed_at', end),
      
      // Active borrows (not returned, started in period)
      supabase
        .from('borrow_records')
        .select('*', { count: 'exact', head: true })
        .is('returned_at', null)
        .gte('borrowed_at', start),
      
      // Returned in period
      supabase
        .from('borrow_records')
        .select('*', { count: 'exact', head: true })
        .not('returned_at', 'is', null)
        .gte('borrowed_at', start)
        .lte('borrowed_at', end),
      
      // Overdue (due date passed, not returned)
      supabase
        .from('borrow_records')
        .select('*', { count: 'exact', head: true })
        .is('returned_at', null)
        .lt('due_date', new Date().toISOString()),
    ]);

    setBorrowStats({
      totalBorrows: allBorrowsResult.count || 0,
      activeBorrows: activeBorrowsResult.count || 0,
      returned: returnedResult.count || 0,
      overdue: overdueResult.count || 0,
    });
  };

  const loadPopularBooks = async (start: string, end: string) => {
    // Get borrow counts per book
    const { data: borrows } = await supabase
      .from('borrow_records')
      .select('book_id')
      .gte('borrowed_at', start)
      .lte('borrowed_at', end);

    if (!borrows) return;

    // Count borrows per book
    const bookCounts: { [key: string]: number } = {};
    borrows.forEach(record => {
      bookCounts[record.book_id] = (bookCounts[record.book_id] || 0) + 1;
    });

    // Get book details for top books
    const topBookIds = Object.entries(bookCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([id]) => id);

    const { data: books } = await supabase
      .from('books')
      .select('id, title, author, category')
      .in('id', topBookIds);

    if (books) {
      const popularBooks = books.map(book => ({
        ...book,
        borrow_count: bookCounts[book.id] || 0,
      })).sort((a, b) => b.borrow_count - a.borrow_count);

      setPopularBooks(popularBooks);
    }
  };

  const loadCategoryStats = async (start: string, end: string) => {
    // Get all borrows with book details
    const { data: borrows } = await supabase
      .from('borrow_records')
      .select('book_id')
      .gte('borrowed_at', start)
      .lte('borrowed_at', end);

    if (!borrows) return;

    // Get books
    const bookIds = [...new Set(borrows.map(b => b.book_id))];
    const { data: books } = await supabase
      .from('books')
      .select('id, category')
      .in('id', bookIds);

    if (books) {
      // Count by category
      const categoryCounts: { [key: string]: number } = {};
      borrows.forEach(borrow => {
        const book = books.find(b => b.id === borrow.book_id);
        if (book?.category) {
          categoryCounts[book.category] = (categoryCounts[book.category] || 0) + 1;
        }
      });

      const total = Object.values(categoryCounts).reduce((sum, count) => sum + count, 0);
      
      const stats = Object.entries(categoryCounts)
        .map(([category, count]) => ({
          category,
          count,
          percentage: (count / total) * 100,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8);

      setCategoryStats(stats);
    }
  };

  const loadUserActivity = async (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // Get borrows grouped by date
    const { data: borrows } = await supabase
      .from('borrow_records')
      .select('borrowed_at, returned_at')
      .gte('borrowed_at', start)
      .lte('borrowed_at', end);

    // Get new user registrations
    const { data: users } = await supabase
      .from('user_profiles')
      .select('created_at')
      .gte('created_at', start)
      .lte('created_at', end);

    // Group by date
    const activityMap: { [key: string]: UserActivity } = {};
    
    // Group borrows
    borrows?.forEach(borrow => {
      const date = new Date(borrow.borrowed_at).toISOString().split('T')[0];
      if (!activityMap[date]) {
        activityMap[date] = { date, borrows: 0, returns: 0, new_users: 0 };
      }
      activityMap[date].borrows += 1;
      
      if (borrow.returned_at) {
        const returnDate = new Date(borrow.returned_at).toISOString().split('T')[0];
        if (!activityMap[returnDate]) {
          activityMap[returnDate] = { date: returnDate, borrows: 0, returns: 0, new_users: 0 };
        }
        activityMap[returnDate].returns += 1;
      }
    });

    // Group new users
    users?.forEach(user => {
      const date = new Date(user.created_at).toISOString().split('T')[0];
      if (!activityMap[date]) {
        activityMap[date] = { date, borrows: 0, returns: 0, new_users: 0 };
      }
      activityMap[date].new_users += 1;
    });

    const activity = Object.values(activityMap)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-14); // Last 14 days max

    setUserActivity(activity);
  };

  if (profile?.role !== 'librarian') {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
        <p className="text-gray-600">This feature is only available to librarians.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gray-200 p-3 rounded-xl animate-pulse h-14 w-14"></div>
            <div>
              <div className="h-8 w-48 bg-gray-200 rounded animate-pulse mb-2"></div>
              <div className="h-4 w-64 bg-gray-200 rounded animate-pulse"></div>
            </div>
          </div>
          <div className="flex gap-2">
            <div className="h-10 w-24 bg-gray-200 rounded-lg animate-pulse"></div>
            <div className="h-10 w-24 bg-gray-200 rounded-lg animate-pulse"></div>
            <div className="h-10 w-24 bg-gray-200 rounded-lg animate-pulse"></div>
          </div>
        </div>

        {/* Stats Grid Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="h-6 w-32 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-10 w-10 bg-gray-200 rounded-lg animate-pulse"></div>
              </div>
              <div className="h-10 w-20 bg-gray-200 rounded animate-pulse mb-2"></div>
              <div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div>
            </div>
          ))}
        </div>

        {/* Charts Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="h-6 w-40 bg-gray-200 rounded animate-pulse mb-4"></div>
            <div className="h-64 bg-gray-100 rounded-lg animate-pulse"></div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="h-6 w-40 bg-gray-200 rounded animate-pulse mb-4"></div>
            <div className="h-64 bg-gray-100 rounded-lg animate-pulse"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-purple-100 p-3 rounded-xl">
            <BarChart3 className="h-6 w-6 text-purple-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Library Analytics</h2>
            <p className="text-sm text-gray-600">Data-driven insights for library management</p>
          </div>
        </div>

        {/* Period Selector */}
        <div className="flex gap-2">
          <button
            onClick={() => setPeriod('week')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              period === 'week'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            This Week
          </button>
          <button
            onClick={() => setPeriod('month')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              period === 'month'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            This Month
          </button>
          <button
            onClick={() => setPeriod('year')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              period === 'year'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            This Year
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
          <div className="flex items-center justify-between mb-2">
            <BookOpen className="h-8 w-8 text-blue-600" />
            <span className="text-sm font-medium text-blue-600">Total</span>
          </div>
          <div className="text-3xl font-bold text-gray-900">{borrowStats.totalBorrows}</div>
          <p className="text-sm text-gray-600 mt-1">Books Borrowed</p>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="h-8 w-8 text-green-600" />
            <span className="text-sm font-medium text-green-600">Active</span>
          </div>
          <div className="text-3xl font-bold text-gray-900">{borrowStats.activeBorrows}</div>
          <p className="text-sm text-gray-600 mt-1">Currently Borrowed</p>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border border-purple-200">
          <div className="flex items-center justify-between mb-2">
            <Calendar className="h-8 w-8 text-purple-600" />
            <span className="text-sm font-medium text-purple-600">Returned</span>
          </div>
          <div className="text-3xl font-bold text-gray-900">{borrowStats.returned}</div>
          <p className="text-sm text-gray-600 mt-1">Books Returned</p>
        </div>

        <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-6 border border-red-200">
          <div className="flex items-center justify-between mb-2">
            <AlertCircle className="h-8 w-8 text-red-600" />
            <span className="text-sm font-medium text-red-600">Overdue</span>
          </div>
          <div className="text-3xl font-bold text-gray-900">{borrowStats.overdue}</div>
          <p className="text-sm text-gray-600 mt-1">Overdue Books</p>
        </div>
      </div>

      {/* Popular Books */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-5 w-5 text-purple-600" />
          <h3 className="text-lg font-semibold text-gray-900">Most Popular Books</h3>
        </div>
        
        {popularBooks.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No borrowing data available for this period</p>
        ) : (
          <div className="space-y-3">
            {popularBooks.map((book, index) => (
              <div key={book.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div className="flex-shrink-0 w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold">
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-gray-900 truncate">{book.title}</h4>
                  <p className="text-sm text-gray-600 truncate">{book.author}</p>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-purple-600">{book.borrow_count}</div>
                  <div className="text-xs text-gray-500">borrows</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Category Distribution */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <PieChart className="h-5 w-5 text-purple-600" />
          <h3 className="text-lg font-semibold text-gray-900">Popular Categories</h3>
        </div>
        
        {categoryStats.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No category data available</p>
        ) : (
          <div className="space-y-3">
            {categoryStats.map((stat, index) => (
              <div key={stat.category} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-gray-700">{stat.category}</span>
                  <span className="text-gray-600">{stat.count} ({stat.percentage.toFixed(1)}%)</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${stat.percentage}%`,
                      backgroundColor: `hsl(${(index * 360) / categoryStats.length}, 70%, 50%)`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* User Activity Trends */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="h-5 w-5 text-purple-600" />
          <h3 className="text-lg font-semibold text-gray-900">User Activity Trends</h3>
        </div>
        
        {userActivity.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No activity data available</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 text-sm font-semibold text-gray-700">Date</th>
                  <th className="text-center py-2 px-3 text-sm font-semibold text-gray-700">Borrows</th>
                  <th className="text-center py-2 px-3 text-sm font-semibold text-gray-700">Returns</th>
                  <th className="text-center py-2 px-3 text-sm font-semibold text-gray-700">New Users</th>
                </tr>
              </thead>
              <tbody>
                {userActivity.map((activity) => (
                  <tr key={activity.date} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-2 px-3 text-sm text-gray-900">
                      {new Date(activity.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </td>
                    <td className="py-2 px-3 text-center">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                        {activity.borrows}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-center">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                        {activity.returns}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-center">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                        {activity.new_users}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
