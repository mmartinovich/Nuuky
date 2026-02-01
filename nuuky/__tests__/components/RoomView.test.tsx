import React from 'react';
import { render } from '@testing-library/react-native';
import { RoomView } from '../../components/RoomView';

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

jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn() }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0 }),
}));

jest.mock('../../hooks/useTheme', () => ({
  useTheme: () => ({
    theme: {
      colors: {
        glass: { background: '#111', border: '#333' },
        text: { primary: '#fff', secondary: '#999' },
      },
      gradients: { background: ['#000', '#111'] },
    },
  }),
}));

// Mock OrbitView since it's complex
jest.mock('../../components/OrbitView', () => ({
  OrbitView: ({ headerContent }: any) => {
    const { View } = require('react-native');
    return <View>{headerContent}</View>;
  },
}));

const currentUser = { id: 'u1', display_name: 'Me' } as any;

describe('RoomView', () => {
  test('renders room name', () => {
    const { getByText } = render(
      <RoomView roomName="My Room" participants={[]} currentUser={currentUser} isCreator={true} />,
    );
    expect(getByText('My Room')).toBeTruthy();
  });

  test('renders default name when no roomName', () => {
    const { getByText } = render(
      <RoomView participants={[]} currentUser={currentUser} isCreator={true} />,
    );
    expect(getByText('Room')).toBeTruthy();
  });

  test('shows participant count singular', () => {
    const participants = [{ id: 'p1', user: currentUser }] as any[];
    const { getByText } = render(
      <RoomView roomName="R" participants={participants} currentUser={currentUser} isCreator={true} />,
    );
    expect(getByText('1 person here')).toBeTruthy();
  });

  test('shows participant count plural', () => {
    const participants = [
      { id: 'p1', user: currentUser },
      { id: 'p2', user: { id: 'u2', display_name: 'Other' } },
    ] as any[];
    const { getByText } = render(
      <RoomView roomName="R" participants={participants} currentUser={currentUser} isCreator={true} />,
    );
    expect(getByText('2 people here')).toBeTruthy();
  });

  test('renders back button', () => {
    const { getByLabelText } = render(
      <RoomView roomName="R" participants={[]} currentUser={currentUser} isCreator={true} />,
    );
    expect(getByLabelText('Go back')).toBeTruthy();
  });

  test('renders settings button when handler provided', () => {
    const { getByLabelText } = render(
      <RoomView roomName="R" participants={[]} currentUser={currentUser} isCreator={true} onSettingsPress={jest.fn()} />,
    );
    expect(getByLabelText('Room settings')).toBeTruthy();
  });
});
