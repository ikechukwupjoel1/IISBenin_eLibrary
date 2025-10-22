import React, { useEffect, useState } from 'react';
import { UserCog, Plus, Pencil, Trash2, Search, X, KeyRound, Printer } from 'lucide-react';
import { supabase, type Staff } from '../lib/supabase';
import toast from 'react-hot-toast';

type GeneratedCredentials = {
  enrollment_id: string;
  password: string;
  full_name?: string;
  email?: string;
};

export function StaffManagement() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddingStaff, setIsAddingStaff] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [showCredentials, setShowCredentials] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetPasswordStaff, setResetPasswordStaff] = useState<Staff | null>(null);
  const [generatedCredentials, setGeneratedCredentials] = useState<GeneratedCredentials | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone_number: '',
  });

  useEffect(() => {
    loadStaff();
  }, []);

  const loadStaff = async () => {
    console.log('Loading staff...');
    const { data, error } = await supabase
      .from('staff')
      .select('*')
      .order('name');

    console.log('Staff load result:', { data, error, count: data?.length });

    if (error) {
      console.error('Error loading staff:', error);
      return;
    }

    setStaff(data || []);
  };

  const generateEnrollmentId = () => {
    return 'STAFF' + Date.now().toString().slice(-7);
  };

  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let password = '';
    for (let i = 0; i < 8; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editingStaff) {
      console.log('Updating staff:', editingStaff.id, formData);
      
      const { data, error } = await supabase
        .from('staff')
        .update({
          name: formData.name,
          email: formData.email || null,
          phone_number: formData.phone_number || null,
        })
        .eq('id', editingStaff.id)
        .select();

      console.log('Update result:', { data, error });

      if (error) {
        toast.error('Error updating staff member: ' + error.message);
        console.error('Update error:', error);
        return;
      }

      toast.success('Staff member updated successfully');
      await loadStaff();
      handleCancel();
    } else {
      const enrollmentId = generateEnrollmentId();
      const password = generatePassword();
      const email = formData.email || `${enrollmentId.toLowerCase()}@iisbenin.edu`;

      // Use Edge Function to create user without affecting current session
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        alert('You must be logged in to create staff members');
        return;
      }

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user-account`;

      console.log('Creating staff with:', {
        email,
        full_name: formData.name,
        role: 'staff',
        enrollment_id: enrollmentId,
        phone_number: formData.phone_number || null,
      });

      try {
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            email,
            password,
            full_name: formData.name,
            role: 'staff',
            enrollment_id: enrollmentId,
            phone_number: formData.phone_number || null,
          }),
        });

        const result = await response.json();

        console.log('Staff creation response:', { 
          status: response.status, 
          statusText: response.statusText,
          result 
        });

        if (!response.ok || result.error) {
          const errorMsg = result.error || `HTTP ${response.status}: ${response.statusText}`;
          console.error('Staff creation failed:', { status: response.status, result });
          alert('Error creating staff member: ' + errorMsg + (result.debug ? '\nDebug: ' + JSON.stringify(result.debug) : ''));
          return;
        }

        setGeneratedCredentials({
          enrollment_id: enrollmentId,
          password,
          full_name: formData.name,
          email,
        });
        setShowCredentials(true);

        console.log('Staff created successfully, reloading staff list...');
        await loadStaff();
        console.log('Staff list reloaded');
        handleCancel();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        toast.error('Error creating staff member: ' + errorMessage);
      }
    }
  };

  const handleEdit = (staffMember: Staff) => {
    setEditingStaff(staffMember);
    setFormData({
      name: staffMember.name,
      email: staffMember.email || '',
      phone_number: staffMember.phone_number || '',
    });
    setIsAddingStaff(true);
  };

  const openResetPassword = (staffMember: Staff) => {
    setResetPasswordStaff(staffMember);
    setShowResetPassword(true);
  };

  const handleResetPassword = async () => {
    if (!resetPasswordStaff) return;

    const newPassword = generatePassword();

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('You must be logged in');
        return;
      }

      console.log('Resetting password for staff:', resetPasswordStaff);

      // Get the auth user ID from user_profiles linked to this staff member
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('id, email, role, staff_id')
        .eq('staff_id', resetPasswordStaff.id)
        .maybeSingle();

      console.log('Profile lookup result:', { 
        profileData, 
        profileError,
        staffId: resetPasswordStaff.id 
      });

      if (profileError) {
        toast.error('Error looking up user profile: ' + profileError.message);
        console.error('Profile error:', profileError);
        return;
      }

      if (!profileData) {
        toast.error('No user account found for this staff member. They may not have been registered properly.');
        console.error('No profile found for staff_id:', resetPasswordStaff.id);
        return;
      }

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/reset-user-password`;
      console.log('Calling reset API:', apiUrl, 'with user_id:', profileData.id);

      console.log('Sending reset request with:', {
        user_id: profileData.id,
        userEmail: profileData.email,
        staffName: resetPasswordStaff.name
      });

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          user_id: profileData.id, // Use the auth user ID, not the staff table ID
          new_password: newPassword,
        }),
      });

      const result = await response.json();
      console.log('Reset API response:', { 
        status: response.status, 
        statusText: response.statusText,
        result 
      });

      if (!response.ok || result.error) {
        const errorMsg = result.error || `HTTP ${response.status}: ${response.statusText}`;
        toast.error('Error resetting password: ' + errorMsg);
        console.error('Reset failed:', { status: response.status, result });
        return;
      }

      setGeneratedCredentials({
        enrollment_id: resetPasswordStaff.enrollment_id || '',
        password: newPassword,
      });
      setShowResetPassword(false);
      setShowCredentials(true);
      toast.success('Password reset successfully');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Reset password error:', error);
      toast.error('Error resetting password: ' + errorMessage);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this staff member? This will permanently remove their account.')) return;

    try {
      console.log('Deleting staff with ID:', id);

      // First, get the user_profile ID to delete the auth user
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('staff_id', id)
        .maybeSingle();

      console.log('Profile lookup:', { profileData, profileError });

      if (profileError) {
        console.error('Error fetching profile:', profileError);
      }

      // Delete the staff member (CASCADE will delete user_profile)
      const { data, error: staffError } = await supabase
        .from('staff')
        .delete()
        .eq('id', id)
        .select();

      console.log('Delete result:', { data, error: staffError });

      if (staffError) {
        toast.error('Error deleting staff member: ' + staffError.message);
        console.error('Delete error details:', staffError);
        return;
      }

      // If we have the profile ID, try to delete the auth user
      if (profileData?.id) {
        // Note: This requires admin privileges and should ideally be done via Edge Function
        // For now, the CASCADE delete on user_profiles should handle cleanup
        console.log('Staff and profile deleted, auth user ID:', profileData.id);
      }

      toast.success('Staff member deleted successfully');
      await loadStaff();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Catch error:', error);
      toast.error('Error deleting staff member: ' + errorMessage);
    }
  };

  const handlePrintCredentials = () => {
    if (!generatedCredentials) return;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups to print credentials');
      return;
    }

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Staff Account Credentials</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            padding: 40px;
            max-width: 600px;
            margin: 0 auto;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #333;
            padding-bottom: 20px;
          }
          .header h1 {
            margin: 0;
            color: #059669;
          }
          .credentials {
            background: #f3f4f6;
            border: 2px solid #d1d5db;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
          }
          .credential-row {
            margin: 15px 0;
          }
          .label {
            font-weight: bold;
            color: #374151;
            display: block;
            margin-bottom: 5px;
          }
          .value {
            font-size: 16px;
            color: #111827;
            padding: 8px;
            background: white;
            border: 1px solid #d1d5db;
            border-radius: 4px;
            font-family: monospace;
          }
          .warning {
            background: #fef3c7;
            border: 1px solid #fbbf24;
            border-radius: 8px;
            padding: 15px;
            margin: 20px 0;
          }
          .footer {
            margin-top: 30px;
            text-align: center;
            color: #6b7280;
            font-size: 12px;
            border-top: 1px solid #d1d5db;
            padding-top: 20px;
          }
          @media print {
            body { padding: 20px; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>IIS Benin eLibrary</h1>
          <h2>Staff Account Credentials</h2>
        </div>

        <div class="credentials">
          <div class="credential-row">
            <span class="label">Full Name:</span>
            <div class="value">${generatedCredentials.full_name || 'N/A'}</div>
          </div>
          <div class="credential-row">
            <span class="label">Enrollment ID:</span>
            <div class="value">${generatedCredentials.enrollment_id}</div>
          </div>
          <div class="credential-row">
            <span class="label">Email:</span>
            <div class="value">${generatedCredentials.email || 'N/A'}</div>
          </div>
          <div class="credential-row">
            <span class="label">Password:</span>
            <div class="value">${generatedCredentials.password}</div>
          </div>
        </div>

        <div class="warning">
          <p><strong>⚠️ Important:</strong></p>
          <ul>
            <li>Keep these credentials secure and confidential</li>
            <li>Change your password after first login</li>
            <li>This password cannot be retrieved later</li>
          </ul>
        </div>

        <div class="footer">
          <p>Generated on ${new Date().toLocaleString()}</p>
          <p>IIS Benin eLibrary Management System</p>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  const handleCancel = () => {
    setFormData({ name: '', email: '', phone_number: '' });
    setIsAddingStaff(false);
    setEditingStaff(null);
  };

  const filteredStaff = staff.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.email && s.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (s.enrollment_id && s.enrollment_id.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Staff Management</h2>
        <button
          onClick={() => setIsAddingStaff(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-5 w-5" />
          Register Staff
        </button>
      </div>

      {isAddingStaff && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-6">
            <UserCog className="h-6 w-6 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">
              {editingStaff ? 'Edit Staff Member' : 'Register New Staff Member'}
            </h3>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email (Optional)
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="email@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number (Optional)
                </label>
                <input
                  type="tel"
                  value={formData.phone_number}
                  onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="+1234567890"
                />
              </div>
            </div>

            {!editingStaff && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
                <p className="font-medium">Auto-Generated Credentials</p>
                <p className="text-xs mt-1">Enrollment ID and password will be generated automatically and displayed after registration.</p>
              </div>
            )}

            <div className="flex gap-2">
              <button
                type="submit"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                {editingStaff ? 'Update Staff' : 'Register Staff'}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search staff by name, email, or enrollment ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Enrollment ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Phone Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredStaff.map((staffMember) => (
                <tr key={staffMember.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {staffMember.name}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {staffMember.email || '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700 font-mono">
                    {staffMember.enrollment_id || '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {staffMember.phone_number || '-'}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(staffMember)}
                        className="text-blue-600 hover:text-blue-800 transition-colors"
                        title="Edit staff member"
                      >
                        <Pencil className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => openResetPassword(staffMember)}
                        className="text-amber-600 hover:text-amber-800 transition-colors"
                        title="Reset password"
                      >
                        <KeyRound className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(staffMember.id)}
                        className="text-red-600 hover:text-red-800 transition-colors"
                        title="Delete staff member"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredStaff.length === 0 && (
            <div className="text-center py-8 text-gray-600">
              {searchQuery ? 'No staff members found matching your search.' : 'No staff members yet. Add one to get started.'}
            </div>
          )}
        </div>
      </div>

      {showCredentials && generatedCredentials && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Staff Credentials</h3>
              <button onClick={() => setShowCredentials(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-green-800 font-medium mb-2">Staff member registered successfully!</p>
                <p className="text-sm text-green-700">Please provide these credentials to the staff member:</p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Enrollment ID</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={generatedCredentials.enrollment_id}
                      readOnly
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={generatedCredentials.password}
                      readOnly
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
                <p className="font-medium">Important:</p>
                <p className="text-xs mt-1">Save these credentials now. They cannot be retrieved later.</p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handlePrintCredentials}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                >
                  <Printer className="h-5 w-5" />
                  Print Credentials
                </button>
                <button
                  onClick={() => setShowCredentials(false)}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showResetPassword && resetPasswordStaff && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <KeyRound className="h-6 w-6 text-amber-600" />
                Reset Password
              </h3>
              <button onClick={() => setShowResetPassword(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <p className="text-amber-800 font-medium mb-2">Confirm Password Reset</p>
                <p className="text-sm text-amber-700">
                  You are about to reset the password for:
                </p>
                <p className="text-sm font-mono mt-2 text-amber-900">
                  {resetPasswordStaff.name} ({resetPasswordStaff.enrollment_id})
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
                <p className="font-medium">What happens next:</p>
                <ul className="list-disc list-inside text-xs mt-2 space-y-1">
                  <li>A new random password will be generated</li>
                  <li>The staff member's current password will be replaced</li>
                  <li>You will receive the new credentials to share with the staff member</li>
                </ul>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowResetPassword(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleResetPassword}
                  className="flex-1 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
                >
                  Reset Password
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
