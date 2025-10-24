import React, { useEffect, useState } from 'react';
import { Trophy, Medal, Award, BookOpen, TrendingUp } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { LoadingSkeleton } from './ui/LoadingSkeleton';

type LeaderboardEntry = {
  user_id: string;
  user_name: string;
  books_read: number;
  total_points: number;
  role: string;
};

export function Leaderboard() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'all' | 'month' | 'week'>('all');

  useEffect(() => {
    loadLeaderboard();
  }, [timeRange]);

  const loadLeaderboard = async () => {
    setLoading(true);

    let dateFilter = '';
    if (timeRange === 'month') {
      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      dateFilter = monthAgo.toISOString();
    } else if (timeRange === 'week') {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      dateFilter = weekAgo.toISOString();
    }

    // Get all approved book reports
    let query = supabase
      .from('book_reports')
      .select(`
        user_id,
        points_awarded,
        created_at,
        user_profiles!book_reports_user_id_fkey (
          id,
          full_name,
          role
        )
      `)
      .eq('status', 'approved');

    if (dateFilter) {
      query = query.gte('created_at', dateFilter);
    }

    const { data: reports, error } = await query;

    if (error) {
      console.error('Error loading leaderboard:', error);
      setLoading(false);
      return;
    }

    // Aggregate points by user
    const userPointsMap = new Map<string, { name: string; count: number; points: number; role: string }>();

    reports?.forEach((report) => {
      const profiles = report.user_profiles as unknown as { id: string; full_name: string; role: string };
      if (!profiles) return;

      const existing = userPointsMap.get(profiles.id);
      if (existing) {
        existing.count++;
        existing.points += report.points_awarded || 0;
      } else {
        userPointsMap.set(profiles.id, {
          name: profiles.full_name,
          count: 1,
          points: report.points_awarded || 0,
          role: profiles.role,
        });
      }
    });

    const leaderboardData: LeaderboardEntry[] = Array.from(userPointsMap.entries())
      .map(([id, data]) => ({
        user_id: id,
        user_name: data.name,
        books_read: data.count,
        total_points: data.points,
        role: data.role,
      }))
      .sort((a, b) => b.total_points - a.total_points)
      .slice(0, 20);

    setLeaderboard(leaderboardData);
    setLoading(false);
  };

  const getRankIcon = (index: number) => {
    if (index === 0) return <Trophy className="h-6 w-6 text-yellow-500" />;
    if (index === 1) return <Medal className="h-6 w-6 text-gray-400" />;
    if (index === 2) return <Award className="h-6 w-6 text-orange-600" />;
    return null;
  };

  const getRankBadge = (index: number) => {
    if (index === 0) return 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-white';
    if (index === 1) return 'bg-gradient-to-r from-gray-300 to-gray-500 text-white';
    if (index === 2) return 'bg-gradient-to-r from-orange-400 to-orange-600 text-white';
    return 'bg-gray-100 text-gray-700';
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'librarian':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'staff':
        return 'bg-teal-100 text-teal-700 border-teal-200';
      case 'student':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  if (loading) {
    return <LoadingSkeleton type="list" title="Reading Leaderboard" subtitle="Top readers in the library" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-yellow-100 p-3 rounded-xl">
            <TrendingUp className="h-6 w-6 text-yellow-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Reading Leaderboard</h2>
            <p className="text-sm text-gray-600">Top readers in the library</p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setTimeRange('week')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              timeRange === 'week'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            This Week
          </button>
          <button
            onClick={() => setTimeRange('month')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              timeRange === 'month'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            This Month
          </button>
          <button
            onClick={() => setTimeRange('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              timeRange === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All Time
          </button>
        </div>
      </div>

      {leaderboard.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <BookOpen className="h-16 w-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Data Available</h3>
          <p className="text-gray-500">Start reading books to appear on the leaderboard</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Rank</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Reader</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Role</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900">Books Read</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {leaderboard.map((entry, index) => (
                  <tr
                    key={entry.user_id}
                    className={`${
                      index < 3 ? 'bg-yellow-50/30' : 'hover:bg-gray-50'
                    } transition-colors`}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {getRankIcon(index) || (
                          <div className={`flex items-center justify-center w-8 h-8 rounded-full font-semibold text-sm ${getRankBadge(index)}`}>
                            {index + 1}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{entry.user_name}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getRoleColor(entry.role)}`}>
                        {entry.role.charAt(0).toUpperCase() + entry.role.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="space-y-1">
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-2xl font-bold text-indigo-600">{entry.total_points}</span>
                          <span className="text-sm text-gray-500">pts</span>
                        </div>
                        <div className="flex items-center justify-end gap-1 text-xs text-gray-500">
                          <BookOpen className="h-3 w-3" />
                          <span>{entry.books_read} book{entry.books_read !== 1 ? 's' : ''}</span>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
