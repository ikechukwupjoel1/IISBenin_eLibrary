import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  BookOpen, 
  Clock, 
  Download,
  RefreshCw,
  Calendar,
  Award,
  AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

interface DailySnapshot {
  snapshot_date: string;
  total_users: number;
  active_users: number;
  total_books: number;
  total_borrows: number;
  active_borrows: number;
  overdue_borrows: number;
  new_users_today: number;
  new_books_today: number;
  borrows_today: number;
  returns_today: number;
  avg_borrows_per_user: number;
  avg_borrow_duration: number;
  top_books: Array<{ book_id: string; title: string; borrow_count: number }>;
  top_categories: Array<{ category: string; borrow_count: number }>;
  top_institutions: Array<{ institution_id: string; name: string; borrow_count: number }>;
}

interface CategoryAnalytics {
  category: string;
  total_books: number;
  total_borrows: number;
  active_borrows: number;
  unique_borrowers: number;
  borrows_last_30_days: number;
  growth_rate: number;
  avg_borrow_duration: number;
  popularity_score: number;
}

interface InstitutionStats {
  institution_id: string;
  institution_name: string;
  is_active: boolean;
  total_students: number;
  total_librarians: number;
  total_books: number;
  total_borrows: number;
  active_users: number;
  borrows_last_30_days: number;
  current_active_borrows: number;
  current_overdue: number;
  avg_borrow_duration: number;
}

interface TrendingBook {
  book_id: string;
  title: string;
  author: string;
  category: string;
  borrow_count: number;
  unique_borrowers: number;
  trend_direction: string;
}

