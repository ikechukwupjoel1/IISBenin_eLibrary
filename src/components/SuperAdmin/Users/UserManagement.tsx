import React, { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import toast from 'react-hot-toast';
import { Search, Filter, UserPlus, Download, RefreshCw, CheckSquare, Square, Eye, Ban, Check, Trash2 } from 'lucide-react';
import { UserDetailsModal } from './UserDetailsModal';

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

export function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [institutionFilter, setInstitutionFilter] = useState<string>('');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);
  
  // Sorting
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC');
  
  // Selection
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);
  
  // Modal
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  
  // Institutions for filter
  const [institutions, setInstitutions] = useState<Array<{ id: string; name: string }>>([]);

  useEffect(() => {
    loadInstitutions();
  }, []);

  useEffect(() => {
    loadUsers();
  }, [searchTerm, roleFilter, statusFilter, institutionFilter, currentPage, sortBy, sortOrder]);

  const loadInstitutions = async () => {
    try {
      const { data, error } = await supabase
        .from('institutions')
        .select('id, name')
        .order('name');
      
      if (error) throw error;
      setInstitutions(data || []);
    } catch (error) {
      console.error('Failed to load institutions:', error);
    }
  };

  const loadUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_all_users_paginated', {
        search_term: searchTerm || null,
        role_filter: roleFilter || null,
        institution_filter: institutionFilter || null,
        status_filter: statusFilter || null,
        page_num: currentPage,
        page_size: pageSize,
        sort_by: sortBy,
        sort_order: sortOrder
      });
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        setUsers(data);
        setTotalCount(data[0].total_count || 0);
      } else {
        setUsers([]);
        setTotalCount(0);
      }
    } catch (error) {
      console.error('Failed to load users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'ASC' ? 'DESC' : 'ASC');
    } else {
      setSortBy(column);
      setSortOrder('ASC');
    }
  };

  const toggleUserSelection = (userId: string) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUsers(newSelected);
    setShowBulkActions(newSelected.size > 0);
  };

  const toggleSelectAll = () => {
    if (selectedUsers.size === users.length) {
      setSelectedUsers(new Set());
      setShowBulkActions(false);
    } else {
      setSelectedUsers(new Set(users.map(u => u.id)));
      setShowBulkActions(true);
    }
  };

  const handleBulkSuspend = async () => {
    if (!confirm(`Are you sure you want to suspend ${selectedUsers.size} users?`)) return;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase.rpc('bulk_suspend_users', {
        user_ids: Array.from(selectedUsers),
        admin_id: user.id,
        reason: 'Bulk suspension by super admin'
      });
      
      if (error) throw error;
      
      toast.success(`Successfully suspended ${data.suspended_count} users`);
      setSelectedUsers(new Set());
      setShowBulkActions(false);
      loadUsers();
    } catch (error) {
      console.error('Bulk suspend failed:', error);
      toast.error('Failed to suspend users');
    }
  };

  const handleBulkActivate = async () => {
    if (!confirm(`Are you sure you want to activate ${selectedUsers.size} users?`)) return;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase.rpc('bulk_activate_users', {
        user_ids: Array.from(selectedUsers),
        admin_id: user.id,
        reason: 'Bulk activation by super admin'
      });
      
      if (error) throw error;
      
      toast.success(`Successfully activated ${data.activated_count} users`);
      setSelectedUsers(new Set());
      setShowBulkActions(false);
      loadUsers();
    } catch (error) {
      console.error('Bulk activate failed:', error);
      toast.error('Failed to activate users');
    }
  };

  const exportToCSV = () => {
    const headers = ['Email', 'Name', 'Role', 'Institution', 'Status', 'Last Login', 'Created'];
    const rows = users.map(u => [
      u.email,
      u.full_name || '',
      u.role,
      u.institution_name || '',
      u.is_active ? 'Active' : 'Suspended',
      u.last_login ? new Date(u.last_login).toLocaleDateString() : 'Never',
      new Date(u.created_at).toLocaleDateString()
    ]);
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `users-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    toast.success('Exported to CSV');
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">User Management</h2>
          <p className="text-gray-600 mt-1">Manage all users across institutions</p>
        </div>
        <button
          onClick={exportToCSV}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Download className="w-4 h-4" />
          <span>Export CSV</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by email or name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Roles</option>
            <option value="student">Student</option>
            <option value="librarian">Librarian</option>
            <option value="super_admin">Super Admin</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </select>

          {/* Institution Filter */}
          <select
            value={institutionFilter}
            onChange={(e) => setInstitutionFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Institutions</option>
            {institutions.map(inst => (
              <option key={inst.id} value={inst.id}>{inst.name}</option>
            ))}
          </select>
        </div>

        {/* Active Filters */}
        {(searchTerm || roleFilter || statusFilter || institutionFilter) && (
          <div className="mt-4 flex items-center space-x-2">
            <span className="text-sm text-gray-600">Active filters:</span>
            <button
              onClick={() => {
                setSearchTerm('');
                setRoleFilter('');
                setStatusFilter('');
                setInstitutionFilter('');
              }}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* Bulk Actions */}
      {showBulkActions && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-blue-900 font-medium">
              {selectedUsers.size} user(s) selected
            </span>
            <div className="flex space-x-2">
              <button
                onClick={handleBulkActivate}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Check className="w-4 h-4" />
                <span>Activate</span>
              </button>
              <button
                onClick={handleBulkSuspend}
                className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <Ban className="w-4 h-4" />
                <span>Suspend</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left">
                  <button onClick={toggleSelectAll} className="hover:bg-gray-100 p-1 rounded">
                    {selectedUsers.size === users.length ? (
                      <CheckSquare className="w-5 h-5 text-blue-600" />
                    ) : (
                      <Square className="w-5 h-5 text-gray-400" />
                    )}
                  </button>
                </th>
                <th 
                  className="px-4 py-3 text-left text-sm font-semibold text-gray-900 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('email')}
                >
                  Email {sortBy === 'email' && (sortOrder === 'ASC' ? '↑' : '↓')}
                </th>
                <th 
                  className="px-4 py-3 text-left text-sm font-semibold text-gray-900 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('full_name')}
                >
                  Name {sortBy === 'full_name' && (sortOrder === 'ASC' ? '↑' : '↓')}
                </th>
                <th 
                  className="px-4 py-3 text-left text-sm font-semibold text-gray-900 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('role')}
                >
                  Role {sortBy === 'role' && (sortOrder === 'ASC' ? '↑' : '↓')}
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Institution</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Last Login</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                    Loading users...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                    No users found
                  </td>
                </tr>
              ) : (
                users.map(user => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <button 
                        onClick={() => toggleUserSelection(user.id)}
                        className="hover:bg-gray-100 p-1 rounded"
                      >
                        {selectedUsers.has(user.id) ? (
                          <CheckSquare className="w-5 h-5 text-blue-600" />
                        ) : (
                          <Square className="w-5 h-5 text-gray-400" />
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">{user.email}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{user.full_name || '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        user.role === 'super_admin' ? 'bg-purple-100 text-purple-800' :
                        user.role === 'librarian' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{user.institution_name || '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {user.is_active ? 'Active' : 'Suspended'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never'}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => {
                          setSelectedUser(user);
                          setShowUserModal(true);
                        }}
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 p-2 rounded"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalCount)} of {totalCount} users
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="px-3 py-1">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* User Details Modal */}
      {selectedUser && (
        <UserDetailsModal
          isOpen={showUserModal}
          onClose={() => {
            setShowUserModal(false);
            setSelectedUser(null);
          }}
          user={selectedUser}
          onUpdate={loadUsers}
        />
      )}
    </div>
  );
}
