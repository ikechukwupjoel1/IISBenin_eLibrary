import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';

type UserProfile = {
  id: string;
  email: string;
  full_name: string;
  role: 'librarian' | 'staff' | 'student';
  student_id?: string;
  staff_id?: string;
  enrollment_id?: string;
  institution_id: string;
};

type Institution = {
  id: string;
  name: string;
  is_setup_complete: boolean;
  theme_settings?: { logo_url?: string; tagline?: string };
};

type AuthContextType = {
  user: User | null;
  profile: UserProfile | null;
  institution: Institution | null;
  loading: boolean;
  signIn: (identifier: string, password: string, role?: 'librarian' | 'staff' | 'student') => Promise<void>;
  signUp: (email: string, password: string, fullName: string, role: 'librarian' | 'staff' | 'student', institutionId: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [institution, setInstitution] = useState<Institution | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const loadUserProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error loading user profile:', error);
      return null;
    }
    return data;
  };

  const loadInstitution = async (institutionId: string) => {
    const { data, error } = await supabase
      .from('institutions')
      .select('id, name, is_setup_complete, theme_settings')
      .eq('id', institutionId)
      .single();
    
    if (error) {
      console.error('Error loading institution:', error);
      return null;
    }
    return data;
  };

  const logLogin = async (enrollmentId: string, userId: string | null, success: boolean, role?: string, fullName?: string, institutionId?: string | null) => {
    try {
      console.log('Logging login attempt:', { enrollmentId, userId, success, role, fullName, institutionId });
      
      const userAgent = navigator.userAgent || 'Unknown';
      let ipAddress = null;
      let location = null;
      
      try {
        const ipResponse = await fetch('https://ipapi.co/json/');
        if (ipResponse.ok) {
          const ipData = await ipResponse.json();
          ipAddress = ipData.ip || null;
          location = ipData.city && ipData.country_name 
            ? `${ipData.city}, ${ipData.country_name}` 
            : null;
        }
      } catch (ipError) {
        console.warn('Could not fetch IP/location:', ipError);
      }
      
      const logData: any = {
        enrollment_id: enrollmentId,
        status: success ? 'success' : 'failed',
        role: role || 'unknown',
        login_at: new Date().toISOString(),
        user_agent: userAgent,
        ip_address: ipAddress,
        location: location,
        institution_id: institutionId, // Add institution ID to the log
      };
      
      if (userId) {
        logData.user_id = userId;
      }
      
      if (fullName) {
        logData.full_name = fullName;
      }
      
      const { error } = await supabase.from('login_logs').insert([logData]);
      
      if (error) {
        console.error('Error inserting login log:', error);
      } else {
        console.log('Login log created successfully');
      }
    } catch (error) {
      console.error('Error logging login:', error);
    }
  };

  useEffect(() => {
    const loadSessionData = async (sessionUser: User) => {
      const userProfile = await loadUserProfile(sessionUser.id);
      setProfile(userProfile);

      if (userProfile?.institution_id) {
        const institutionData = await loadInstitution(userProfile.institution_id);
        setInstitution(institutionData);
      } else {
        setInstitution(null);
      }
    };

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        await loadSessionData(session.user);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      // Use an async IIFE to handle the async operations safely
      (async () => {
        if (session?.user) {
          try {
            await loadSessionData(session.user);
          } catch (e) {
            console.error("Error in onAuthStateChange:", e);
            // Sign out the user if session data is corrupt or fails to load
            await supabase.auth.signOut();
          }
        } else {
          setUser(null);
          setProfile(null);
          setInstitution(null);
        }
      })();
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (identifier: string, password: string, role?: 'librarian' | 'staff' | 'student') => {
    if (role === 'librarian') {
      const email = identifier.toLowerCase().trim();
      if (!email) {
        setAuthError('Please enter your email');
        throw new Error('Please enter your email');
      }

      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (error) {
          console.error('Supabase auth error:', error);
          await logLogin(email, null, false, role);
          const msg = (error as any).message || JSON.stringify(error);
          setAuthError(msg);
          throw new Error(msg);
        }

        if (data?.user) {
          const userProfile = await loadUserProfile(data.user.id);
          if (!userProfile || userProfile.role !== 'librarian') {
            await supabase.auth.signOut();
            await logLogin(email, data.user.id, false, role, userProfile?.full_name, userProfile?.institution_id);
            setAuthError('Access denied. Not a librarian account.');
            throw new Error('Access denied. Not a librarian account.');
          }
          await logLogin(userProfile.enrollment_id || email, data.user.id, true, role, userProfile.full_name, userProfile.institution_id);
          setProfile(userProfile);
          if (userProfile.institution_id) {
            const institutionData = await loadInstitution(userProfile.institution_id);
            setInstitution(institutionData);
          }
          setAuthError(null);
        }
      } catch (err: any) {
        if (!authError) setAuthError(err?.message || 'Authentication failed');
        throw err;
      }
    } else if (role === 'staff' || role === 'student') {
      const tableName = role === 'staff' ? 'staff' : 'students';
      const { data: record, error: fetchError } = await supabase
        .from(tableName)
        .select('*')
        .eq('enrollment_id', identifier)
        .maybeSingle();

      if (fetchError || !record) {
        await logLogin(identifier, null, false, role);
        throw new Error('Invalid enrollment ID');
      }

      try {
        const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-login`;
        
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            enrollment_id: identifier,
            password: password,
            role: role,
          }),
        });

        const data = await response.json();

        if (!response.ok || !data.valid) {
          await logLogin(identifier, data.profile?.id || null, false, role, data.profile?.full_name, data.profile?.institution_id);
          throw new Error(data.error || 'Invalid password');
        }

        const profileData = data.profile;
        await logLogin(identifier, profileData.id, true, role, profileData.full_name, profileData.institution_id);
        setProfile(profileData);
        if (profileData.institution_id) {
          const institutionData = await loadInstitution(profileData.institution_id);
          setInstitution(institutionData);
        }
        setUser({ id: profileData.id } as any);
        localStorage.setItem('userProfile', JSON.stringify(profileData));
      } catch (error) {
        console.error('Error during custom login:', error);
        await logLogin(identifier, null, false, role);
        throw error;
      }
    } else {
      throw new Error('Invalid role specified');
    }
  };

  const signUp = async (email: string, password: string, fullName: string, role: 'librarian' | 'staff' | 'student') => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;

    if (data.user) {
      const { error: profileError } = await supabase
        .from('user_profiles')
        .insert({
          id: data.user.id,
          email,
          full_name: fullName,
          role,
        });

      if (profileError) throw profileError;

      const userProfile = await loadUserProfile(data.user.id);
      setProfile(userProfile);
    }
  };

  const signOut = async () => {
    if (profile?.role !== 'student' && profile?.role !== 'staff') {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    }
    localStorage.removeItem('userProfile');
    setProfile(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, profile, institution, loading, signIn, signUp, signOut }}>
      {authError && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', background: '#fee', color: '#900', zIndex: 9999, padding: '1em', textAlign: 'center' }}>
          {authError}
        </div>
      )}
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
