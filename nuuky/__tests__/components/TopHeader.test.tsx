import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { TopHeader } from '../../components/TopHeader';

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

jest.mock('../../components/AudioConnectionBadge', () => ({
  AudioConnectionBadge: () => null,
}));

const defaultProps = {
  accent: { primary: '#3FCBFF', soft: 'rgba(63,203,255,0.15)', glow: '#3FCBFF', gradient: ['#3FCBFF', '#00b8d4'] as [string, string] },
  theme: {
    colors: {
      ui: { borderLight: '#333' },
      glass: { background: '#111', border: '#222' },
      text: { primary: '#fff', secondary: '#999' },
      neon: { cyan: '#00f0ff' },
    },
  },
  totalBadgeCount: 0,
  defaultRoom: null,
  currentVibe: 'Feeling good',
  audioConnectionStatus: 'disconnected',
  onNotificationPress: jest.fn(),
  onRoomPillPress: jest.fn(),
};

describe('TopHeader', () => {
  test('renders vibe text when no room', () => {
    const { getByText } = render(<TopHeader {...defaultProps} />);
    expect(getByText('Feeling good')).toBeTruthy();
  });

  test('renders room pill when defaultRoom set', () => {
    const { getByText } = render(
      <TopHeader {...defaultProps} defaultRoom={{ name: 'My Room' }} />
    );
    expect(getByText('My Room')).toBeTruthy();
  });

  test('shows badge count', () => {
    const { getByText } = render(
      <TopHeader {...defaultProps} totalBadgeCount={5} />
    );
    expect(getByText('5')).toBeTruthy();
  });

  test('shows 99+ for large counts', () => {
    const { getByText } = render(
      <TopHeader {...defaultProps} totalBadgeCount={150} />
    );
    expect(getByText('99+')).toBeTruthy();
  });

  test('calls onNotificationPress', () => {
    const onPress = jest.fn();
    const { getByLabelText } = render(
      <TopHeader {...defaultProps} onNotificationPress={onPress} />
    );
    fireEvent.press(getByLabelText('Notifications'));
    expect(onPress).toHaveBeenCalled();
  });

  test('calls onRoomPillPress', () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <TopHeader {...defaultProps} defaultRoom={{ name: 'Test' }} onRoomPillPress={onPress} />
    );
    fireEvent.press(getByText('Test'));
    expect(onPress).toHaveBeenCalled();
  });
});
