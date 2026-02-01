import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { InviteFriendsModal } from '../../components/InviteFriendsModal';

jest.mock('expo-blur', () => ({
  BlurView: ({ children, ...props }: any) => {
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
        glass: { background: '#111', border: '#333' },
        text: { primary: '#fff', secondary: '#999', tertiary: '#666' },
      },
    },
    accent: { primary: '#3FCBFF', soft: 'rgba(63,203,255,0.15)', textOnPrimary: '#000' },
  }),
}));

jest.mock('../../lib/utils', () => ({
  isUserTrulyOnline: jest.fn().mockReturnValue(false),
}));

const friends = [
  { id: 'f1', display_name: 'Alice', avatar_url: null, is_online: false, last_seen_at: null },
  { id: 'f2', display_name: 'Bob', avatar_url: null, is_online: false, last_seen_at: null },
] as any[];

describe('InviteFriendsModal', () => {
  test('renders title', () => {
    const { getByText } = render(
      <InviteFriendsModal visible={true} friends={friends} participantIds={[]} onClose={jest.fn()} onInvite={jest.fn()} />
    );
    expect(getByText('Invite Friends')).toBeTruthy();
  });

  test('renders available friends', () => {
    const { getByText } = render(
      <InviteFriendsModal visible={true} friends={friends} participantIds={[]} onClose={jest.fn()} onInvite={jest.fn()} />
    );
    expect(getByText('Alice')).toBeTruthy();
    expect(getByText('Bob')).toBeTruthy();
  });

  test('filters out existing participants', () => {
    const { queryByText, getByText } = render(
      <InviteFriendsModal visible={true} friends={friends} participantIds={['f1']} onClose={jest.fn()} onInvite={jest.fn()} />
    );
    expect(queryByText('Alice')).toBeNull();
    expect(getByText('Bob')).toBeTruthy();
  });

  test('shows empty state when all friends are participants', () => {
    const { getByText } = render(
      <InviteFriendsModal visible={true} friends={friends} participantIds={['f1', 'f2']} onClose={jest.fn()} onInvite={jest.fn()} />
    );
    expect(getByText('No Friends Available')).toBeTruthy();
  });
});
