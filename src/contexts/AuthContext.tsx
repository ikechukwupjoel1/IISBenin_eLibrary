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
};

type AuthContextType = {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: (identifier: string, password: string, role?: 'librarian' | 'staff' | 'student') => Promise<void>;
  signUp: (email: string, password: string, fullName: string, role: 'librarian' | 'staff' | 'student') => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
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

  const logLogin = async (enrollmentId: string, userId: string | null, success: boolean) => {
    try {
      await supabase.from('login_logs').insert({
        user_id: userId,
        enrollment_id: enrollmentId,
        success,
        login_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error logging login:', error);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        const userProfile = await loadUserProfile(session.user.id);
        if (!userProfile) {
          setAuthError('Failed to load user profile. Please contact admin.');
        }
        setProfile(userProfile);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      (async () => {
        setUser(session?.user ?? null);
        if (session?.user) {
          const userProfile = await loadUserProfile(session.user.id);
          if (!userProfile) {
            setAuthError('Failed to load user profile. Please contact admin.');
          }
          setProfile(userProfile);
        } else {
          setProfile(null);
        }
      })();
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (identifier: string, password: string, role?: 'librarian' | 'staff' | 'student') => {
    if (role === 'librarian') {
      // Normalize email to lowercase and trim
      const email = identifier.toLowerCase().trim();
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        await logLogin(email, null, false);
        setAuthError('Invalid email or password');
        throw new Error('Invalid email or password');
      }

      if (data.user) {
        const userProfile = await loadUserProfile(data.user.id);
        if (!userProfile || userProfile.role !== 'librarian') {
          await supabase.auth.signOut();
          await logLogin(email, data.user.id, false);
          setAuthError('Access denied. Not a librarian account.');
          throw new Error('Access denied. Not a librarian account.');
        }
        await logLogin(userProfile.enrollment_id || email, data.user.id, true);
        setProfile(userProfile);
        setAuthError(null);
      }
    } else if (role === 'staff' || role === 'student') {
      const tableName = role === 'staff' ? 'staff' : 'students';

      const { data: record, error: fetchError } = await supabase
        .from(tableName)
        .select('*')
        .eq('enrollment_id', identifier)
        .maybeSingle();

      if (fetchError || !record) {
        await logLogin(identifier, null, false);
        throw new Error('Invalid enrollment ID');
      }

      // First, try a direct lookup by enrollment_id (most reliable pre-auth)
      let { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .ilike('enrollment_id', identifier.trim())
        .eq('role', role)
        .maybeSingle();

      // Fallback 1: If not found, try by role-specific foreign key
      if ((!profileData || profileError) && role === 'student') {
        const { data: fallbackProfile, error: fallbackError } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('student_id', record.id)
          .eq('role', 'student')
          .maybeSingle();
        profileData = fallbackProfile ?? profileData;
        profileError = fallbackError ?? profileError;
      }

      if ((!profileData || profileError) && role === 'staff') {
        const { data: fallbackProfile, error: fallbackError } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('staff_id', record.id)
          .eq('role', 'staff')
          .maybeSingle();
        profileData = fallbackProfile ?? profileData;
        profileError = fallbackError ?? profileError;
      }

      if (profileError || !profileData) {
        await logLogin(identifier, null, false);
        throw new Error('User profile not found');
      }

      if (role === 'student') {
        // For students, check password directly
        if (profileData.password_hash !== password) {
          await logLogin(identifier, profileData.id, false);
          throw new Error('Invalid password');
        }
        // Set profile directly for students (no Supabase auth)
        await logLogin(identifier, profileData.id, true);
        setProfile(profileData);
        setUser({ id: profileData.id } as any); // Fake user object
      } else {
        // For staff, use Supabase auth
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email: profileData.email,
          password
        });

        if (authError) {
          await logLogin(identifier, profileData.id, false);
          throw new Error('Authentication failed');
        }

        if (authData.user) {
          const userProfile = await loadUserProfile(authData.user.id);
          await logLogin(identifier, authData.user.id, true);
          setProfile(userProfile);
        }
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
    if (profile?.role !== 'student') {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    }
    setProfile(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, signUp, signOut }}>
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
