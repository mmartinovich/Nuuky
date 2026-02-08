import {
  getMoodColor,
  getMoodImage,
  getTheme,
  getAccentFromMood,
  getCustomMoodColor,
  getMoodDisplay,
  getVibeText,
  colors,
  gradients,
  typography,
  spacing,
  radius,
  CUSTOM_MOOD_NEUTRAL_COLOR,
} from '../../lib/theme';

// Mock require for image assets
jest.mock('../../assets/good.png', () => 'good.png', { virtual: true });
jest.mock('../../assets/chill.png', () => 'chill.png', { virtual: true });
jest.mock('../../assets/down.png', () => 'down.png', { virtual: true });
jest.mock('../../assets/help.png', () => 'help.png', { virtual: true });

describe('theme', () => {
  describe('getMoodColor', () => {
    test('returns correct color for good', () => {
      const c = getMoodColor('good');
      expect(c.base).toBe('#32D583');
    });

    test('returns correct color for neutral', () => {
      const c = getMoodColor('neutral');
      expect(c.base).toBe('#3FCBFF');
    });

    test('returns correct color for not_great', () => {
      const c = getMoodColor('not_great');
      expect(c.base).toBe('#B06CF3');
    });

    test('returns correct color for reach_out', () => {
      const c = getMoodColor('reach_out');
      expect(c.base).toBe('#FF4D6D');
    });

    test('returns neutral for unknown mood', () => {
      const c = getMoodColor('unknown' as any);
      expect(c.base).toBe('#3FCBFF');
    });

    test('mood colors have glow and soft properties', () => {
      const c = getMoodColor('good');
      expect(c.glow).toBeDefined();
      expect(c.soft).toBeDefined();
      expect(c.gradient).toHaveLength(2);
    });
  });

  describe('getMoodImage', () => {
    test('returns image for each mood', () => {
      expect(getMoodImage('good')).toBeDefined();
      expect(getMoodImage('neutral')).toBeDefined();
      expect(getMoodImage('not_great')).toBeDefined();
      expect(getMoodImage('reach_out')).toBeDefined();
    });

    test('returns neutral image for unknown mood', () => {
      expect(getMoodImage('unknown' as any)).toBeDefined();
    });
  });

  describe('getTheme', () => {
    test('returns dark theme colors', () => {
      const theme = getTheme('dark');
      expect(theme.colors.bg.primary).toBe('#050510');
      expect(theme.colors.text.primary).toBe('#ffffff');
    });

    test('getTheme returns same colors regardless of mode parameter', () => {
      const dark = getTheme('dark');
      const light = getTheme('light');
      expect(dark.colors.bg.primary).toBe(light.colors.bg.primary);
      expect(dark.colors.mood.good.base).toBe(light.colors.mood.good.base);
    });
  });

  describe('getAccentFromMood', () => {
    test('returns accent colors for mood', () => {
      const accent = getAccentFromMood('good');
      expect(accent.primary).toBe('#32D583');
      expect(accent.soft).toBeDefined();
      expect(accent.glow).toBeDefined();
      expect(accent.gradient).toHaveLength(2);
      expect(accent.textOnPrimary).toBeDefined();
    });

    test('defaults to neutral when no mood', () => {
      const accent = getAccentFromMood();
      expect(accent.primary).toBe('#3FCBFF');
    });
  });

  describe('getCustomMoodColor', () => {
    test('returns color object from hex', () => {
      const c = getCustomMoodColor('#FF6B35');
      expect(c.base).toBe('#FF6B35');
      expect(c.glow).toContain('rgba');
      expect(c.soft).toContain('rgba');
      expect(c.gradient).toHaveLength(2);
    });
  });

  describe('getMoodDisplay', () => {
    test('returns preset mood display', () => {
      const display = getMoodDisplay({ mood: 'good' });
      expect(display.type).toBe('preset');
    });

    test('returns custom mood display when active', () => {
      const customMood = { id: 'cm1', emoji: '🔥', text: 'Fire', color: '#FF0000' };
      const display = getMoodDisplay({ mood: 'neutral', custom_mood_id: 'cm1' }, customMood);
      expect(display.type).toBe('custom');
      expect((display as any).emoji).toBe('🔥');
    });
  });

  describe('getVibeText', () => {
    test('returns a string for each mood', () => {
      expect(typeof getVibeText('good')).toBe('string');
      expect(typeof getVibeText('neutral')).toBe('string');
      expect(typeof getVibeText('not_great')).toBe('string');
      expect(typeof getVibeText('reach_out')).toBe('string');
    });
  });

  describe('exports', () => {
    test('colors has expected structure', () => {
      expect(colors.bg).toBeDefined();
      expect(colors.text).toBeDefined();
      expect(colors.mood).toBeDefined();
    });

    test('gradients has expected structure', () => {
      expect(gradients.background).toBeDefined();
      expect(gradients.card).toBeDefined();
    });

    test('typography has sizes and weights', () => {
      expect(typography.size.base).toBe(16);
      expect(typography.weight.bold).toBe('700');
    });

    test('spacing has expected values', () => {
      expect(spacing.md).toBe(20);
      expect(spacing.screenPadding).toBe(24);
    });

    test('radius has expected values', () => {
      expect(radius.full).toBe(9999);
    });

    test('CUSTOM_MOOD_NEUTRAL_COLOR is defined', () => {
      expect(CUSTOM_MOOD_NEUTRAL_COLOR).toBe('#FACC15');
    });
  });
});
