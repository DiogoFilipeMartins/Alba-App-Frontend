import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AuthContext = createContext(null);
// Use your machine LAN IP so physical devices can reach the backend from the same Wi‑Fi
const BACKEND_URL = 'http://10.120.19.103:3000';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const storedToken = await AsyncStorage.getItem('authToken');
        if (mounted && storedToken) {
          setToken(storedToken);
          // Optionally decode token to get user info, or fetch from backend
          // For now, just mark as logged in
          setUser({ token: storedToken });
        }
      } catch (e) {
        console.warn('AuthProvider restore token error', e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const signIn = async (email, password) => {
    try {
      const res = await fetch(`${BACKEND_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Login failed');
      }

      const { token: authToken } = await res.json();
      await AsyncStorage.setItem('authToken', authToken);
      setToken(authToken);
      setUser({ token: authToken, email });
      return { user: { email } };
    } catch (error) {
      throw error;
    }
  };

  const signUp = async ({ email, password, username }) => {
    try {
      const res = await fetch(`${BACKEND_URL}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, username }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Signup failed');
      }

      const data = await res.json();
      // Return preview URL if using Ethereal
      return { user: { email }, previewUrl: data.previewUrl };
    } catch (error) {
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await AsyncStorage.removeItem('authToken');
      setToken(null);
      setUser(null);
    } catch (error) {
      console.error('Signout error', error);
    }
  };

  const resendConfirmation = async (email) => {
    try {
      // For now, user must click confirmation link from email
      // In future, could implement a /auth/resend endpoint
      return { success: true };
    } catch (error) {
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, signIn, signUp, signOut, resendConfirmation, token }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
