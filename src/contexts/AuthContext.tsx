import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { apiService } from '../services/apiService';
import { User } from '@supabase/supabase-js';
import { useDispatch } from 'react-redux';
import { setAuth, clearAuth, setLoading as setReduxLoading } from '../store/slices/authSlice';

interface AuthContextType {
  user: User | null;
  profile: any;
  isAdmin: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<any>;
  signUp: (params: { email: string; password: string; username: string; phone?: string }) => Promise<any>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const dispatch = useDispatch();

  // Fetch profile from public.profiles
  const fetchProfile = async (userId: string | undefined) => {
    if (!userId) { 
      setProfile(null); 
      dispatch(setAuth({ user: null, profile: null }));
      return; 
    }
    try {
      const data = await apiService.getProfile(userId);
      setProfile(data ?? null);
      return data;
    } catch (e) {
      console.warn('fetchProfile error', e);
      setProfile(null);
      return null;
    }
  };

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const sessionUser = data?.session?.user ?? null;
        if (mounted) {
          setUser(sessionUser);
          if (sessionUser) {
            const p = await fetchProfile(sessionUser.id);
            dispatch(setAuth({ user: sessionUser, profile: p }));
          } else {
            dispatch(clearAuth());
          }
        }
      } catch (e) {
        console.warn('AuthProvider getSession error', e);
      } finally {
        if (mounted) {
          setLoading(false);
          dispatch(setReduxLoading(false));
        }
      }
    })();

    const { data: subscription } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const sessionUser = session?.user ?? null;
      if (mounted) {
        setUser(sessionUser);
        if (sessionUser) {
          const p = await fetchProfile(sessionUser.id);
          dispatch(setAuth({ user: sessionUser, profile: p }));
        } else {
          setProfile(null);
          dispatch(clearAuth());
        }
        setLoading(false);
        dispatch(setReduxLoading(false));
      }
    });

    return () => {
      mounted = false;
      subscription?.subscription?.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  };

  const signUp = async ({ email, password, username, phone }: { email: string; password: string; username: string; phone?: string }) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { 
        data: { 
          username,
          full_name: username, // Alguns triggers usam full_name
          phone: phone || null 
        } 
      },
    });
    if (error) throw error;
    return data;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    dispatch(clearAuth());
    if (error) throw error;
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) throw error;
  };

  const isAdmin = profile?.role === 'admin';

  const refreshProfile = async () => {
    if (user?.id) {
      const p = await fetchProfile(user.id);
      dispatch(setAuth({ user, profile: p }));
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, isAdmin, loading, signIn, signUp, signOut, resetPassword, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
