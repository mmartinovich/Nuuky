import React from 'react';
import { render } from '@testing-library/react-native';
import { SwipeableFriendCard } from '../../components/SwipeableFriendCard';

jest.mock('expo-image', () => ({ Image: 'CachedImage' }));
jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium' },
  NotificationFeedbackType: { Warning: 'warning' },
}));

jest.mock('react-native-gesture-handler/ReanimatedSwipeable', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: ({ children }: any) => <View>{children}</View>,
  };
});

jest.mock('react-native-reanimated', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: {
      View: ({ children, style, ...props }: any) => <View style={style} {...props}>{children}</View>,
    },
    useSharedValue: (v: any) => ({ value: v }),
    useAnimatedStyle: () => ({}),
    interpolate: jest.fn(),
  };
});

jest.mock('../../hooks/useTheme', () => ({
  useTheme: () => ({
    theme: {
      colors: {
        glass: { background: '#111', border: '#333' },
        text: { primary: '#fff', tertiary: '#666' },
        ui: { borderLight: '#444' },
        bg: { primary: '#000' },
      },
    },
  }),
}));

jest.mock('../../lib/theme', () => ({
  getMoodColor: () => ({ base: '#888', gradient: ['#888', '#666'] }),
  radius: { md: 8 },
}));

jest.mock('../../lib/utils', () => ({
  isUserTrulyOnline: jest.fn().mockReturnValue(false),
  formatRelativeTime: jest.fn().mockReturnValue('5m ago'),
}));

jest.mock('../../components/StreakBadge', () => ({
  BoltIcon: () => null,
  BoltTier: {},
}));

jest.mock('react-native-svg', () => ({
  Svg: 'Svg',
  Path: 'Path',
  Defs: 'Defs',
  LinearGradient: 'LinearGradient',
  Stop: 'Stop',
}));

const mockFriendship = {
  id: 'fs1',
  user_id: 'u1',
  friend_id: 'f1',
  friend: {
    id: 'f1',
    display_name: 'Alice',
    mood: 'good',
    avatar_url: null,
    is_online: false,
    last_seen_at: '2024-01-01T00:00:00Z',
  },
};

describe('SwipeableFriendCard', () => {
  const defaultProps = {
    friendship: mockFriendship as any,
    onRemove: jest.fn(),
    textPrimaryColor: '#fff',
  };

  test('renders friend name', () => {
    const { getByText } = render(<SwipeableFriendCard {...defaultProps} />);
    expect(getByText('Alice')).toBeTruthy();
  });

  test('renders avatar placeholder with initial', () => {
    const { getByText } = render(<SwipeableFriendCard {...defaultProps} />);
    expect(getByText('A')).toBeTruthy();
  });

  test('renders last seen time', () => {
    const { getByText } = render(<SwipeableFriendCard {...defaultProps} />);
    expect(getByText('5m ago')).toBeTruthy();
  });

  test('renders streak badge when present', () => {
    const streak = { state: 'active', consecutive_days: 5 };
    const { getByText } = render(
      <SwipeableFriendCard {...defaultProps} streak={streak as any} />,
    );
    expect(getByText('5')).toBeTruthy();
  });

  test('does not render streak when broken', () => {
    const streak = { state: 'broken', consecutive_days: 0 };
    const { queryByText } = render(
      <SwipeableFriendCard {...defaultProps} streak={streak as any} />,
    );
    // Broken streak should not show count
    expect(queryByText('0')).toBeNull();
  });
});
