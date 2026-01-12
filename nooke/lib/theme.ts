// Nūūky Design System - Neon Cyber Garden (Gen-Z Edition)

export const colors = {
  // Backgrounds - Darker, richer gradients for glassmorphism
  bg: {
    primary: '#050510',
    secondary: '#0a0a20',
    tertiary: '#141428',
  },

  // Mood colors - Vibrant and energetic
  mood: {
    good: {
      base: '#22C55E', // Vibrant green
      glow: 'rgba(34, 197, 94, 0.4)',
      soft: 'rgba(34, 197, 94, 0.15)',
      gradient: ['#22C55E', '#16A34A'],
    },
    neutral: {
      base: '#3B82F6', // Bright blue
      glow: 'rgba(59, 130, 246, 0.4)',
      soft: 'rgba(59, 130, 246, 0.15)',
      gradient: ['#3B82F6', '#2563EB'],
    },
    notGreat: {
      base: '#A855F7', // Vibrant purple
      glow: 'rgba(168, 85, 247, 0.4)',
      soft: 'rgba(168, 85, 247, 0.15)',
      gradient: ['#A855F7', '#9333EA'],
    },
    reachOut: {
      base: '#EC4899', // Bright pink
      glow: 'rgba(236, 72, 153, 0.45)',
      soft: 'rgba(236, 72, 153, 0.18)',
      gradient: ['#EC4899', '#DB2777'],
    },
  },

  // Glass properties for glassmorphism effects
  glass: {
    background: 'rgba(255, 255, 255, 0.08)',
    border: 'rgba(255, 255, 255, 0.15)',
    highlight: 'rgba(255, 255, 255, 0.25)',
    shadow: 'rgba(0, 0, 0, 0.3)',
  },

  // Text colors - high contrast
  text: {
    primary: '#ffffff',
    secondary: '#c7d2fe',
    tertiary: '#8b9fd9',
    accent: '#00f0ff',
    neon: '#ff1aff',
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

  // Neon accent colors
  neon: {
    pink: '#ff1aff',
    cyan: '#00f0ff',
    green: '#39ff14',
    purple: '#b537f2',
    orange: '#ff6b35',
  },
};

export const gradients = {
  background: ['#050510', '#0a0a20', '#141428'],
  backgroundAlt: ['#0a0a20', '#141428', '#0f0f24'],
  card: ['rgba(255, 255, 255, 0.06)', 'rgba(255, 255, 255, 0.03)'],
  glass: ['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.05)'],
  neonPink: ['#EC4899', '#DB2777', '#BE185D'],
  neonCyan: ['#3B82F6', '#2563EB', '#1D4ED8'],
  neonGreen: ['#22C55E', '#16A34A', '#15803D'],
  neonPurple: ['#A855F7', '#9333EA', '#7E22CE'],
  button: ['rgba(59, 130, 246, 0.2)', 'rgba(236, 72, 153, 0.2)'],
  vibe: ['#EC4899', '#A855F7', '#3B82F6', '#22C55E'],
};

export const typography = {
  // Font families
  display: 'Outfit', // Modern, rounded, friendly
  body: 'system',
  mono: 'monospace',

  // Font sizes
  size: {
    xs: 11,
    sm: 13,
    base: 15,
    md: 15,
    lg: 17,
    xl: 20,
    '2xl': 24,
    '3xl': 32,
    '4xl': 40,
    '5xl': 56,
  },
  // Alias for plural form
  sizes: {
    xs: 11,
    sm: 13,
    base: 15,
    md: 15,
    lg: 17,
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
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
  '3xl': 64,
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

// Pre-load all mood images at module initialization for instant switching
const MOOD_IMAGES = {
  good: require('../assets/good.png'),
  neutral: require('../assets/chill.png'),
  not_great: require('../assets/down.png'),
  reach_out: require('../assets/help.png'),
} as const;

// Helper to get mood image (uses pre-loaded images for instant access)
export const getMoodImage = (mood: 'good' | 'neutral' | 'not_great' | 'reach_out') => {
  return MOOD_IMAGES[mood] || MOOD_IMAGES.neutral;
};

// Export all mood images for pre-caching if needed
export const getAllMoodImages = () => Object.values(MOOD_IMAGES);

// Vibe words for each mood
const vibeWords = {
  good: [
    'vibing',
    'thriving',
    'glowing',
    'slaying',
    'winning',
    'living',
    'flourishing',
    'shining',
    'beaming',
    'radiant',
  ],
  neutral: [
    'chilling',
    'existing',
    'vibing',
    'hanging',
    'floating',
    'coasting',
    'present',
    'here',
    'around',
    'just vibing',
  ],
  not_great: [
    'meh',
    'struggling',
    'rough',
    'low',
    'down',
    'off',
    'bleh',
    'ugh',
    'not it',
    'rough day',
  ],
  reach_out: [
    'need u',
    'here for me',
    'support',
    'help',
    'struggling',
    'reach out',
    'need support',
    'here',
    'present',
    'available',
  ],
};

// Helper to get vibe text (randomized)
export const getVibeText = (mood: 'good' | 'neutral' | 'not_great' | 'reach_out') => {
  const words = vibeWords[mood] || vibeWords.neutral;
  const randomIndex = Math.floor(Math.random() * words.length);
  return words[randomIndex];
};
