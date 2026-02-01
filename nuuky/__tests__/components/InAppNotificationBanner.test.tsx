import React from 'react';
import { render } from '@testing-library/react-native';
import { InAppNotificationBanner } from '../../components/InAppNotificationBanner';

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
jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light' },
  NotificationFeedbackType: { Success: 'success' },
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0 }),
}));

jest.mock('../../hooks/useTheme', () => ({
  useTheme: () => ({
    isDark: true,
    theme: {
      colors: {
        glass: { background: '#111', border: '#333' },
        text: { primary: '#fff', secondary: '#999', tertiary: '#666' },
        neon: { cyan: '#0ff', purple: '#a855f7' },
        blurTint: 'dark',
      },
    },
  }),
}));

describe('InAppNotificationBanner', () => {
  test('returns null when no notification', () => {
    const { toJSON } = render(
      <InAppNotificationBanner notification={null} onDismiss={jest.fn()} />,
    );
    expect(toJSON()).toBeNull();
  });

  test('renders notification title and body', () => {
    const notification = { id: '1', title: 'Hello', body: 'World' };
    const { getByText } = render(
      <InAppNotificationBanner notification={notification} onDismiss={jest.fn()} />,
    );
    expect(getByText('Hello')).toBeTruthy();
    expect(getByText('World')).toBeTruthy();
  });

  test('triggers haptic on notification appear', () => {
    const notification = { id: '1', title: 'Test', body: 'Body' };
    render(<InAppNotificationBanner notification={notification} onDismiss={jest.fn()} />);
    const Haptics = require('expo-haptics');
    expect(Haptics.notificationAsync).toHaveBeenCalled();
  });

  test('renders with avatar URL', () => {
    const notification = { id: '1', title: 'Test', body: 'Body', avatarUrl: 'https://img.com/pic.jpg' };
    const { toJSON } = render(
      <InAppNotificationBanner notification={notification} onDismiss={jest.fn()} />,
    );
    expect(toJSON()).not.toBeNull();
  });

  test('renders with custom color', () => {
    const notification = { id: '1', title: 'Test', body: 'Body', color: '#FF0000' };
    const { toJSON } = render(
      <InAppNotificationBanner notification={notification} onDismiss={jest.fn()} />,
    );
    expect(toJSON()).not.toBeNull();
  });
});
