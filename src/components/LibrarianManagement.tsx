import React, { useEffect, useState, useRef } from 'react';
import { Shield, Plus, Edit2, Trash2, Search, X, KeyRound, Printer } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { generateSecurePassword } from '../utils/validation';

type Librarian = {
  id: string;
  email: string;
  full_name: string;
  role: string;
  created_at: string;
};

type GeneratedCredentials = {
  email: string;
  password: string;
  enrollmentId?: string;
  fullName?: string;
};

export function LibrarianManagement() {
  const [librarians, setLibrarians] = useState<Librarian[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddingLibrarian, setIsAddingLibrarian] = useState(false);
  const [showCredentials, setShowCredentials] = useState(false);
  const [generatedCredentials, setGeneratedCredentials] = useState<GeneratedCredentials | null>(null);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [selectedLibrarian, setSelectedLibrarian] = useState<Librarian | null>(null);
  const printRef = useRef<HTMLDivElement>(null);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
  });

  useEffect(() => {
    loadLibrarians();
  }, []);

  const loadLibrarians = async () => {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('role', 'librarian')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading librarians:', error);
      return;
    }

    setLibrarians(data || []);
  };

  const generatePassword = () => {
    // Use the secure password generator that guarantees all requirements:
    // 10+ chars, uppercase, lowercase, number, special char
    return generateSecurePassword(12);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const password = generatePassword();
    const enrollmentId = `LIB${Math.floor(Math.random() * 100000000)}`;

    console.log('Creating librarian account with:', { email: formData.email, full_name: formData.full_name, enrollmentId });

    try {
      // First, check if user profile already exists
      const { data: existingProfile } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('email', formData.email)
        .maybeSingle();

      if (existingProfile) {
        toast.error('A user with this email already exists');
        return;
      }

      // Show loading message
      toast.loading('Creating librarian account...', { id: 'create-librarian' });

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password,
        options: {
          emailRedirectTo: undefined, // Disable email confirmation
        },
      });

      console.log('Auth signup result:', { authData, authError });

      if (authError) {
        console.error('Auth error:', authError);
        
        // Check if it's a rate limit error
        if (authError.message && authError.message.includes('rate limit')) {
          toast.error('Please wait a moment before creating another account. Email rate limit reached.');
        } else {
          toast.error('Error creating librarian account: ' + authError.message);
        }
        return;
      }

      if (!authData.user) {
        toast.dismiss('create-librarian');
        toast.error('Failed to create user account');
        return;
      }

      // Wait a bit to ensure auth user is fully created and avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Check again if profile was auto-created by a trigger
      const { data: autoProfile } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('id', authData.user.id)
        .maybeSingle();

      if (autoProfile) {
        // Profile already exists, just update it
        const { error: updateError } = await supabase
          .from('user_profiles')
          .update({
            email: formData.email,
            full_name: formData.full_name,
            role: 'librarian',
            enrollment_id: enrollmentId,
          })
          .eq('id', authData.user.id);

        if (updateError) {
          console.error('Profile update error:', updateError);
          alert('Error updating librarian profile: ' + updateError.message);
          return;
        }
      } else {
        // Create new profile
        const { error: profileError } = await supabase
          .from('user_profiles')
          .insert({
            id: authData.user.id,
            email: formData.email,
            full_name: formData.full_name,
            role: 'librarian',
            enrollment_id: enrollmentId,
          });

        console.log('Profile insert result:', { profileError });

        if (profileError) {
          console.error('Profile error:', profileError);
          alert('Error creating librarian profile: ' + profileError.message);
          return;
        }
      }

      setGeneratedCredentials({
        email: formData.email,
        password,
        enrollmentId,
        fullName: formData.full_name,
      });

      toast.dismiss('create-librarian');
      toast.success('Librarian account created successfully!');
      setShowCredentials(true);

      loadLibrarians();
      handleCancel();
    } catch (error) {
      toast.dismiss('create-librarian');
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Unexpected error:', error);
      toast.error('Error creating librarian: ' + errorMessage);
    }
  };

  const handleDelete = async (id: string, email: string) => {
    if (!confirm(`Are you sure you want to delete librarian account for ${email}? This action is irreversible.`)) return;

    try {
      // First delete from user_profiles (will cascade to other tables)
      const { error: profileError } = await supabase
        .from('user_profiles')
        .delete()
        .eq('id', id);

      if (profileError) {
        console.error('Error deleting profile:', profileError);
        toast.error('Error deleting librarian profile: ' + profileError.message);
        return;
      }

      // Then try to delete auth user (this might fail if no edge function, but profile is already deleted)
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-user`;
        
        try {
          const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json',
              'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            },
            body: JSON.stringify({ user_id: id }),
          });

          if (!response.ok) {
            console.warn('Edge function delete failed, but profile deleted successfully');
          }
        } catch (fetchError) {
          console.warn('Edge function not available, but profile deleted successfully');
        }
      }

      toast.success('Librarian deleted successfully');
      loadLibrarians();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error('Error deleting librarian: ' + errorMessage);
      console.error('Delete error:', error);
    }
  };

  const handleCancel = () => {
    setFormData({ full_name: '', email: '' });
    setIsAddingLibrarian(false);
  };

  const openResetPasswordModal = (librarian: Librarian) => {
    setSelectedLibrarian(librarian);
    setShowResetPasswordModal(true);
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
        <title>Librarian Account Credentials</title>
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
            color: #1e40af;
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
          <h2>Librarian Account Credentials</h2>
        </div>

        <div class="credentials">
          <div class="credential-row">
            <span class="label">Full Name:</span>
            <div class="value">${generatedCredentials.fullName || 'N/A'}</div>
          </div>
          <div class="credential-row">
            <span class="label">Enrollment ID:</span>
            <div class="value">${generatedCredentials.enrollmentId || 'N/A'}</div>
          </div>
          <div class="credential-row">
            <span class="label">Email:</span>
            <div class="value">${generatedCredentials.email}</div>
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

  const handleResetPassword = async () => {
    if (!selectedLibrarian) return;

    const newPassword = generatePassword();

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      alert('You must be logged in to reset passwords');
      return;
    }

    const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/reset-user-password`;

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          user_id: selectedLibrarian.id,
          new_password: newPassword,
        }),
      });

      const result = await response.json();

      if (!response.ok || result.error) {
        alert('Error resetting password: ' + (result.error || 'Unknown error'));
        return;
      }

      setGeneratedCredentials({
        email: selectedLibrarian.email,
        password: newPassword,
      });
      setShowResetPasswordModal(false);
      setShowCredentials(true);
      alert('Password reset successfully');
    } catch (error: unknown) {
      alert('Error resetting password: ' + error.message);
    }
  };

  const filteredLibrarians = librarians.filter(lib =>
    lib.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    lib.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Librarian Management</h2>
        <button
          onClick={() => setIsAddingLibrarian(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-5 w-5" />
          Add Librarian
        </button>
      </div>

      {isAddingLibrarian && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-6">
            <Shield className="h-6 w-6 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">
              Add New Librarian
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
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="librarian@iisbenin.edu"
                  required
                />
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
              <p className="font-medium">Auto-Generated Password</p>
              <p className="text-xs mt-1">A secure password will be generated automatically and displayed after account creation.</p>
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Create Librarian Account
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
            placeholder="Search librarians by name or email..."
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
                  Created At
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredLibrarians.map((librarian) => (
                <tr key={librarian.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {librarian.full_name}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {librarian.email}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {new Date(librarian.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <button
                      onClick={() => handleDelete(librarian.id, librarian.email)}
                      className="text-red-600 hover:text-red-800 transition-colors"
                      title="Delete Librarian"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>

                    <button
                      onClick={() => openResetPasswordModal(librarian)}
                      className="text-blue-600 hover:text-blue-800 transition-colors"
                      title="Reset Password"
                    >
                      <KeyRound className="h-5 w-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredLibrarians.length === 0 && (
            <div className="text-center py-8 text-gray-600">
              {searchQuery ? 'No librarians found matching your search.' : 'No other librarians yet.'}
            </div>
          )}
        </div>
      </div>

      {showCredentials && generatedCredentials && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Librarian Credentials</h3>
              <button onClick={() => setShowCredentials(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-green-800 font-medium mb-2">Librarian account created successfully!</p>
                <p className="text-sm text-green-700">Please provide these credentials to the new librarian:</p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="text"
                    value={generatedCredentials.email}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                  <input
                    type="text"
                    value={generatedCredentials.password}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 font-mono"
                  />
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
                <p className="font-medium">Important:</p>
                <p className="text-xs mt-1">Save these credentials now. The password cannot be retrieved later.</p>
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

      {showResetPasswordModal && selectedLibrarian && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Reset Librarian Password</h3>
              <button onClick={() => setShowResetPasswordModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-sm text-gray-700">
                Are you sure you want to reset the password for <span className="font-semibold">{selectedLibrarian.full_name}</span>?
              </p>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
                <p className="font-medium">A new password will be generated and displayed.</p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setShowResetPasswordModal(false)}
                  className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleResetPassword}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
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
