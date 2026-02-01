import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { PickRoomModal } from '../../components/PickRoomModal';

jest.mock('expo-blur', () => ({
  BlurView: ({ children, ...props }: any) => {
    const { View } = require('react-native');
    return <View {...props}>{children}</View>;
  },
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

const rooms = [
  { id: 'r1', name: 'Room One' },
  { id: 'r2', name: 'Room Two' },
] as any[];

describe('PickRoomModal', () => {
  test('renders friend name in title', () => {
    const { getByText } = render(
      <PickRoomModal visible={true} rooms={rooms} friendName="Alice" onClose={jest.fn()} onPick={jest.fn()} />
    );
    expect(getByText('Invite Alice')).toBeTruthy();
  });

  test('renders room list', () => {
    const { getByText } = render(
      <PickRoomModal visible={true} rooms={rooms} friendName="Alice" onClose={jest.fn()} onPick={jest.fn()} />
    );
    expect(getByText('Room One')).toBeTruthy();
    expect(getByText('Room Two')).toBeTruthy();
  });

  test('shows empty state when no rooms', () => {
    const { getByText } = render(
      <PickRoomModal visible={true} rooms={[]} friendName="Alice" onClose={jest.fn()} onPick={jest.fn()} />
    );
    expect(getByText('No Rooms')).toBeTruthy();
  });

  test('shows choose a room subtitle', () => {
    const { getByText } = render(
      <PickRoomModal visible={true} rooms={rooms} friendName="Alice" onClose={jest.fn()} onPick={jest.fn()} />
    );
    expect(getByText('Choose a Room')).toBeTruthy();
  });
});
