import { useState, useEffect } from 'react';
import { Users, Plus, Trash2, Shield, Mail, User, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

type Admin = {
  id: string;
  email: string;
  full_name: string;
  role: string;
  institution_id: string | null;
  created_at: string;
  institutions?: {
    name: string;
  };
};

export function AdminManagement() {
  const { profile } = useAuth();
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    role: 'librarian',
    institution_id: '',
  });
  const [institutions, setInstitutions] = useState<{ id: string; name: string }[]>([]);

  const isSuperAdmin = profile?.role === 'super_admin';

  useEffect(() => {
    loadAdmins();
    loadInstitutions();
  }, []);

  const loadInstitutions = async () => {
    const { data, error } = await supabase
      .from('institutions')
      .select('id, name')
      .order('name');

    if (!error && data) {
      setInstitutions(data);
    }
  };

  const loadAdmins = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select(`
          *,
          institutions:institution_id (name)
        `)
        .in('role', ['librarian', 'super_admin'])
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading admins:', error);
        toast.error('Failed to load administrators');
      } else {
        setAdmins(data || []);
      }
    } catch (err) {
      console.error('Unexpected error:', err);
      toast.error('Failed to load administrators');
    }
    setLoading(false);
  };

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.email || !formData.full_name) {
      toast.error('Email and full name are required');
      return;
    }

    if (formData.role === 'librarian' && !formData.institution_id) {
      toast.error('Institution is required for librarians');
      return;
    }

    setSubmitting(true);

    try {
      // Call Edge Function to create admin user
      const { data, error } = await supabase.functions.invoke('create-admin-user', {
        body: {
          email: formData.email,
          full_name: formData.full_name,
          role: formData.role,
          institution_id: formData.role === 'librarian' ? formData.institution_id : null,
        },
      });

      if (error) {
        console.error('Error creating admin:', error);
        toast.error('Failed to create administrator: ' + error.message);
      } else {
        toast.success('Administrator created successfully! Invitation email sent.');
        setShowAddModal(false);
        setFormData({ email: '', full_name: '', role: 'librarian', institution_id: '' });
        loadAdmins();
      }
    } catch (err: any) {
      console.error('Unexpected error:', err);
      toast.error('Failed to create administrator: ' + (err.message || 'Unknown error'));
    }

    setSubmitting(false);
  };

  const handleDeleteAdmin = async (adminId: string, adminEmail: string) => {
    if (!window.confirm(`Are you sure you want to remove ${adminEmail}? This action cannot be undone.`)) {
      return;
    }

    try {
      // Note: This only removes from user_profiles. The auth.users entry remains.
      // For full deletion, you'd need an admin function.
      const { error } = await supabase
        .from('user_profiles')
        .delete()
        .eq('id', adminId);

      if (error) {
        console.error('Error deleting admin:', error);
        toast.error('Failed to remove administrator');
      } else {
        toast.success('Administrator removed successfully');
        loadAdmins();
      }
    } catch (err) {
      console.error('Unexpected error:', err);
      toast.error('Failed to remove administrator');
    }
  };

  if (!isSuperAdmin) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-8 text-center">
        <Shield className="h-16 w-16 mx-auto mb-4 text-yellow-600" />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Access Restricted</h3>
        <p className="text-gray-600">
          Only super administrators can manage admin accounts.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold text-gray-900">Administrator Management</h3>
          <p className="text-sm text-gray-600 mt-1">Manage librarians and super admins</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-3 rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all duration-300 shadow-md hover:shadow-lg"
        >
          <Plus className="h-5 w-5" />
          Add Administrator
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-purple-600" />
            <div>
              <p className="text-sm text-gray-600">Super Admins</p>
              <p className="text-2xl font-bold text-gray-900">
                {admins.filter(a => a.role === 'super_admin').length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <Users className="h-8 w-8 text-blue-600" />
            <div>
              <p className="text-sm text-gray-600">Librarians</p>
              <p className="text-2xl font-bold text-gray-900">
                {admins.filter(a => a.role === 'librarian').length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <User className="h-8 w-8 text-green-600" />
            <div>
              <p className="text-sm text-gray-600">Total Admins</p>
              <p className="text-2xl font-bold text-gray-900">{admins.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Admins List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-600 border-t-transparent"></div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Administrator
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Institution
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {admins.map((admin) => (
                  <tr key={admin.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-gray-900">{admin.full_name}</p>
                        <p className="text-sm text-gray-500">{admin.email}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                        admin.role === 'super_admin' 
                          ? 'bg-purple-100 text-purple-700' 
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        {admin.role === 'super_admin' ? '👑 Super Admin' : '📚 Librarian'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {admin.institutions?.name || 'All Institutions'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(admin.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      {admin.id !== profile?.id && (
                        <button
                          onClick={() => handleDeleteAdmin(admin.id, admin.email)}
                          className="text-red-600 hover:text-red-800 transition-colors p-2 hover:bg-red-50 rounded-lg"
                          title="Remove Admin"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Admin Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900">Add Administrator</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddAdmin} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Mail className="h-4 w-4 inline mr-1" />
                  Email Address
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="admin@example.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <User className="h-4 w-4 inline mr-1" />
                  Full Name
                </label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="John Doe"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Shield className="h-4 w-4 inline mr-1" />
                  Role
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="librarian">Librarian</option>
                  <option value="super_admin">Super Admin</option>
                </select>
              </div>

              {formData.role === 'librarian' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Institution
                  </label>
                  <select
                    value={formData.institution_id}
                    onChange={(e) => setFormData({ ...formData, institution_id: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    required
                  >
                    <option value="">Select Institution</option>
                    {institutions.map((inst) => (
                      <option key={inst.id} value={inst.id}>{inst.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-3 rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all duration-300 font-semibold disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Create Administrator'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
