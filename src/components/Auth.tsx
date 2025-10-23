import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import BackgroundCarousel from './BackgroundCarousel';
import schoolLogo from '../assets/Iisbenin logo.png';
import { validateEmail, validatePassword } from '../utils/validation';

type UserRole = 'librarian' | 'staff' | 'student';

export function Auth() {
  const [activeTab, setActiveTab] = useState<UserRole>('student');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();

  const emailValid = () => {
    if (activeTab !== 'librarian') return true;
    return validateEmail(identifier);
  };

  const passwordValid = () => {
    if (activeTab !== 'librarian') return true;
    const validation = validatePassword(password);
    if (!validation.valid) {
      setPasswordError(validation.message);
      return false;
    }
    setPasswordError('');
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setPasswordError('');
    setLoading(true);

    try {
      // Enhanced client-side validation for librarian
      if (activeTab === 'librarian') {
        const email = identifier.trim().toLowerCase();
        if (!validateEmail(email)) {
          setError('Please enter a valid email address');
          setLoading(false);
          return;
        }
        
        const passwordValidation = validatePassword(password);
        if (!passwordValidation.valid) {
          setError(passwordValidation.message);
          setLoading(false);
          return;
        }
      }

      await signIn(identifier, password, activeTab);
    } catch (err) {
      const error = err as Error;
      setError(error.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'librarian' as UserRole, label: 'Librarian' },
    { id: 'staff' as UserRole, label: 'Staff' },
    { id: 'student' as UserRole, label: 'Student' },
  ];

  const getIdentifierLabel = () => {
    return activeTab === 'librarian' ? 'Email Address' : 'Enrollment ID';
  };

  const getIdentifierPlaceholder = () => {
    return activeTab === 'librarian' ? 'Enter your email' : `Enter your ${activeTab} enrollment ID`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative">
      <BackgroundCarousel />

      <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl w-full max-w-md p-8 relative z-10 transition-all duration-300 hover:shadow-3xl">
        <div className="text-center mb-8">
          <img
            src={schoolLogo}
            alt="IISBenin Logo"
            className="w-24 h-24 mx-auto mb-4 object-contain transition-transform duration-300 hover:scale-110"
          />
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent mb-2">IISBenin Library</h1>
          <p className="text-gray-600">Sign in to access the library system</p>
        </div>

        <div className="flex border-b border-gray-200 mb-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setIdentifier('');
                setPassword('');
                setError('');
              }}
              className={`flex-1 py-3 text-sm font-medium transition-all duration-200 min-h-[44px] ${
                activeTab === tab.id
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {getIdentifierLabel()}
            </label>
            <input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-4 focus:ring-blue-300 focus:outline-none transition-all duration-200 min-h-[44px]"
              placeholder={getIdentifierPlaceholder()}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setPasswordError('');
              }}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-4 focus:ring-blue-300 focus:outline-none transition-all duration-200 min-h-[44px]"
              placeholder="Enter your password"
              required
              minLength={10}
            />
            {activeTab === 'librarian' && password && passwordError && (
              <p className="mt-1 text-xs text-red-600">{passwordError}</p>
            )}
            {activeTab === 'librarian' && !password && (
              <p className="mt-1 text-xs text-gray-500">
                Must be 10+ characters with uppercase, lowercase, number, and special character
              </p>
            )}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm animate-pulse">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || (activeTab === 'librarian' && (!emailValid() || !passwordValid()))}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 rounded-lg font-medium hover:from-blue-700 hover:to-blue-800 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl active:scale-95 min-h-[44px]"
          >
            {loading ? 'Signing in...' : `Sign in as ${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}`}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Contact the librarian if you need assistance
          </p>
        </div>
      </div>
    </div>
  );
}
