import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { RoomCard } from '../../components/RoomCard';

jest.mock('expo-image', () => ({
  Image: 'CachedImage',
}));

jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children, ...props }: any) => {
    const { View } = require('react-native');
    return <View {...props}>{children}</View>;
  },
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

jest.mock('../../hooks/useTheme', () => ({
  useTheme: () => ({
    accent: { primary: '#3FCBFF', soft: 'rgba(63,203,255,0.15)' },
    theme: {
      colors: {
        glass: { background: '#111', border: '#333' },
        text: { primary: '#fff', secondary: '#999', tertiary: '#666' },
        ui: { borderLight: '#444' },
        bg: { primary: '#000' },
      },
    },
  }),
}));

jest.mock('../../lib/utils', () => ({
  isUserTrulyOnline: jest.fn().mockReturnValue(false),
}));

const mockRoom = {
  id: 'room1',
  name: 'Test Room',
  participants: [],
};

describe('RoomCard', () => {
  test('renders room name', () => {
    const { getByText } = render(
      <RoomCard room={mockRoom as any} onPress={jest.fn()} />
    );
    expect(getByText('Test Room')).toBeTruthy();
  });

  test('shows "No members yet" when empty', () => {
    const { getByText } = render(
      <RoomCard room={mockRoom as any} onPress={jest.fn()} />
    );
    expect(getByText('No members yet')).toBeTruthy();
  });

  test('calls onPress', () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <RoomCard room={mockRoom as any} onPress={onPress} />
    );
    fireEvent.press(getByText('Test Room'));
    expect(onPress).toHaveBeenCalled();
  });

  test('renders selected style when default', () => {
    const { toJSON } = render(
      <RoomCard room={mockRoom as any} onPress={jest.fn()} isDefault={true} />
    );
    expect(toJSON()).toBeTruthy();
  });

  test('shows Unnamed Room for missing name', () => {
    const room = { ...mockRoom, name: '' };
    const { getByText } = render(
      <RoomCard room={room as any} onPress={jest.fn()} />
    );
    expect(getByText('Unnamed Room')).toBeTruthy();
  });

  test('shows creator name for home rooms', () => {
    const homeRoom = { ...mockRoom, name: 'My Nūūky' };
    const { getByText } = render(
      <RoomCard room={homeRoom as any} onPress={jest.fn()} isCreator={false} creatorName="Alice" />
    );
    expect(getByText("Alice's Nūūky")).toBeTruthy();
  });

  test('renders participant count', () => {
    const room = {
      ...mockRoom,
      participants: [
        { id: 'p1', user: { id: 'u1', display_name: 'Bob', is_online: false, last_seen_at: null } },
        { id: 'p2', user: { id: 'u2', display_name: 'Alice', is_online: false, last_seen_at: null } },
      ],
    };
    const { getByText } = render(
      <RoomCard room={room as any} onPress={jest.fn()} />
    );
    expect(getByText('2')).toBeTruthy();
  });
});
