import React from 'react';
import { render } from '@testing-library/react-native';
import { Animated } from 'react-native';
import { FriendParticle } from '../../components/FriendParticle';

// Mock dependencies
jest.mock('expo-image', () => ({
  Image: 'Image',
}));

jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children, ...props }: any) => {
    const { View } = require('react-native');
    return <View {...props}>{children}</View>;
  },
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'Light', Medium: 'Medium' },
}));

jest.mock('../../lib/theme', () => ({
  getMoodColor: jest.fn(() => ({
    base: '#3FCBFF',
    soft: 'rgba(63, 203, 255, 0.15)',
    glow: 'rgba(63, 203, 255, 0.4)',
  })),
}));

jest.mock('../../lib/utils', () => ({
  isUserTrulyOnline: jest.fn(() => true),
}));

jest.mock('../../hooks/useTheme', () => ({
  useTheme: () => ({
    theme: {
      colors: {
        text: { primary: '#fff', secondary: '#ccc', tertiary: '#999' },
        glass: { border: '#333', background: '#111' },
        bg: { primary: '#000' },
        mood: { good: { base: '#32D583' } },
      },
      gradients: { button: ['#000', '#111'] },
    },
  }),
}));

jest.mock('../../stores/appStore', () => ({
  useLowPowerMode: jest.fn(() => false),
}));

jest.mock('../../components/StreakBadge', () => ({
  StreakBadge: () => null,
}));

describe('FriendParticle', () => {
  const mockFriend = {
    id: 'friend123',
    display_name: 'Test Friend',
    avatar_url: 'https://example.com/avatar.png',
    mood: 'good' as const,
    is_online: true,
    last_seen_at: new Date().toISOString(),
  };

  const mockOrbitAngle = new Animated.Value(0);

  test('renders friend particle', () => {
    const { toJSON } = render(
      <FriendParticle
        friend={mockFriend}
        index={0}
        total={3}
        baseAngle={0}
        radius={100}
        orbitAngle={mockOrbitAngle}
        onPress={jest.fn()}
        hasActiveFlare={false}
        position={{ x: 100, y: 100 }}
      />
    );

    expect(toJSON()).toBeTruthy();
  });

  test('renders with hasActiveFlare', () => {
    const { toJSON } = render(
      <FriendParticle
        friend={mockFriend}
        index={0}
        total={3}
        baseAngle={0}
        radius={100}
        orbitAngle={mockOrbitAngle}
        onPress={jest.fn()}
        hasActiveFlare={true}
        position={{ x: 100, y: 100 }}
      />
    );

    expect(toJSON()).toBeTruthy();
  });
});
