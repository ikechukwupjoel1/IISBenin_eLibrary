import { Toaster } from 'react-hot-toast';
import { useAuth } from './contexts/AuthContext';
import { Auth } from './components/Auth';
import { MainApp } from './components/MainApp';
import { LibrarianSetup } from './components/LibrarianSetup';
import { InstitutionSetup } from './components/InstitutionSetup'; // Import the new component
import PWAInstallPrompt from './components/PWAInstallPrompt';
import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';

function App() {
  const { user, profile, institution, loading } = useAuth();
  const [needsSetup, setNeedsSetup] = useState<boolean | null>(null);

  useEffect(() => {
    const checkSetup = async () => {
      // Check if any librarian accounts exist to determine if initial setup is needed.
      const { count, error } = await supabase
        .from('user_profiles')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'librarian');

      if (error) {
        console.error('Error checking for initial setup:', error);
        setNeedsSetup(false); // Default to false on error to avoid blocking app
        return;
      }

      // If there are no librarians, setup is needed.
      setNeedsSetup(count === 0);
    };

    checkSetup();
  }, []);

  if (loading || needsSetup === null) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (needsSetup) {
    return <LibrarianSetup />;
  }

  // New Onboarding Flow
  if (user && profile?.role === 'librarian' && institution && !institution.is_setup_complete) {
    return <InstitutionSetup />;
  }

  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            duration: 3000,
            iconTheme: {
              primary: '#10B981',
              secondary: '#fff',
            },
          },
          error: {
            duration: 4000,
            iconTheme: {
              primary: '#EF4444',
              secondary: '#fff',
            },
          },
        }}
      />
      <PWAInstallPrompt />
      {user ? <MainApp /> : <Auth />}
    </>
  );
}

export default App;
