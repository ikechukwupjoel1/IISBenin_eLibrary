import React, { useEffect, useState, useCallback } from 'react';
import { UserCog, Plus, Pencil, Trash2, Search, X, KeyRound, Printer, Upload } from 'lucide-react';
import { supabase, type Staff } from '../lib/supabase';
import toast from 'react-hot-toast';
import { generateSecurePassword } from '../utils/validation';
import { useAuth } from '../contexts/AuthContext';
import { LoadingSkeleton } from './ui/LoadingSkeleton';
import { BulkUserRegistration } from './BulkUserRegistration';

type GeneratedCredentials = {
  enrollment_id: string;
  password: string;
  full_name?: string;
  email?: string;
};

export function StaffManagement() {
  const { profile: currentLibrarianProfile } = useAuth();
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false); // Guard against double submissions
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddingStaff, setIsAddingStaff] = useState(false);
  const [showBulkRegister, setShowBulkRegister] = useState(false);
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
    let isMounted = true;

    const fetchData = async () => {
      if (currentLibrarianProfile && isMounted) {
        await loadStaff();
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [currentLibrarianProfile, loadStaff]);

  const loadStaff = useCallback(async () => {
    if (!currentLibrarianProfile?.institution_id) {
      setLoading(false);
      toast.error('Institution information not available. Please log in again.');
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('staff')
        .select('*')
        .eq('institution_id', currentLibrarianProfile.institution_id)
        .order('name');

      if (error) {
        console.error('Error loading staff:', error);
        toast.error(`Failed to load staff members: ${error.message}`);
        setStaff([]);
        return;
      }

      setStaff(data || []);
    } catch (error) {
      console.error('Unexpected error loading staff:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast.error(`Error loading staff: ${errorMessage}`);
      setStaff([]);
    } finally {
      setLoading(false);
    }
  }, [currentLibrarianProfile?.institution_id]);

  const generateEnrollmentId = async () => {
    const { data, error } = await supabase
      .rpc('get_next_enrollment_id', { role_type: 'staff' });
    
    if (error) {
      console.error('Error generating enrollment ID:', error);
      throw new Error('Failed to generate enrollment ID');
    }
    return data;
  };

  const generatePassword = () => {
    // Use the secure password generator that guarantees all requirements:
    // 10+ chars, uppercase, lowercase, number, special char
    return generateSecurePassword(12);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Prevent double submission
    if (submitting) {
      return;
    }

    if (!currentLibrarianProfile?.institution_id) {
      toast.error('Could not identify your institution. Please re-login.');
      return;
    }

    setSubmitting(true);

    try {
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
        const enrollmentId = await generateEnrollmentId();
        const password = generatePassword();
        const email = formData.email || `${enrollmentId.toLowerCase()}@iisbenin.edu`;

        // Use Edge Function to create user without affecting current session
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
          toast.error('You must be logged in to create staff members');
          return;
        }

        const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user-account`;

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
            institution_id: currentLibrarianProfile.institution_id,
          }),
        });

        const result = await response.json();

        if (!response.ok || result.error) {
          const errorMsg = result.error || `HTTP ${response.status}: ${response.statusText}`;
          console.error('Staff creation failed:', { status: response.status, result });
          toast.error('Error creating staff member: ' + errorMsg);
          return;
        }

        setGeneratedCredentials({
          enrollment_id: enrollmentId,
          password,
          full_name: formData.name,
          email,
        });
        setShowCredentials(true);

        await loadStaff();
        handleCancel();
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error in handleSubmit:', error);
      toast.error('Error processing request: ' + errorMessage);
    } finally {
      setSubmitting(false);
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

  if (loading) {
    return <LoadingSkeleton type="list" />;
  }

  return (
    <div className="space-y-6">
      {!isAddingStaff && !showBulkRegister ? (
        <>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Staff Management</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {staff.length} staff member{staff.length !== 1 ? 's' : ''} registered
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowBulkRegister(true)}
                className="flex items-center gap-2 bg-gradient-to-r from-green-600 to-green-700 text-white px-6 py-3 rounded-lg hover:from-green-700 hover:to-green-800 transition-all duration-300 shadow-md hover:shadow-lg active:scale-95 min-h-[44px]"
              >
                <Upload className="h-5 w-5" />
                Bulk Register
              </button>
              <button
                onClick={() => setIsAddingStaff(true)}
                className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-300 shadow-md hover:shadow-lg active:scale-95 min-h-[44px]"
              >
                <Plus className="h-5 w-5" />
                Register Staff
              </button>
            </div>
          </div>
        </>
      ) : (
        <div>
          <button
            onClick={() => {
              setIsAddingStaff(false);
              setShowBulkRegister(false);
              setEditingStaff(null);
            }}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors mb-4"
          >
            <X className="h-5 w-5" />
            Back to List
          </button>
        </div>
      )}

      {showBulkRegister && <BulkUserRegistration />}

      {isAddingStaff && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 transition-all duration-300">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/30 dark:to-blue-800/30 rounded-lg">
              <UserCog className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {editingStaff ? 'Edit Staff Member' : 'Register New Staff Member'}
            </h3>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-4 focus:ring-blue-300 dark:focus:ring-blue-600 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white min-h-[44px]"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email (Optional)
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-4 focus:ring-blue-300 dark:focus:ring-blue-600 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white min-h-[44px]"
                  placeholder="email@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Phone Number (Optional)
                </label>
                <input
                  type="tel"
                  value={formData.phone_number}
                  onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-4 focus:ring-blue-300 dark:focus:ring-blue-600 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white min-h-[44px]"
                  placeholder="+1234567890"
                />
              </div>
            </div>

            {!editingStaff && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-sm text-blue-800 dark:text-blue-300">
                <p className="font-medium">Auto-Generated Credentials</p>
                <p className="text-xs mt-1">Enrollment ID and password will be generated automatically and displayed after registration.</p>
              </div>
            )}

            <div className="flex gap-2">
              <button
                type="submit"
                className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-300 shadow-md hover:shadow-lg active:scale-95 min-h-[44px] font-medium"
              >
                {editingStaff ? 'Update Staff' : 'Register Staff'}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 px-6 py-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-300 min-h-[44px] font-medium"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {!showBulkRegister && !isAddingStaff && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 transition-all duration-300">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search staff by name, email, or enrollment ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-4 focus:ring-blue-300 dark:focus:ring-blue-600 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white min-h-[44px]"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Enrollment ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Phone Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredStaff.map((staffMember) => (
                <tr key={staffMember.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                    {staffMember.name}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                    {staffMember.email || '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300 font-mono">
                    {staffMember.enrollment_id || '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                    {staffMember.phone_number || '-'}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(staffMember)}
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors p-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center"
                        title="Edit staff member"
                      >
                        <Pencil className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => openResetPassword(staffMember)}
                        className="text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300 transition-colors p-2 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center"
                        title="Reset password"
                      >
                        <KeyRound className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(staffMember.id)}
                        className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 transition-colors p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center"
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
            <div className="text-center py-12 text-gray-600 dark:text-gray-400">
              {searchQuery ? 'No staff members found matching your search.' : 'No staff members yet. Add one to get started.'}
            </div>
          )}
        </div>
      </div>
      )}

      {showCredentials && generatedCredentials && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 z-50 overflow-y-auto animate-fade-in">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full my-4 sm:my-8 shadow-2xl max-h-[95vh] sm:max-h-[90vh] flex flex-col animate-scale-in">
            {/* Fixed Header */}
            <div className="flex items-center justify-between p-4 sm:p-6 pb-3 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">Staff Credentials</h3>
              <button onClick={() => setShowCredentials(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 min-w-[44px] min-h-[44px] flex items-center justify-center transition-all duration-300">
                <X className="h-5 w-5 sm:h-6 sm:w-6" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="overflow-y-auto flex-1 px-4 sm:px-6 py-4 space-y-4">
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <p className="text-green-800 dark:text-green-300 font-medium mb-2">Staff member registered successfully!</p>
                <p className="text-sm text-green-700 dark:text-green-400">Please provide these credentials to the staff member:</p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Enrollment ID</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={generatedCredentials.enrollment_id}
                      readOnly
                      className="flex-1 px-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white font-mono min-h-[44px]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={generatedCredentials.password}
                      readOnly
                      className="flex-1 px-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white font-mono min-h-[44px]"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 text-sm text-yellow-800 dark:text-yellow-300">
                <p className="font-medium">Important:</p>
                <p className="text-xs mt-1">Save these credentials now. They cannot be retrieved later.</p>
              </div>
            </div>

            {/* Fixed Footer */}
            <div className="flex gap-3 p-4 sm:p-6 pt-3 border-t border-gray-200 dark:border-gray-700 flex-shrink-0 bg-gray-50 dark:bg-gray-900">
              <button
                onClick={handlePrintCredentials}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 transition-all duration-300 shadow-md hover:shadow-lg active:scale-95 flex items-center justify-center gap-2 min-h-[44px] font-medium"
              >
                <Printer className="h-5 w-5" />
                <span className="hidden xs:inline">Print</span>
              </button>
              <button
                onClick={() => setShowCredentials(false)}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-300 shadow-md hover:shadow-lg active:scale-95 min-h-[44px] font-medium"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {showResetPassword && resetPasswordStaff && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 z-50 overflow-y-auto animate-fade-in">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full my-4 sm:my-8 shadow-2xl max-h-[95vh] sm:max-h-[90vh] flex flex-col animate-scale-in">
            {/* Fixed Header */}
            <div className="flex items-center justify-between p-4 sm:p-6 pb-3 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <KeyRound className="h-5 w-5 sm:h-6 sm:w-6 text-amber-600 dark:text-amber-400" />
                Reset Password
              </h3>
              <button onClick={() => setShowResetPassword(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 min-w-[44px] min-h-[44px] flex items-center justify-center transition-all duration-300">
                <X className="h-5 w-5 sm:h-6 sm:w-6" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="overflow-y-auto flex-1 px-4 sm:px-6 py-4 space-y-4">
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                <p className="text-amber-800 dark:text-amber-300 font-medium mb-2">Confirm Password Reset</p>
                <p className="text-sm text-amber-700 dark:text-amber-400">
                  You are about to reset the password for:
                </p>
                <p className="text-sm font-mono mt-2 text-amber-900 dark:text-amber-200">
                  {resetPasswordStaff.name} ({resetPasswordStaff.enrollment_id})
                </p>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-sm text-blue-800 dark:text-blue-300">
                <p className="font-medium">What happens next:</p>
                <ul className="list-disc list-inside text-xs mt-2 space-y-1">
                  <li>A new random password will be generated</li>
                  <li>The staff member's current password will be replaced</li>
                  <li>You will receive the new credentials to share with the staff member</li>
                </ul>
              </div>
            </div>

            {/* Fixed Footer */}
            <div className="flex gap-3 p-4 sm:p-6 pt-3 border-t border-gray-200 dark:border-gray-700 flex-shrink-0 bg-gray-50 dark:bg-gray-900">
              <button
                type="button"
                onClick={() => setShowResetPassword(false)}
                className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-300 min-h-[44px] font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleResetPassword}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-amber-600 to-amber-700 text-white rounded-lg hover:from-amber-700 hover:to-amber-800 transition-all duration-300 shadow-md hover:shadow-lg active:scale-95 min-h-[44px] font-medium"
              >
                Reset Password
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
