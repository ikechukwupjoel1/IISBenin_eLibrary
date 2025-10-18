import { Toaster } from 'react-hot-toast';
import { useAuth } from './contexts/AuthContext';
import { Auth } from './components/Auth';
import { MainApp } from './components/MainApp';
import { LibrarianSetup } from './components/LibrarianSetup';
import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';

function App() {
  const { user, loading } = useAuth();
  const [needsSetup, setNeedsSetup] = useState<boolean | null>(null);

  useEffect(() => {
    const checkSetup = async () => {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('role', 'librarian')
        .maybeSingle();

      if (error) {
        console.error('Error checking setup:', error);
        setNeedsSetup(false);
        return;
      }

      setNeedsSetup(!data);
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
      {user ? <MainApp /> : <Auth />}
    </>
  );
}

export default App;
