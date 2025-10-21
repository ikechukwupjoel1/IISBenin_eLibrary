import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import BackgroundCarousel from './BackgroundCarousel';
import schoolLogo from '../assets/Iisbenin logo.png';

type UserRole = 'librarian' | 'staff' | 'student';

export function Auth() {
  const [activeTab, setActiveTab] = useState<UserRole>('student');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();

  const emailValid = () => {
    if (activeTab !== 'librarian') return true;
    const e = identifier.trim().toLowerCase();
    return e.length > 0 && e.includes('@');
  };

  const passwordValid = () => {
    if (activeTab !== 'librarian') return true;
    return password.length >= 6;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Basic client-side validation for librarian (server will still validate)
      if (activeTab === 'librarian') {
        const email = identifier.trim().toLowerCase();
        if (!email || !email.includes('@')) {
          setError('Please enter a valid email address');
          setLoading(false);
          return;
        }
        if (!password || password.length < 6) {
          setError('Password must be at least 6 characters');
          setLoading(false);
          return;
        }
      }

      await signIn(identifier, password, activeTab);
    } catch (err: any) {
      setError(err.message || 'Invalid credentials');
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

      <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl w-full max-w-md p-8 relative z-10">
        <div className="text-center mb-8">
          <img
            src={schoolLogo}
            alt="IISBenin Logo"
            className="w-24 h-24 mx-auto mb-4 object-contain"
          />
          <h1 className="text-3xl font-bold text-gray-800 mb-2">IISBenin Library</h1>
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
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
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
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
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
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              placeholder="Enter your password"
              required
              minLength={6}
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !emailValid() || !passwordValid()}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
          >
            {loading ? 'Signing in...' : `Sign in as ${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}`}
          </button>

          {activeTab === 'librarian' && (!emailValid() || !passwordValid()) && (
            <div className="mt-2 text-sm text-red-600">
              {!emailValid() && <div>Please enter a valid email address.</div>}
              {!passwordValid() && <div>Password must be at least 6 characters.</div>}
            </div>
          )}
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
