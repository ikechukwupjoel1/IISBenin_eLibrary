import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { Lock, Eye, EyeOff, CheckCircle, User } from 'lucide-react';

export function StudentProfile() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [passwordStrength, setPasswordStrength] = useState({
    score: 0,
    feedback: ''
  });

  useEffect(() => {
    checkPasswordStrength(passwordForm.newPassword);
  }, [passwordForm.newPassword]);

  const checkPasswordStrength = (password: string) => {
    if (!password) {
      setPasswordStrength({ score: 0, feedback: '' });
      return;
    }

    let score = 0;
    const feedback: string[] = [];

    // Length check
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    else feedback.push('Use 12+ characters');

    // Complexity checks
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
    else feedback.push('Include uppercase and lowercase');

    if (/[0-9]/.test(password)) score++;
    else feedback.push('Include numbers');

    if (/[^A-Za-z0-9]/.test(password)) score++;
    else feedback.push('Include special characters (!@#$%)');

    const strengthText = score <= 2 ? 'Weak' : score === 3 ? 'Fair' : score === 4 ? 'Good' : 'Strong';
    
    setPasswordStrength({
      score,
      feedback: feedback.length > 0 ? feedback.join(', ') : strengthText
    });
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    if (passwordStrength.score < 3) {
      toast.error('Please use a stronger password');
      return;
    }

    try {
      setLoading(true);

      // Verify current password by attempting to sign in
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) throw new Error('No user found');

      // Try to sign in with current password to verify it
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: passwordForm.currentPassword,
      });

      if (signInError) {
        toast.error('Current password is incorrect');
        return;
      }

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: passwordForm.newPassword
      });

      if (updateError) throw updateError;

      toast.success('Password changed successfully!');
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (error) {
      console.error('Error changing password:', error);
      toast.error('Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const getStrengthColor = () => {
    if (passwordStrength.score <= 2) return 'bg-red-500';
    if (passwordStrength.score === 3) return 'bg-yellow-500';
    if (passwordStrength.score === 4) return 'bg-blue-500';
    return 'bg-green-500';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Profile Settings</h2>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Manage your profile and password
        </p>
      </div>

      {/* Profile Avatar Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-start gap-6">
          <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-4xl font-bold">
            {profile?.full_name?.charAt(0).toUpperCase() || 'U'}
          </div>

          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {profile?.full_name || 'User'}
            </h3>
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                {profile?.role?.replace('_', ' ').toUpperCase() || 'USER'}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-500">
                {profile?.email || ''}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Password Change Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Lock className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Change Password
          </h3>
        </div>

        <form onSubmit={handlePasswordChange} className="space-y-4">
          {/* Current Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Current Password
            </label>
            <div className="relative">
              <input
                type={showCurrentPassword ? 'text' : 'password'}
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                required
                className="w-full px-4 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="Enter current password"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                {showCurrentPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              New Password
            </label>
            <div className="relative">
              <input
                type={showNewPassword ? 'text' : 'password'}
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                required
                minLength={8}
                className="w-full px-4 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="Enter new password"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            
            {/* Password Strength Indicator */}
            {passwordForm.newPassword && (
              <div className="mt-2">
                <div className="flex items-center gap-2 mb-1">
                  <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${getStrengthColor()}`}
                      style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                    {passwordStrength.score <= 2 ? 'Weak' : passwordStrength.score === 3 ? 'Fair' : passwordStrength.score === 4 ? 'Good' : 'Strong'}
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {passwordStrength.feedback}
                </p>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Confirm New Password
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                required
                minLength={8}
                className="w-full px-4 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="Confirm new password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            {passwordForm.confirmPassword && passwordForm.newPassword !== passwordForm.confirmPassword && (
              <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                Passwords do not match
              </p>
            )}
            {passwordForm.confirmPassword && passwordForm.newPassword === passwordForm.confirmPassword && (
              <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400 mt-1">
                <CheckCircle className="h-3 w-3" />
                Passwords match
              </div>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || !passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword || passwordForm.newPassword !== passwordForm.confirmPassword || passwordStrength.score < 3}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {loading ? 'Changing Password...' : 'Change Password'}
          </button>
        </form>

        {/* Password Requirements */}
        <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <p className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-2">
            Password Requirements:
          </p>
          <ul className="text-xs text-blue-800 dark:text-blue-400 space-y-1">
            <li>• At least 8 characters long (12+ recommended)</li>
            <li>• Mix of uppercase and lowercase letters</li>
            <li>• At least one number</li>
            <li>• At least one special character (!@#$%^&*)</li>
          </ul>
        </div>
      </div>

      {/* Profile Information (Read-only) */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-2 mb-4">
          <User className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Profile Information
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
              Full Name
            </label>
            <p className="text-gray-900 dark:text-white font-medium">{profile?.full_name}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
              Email
            </label>
            <p className="text-gray-900 dark:text-white font-medium">{profile?.email}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
              Role
            </label>
            <p className="text-gray-900 dark:text-white font-medium capitalize">{profile?.role}</p>
          </div>

          {profile?.role === 'student' && profile?.student_id && (
            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                Student ID
              </label>
              <p className="text-gray-900 dark:text-white font-medium">{profile.student_id}</p>
            </div>
          )}
        </div>

        <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">
          Contact your librarian to update your profile information.
        </p>
      </div>
    </div>
  );
}