export default function AnalyticsDashboard() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [snapshot, setSnapshot] = useState<DailySnapshot | null>(null);
  const [categories, setCategories] = useState<CategoryAnalytics[]>([]);
  const [institutions, setInstitutions] = useState<InstitutionStats[]>([]);
  const [trendingBooks, setTrendingBooks] = useState<TrendingBook[]>([]);
  const [selectedDateRange, setSelectedDateRange] = useState(7); // Last 7 days
  const [activeTab, setActiveTab] = useState<'overview' | 'categories' | 'institutions' | 'trends'>('overview');

  useEffect(() => {
    fetchAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);

      // Fetch latest daily snapshot
      const { data: snapshotData, error: snapshotError } = await supabase
        .from('daily_analytics_snapshots')
        .select('*')
        .order('snapshot_date', { ascending: false })
        .limit(1)
        .single();

      if (snapshotError) throw snapshotError;
      setSnapshot(snapshotData);

      // Fetch category analytics
      const { data: categoryData, error: categoryError } = await supabase
        .from('category_analytics')
        .select('*')
        .order('popularity_score', { ascending: false });

      if (categoryError) throw categoryError;
      setCategories(categoryData || []);

      // Fetch institution stats
      const { data: institutionData, error: institutionError } = await supabase
        .from('institution_performance_stats')
        .select('*')
        .order('total_borrows', { ascending: false });

      if (institutionError) throw institutionError;
      setInstitutions(institutionData || []);

      // Fetch trending books
      const { data: trendingData, error: trendingError } = await supabase
        .rpc('get_trending_books', { p_days: selectedDateRange, p_limit: 10 });

      if (trendingError) throw trendingError;
      setTrendingBooks(trendingData || []);

    } catch (error: unknown) {
      console.error('Error fetching analytics:', error);
      const message = error instanceof Error ? error.message : 'Failed to load analytics';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const refreshAnalyticsViews = async () => {
    try {
      setRefreshing(true);
      toast.loading('Refreshing analytics data...');

      const { error } = await supabase.rpc('refresh_analytics_views');

      if (error) throw error;

      toast.dismiss();
      toast.success('Analytics refreshed successfully');
      await fetchAnalytics();
    } catch (error: unknown) {
      toast.dismiss();
      const message = error instanceof Error ? error.message : 'Failed to refresh analytics';
      toast.error(message);
    } finally {
      setRefreshing(false);
    }
  };

  const generateSnapshot = async () => {
    try {
      toast.loading('Generating daily snapshot...');

      const { error } = await supabase.rpc('generate_daily_snapshot');

      if (error) throw error;

      toast.dismiss();
      toast.success('Snapshot generated successfully');
      await fetchAnalytics();
    } catch (error: unknown) {
      toast.dismiss();
      const message = error instanceof Error ? error.message : 'Failed to generate snapshot';
      toast.error(message);
    }
  };

  const exportToCSV = (data: unknown[], filename: string) => {
    if (!data || data.length === 0) {
      toast.error('No data to export');
      return;
    }

    const headers = Object.keys(data[0] as object);
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = (row as Record<string, unknown>)[header];
          return typeof value === 'string' ? `"${value}"` : value;
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Data exported successfully');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h2>
          <p className="text-gray-600 mt-1">Comprehensive insights and performance metrics</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={generateSnapshot}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <Calendar className="w-4 h-4" />
            Generate Snapshot
          </button>
          <button
            onClick={refreshAnalyticsViews}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh Data
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {snapshot && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Users</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{snapshot.total_users.toLocaleString()}</p>
                <p className="text-sm text-green-600 mt-2">+{snapshot.new_users_today} today</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg">
                <Users className="w-8 h-8 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Books</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{snapshot.total_books.toLocaleString()}</p>
                <p className="text-sm text-green-600 mt-2">+{snapshot.new_books_today} today</p>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <BookOpen className="w-8 h-8 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Borrows</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{snapshot.active_borrows.toLocaleString()}</p>
                <p className="text-sm text-blue-600 mt-2">{snapshot.borrows_today} borrowed today</p>
              </div>
              <div className="p-3 bg-indigo-50 rounded-lg">
                <TrendingUp className="w-8 h-8 text-indigo-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Overdue Books</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{snapshot.overdue_borrows.toLocaleString()}</p>
                <p className="text-sm text-gray-500 mt-2">
                  Avg: {snapshot.avg_borrow_duration?.toFixed(1) || 0} days
                </p>
              </div>
              <div className="p-3 bg-orange-50 rounded-lg">
                <Clock className="w-8 h-8 text-orange-600" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            {[
              { id: 'overview', label: 'Overview', icon: BarChart3 },
              { id: 'categories', label: 'Categories', icon: BookOpen },
              { id: 'institutions', label: 'Institutions', icon: Users },
              { id: 'trends', label: 'Trending', icon: TrendingUp }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && snapshot && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Top Books */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Top Books Today</h3>
                    <button
                      onClick={() => exportToCSV(snapshot.top_books || [], 'top_books')}
                      className="text-sm text-indigo-600 hover:text-indigo-700"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="space-y-3">
                    {snapshot.top_books?.slice(0, 5).map((book, index) => (
                      <div key={book.book_id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center justify-center w-8 h-8 bg-indigo-100 text-indigo-600 rounded-full font-bold text-sm">
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{book.title}</p>
                          <p className="text-xs text-gray-500">{book.borrow_count} borrows</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Top Categories */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Top Categories Today</h3>
                    <button
                      onClick={() => exportToCSV(snapshot.top_categories || [], 'top_categories')}
                      className="text-sm text-indigo-600 hover:text-indigo-700"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="space-y-3">
                    {snapshot.top_categories?.slice(0, 5).map((cat, index) => (
                      <div key={cat.category} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center justify-center w-8 h-8 bg-green-100 text-green-600 rounded-full font-bold text-sm">
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">{cat.category}</p>
                          <p className="text-xs text-gray-500">{cat.borrow_count} borrows</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Top Institutions */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Top Institutions Today</h3>
                  <button
                    onClick={() => exportToCSV(snapshot.top_institutions || [], 'top_institutions')}
                    className="text-sm text-indigo-600 hover:text-indigo-700"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {snapshot.top_institutions?.slice(0, 6).map((inst, index) => (
                    <div key={inst.institution_id} className="flex items-center gap-3 p-4 bg-gradient-to-br from-indigo-50 to-blue-50 rounded-lg border border-indigo-100">
                      <div className="flex items-center justify-center w-10 h-10 bg-indigo-600 text-white rounded-full font-bold">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{inst.name}</p>
                        <p className="text-xs text-gray-600">{inst.borrow_count} borrows</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Categories Tab */}
          {activeTab === 'categories' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Category Performance</h3>
                <button
                  onClick={() => exportToCSV(categories, 'category_analytics')}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100"
                >
                  <Download className="w-4 h-4" />
                  Export CSV
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Books</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Borrows</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Active</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last 30 Days</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Popularity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {categories.map(cat => (
                      <tr key={cat.category} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{cat.category}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{cat.total_books}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{cat.total_borrows}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{cat.active_borrows}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{cat.borrows_last_30_days}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-[100px]">
                              <div
                                className="bg-indigo-600 h-2 rounded-full"
                                style={{ width: `${Math.min(cat.popularity_score, 100)}%` }}
                              />
                            </div>
                            <span className="text-sm text-gray-600">{cat.popularity_score.toFixed(1)}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Institutions Tab */}
          {activeTab === 'institutions' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Institution Performance</h3>
                <button
                  onClick={() => exportToCSV(institutions, 'institution_stats')}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100"
                >
                  <Download className="w-4 h-4" />
                  Export CSV
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Institution</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Students</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Books</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Borrows</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Active</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Overdue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {institutions.map(inst => (
                      <tr key={inst.institution_id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{inst.institution_name}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            inst.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                          }`}>
                            {inst.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{inst.total_students}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{inst.total_books}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{inst.total_borrows}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{inst.current_active_borrows}</td>
                        <td className="px-4 py-3">
                          <span className={`text-sm font-medium ${
                            inst.current_overdue > 0 ? 'text-orange-600' : 'text-gray-600'
                          }`}>
                            {inst.current_overdue}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Trending Tab */}
          {activeTab === 'trends' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Trending Books</h3>
                <div className="flex items-center gap-3">
                  <select
                    value={selectedDateRange}
                    onChange={(e) => setSelectedDateRange(Number(e.target.value))}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    <option value={7}>Last 7 days</option>
                    <option value={14}>Last 14 days</option>
                    <option value={30}>Last 30 days</option>
                  </select>
                  <button
                    onClick={() => exportToCSV(trendingBooks, 'trending_books')}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100"
                  >
                    <Download className="w-4 h-4" />
                    Export
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {trendingBooks.map((book, index) => (
                  <div key={book.book_id} className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg border border-purple-100">
                    <div className="flex items-start gap-3">
                      <div className="flex items-center justify-center w-10 h-10 bg-purple-600 text-white rounded-full font-bold flex-shrink-0">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-sm font-semibold text-gray-900">{book.title}</h4>
                          {book.trend_direction === 'up' ? (
                            <TrendingUp className="w-5 h-5 text-green-600 flex-shrink-0" />
                          ) : (
                            <AlertCircle className="w-5 h-5 text-gray-400 flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-gray-600 mt-1">{book.author}</p>
                        <div className="flex items-center gap-4 mt-2">
                          <span className="text-xs text-gray-500">
                            <Award className="w-3 h-3 inline mr-1" />
                            {book.borrow_count} borrows
                          </span>
                          <span className="text-xs text-gray-500">
                            <Users className="w-3 h-3 inline mr-1" />
                            {book.unique_borrowers} readers
                          </span>
                        </div>
                        <span className="inline-block mt-2 px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">
                          {book.category}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
