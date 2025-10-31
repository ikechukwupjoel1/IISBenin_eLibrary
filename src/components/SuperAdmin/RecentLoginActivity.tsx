import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import { LogIn, CheckCircle, XCircle } from 'lucide-react';

interface LoginLog {
  login_at: string;
  enrollment_id: string;
  status: string;
  role: string;
  full_name: string;
  institution_id: string;
}

export function RecentLoginActivity() {
  const [activity, setActivity] = useState<LoginLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActivity = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.rpc('get_recent_login_activity', { _limit: 10 });
        if (error) throw error;
        setActivity(data || []);
      } catch (error) {
        toast.error('Failed to load recent activity.');
        console.error('Error fetching recent activity:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchActivity();
  }, []);

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <h4 className="text-lg font-medium text-gray-900 mb-4">Recent Login Activity</h4>
        <p>Loading recent activity...</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h4 className="text-lg font-medium text-gray-900 mb-4">Recent Login Activity</h4>
      {activity.length === 0 ? (
        <p className="text-gray-500">No recent login activity.</p>
      ) : (
        <ul className="divide-y divide-gray-200">
          {activity.map((log, index) => (
            <li key={index} className="py-3 flex items-center space-x-3">
              <div className="flex-shrink-0">
                {log.status === 'success' ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-500" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {log.full_name || log.enrollment_id} ({log.role})
                </p>
                <p className="text-sm text-gray-500 truncate">
                  {log.status === 'success' ? 'Logged in' : 'Failed login'} at {new Date(log.login_at).toLocaleString()}
                </p>
              </div>
              <div className="flex-shrink-0 text-sm text-gray-500">
                {log.institution_id ? `Inst: ${log.institution_id.substring(0, 4)}...` : 'Global'}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
