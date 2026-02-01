import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { UserSearchModal } from '../../components/UserSearchModal';

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

jest.mock('../../hooks/useTheme', () => ({
  useTheme: () => ({
    theme: {
      colors: {
        glass: { background: '#111', border: '#333' },
        text: { primary: '#fff', secondary: '#999', tertiary: '#666' },
        bg: { primary: '#000' },
        mood: { good: { base: '#0f0' } },
      },
      gradients: { neonCyan: ['#0ff', '#0af'] },
    },
  }),
}));

const mockSearchUsers = jest.fn();
const mockClearResults = jest.fn();

jest.mock('../../hooks/useUserSearch', () => ({
  useUserSearch: () => ({
    loading: false,
    results: [],
    searchUsers: mockSearchUsers,
    clearResults: mockClearResults,
  }),
}));

jest.mock('../../hooks/useFriends', () => ({
  useFriends: () => ({
    friends: [],
    addFriend: jest.fn(),
  }),
}));

jest.mock('../../lib/utils', () => ({
  isUserTrulyOnline: jest.fn().mockReturnValue(false),
}));

describe('UserSearchModal', () => {
  test('renders title', () => {
    const { getByText } = render(
      <UserSearchModal visible={true} onClose={jest.fn()} />,
    );
    expect(getByText('Find Users')).toBeTruthy();
  });

  test('shows hint state initially', () => {
    const { getByText } = render(
      <UserSearchModal visible={true} onClose={jest.fn()} />,
    );
    expect(getByText('Search by Username')).toBeTruthy();
    expect(getByText('Enter at least 2 characters to search for users')).toBeTruthy();
  });

  test('has search placeholder', () => {
    const { getByPlaceholderText } = render(
      <UserSearchModal visible={true} onClose={jest.fn()} />,
    );
    expect(getByPlaceholderText('Search by username...')).toBeTruthy();
  });

  test('clears results on close', () => {
    const { rerender } = render(
      <UserSearchModal visible={true} onClose={jest.fn()} />,
    );
    rerender(<UserSearchModal visible={false} onClose={jest.fn()} />);
    expect(mockClearResults).toHaveBeenCalled();
  });
});
