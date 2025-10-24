import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import BackgroundCarousel from './BackgroundCarousel';
import schoolLogo from '../assets/Iisbenin logo.png';

export function LibrarianSetup() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSetup = async () => {
    setLoading(true);
    setError('');

    try {
      // Sign up the librarian (normalize email to lowercase)
      const email = 'iksotech@gmail.com';
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password: '@ICTAdmin',
        options: {
          data: {
            full_name: 'ICT Administrator'
          }
        }
      });

      if (signUpError) throw signUpError;

      if (authData.user) {
        // Create the user profile
        const { error: profileError } = await supabase
          .from('user_profiles')
          .insert({
            id: authData.user.id,
            email,
            full_name: 'ICT Administrator',
            role: 'librarian'
          });

        if (profileError) throw profileError;

        setSuccess(true);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during setup');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <BackgroundCarousel />
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl w-full max-w-md p-8 relative z-10">
          <div className="text-center">
            <img src={schoolLogo} alt="IISBenin Logo" className="w-24 h-24 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-gray-800 mb-4">Setup Complete!</h1>
            <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
              <h2 className="font-semibold text-green-900 mb-2">Librarian Account Created</h2>
              <div className="text-left space-y-2">
                <div>
                  <span className="text-sm text-green-700 font-medium">Email:</span>
                  <p className="text-lg font-bold text-green-900">Iksotech@gmail.com</p>
                </div>
                <div>
                  <span className="text-sm text-green-700 font-medium">Password:</span>
                  <p className="text-lg font-bold text-green-900">@ICTAdmin</p>
                </div>
              </div>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-lg"
            >
              Go to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <BackgroundCarousel />
      <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl w-full max-w-md p-8 relative z-10">
        <div className="text-center">
          <img src="/Iisbenin logo.png" alt="IISBenin Logo" className="w-24 h-24 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-800 mb-2">IISBenin Library</h1>
          <h2 className="text-xl text-gray-600 mb-6">Initial Setup</h2>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6 text-left">
            <h3 className="font-semibold text-blue-900 mb-3">Creating Librarian Account</h3>
            <div className="space-y-2 text-sm text-blue-800">
              <p><span className="font-medium">Email:</span> Iksotech@gmail.com</p>
              <p><span className="font-medium">Password:</span> @ICTAdmin</p>
              <p><span className="font-medium">Role:</span> Librarian</p>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">
              {error}
            </div>
          )}

          <button
            onClick={handleSetup}
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
          >
            {loading ? 'Setting up...' : 'Create Librarian Account'}
          </button>

          <p className="text-xs text-gray-500 mt-4">
            This is a one-time setup. Click the button above to create the initial librarian account.
          </p>
        </div>
      </div>
    </div>
  );
}
