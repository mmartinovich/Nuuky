// Nūūky Design System - Neon Cyber Garden (Gen-Z Edition)

// ============================================
// Theme Types
// ============================================
export type ThemeMode = 'dark';
export type ResolvedTheme = 'dark';
export type PresetMood = 'good' | 'neutral' | 'not_great' | 'reach_out';

// Accent colors derived from mood
export interface AccentColors {
  primary: string;
  soft: string;
  glow: string;
  gradient: readonly [string, string];
  textOnPrimary: string;
}

// ============================================
// Shared Colors (same in both themes)
// ============================================
const sharedColors = {
  // Mood colors - Vibrant and energetic (work in both themes)
  mood: {
    good: {
      base: '#32D583', // Green
      glow: 'rgba(50, 213, 131, 0.4)',
      soft: 'rgba(50, 213, 131, 0.15)',
      gradient: ['#32D583', '#28B870'] as const,
    },
    neutral: {
      base: '#3FCBFF', // Cyan
      glow: 'rgba(63, 203, 255, 0.4)',
      soft: 'rgba(63, 203, 255, 0.15)',
      gradient: ['#3FCBFF', '#2BB8EC'] as const,
    },
    notGreat: {
      base: '#B06CF3', // Purple
      glow: 'rgba(176, 108, 243, 0.4)',
      soft: 'rgba(176, 108, 243, 0.15)',
      gradient: ['#B06CF3', '#9A4FE0'] as const,
    },
    reachOut: {
      base: '#FF4D6D', // Red
      glow: 'rgba(255, 77, 109, 0.45)',
      soft: 'rgba(255, 77, 109, 0.18)',
      gradient: ['#FF4D6D', '#E6365A'] as const,
    },
  },
  // Streak colors
  streak: {
    bolt: ['#00f0ff', '#3B82F6', '#b537f2'] as const, // cyan → blue → purple gradient
    active: '#00f0ff',
    fading: 'rgba(0, 240, 255, 0.4)',
    badge: ['#00c6d4', '#0088ff'] as const,
    badgeText: '#ffffff',
    glow: 'rgba(0, 240, 255, 0.6)',
  },
  // Neon accent colors (same in both themes)
  neon: {
    pink: '#ff1aff',
    cyan: '#00f0ff',
    green: '#39ff14',
    purple: '#b537f2',
    orange: '#ff6b35',
  },
};

// ============================================
// Dark Theme Colors
// ============================================
const darkColors = {
  // Backgrounds - Darker, richer gradients for glassmorphism
  bg: {
    primary: '#050510',
    secondary: '#0a0a20',
    tertiary: '#141428',
  },
  // Glass properties for glassmorphism effects
  glass: {
    background: 'rgba(255, 255, 255, 0.08)',
    border: 'rgba(255, 255, 255, 0.15)',
    highlight: 'rgba(255, 255, 255, 0.25)',
    shadow: 'rgba(0, 0, 0, 0.3)',
  },
  // Text colors - opacity-based hierarchy for better contrast
  text: {
    primary: '#ffffff',
    secondary: 'rgba(255, 255, 255, 0.7)', // Updated: color → opacity
    tertiary: 'rgba(255, 255, 255, 0.5)', // Updated: color → opacity
    accent: '#00f0ff', // Keep neon cyan
    neon: '#ff1aff', // Keep neon pink
  },
  // UI elements - vibrant and modern
  ui: {
    border: 'rgba(0, 240, 255, 0.2)',
    borderLight: 'rgba(255, 255, 255, 0.1)',
    card: 'rgba(20, 20, 40, 0.6)',
    cardHover: 'rgba(30, 30, 60, 0.8)',
    overlay: 'rgba(10, 10, 31, 0.85)',
    neonBorder: 'rgba(255, 26, 255, 0.5)',
  },
  // Accent colors (default - used when no mood-based accent is available)
  accent: {
    primary: '#3FCBFF', // Default to neutral (cyan)
    soft: 'rgba(63, 203, 255, 0.15)', // Background for selected states
    muted: 'rgba(63, 203, 255, 0.5)', // Borders for inactive states
  },
  // Navigation bar
  nav: {
    background: '#1C1C1E',
  },
  // Status/action colors
  status: {
    success: '#22C55E',
    error: '#EF4444',
    warning: '#F59E0B',
    info: '#3FCBFF',
  },
  action: {
    delete: '#EF4444',
    archive: '#F59E0B',
    mute: '#6B7280',
  },
  // BlurView tint
  blurTint: 'dark' as const,
};

