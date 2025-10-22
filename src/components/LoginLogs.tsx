import React, { useEffect, useState } from 'react';
import { Clock, Search, Edit2, Save, X, Filter } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

type LoginLog = {
  id: string;
  user_id: string | null;
  enrollment_id: string;
  full_name?: string;
  role?: string;
  status?: string;
  login_at: string;
  ip_address: string | null;
  user_agent: string | null;
  success?: boolean;
  created_at?: string;
  user_profiles?: {
    full_name: string;
    role: string;
  };
};

export function LoginLogs() {
  const [logs, setLogs] = useState<LoginLog[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'student' | 'staff'>('all');
  const [editingLog, setEditingLog] = useState<string | null>(null);
  const [editEnrollmentId, setEditEnrollmentId] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLogs();
  }, [roleFilter]);

  const loadLogs = async () => {
    setLoading(true);
    console.log('Loading login logs...');
    
    try {
      // First, try to load with relationship
      const query = supabase
        .from('login_logs')
        .select(`
          *,
          user_profiles (
            full_name,
            role
          )
        `)
        .order('login_at', { ascending: false })
        .limit(100);

      let { data, error } = await query;

      // If relationship error, try without it (use fields directly from login_logs)
      if (error && error.message.includes('relationship')) {
        console.warn('Relationship not found, using direct fields from login_logs');
        toast.error('Login logs table needs to be fixed. Please run fix_login_logs_relationship.sql', {
          duration: 6000
        });
        
        const simpleQuery = await supabase
          .from('login_logs')
          .select('*')
          .order('login_at', { ascending: false })
          .limit(100);
        
        data = simpleQuery.data;
        error = simpleQuery.error;
      }

      console.log('Login logs query result:', { data, error, count: data?.length });

      if (error) {
        console.error('Error loading login logs:', error);
        
        // Check if it's a network error
        if (error.message && (error.message.includes('Failed to fetch') || error.message.includes('NetworkError'))) {
          toast.error('Network error: Unable to connect to server. Please check your internet connection.');
        } else if (error.code === '42P01') {
          toast.error('Login logs table does not exist. Please contact administrator.');
        } else {
          toast.error('Error loading login logs: ' + error.message);
        }
        
        setLoading(false);
        return;
      }

      if (data) {
        let filteredData = data;
        if (roleFilter !== 'all') {
          // Filter by role from user_profiles if available, otherwise from direct field
          filteredData = data.filter(log => {
            const role = log.user_profiles?.role || log.role;
            return role === roleFilter;
          });
        }
        console.log('Setting logs:', filteredData.length, 'records');
        setLogs(filteredData as LoginLog[]);
      } else {
        console.log('No data returned from query');
        setLogs([]);
      }
      
      setLoading(false);
    } catch (err) {
      console.error('Unexpected error loading login logs:', err);
      toast.error('Network error: Unable to connect to server. Please check your internet connection and try again.');
      setLoading(false);
    }
  };

  const handleUpdateEnrollmentId = async (logId: string) => {
    if (!editEnrollmentId.trim()) {
      toast.error('Enrollment ID cannot be empty');
      return;
    }

    const { error } = await supabase
      .from('login_logs')
      .update({ enrollment_id: editEnrollmentId })
      .eq('id', logId);

    if (error) {
      toast.error('Failed to update enrollment ID');
      return;
    }

    toast.success('Enrollment ID updated successfully');
    setEditingLog(null);
    loadLogs();
  };

  const filteredLogs = logs.filter(log =>
    log.enrollment_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.user_profiles?.full_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Clock className="h-7 w-7 text-blue-600" />
            Login Logs
          </h2>
          <p className="text-sm text-gray-600 mt-1">View and manage login history for all users</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Search by name or enrollment ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setRoleFilter('all')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  roleFilter === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setRoleFilter('student')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  roleFilter === 'student'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Students
              </button>
              <button
                onClick={() => setRoleFilter('staff')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  roleFilter === 'staff'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Staff
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading logs...</div>
          ) : filteredLogs.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No login logs found</div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Enrollment ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Login Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {log.user_profiles?.full_name || log.full_name || 'Unknown User'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {editingLog === log.id ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={editEnrollmentId}
                            onChange={(e) => setEditEnrollmentId(e.target.value)}
                            className="px-2 py-1 border border-gray-300 rounded text-sm font-mono"
                            autoFocus
                          />
                          <button
                            onClick={() => handleUpdateEnrollmentId(log.id)}
                            className="p-1 text-green-600 hover:text-green-700"
                          >
                            <Save className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setEditingLog(null)}
                            className="p-1 text-gray-600 hover:text-gray-700"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="text-sm text-gray-700 font-mono">{log.enrollment_id}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          (log.user_profiles?.role || log.role) === 'student'
                            ? 'bg-blue-100 text-blue-800'
                            : (log.user_profiles?.role || log.role) === 'staff'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-purple-100 text-purple-800'
                        }`}
                      >
                        {log.user_profiles?.role || log.role || 'Unknown'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      <div>{new Date(log.login_at).toLocaleDateString()}</div>
                      <div className="text-xs text-gray-500">
                        {new Date(log.login_at).toLocaleTimeString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          (log.success !== false && log.status !== 'failed')
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {log.status === 'success' || log.success ? 'Success' : 'Failed'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {editingLog !== log.id && (
                        <button
                          onClick={() => {
                            setEditingLog(log.id);
                            setEditEnrollmentId(log.enrollment_id);
                          }}
                          className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                        >
                          <Edit2 className="h-4 w-4" />
                          Edit ID
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <p className="text-sm text-gray-600">
            Showing {filteredLogs.length} of {logs.length} login logs
          </p>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">About Login Logs</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• View login history with timestamps for all students and staff</li>
          <li>• Filter by role to see specific user types</li>
          <li>• Update enrollment IDs if a user loses their credentials</li>
          <li>• Track successful and failed login attempts</li>
          <li>• Logs are automatically created on each login attempt</li>
        </ul>
      </div>
    </div>
  );
}
