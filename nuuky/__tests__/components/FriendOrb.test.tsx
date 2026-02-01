import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { FriendOrb } from '../../components/FriendOrb';

jest.mock('../../hooks/useTheme', () => ({
  useTheme: () => ({
    theme: {
      colors: {
        glass: { background: '#111', border: '#333' },
        text: { primary: '#fff', secondary: '#999', tertiary: '#666' },
        bg: { primary: '#000' },
        mood: { good: { base: '#0f0' } },
        neon: { cyan: '#0ff' },
      },
    },
  }),
}));

jest.mock('../../lib/theme', () => ({
  getMoodColor: () => ({ base: '#888', glow: '#88888844', gradient: ['#888', '#666'] }),
  getMoodDisplay: (user: any) => ({
    type: 'preset',
    emoji: '😊',
    label: 'Good',
    color: { base: '#888', glow: '#88888844', gradient: ['#888', '#666'] },
  }),
  spacing: { xs: 4, sm: 8 },
  radius: { sm: 4 },
}));

jest.mock('../../lib/utils', () => ({
  isUserTrulyOnline: jest.fn().mockReturnValue(true),
}));

const mockFriend = {
  id: 'f1',
  display_name: 'Alice',
  mood: 'good',
  is_online: true,
  last_seen_at: null,
  avatar_url: null,
};

describe('FriendOrb', () => {
  test('renders friend name', () => {
    const { getByText } = render(<FriendOrb friend={mockFriend as any} onPress={jest.fn()} />);
    expect(getByText('Alice')).toBeTruthy();
  });

  test('renders without crashing', () => {
    const { toJSON } = render(<FriendOrb friend={mockFriend as any} onPress={jest.fn()} />);
    expect(toJSON()).not.toBeNull();
  });

  test('calls onPress when tapped', () => {
    const onPress = jest.fn();
    const { getByText } = render(<FriendOrb friend={mockFriend as any} onPress={onPress} />);
    fireEvent.press(getByText('Alice'));
    expect(onPress).toHaveBeenCalled();
  });

  test('renders offline friend', () => {
    const { isUserTrulyOnline } = require('../../lib/utils');
    isUserTrulyOnline.mockReturnValueOnce(false);
    const { getByText } = render(<FriendOrb friend={{ ...mockFriend, is_online: false } as any} onPress={jest.fn()} />);
    expect(getByText('Alice')).toBeTruthy();
  });
});
