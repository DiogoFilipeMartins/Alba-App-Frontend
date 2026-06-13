import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ColorPalette = 'teal' | 'blue' | 'warm';

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
  fontRegular: string;
  fontMedium: string;
  fontSemiBold: string;
  fontBold: string;
};

const commonFonts = {
  fontRegular: 'Poppins_400Regular',
  fontMedium: 'Poppins_500Medium',
  fontSemiBold: 'Poppins_600SemiBold',
  fontBold: 'Poppins_700Bold',
};

// Sensory-friendly palettes: muted, non-fluorescent, comforting shades
const PALETTES = {
  teal: {
    light: { primary: '#0f766e', accent: '#14b8a6', border: '#e2e8f0' },
    dark: { primary: '#14b8a6', accent: '#2dd4bf', border: '#1e293b' }
  },
  blue: {
    light: { primary: '#0369a1', accent: '#0ea5e9', border: '#e2e8f0' },
    dark: { primary: '#0ea5e9', accent: '#38bdf8', border: '#1e293b' }
  },
  warm: {
    light: { primary: '#b45309', accent: '#d97706', border: '#f7e8d0' },
    dark: { primary: '#d97706', accent: '#f59e0b', border: '#2d241e' }
  }
};

interface ThemeContextType {
  isDark: boolean;
  colorTheme: ColorPalette;
  colors: ThemeColors;
  toggleTheme: () => void;
  setColorTheme: (theme: ColorPalette) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [isDark, setIsDark] = useState(systemScheme === 'dark');
  const [colorTheme, setColorThemeState] = useState<ColorPalette>('teal');

  useEffect(() => {
    (async () => {
      const savedTheme = await AsyncStorage.getItem('theme');
      const savedPalette = await AsyncStorage.getItem('colorPalette');
      
      if (savedTheme) {
        setIsDark(savedTheme === 'dark');
      } else {
        setIsDark(systemScheme === 'dark');
      }

      if (savedPalette) {
        setColorThemeState(savedPalette as ColorPalette);
      }
    })();
  }, [systemScheme]);

  const toggleTheme = async () => {
    const newIsDark = !isDark;
    setIsDark(newIsDark);
    await AsyncStorage.setItem('theme', newIsDark ? 'dark' : 'light');
  };

  const setColorTheme = async (theme: ColorPalette) => {
    setColorThemeState(theme);
    await AsyncStorage.setItem('colorPalette', theme);
  };

  // Build colors based on mode and colorTheme
  const currentPalette = PALETTES[colorTheme];
  const colors: ThemeColors = isDark
    ? {
        // Calming slate instead of pure black to reduce high-contrast glare
        background: colorTheme === 'warm' ? '#1a1410' : '#0f172a',
        card: colorTheme === 'warm' ? '#271f1a' : '#1e293b',
        textPrimary: '#f1f5f9',
        textSecondary: '#94a3b8',
        textMuted: '#64748b',
        primary: currentPalette.dark.primary,
        accent: currentPalette.dark.accent,
        border: currentPalette.dark.border,
        surface: colorTheme === 'warm' ? '#1e1814' : '#0f172a',
        ...commonFonts,
      }
    : {
        // Soft cream/warm grey instead of pure white to reduce glare
        background: colorTheme === 'warm' ? '#faf7f2' : '#f8fafc',
        card: '#ffffff',
        textPrimary: '#0f172a',
        textSecondary: '#475569',
        textMuted: '#94a3b8',
        primary: currentPalette.light.primary,
        accent: currentPalette.light.accent,
        border: currentPalette.light.border,
        surface: colorTheme === 'warm' ? '#f4eedf' : '#f1f5f9',
        ...commonFonts,
      };

  return (
    <ThemeContext.Provider value={{ isDark, colorTheme, colors, toggleTheme, setColorTheme }}>
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