// ============================================
// Dark Theme Gradients
// ============================================
const darkGradients = {
  background: ['#0B0E1A', '#0A0D18', '#080B14'] as const,
  backgroundAlt: ['#0a0a20', '#141428', '#0f0f24'] as const,
  card: ['rgba(255, 255, 255, 0.06)', 'rgba(255, 255, 255, 0.03)'] as const,
  glass: ['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.05)'] as const,
  neonPink: ['#EC4899', '#DB2777', '#BE185D'] as const,
  neonCyan: ['#3B82F6', '#2563EB', '#1D4ED8'] as const,
  neonGreen: ['#22C55E', '#16A34A', '#15803D'] as const,
  neonPurple: ['#A855F7', '#9333EA', '#7E22CE'] as const,
  button: ['rgba(59, 130, 246, 0.2)', 'rgba(236, 72, 153, 0.2)'] as const,
  vibe: ['#EC4899', '#A855F7', '#3B82F6', '#22C55E'] as const,
};

// ============================================
// Theme Getter Function
// ============================================
export const getTheme = (_mode?: ResolvedTheme) => ({
  colors: {
    ...sharedColors,
    ...darkColors,
  },
  gradients: darkGradients,
});

// ============================================
// Backward Compatibility Exports
// (These use dark theme as default for existing components)
// ============================================
export const colors = {
  ...sharedColors,
  ...darkColors,
};

export const gradients = darkGradients;

export const typography = {
  // Font families
  display: 'Outfit_600SemiBold',
  displayMedium: 'Outfit_500Medium',
  displayBold: 'Outfit_700Bold',
  body: 'Outfit_400Regular',
  mono: 'monospace',

  // Font sizes (refined for better readability)
  size: {
    xs: 11,
    sm: 14, // Updated: 13 → 14
    base: 16, // Updated: 15 → 16
    md: 16, // Updated: 15 → 16
    lg: 18, // Updated: 17 → 18
    xl: 20,
    '2xl': 24,
    '3xl': 32,
    '4xl': 40,
    '5xl': 56,
  },
  // Alias for plural form
  sizes: {
    xs: 11,
    sm: 14,
    base: 16,
    md: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 32,
    '4xl': 40,
    '5xl': 56,
  },

  // Font weights
  weight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
    black: '900',
  },
  // Alias for plural form
  weights: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
    black: '900',
  },

  // Line heights (new - for better readability)
  lineHeight: {
    tight: 1.2, // Headings
    normal: 1.5, // Body text
    relaxed: 1.7, // Long-form content
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 20, // Updated: 16 → 20 for more generous default padding
  lg: 24,
  xl: 32,
  '2xl': 48,
  '3xl': 64,
  
  // Semantic spacing tokens (new)
  screenPadding: 24, // Consistent screen edge margins
  cardPadding: 20, // Internal card spacing
  listItemGap: 16, // Between list items
};

export const radius = {
  sm: 12,
  md: 16,
  lg: 20,
  xl: 28,
  '2xl': 36,
  full: 9999,
};

export const shadows = {
  neon: {
    pink: '0 0 20px rgba(255, 26, 255, 0.6), 0 0 40px rgba(255, 26, 255, 0.3)',
    cyan: '0 0 20px rgba(0, 240, 255, 0.6), 0 0 40px rgba(0, 240, 255, 0.3)',
    green: '0 0 20px rgba(57, 255, 20, 0.6), 0 0 40px rgba(57, 255, 20, 0.3)',
    purple: '0 0 20px rgba(181, 55, 242, 0.6), 0 0 40px rgba(181, 55, 242, 0.3)',
  },
  glow: {
    sm: '0 0 20px rgba(168, 85, 247, 0.15)',
    md: '0 0 40px rgba(168, 85, 247, 0.2)',
    lg: '0 0 60px rgba(168, 85, 247, 0.25)',
  },
  soft: {
    sm: '0 4px 16px rgba(0, 0, 0, 0.3)',
    md: '0 8px 24px rgba(0, 0, 0, 0.4)',
    lg: '0 12px 32px rgba(0, 0, 0, 0.5)',
  },
};

// Elevation system (new - for subtle depth without glows)
// Use these for non-glowing elements that need depth
export const elevation = {
  none: {},
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
};

