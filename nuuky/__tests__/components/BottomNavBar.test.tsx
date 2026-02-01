import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Animated } from 'react-native';
import { BottomNavBar } from '../../components/BottomNavBar';

jest.mock('@expo/vector-icons', () => ({
  Feather: 'Feather',
  Ionicons: 'Ionicons',
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium' },
}));

const defaultProps = {
  accent: { primary: '#3FCBFF', soft: 'rgba(63,203,255,0.15)', glow: '#3FCBFF', gradient: ['#3FCBFF', '#00b8d4'] as [string, string], textOnPrimary: '#000' },
  theme: {
    colors: {
      text: { primary: '#fff', secondary: '#999', tertiary: '#666' },
      nav: { background: '#111' },
    },
  },
  isMuted: true,
  isAudioConnecting: false,
  hasDefaultRoom: true,
  myActiveFlare: null,
  ringAnims: [new Animated.Value(0), new Animated.Value(0), new Animated.Value(0)],
  buttonScaleAnim: new Animated.Value(1),
  buttonGlowAnim: new Animated.Value(1),
  onMicToggle: jest.fn(),
  onFlarePress: jest.fn(),
  onFriendsPress: jest.fn(),
  onRoomsPress: jest.fn(),
  onSettingsPress: jest.fn(),
  bottomInset: 0,
};

describe('BottomNavBar', () => {
  test('renders nav labels', () => {
    const { getByText } = render(<BottomNavBar {...defaultProps} />);
    expect(getByText('Flare')).toBeTruthy();
    expect(getByText('Friends')).toBeTruthy();
    expect(getByText('Rooms')).toBeTruthy();
    expect(getByText('Settings')).toBeTruthy();
  });

  test('calls onFriendsPress', () => {
    const onPress = jest.fn();
    const { getByLabelText } = render(<BottomNavBar {...defaultProps} onFriendsPress={onPress} />);
    fireEvent.press(getByLabelText('Friends'));
    expect(onPress).toHaveBeenCalled();
  });

  test('calls onRoomsPress', () => {
    const onPress = jest.fn();
    const { getByLabelText } = render(<BottomNavBar {...defaultProps} onRoomsPress={onPress} />);
    fireEvent.press(getByLabelText('Rooms'));
    expect(onPress).toHaveBeenCalled();
  });

  test('calls onMicToggle', () => {
    const onPress = jest.fn();
    const { getByLabelText } = render(<BottomNavBar {...defaultProps} onMicToggle={onPress} />);
    fireEvent.press(getByLabelText('Unmute microphone'));
    expect(onPress).toHaveBeenCalled();
  });

  test('shows mute label when unmuted', () => {
    const { getByLabelText } = render(<BottomNavBar {...defaultProps} isMuted={false} />);
    expect(getByLabelText('Mute microphone')).toBeTruthy();
  });
});
