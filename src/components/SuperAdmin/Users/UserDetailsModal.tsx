import React, { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import toast from 'react-hot-toast';
import { X, Ban, Check, Shield, Key, Clock, Activity } from 'lucide-react';

interface User {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  institution_id: string | null;
  institution_name: string | null;
  is_active: boolean;
  last_login: string | null;
  created_at: string;
}

interface UserDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  onUpdate: () => void;
}

interface ActivityLog {
  id: string;
  activity_type: string;
  activity_description: string;
  metadata: any;
  created_at: string;
}

export function UserDetailsModal({ isOpen, onClose, user, onUpdate }: UserDetailsModalProps) {
  const [activityLog, setActivityLog] = useState<ActivityLog[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [newRole, setNewRole] = useState(user.role);
  const [showRoleChange, setShowRoleChange] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadActivityLog();
    }
  }, [isOpen, user.id]);

  const loadActivityLog = async () => {
    setLoadingActivity(true);
    try {
      const { data, error } = await supabase.rpc('get_user_activity_log', {
        target_user_id: user.id,
        limit_count: 20
      });
      
      if (error) throw error;
      setActivityLog(data || []);
    } catch (error) {
      console.error('Failed to load activity log:', error);
    } finally {
      setLoadingActivity(false);
    }
  };

  const handleSuspend = async () => {
    if (!confirm(`Are you sure you want to suspend ${user.email}?`)) return;
    
    setActionLoading(true);
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) throw new Error('Not authenticated');
      
      const { error } = await supabase.rpc('bulk_suspend_users', {
        user_ids: [user.id],
        admin_id: currentUser.id,
        reason: 'Suspended via user management modal'
      });
      
      if (error) throw error;
      
      toast.success('User suspended successfully');
      onUpdate();
      onClose();
    } catch (error) {
      console.error('Failed to suspend user:', error);
      toast.error('Failed to suspend user');
    } finally {
      setActionLoading(false);
    }
  };

  const handleActivate = async () => {
    if (!confirm(`Are you sure you want to activate ${user.email}?`)) return;
    
    setActionLoading(true);
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) throw new Error('Not authenticated');
      
      const { error } = await supabase.rpc('bulk_activate_users', {
        user_ids: [user.id],
        admin_id: currentUser.id,
        reason: 'Activated via user management modal'
      });
      
      if (error) throw error;
      
      toast.success('User activated successfully');
      onUpdate();
      onClose();
    } catch (error) {
      console.error('Failed to activate user:', error);
      toast.error('Failed to activate user');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRoleChange = async () => {
    if (newRole === user.role) {
      setShowRoleChange(false);
      return;
    }
    
    if (!confirm(`Are you sure you want to change ${user.email}'s role from ${user.role} to ${newRole}?`)) return;
    
    setActionLoading(true);
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) throw new Error('Not authenticated');
      
      const { data, error } = await supabase.rpc('change_user_role', {
        target_user_id: user.id,
        new_role: newRole,
        admin_id: currentUser.id,
        reason: 'Role changed via user management modal'
      });
      
      if (error) throw error;
      
      if (data.success) {
        toast.success(`Role changed from ${data.old_role} to ${data.new_role}`);
        setShowRoleChange(false);
        onUpdate();
        onClose();
      } else {
        throw new Error(data.error || 'Failed to change role');
      }
    } catch (error: any) {
      console.error('Failed to change role:', error);
      toast.error(error.message || 'Failed to change role');
    } finally {
      setActionLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-gray-900">User Details</h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-4 overflow-y-auto max-h-[calc(90vh-200px)]">
            {/* User Info */}
            <div className="space-y-4 mb-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Email</label>
                  <p className="text-gray-900">{user.email}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Full Name</label>
                  <p className="text-gray-900">{user.full_name || '-'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Role</label>
                  <div className="flex items-center space-x-2">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      user.role === 'super_admin' ? 'bg-purple-100 text-purple-800' :
                      user.role === 'librarian' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {user.role}
                    </span>
                    <button
                      onClick={() => setShowRoleChange(!showRoleChange)}
                      className="text-blue-600 hover:text-blue-700 text-sm"
                    >
                      Change
                    </button>
                  </div>
                  {showRoleChange && (
                    <div className="mt-2 flex items-center space-x-2">
                      <select
                        value={newRole}
                        onChange={(e) => setNewRole(e.target.value)}
                        className="px-3 py-1 border border-gray-300 rounded-lg text-sm"
                      >
                        <option value="student">Student</option>
                        <option value="librarian">Librarian</option>
                        <option value="super_admin">Super Admin</option>
                      </select>
                      <button
                        onClick={handleRoleChange}
                        disabled={actionLoading}
                        className="px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => {
                          setShowRoleChange(false);
                          setNewRole(user.role);
                        }}
                        className="px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-300"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Status</label>
                  <p>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {user.is_active ? 'Active' : 'Suspended'}
                    </span>
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Institution</label>
                  <p className="text-gray-900">{user.institution_name || '-'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Last Login</label>
                  <p className="text-gray-900">
                    {user.last_login ? new Date(user.last_login).toLocaleString() : 'Never'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Account Created</label>
                  <p className="text-gray-900">{new Date(user.created_at).toLocaleString()}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">User ID</label>
                  <p className="text-gray-900 text-xs font-mono">{user.id}</p>
                </div>
              </div>
            </div>

            {/* Activity Log */}
            <div className="border-t border-gray-200 pt-4">
              <div className="flex items-center space-x-2 mb-4">
                <Activity className="w-5 h-5 text-gray-600" />
                <h4 className="font-semibold text-gray-900">Activity Log</h4>
              </div>
              
              {loadingActivity ? (
                <div className="text-center py-8 text-gray-500">
                  <Activity className="w-6 h-6 animate-spin mx-auto mb-2" />
                  Loading activity...
                </div>
              ) : activityLog.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No activity recorded yet
                </div>
              ) : (
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {activityLog.map(log => (
                    <div key={log.id} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">
                            {log.activity_description}
                          </p>
                          <p className="text-xs text-gray-600 mt-1">
                            {log.activity_type}
                          </p>
                        </div>
                        <span className="text-xs text-gray-500">
                          {new Date(log.created_at).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <div className="flex space-x-2">
              {user.is_active ? (
                <button
                  onClick={handleSuspend}
                  disabled={actionLoading}
                  className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  <Ban className="w-4 h-4" />
                  <span>Suspend User</span>
                </button>
              ) : (
                <button
                  onClick={handleActivate}
                  disabled={actionLoading}
                  className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                >
                  <Check className="w-4 h-4" />
                  <span>Activate User</span>
                </button>
              )}
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
