import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { useAppStore } from '../stores/appStore';
import { getTheme, ThemeMode, ResolvedTheme, AccentColors, getAccentFromMood, getCustomMoodColor } from '../lib/theme';

interface ThemeContextType {
  theme: ReturnType<typeof getTheme>;
  themeMode: ThemeMode;
  resolvedTheme: ResolvedTheme;
  setThemeMode: (mode: ThemeMode) => void;
  isDark: boolean;
  accent: AccentColors;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemColorScheme = useColorScheme();
  const themeMode = useAppStore((state) => state.themeMode);
  const setThemeMode = useAppStore((state) => state.setThemeMode);
  const currentUser = useAppStore((state) => state.currentUser);

  const resolvedTheme: ResolvedTheme = useMemo(() => {
    if (themeMode === 'system') {
      return systemColorScheme === 'light' ? 'light' : 'dark';
    }
    return themeMode;
  }, [themeMode, systemColorScheme]);

  const theme = useMemo(() => getTheme(resolvedTheme), [resolvedTheme]);

  const isDark = resolvedTheme === 'dark';

  // Compute accent colors based on user's current mood (including custom moods)
  const accent = useMemo(() => {
    if (currentUser?.custom_mood_id) {
      return {
        primary: '#FACC15',
        soft: 'rgba(250, 204, 21, 0.15)',
        glow: 'rgba(250, 204, 21, 0.4)',
        gradient: ['#FACC15', '#EAB308'] as const,
        textOnPrimary: '#1A1A1A',
      };
    }
    return getAccentFromMood(currentUser?.mood);
  }, [currentUser?.mood, currentUser?.custom_mood_id, currentUser?.custom_mood?.color]);

  const value = useMemo(
    () => ({
      theme,
      themeMode,
      resolvedTheme,
      setThemeMode,
      isDark,
      accent,
    }),
    [theme, themeMode, resolvedTheme, setThemeMode, isDark, accent]
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};
