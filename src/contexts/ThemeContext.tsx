import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

type ThemeColors = {
  background: string;
  card: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  primary: string;
  accent: string;
  border: string;
  surface: string;
};

const darkColors: ThemeColors = {
  background: '#020202',
  card: '#1a1a1a',
  textPrimary: '#e2e8f0',
  textSecondary: '#94a3b8',
  textMuted: '#64748b',
  primary: '#058c42',
  accent: '#16db65',
  border: '#058c4220',
  surface: '#020202',
};

const lightColors: ThemeColors = {
  background: '#f8fafc',
  card: '#ffffff',
  textPrimary: '#0f172a',
  textSecondary: '#64748b',
  textMuted: '#94a3b8',
  primary: '#058c42',
  accent: '#16db65',
  border: '#e2e8f0',
  surface: '#f1f5f9',
};

interface ThemeContextType {
  isDark: boolean;
  colors: ThemeColors;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [isDark, setIsDark] = useState(systemScheme === 'dark');

  useEffect(() => {
    (async () => {
      const savedTheme = await AsyncStorage.getItem('theme');
      if (savedTheme) {
        setIsDark(savedTheme === 'dark');
      } else {
        setIsDark(systemScheme === 'dark');
      }
    })();
  }, [systemScheme]);

  const toggleTheme = async () => {
    const newIsDark = !isDark;
    setIsDark(newIsDark);
    await AsyncStorage.setItem('theme', newIsDark ? 'dark' : 'light');
  };

  const colors = isDark ? darkColors : lightColors;

  return (
    <ThemeContext.Provider value={{ isDark, colors, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
