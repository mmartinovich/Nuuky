import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { RoomListModal } from '../../components/RoomListModal';

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

jest.mock('../../hooks/useTheme', () => ({
  useTheme: () => ({
    theme: {
      colors: {
        glass: { background: '#111', border: '#333' },
        text: { primary: '#fff', secondary: '#999', tertiary: '#666' },
        bg: { primary: '#000' },
        mood: { neutral: { gradient: ['#888', '#666'] } },
      },
    },
  }),
}));

const rooms = [
  { id: 'r1', name: 'Room One', participants: [], is_private: false },
  { id: 'r2', name: 'Room Two', participants: [], is_private: true },
] as any[];

describe('RoomListModal', () => {
  test('renders title', () => {
    const { getByText } = render(
      <RoomListModal visible={true} rooms={rooms} onClose={jest.fn()} onJoinRoom={jest.fn()} onCreateRoom={jest.fn()} />
    );
    expect(getByText('Active Rooms')).toBeTruthy();
  });

  test('renders room names', () => {
    const { getByText } = render(
      <RoomListModal visible={true} rooms={rooms} onClose={jest.fn()} onJoinRoom={jest.fn()} onCreateRoom={jest.fn()} />
    );
    expect(getByText('Room One')).toBeTruthy();
    expect(getByText('Room Two')).toBeTruthy();
  });

  test('shows empty state', () => {
    const { getByText } = render(
      <RoomListModal visible={true} rooms={[]} onClose={jest.fn()} onJoinRoom={jest.fn()} onCreateRoom={jest.fn()} />
    );
    expect(getByText('No active rooms')).toBeTruthy();
  });

  test('has create room button', () => {
    const { getByText } = render(
      <RoomListModal visible={true} rooms={[]} onClose={jest.fn()} onJoinRoom={jest.fn()} onCreateRoom={jest.fn()} />
    );
    expect(getByText('+ Create Room')).toBeTruthy();
  });

  test('calls onCreateRoom', () => {
    const onCreate = jest.fn();
    const { getByText } = render(
      <RoomListModal visible={true} rooms={[]} onClose={jest.fn()} onJoinRoom={jest.fn()} onCreateRoom={onCreate} />
    );
    fireEvent.press(getByText('+ Create Room'));
    expect(onCreate).toHaveBeenCalled();
  });
});
