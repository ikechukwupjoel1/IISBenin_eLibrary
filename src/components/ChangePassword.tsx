import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Lock } from 'lucide-react';

export function ChangePassword() {
  const { profile } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!profile || (profile.role !== 'staff' && profile.role !== 'student')) {
    return (
      <div className="p-6 text-center">
        <Lock className="h-12 w-12 mx-auto mb-4 text-gray-300" />
        <p className="text-gray-600">Change password is available for staff and students only.</p>
      </div>
    );
  }

  const handleChange = async () => {
    setMessage(null);
    
    if (!currentPassword || !newPassword || !confirmPassword) {
      setMessage({ type: 'error', text: 'Please fill in all fields' });
      return;
    }
    
    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: 'New password must be at least 6 characters' });
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'New password and confirmation do not match' });
      return;
    }

    setLoading(true);
    try {
      // Try edge function first for bcrypt hashing (if deployed)
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/change-password`;
      
      try {
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            user_id: profile.id,
            current_password: currentPassword,
            new_password: newPassword,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          setMessage({ type: 'error', text: data.error || 'Failed to change password' });
        } else {
          setMessage({ type: 'success', text: 'Password changed successfully! Please use your new password on next login.' });
          setCurrentPassword('');
          setNewPassword('');
          setConfirmPassword('');
        }
      } catch (edgeFunctionError) {
        console.log('Edge function not available, using direct database update:', edgeFunctionError);
        
        // Fallback: Direct database update (for when edge function not deployed)
        // Verify current password
        const { data: profileData, error: fetchError } = await supabase
          .from('user_profiles')
          .select('password_hash')
          .eq('id', profile.id)
          .maybeSingle();

        if (fetchError || !profileData) {
          setMessage({ type: 'error', text: 'Unable to verify current password' });
          setLoading(false);
          return;
        }

        // Check if password matches (plain text or bcrypt)
        let passwordValid = false;
        if (profileData.password_hash.startsWith('$2a$') || profileData.password_hash.startsWith('$2b$')) {
          // It's bcrypt - can't verify client-side
          setMessage({ type: 'error', text: 'Edge function required for bcrypt passwords. Please contact administrator.' });
          setLoading(false);
          return;
        } else {
          // Plain text comparison
          passwordValid = profileData.password_hash === currentPassword;
        }

        if (!passwordValid) {
          setMessage({ type: 'error', text: 'Current password is incorrect' });
          setLoading(false);
          return;
        }

        // Update password directly (will be plain text until edge function deployed)
        const { error: updateError } = await supabase
          .from('user_profiles')
          .update({ password_hash: newPassword })
          .eq('id', profile.id);

        if (updateError) {
          setMessage({ type: 'error', text: 'Failed to update password: ' + updateError.message });
        } else {
          setMessage({ 
            type: 'success', 
            text: 'Password changed successfully! Note: For enhanced security, the edge function should be deployed to enable bcrypt hashing.' 
          });
          setCurrentPassword('');
          setNewPassword('');
          setConfirmPassword('');
        }
      }
    } catch (error) {
      console.error('Error changing password:', error);
      setMessage({ type: 'error', text: 'Unexpected error occurred. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-blue-100 p-3 rounded-xl">
          <Lock className="h-6 w-6 text-blue-600" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Change Password</h2>
          <p className="text-sm text-gray-600">Update your login password</p>
        </div>
      </div>

      {message && (
        <div className={`mb-4 p-4 rounded-lg ${
          message.type === 'success' 
            ? 'bg-green-50 text-green-800 border border-green-200' 
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {message.text}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Current Password</label>
          <input 
            value={currentPassword} 
            onChange={(e) => setCurrentPassword(e.target.value)} 
            type="password" 
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter current password"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
          <input 
            value={newPassword} 
            onChange={(e) => setNewPassword(e.target.value)} 
            type="password" 
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter new password (min 6 characters)"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Confirm New Password</label>
          <input 
            value={confirmPassword} 
            onChange={(e) => setConfirmPassword(e.target.value)} 
            type="password" 
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Re-enter new password"
          />
        </div>

        <div className="pt-2">
          <button 
            onClick={handleChange} 
            disabled={loading} 
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading ? 'Updating Password...' : 'Update Password'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ChangePassword;
