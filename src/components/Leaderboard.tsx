import React, { useEffect, useState } from 'react';
import { Trophy, Medal, Award, BookOpen, TrendingUp } from 'lucide-react';
import { supabase } from '../lib/supabase';

type LeaderboardEntry = {
  user_id: string;
  user_name: string;
  books_read: number;
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

    let query = supabase
      .from('borrow_records')
      .select('student_id, staff_id')
      .eq('status', 'completed');

    if (dateFilter) {
      query = query.gte('return_date', dateFilter);
    }

    const { data: records, error } = await query;

    if (error) {
      console.error('Error loading leaderboard:', error);
      setLoading(false);
      return;
    }

    const allUserIds = new Set<string>();
    records?.forEach((record) => {
      const userId = record.student_id || record.staff_id;
      if (userId) allUserIds.add(userId);
    });

    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('id, full_name, role, student_id, staff_id')
      .or(
        Array.from(allUserIds)
          .map((id) => `student_id.eq.${id},staff_id.eq.${id}`)
          .join(',')
      );

    const userProfileMap = new Map<string, { id: string; name: string; role: string }>();
    profiles?.forEach((profile) => {
      const entityId = profile.student_id || profile.staff_id;
      if (entityId) {
        userProfileMap.set(entityId, {
          id: profile.id,
          name: profile.full_name,
          role: profile.role,
        });
      }
    });

    const userCountMap = new Map<string, { name: string; count: number; role: string }>();

    records?.forEach((record) => {
      const entityId = record.student_id || record.staff_id;
      if (!entityId) return;

      const profile = userProfileMap.get(entityId);
      if (!profile) return;

      const existing = userCountMap.get(profile.id);
      if (existing) {
        existing.count++;
      } else {
        userCountMap.set(profile.id, {
          name: profile.name,
          count: 1,
          role: profile.role,
        });
      }
    });

    const leaderboardData: LeaderboardEntry[] = Array.from(userCountMap.entries())
      .map(([id, data]) => ({
        user_id: id,
        user_name: data.name,
        books_read: data.count,
        role: data.role,
      }))
      .sort((a, b) => b.books_read - a.books_read)
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
    return <div className="text-center py-12">Loading...</div>;
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
                      <div className="flex items-center justify-end gap-2">
                        <span className="text-lg font-bold text-gray-900">{entry.books_read}</span>
                        <BookOpen className="h-5 w-5 text-gray-400" />
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
