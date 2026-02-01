import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { InviteCard } from '../../components/InviteCard';

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

jest.mock('expo-image', () => ({
  Image: 'CachedImage',
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

jest.mock('../../hooks/useTheme', () => ({
  useTheme: () => ({
    theme: {
      colors: {
        glass: { border: '#333', background: '#111' },
        text: { primary: '#fff', secondary: '#999' },
        bg: { secondary: '#222' },
        mood: { good: { base: '#0f0', soft: 'rgba(0,255,0,0.1)' }, neutral: { base: '#888' }, reachOut: { base: '#f0f' } },
        neon: { cyan: '#0ff' },
      },
      gradients: { card: ['#000', '#111'], glass: ['#111', '#222'], neonCyan: ['#0ff', '#0dd'] },
    },
    isDark: true,
  }),
}));

const futureDate = new Date(Date.now() + 3600000).toISOString(); // 1hr from now
const pastDate = new Date(Date.now() - 3600000).toISOString();

const mockInvite = {
  id: 'inv1',
  sender: { id: 's1', display_name: 'Alice', mood: 'good', avatar_url: null },
  room: { id: 'r1', name: 'Chill Room' },
  expires_at: futureDate,
};

describe('InviteCard', () => {
  test('renders room name and sender', () => {
    const { getByText } = render(
      <InviteCard invite={mockInvite as any} onAccept={jest.fn()} onDecline={jest.fn()} />
    );
    expect(getByText('Chill Room')).toBeTruthy();
    expect(getByText('from Alice')).toBeTruthy();
  });

  test('shows accept and decline buttons', () => {
    const { getByText } = render(
      <InviteCard invite={mockInvite as any} onAccept={jest.fn()} onDecline={jest.fn()} />
    );
    expect(getByText('Accept')).toBeTruthy();
    expect(getByText('Decline')).toBeTruthy();
  });

  test('shows expired state', () => {
    const expired = { ...mockInvite, expires_at: pastDate };
    const { getByText, queryByText } = render(
      <InviteCard invite={expired as any} onAccept={jest.fn()} onDecline={jest.fn()} />
    );
    expect(getByText('Expired')).toBeTruthy();
    expect(queryByText('Accept')).toBeNull();
  });

  test('calls onAccept', async () => {
    const onAccept = jest.fn().mockResolvedValue(undefined);
    const { getByText } = render(
      <InviteCard invite={mockInvite as any} onAccept={onAccept} onDecline={jest.fn()} />
    );
    fireEvent.press(getByText('Accept'));
    expect(onAccept).toHaveBeenCalled();
  });

  test('calls onDecline', async () => {
    const onDecline = jest.fn().mockResolvedValue(undefined);
    const { getByText } = render(
      <InviteCard invite={mockInvite as any} onAccept={jest.fn()} onDecline={onDecline} />
    );
    fireEvent.press(getByText('Decline'));
    expect(onDecline).toHaveBeenCalled();
  });
});