// Interaction states (new - for consistent feedback)
export const interactionStates = {
  pressed: 0.7, // activeOpacity for TouchableOpacity
  disabled: 0.4, // opacity for disabled elements
  active: '#3FCBFF', // accent.primary for selected items (default cyan)
  activeBackground: 'rgba(63, 203, 255, 0.15)', // accent.soft for selected backgrounds
};

// Helper function to get mood color
export const getMoodColor = (mood: 'good' | 'neutral' | 'not_great' | 'reach_out') => {
  switch (mood) {
    case 'good':
      return colors.mood.good;
    case 'neutral':
      return colors.mood.neutral;
    case 'not_great':
      return colors.mood.notGreat;
    case 'reach_out':
      return colors.mood.reachOut;
    default:
      return colors.mood.neutral;
  }
};

// Determine if text on a given hex color should be dark or light
const getTextOnColor = (hex: string): string => {
  // Validate hex format to prevent NaN from parseInt
  if (!hex || hex.length < 7 || hex[0] !== '#') return '#FFFFFF';
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  if (isNaN(r) || isNaN(g) || isNaN(b)) return '#FFFFFF';
  // Relative luminance formula
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.55 ? '#1A1A1A' : '#FFFFFF';
};

// Helper function to get accent colors from mood (for dynamic theming)
export const getAccentFromMood = (mood?: PresetMood): AccentColors => {
  const moodColors = getMoodColor(mood || 'neutral');
  return {
    primary: moodColors.base,
    soft: moodColors.soft,
    glow: moodColors.glow,
    gradient: moodColors.gradient,
    textOnPrimary: getTextOnColor(moodColors.base),
  };
};

// Helper to get mood image - uses inline requires for New Architecture compatibility
export const getMoodImage = (mood: 'good' | 'neutral' | 'not_great' | 'reach_out') => {
  switch (mood) {
    case 'good':
      return require('../assets/good.png');
    case 'neutral':
      return require('../assets/chill.png');
    case 'not_great':
      return require('../assets/down.png');
    case 'reach_out':
      return require('../assets/help.png');
    default:
      return require('../assets/chill.png');
  }
};

// Export all mood images for pre-caching if needed
export const getAllMoodImages = () => [
  require('../assets/good.png'),
  require('../assets/chill.png'),
  require('../assets/down.png'),
  require('../assets/help.png'),
];

// Status labels for each mood
const vibeLabels: Record<string, string[]> = {
  good: ['Vibing', 'On top', 'Lit', 'Golden', 'Thriving'],
  neutral: ["Chillin'", 'Coasting', 'Floating', "Cruisin'", 'Zen'],
  not_great: ['Meh...', 'Off today', 'Blah', 'Low-key', 'Drained'],
  reach_out: ['Help!', 'SOS', 'Not ok', 'Need a hug', 'Struggling'],
};

// Helper to get random vibe text
export const getVibeText = (mood: 'good' | 'neutral' | 'not_great' | 'reach_out') => {
  const options = vibeLabels[mood] || vibeLabels.neutral;
  return options[Math.floor(Math.random() * options.length)];
};

// ============================================
// Custom Mood Support
// ============================================

// Custom mood color palette
// Neutral color for custom moods — works in both light/dark, avoids clashing with preset mood colors
export const CUSTOM_MOOD_NEUTRAL_COLOR = '#FACC15'; // Yellow accent

// Legacy export kept for compatibility
export const CUSTOM_MOOD_COLORS = [CUSTOM_MOOD_NEUTRAL_COLOR];

// Helper to get custom mood color with glow and soft variants
export const getCustomMoodColor = (hexColor: string) => {
  // Parse hex color to RGB
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  return {
    base: hexColor,
    glow: `rgba(${r}, ${g}, ${b}, 0.4)`,
    soft: `rgba(${r}, ${g}, ${b}, 0.15)`,
    gradient: [hexColor, hexColor] as const,
  };
};

// Helper to get mood display (supports both preset and custom moods)
export const getMoodDisplay = (
  user: { mood: 'good' | 'neutral' | 'not_great' | 'reach_out'; custom_mood_id?: string },
  customMood?: { id: string; emoji: string; text: string; color: string }
) => {
  if (customMood && user.custom_mood_id === customMood.id) {
    return {
      type: 'custom' as const,
      emoji: customMood.emoji,
      text: customMood.text,
      color: getCustomMoodColor(customMood.color),
    };
  }

  return {
    type: 'preset' as const,
    mood: user.mood,
    image: getMoodImage(user.mood),
    colors: getMoodColor(user.mood),
  };
};
