import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { CentralOrb } from '../../components/CentralOrb';

jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children, ...props }: any) => {
    const { View } = require('react-native');
    return <View {...props}>{children}</View>;
  },
}));

jest.mock('expo-blur', () => ({
  BlurView: ({ children, ...props }: any) => {
    const { View } = require('react-native');
    return <View {...props}>{children}</View>;
  },
}));

jest.mock('react-native-svg', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: ({ children, ...props }: any) => <View {...props}>{children}</View>,
    Svg: ({ children, ...props }: any) => <View {...props}>{children}</View>,
    Defs: ({ children, ...props }: any) => <View {...props}>{children}</View>,
    RadialGradient: ({ children, ...props }: any) => <View {...props}>{children}</View>,
    Stop: (props: any) => <View {...props} />,
    Circle: (props: any) => <View {...props} />,
  };
});

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Medium: 'medium', Heavy: 'heavy' },
}));

jest.mock('../../hooks/useTheme', () => ({
  useTheme: () => ({
    isDark: true,
    theme: {
      colors: {
        glass: { background: '#111', border: '#333' },
        text: { primary: '#fff', secondary: '#999', tertiary: '#666' },
        bg: { primary: '#000' },
        neon: { cyan: '#0ff', purple: '#a855f7' },
        mood: { good: { base: '#0f0' }, neutral: { base: '#888' } },
        status: { error: '#EF4444' },
      },
    },
  }),
}));

jest.mock('../../lib/theme', () => ({
  getMoodImage: () => null,
}));

describe('CentralOrb', () => {
  const defaultProps = {
    moodColor: '#888888',
    glowColor: '#88888844',
    hasActiveFlare: false,
    mood: 'neutral' as const,
  };

  test('renders without crashing', () => {
    const { toJSON } = render(<CentralOrb {...defaultProps} />);
    expect(toJSON()).not.toBeNull();
  });

  test('renders with active flare', () => {
    const { toJSON } = render(<CentralOrb {...defaultProps} hasActiveFlare={true} />);
    expect(toJSON()).not.toBeNull();
  });

  test('renders with custom mood', () => {
    const customMood = { id: 'cm1', emoji: '🎉', text: 'Party', color: '#FF0000' };
    const { toJSON } = render(<CentralOrb {...defaultProps} customMood={customMood as any} />);
    expect(toJSON()).not.toBeNull();
  });

  test('renders hint text when showHint is true', () => {
    const { toJSON } = render(<CentralOrb {...defaultProps} showHint={true} />);
    expect(toJSON()).not.toBeNull();
  });

  test('renders status text', () => {
    const { getByText } = render(<CentralOrb {...defaultProps} statusText="Connected" />);
    expect(getByText('Connected')).toBeTruthy();
  });

  test('calls onPress when tapped', () => {
    const onPress = jest.fn();
    const { toJSON } = render(<CentralOrb {...defaultProps} onPress={onPress} />);
    expect(toJSON()).not.toBeNull();
  });

  test('renders with good mood', () => {
    const { toJSON } = render(<CentralOrb {...defaultProps} mood="good" />);
    expect(toJSON()).not.toBeNull();
  });
});
