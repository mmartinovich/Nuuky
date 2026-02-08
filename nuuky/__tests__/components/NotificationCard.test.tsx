import React from 'react';
import { render } from '@testing-library/react-native';
import { NotificationCard } from '../../components/NotificationCard';

jest.mock('expo-blur', () => ({
  BlurView: ({ children, ...props }: any) => {
    const { View } = require('react-native');
    return <View {...props}>{children}</View>;
  },
}));

jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children, ...props }: any) => {
    const { View } = require('react-native');
    return <View {...props}>{children}</View>;
  },
}));

jest.mock('expo-image', () => ({ Image: 'CachedImage' }));
jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons', MaterialCommunityIcons: 'MaterialCommunityIcons' }));
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Medium: 'medium' },
  NotificationFeedbackType: { Success: 'success' },
}));

jest.mock('react-native-gesture-handler/ReanimatedSwipeable', () => {
  const { View } = require('react-native');
  return { __esModule: true, default: ({ children }: any) => <View>{children}</View> };
});

jest.mock('react-native-reanimated', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: { View: ({ children, style, ...props }: any) => <View style={style} {...props}>{children}</View> },
    useSharedValue: (v: any) => ({ value: v }),
    useAnimatedStyle: () => ({}),
    interpolate: jest.fn(),
  };
});

jest.mock('../../hooks/useTheme', () => ({
  useTheme: () => ({
    isDark: true,
    accent: { primary: '#3FCBFF', soft: 'rgba(63,203,255,0.15)', glow: '#3FCBFF', gradient: ['#3FCBFF', '#00b8d4'], textOnPrimary: '#000' },
    theme: {
      colors: {
        glass: { background: '#111', border: '#333' },
        text: { primary: '#fff', secondary: '#999', tertiary: '#666' },
        neon: { cyan: '#0ff', purple: '#a855f7', orange: '#f97316' },
        mood: { good: { base: '#0f0' }, neutral: { base: '#888' } },
        bg: { primary: '#000' },
        blurTint: 'dark',
        status: { error: '#EF4444' },
      },
      gradients: { card: ['#111', '#222'], glass: ['#111', '#333'] },
    },
  }),
}));

jest.mock('../../lib/theme', () => ({
  spacing: { xs: 4, sm: 8, md: 16, lg: 24 },
  radius: { md: 8, lg: 12 },
  typography: { size: { xs: 10, sm: 12, md: 14 } },
}));

jest.mock('../../lib/utils', () => ({
  formatRelativeTime: jest.fn().mockReturnValue('2m ago'),
}));

const makeNotification = (overrides: any = {}) => ({
  id: 'n1',
  type: 'nudge' as const,
  title: 'Hey!',
  body: 'Someone nudged you',
  is_read: false,
  created_at: new Date().toISOString(),
  data: { sender_avatar_url: null, friend_avatar_url: null },
  ...overrides,
});

describe('NotificationCard', () => {
  const defaultProps = {
    notification: makeNotification(),
    onPress: jest.fn(),
    onDelete: jest.fn(),
  };

  test('renders title', () => {
    const { getByText } = render(<NotificationCard {...defaultProps} />);
    expect(getByText('Hey!')).toBeTruthy();
  });

  test('renders relative time', () => {
    const { getByText } = render(<NotificationCard {...defaultProps} />);
    expect(getByText('2m ago')).toBeTruthy();
  });

  test('renders for different notification types', () => {
    const types = ['nudge', 'flare', 'friend_request', 'friend_accepted', 'room_invite', 'call_me'] as const;
    types.forEach((type) => {
      const { getByText } = render(
        <NotificationCard {...defaultProps} notification={makeNotification({ type, title: type })} />,
      );
      expect(getByText(type)).toBeTruthy();
    });
  });

  test('renders read notification', () => {
    const { getByText } = render(
      <NotificationCard {...defaultProps} notification={makeNotification({ is_read: true })} />,
    );
    expect(getByText('Hey!')).toBeTruthy();
  });

  test('renders with avatar URL', () => {
    const { toJSON } = render(
      <NotificationCard
        {...defaultProps}
        notification={makeNotification({ data: { sender_avatar_url: 'https://img.com/pic.jpg' } })}
      />,
    );
    expect(toJSON()).not.toBeNull();
  });
});
