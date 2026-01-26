import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { useAppStore } from '../stores/appStore';
import { getTheme, ThemeMode, ResolvedTheme, AccentColors, getAccentFromMood } from '../lib/theme';

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

  // Compute accent colors based on user's current mood
  const accent = useMemo(() => {
    return getAccentFromMood(currentUser?.mood);
  }, [currentUser?.mood]);

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
