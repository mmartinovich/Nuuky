import React, { createContext, useContext, useMemo } from 'react';
import { useAppStore } from '../stores/appStore';
import { getTheme, AccentColors, getAccentFromMood } from '../lib/theme';

interface ThemeContextType {
  theme: ReturnType<typeof getTheme>;
  isDark: true;
  accent: AccentColors;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const currentUser = useAppStore((state) => state.currentUser);

  const theme = useMemo(() => getTheme(), []);

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
  }, [currentUser?.mood, currentUser?.custom_mood_id]);

  const value = useMemo(
    () => ({
      theme,
      isDark: true as const,
      accent,
    }),
    [theme, accent]
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
