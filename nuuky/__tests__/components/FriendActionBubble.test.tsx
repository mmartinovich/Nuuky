import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { FriendActionBubble } from '../../components/FriendActionBubble';

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
  FontAwesome5: 'FontAwesome5',
  MaterialCommunityIcons: 'MaterialCommunityIcons',
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success' },
}));

const defaultProps = {
  friend: { id: 'f1', display_name: 'Alice' } as any,
  position: { x: 200, y: 300 },
  onDismiss: jest.fn(),
  onNudge: jest.fn(),
  onCallMe: jest.fn(),
  onPhotoNudge: jest.fn(),
};

describe('FriendActionBubble', () => {
  test('renders three action buttons', () => {
    const { getByText } = render(<FriendActionBubble {...defaultProps} />);
    expect(getByText('Nudge')).toBeTruthy();
    expect(getByText('Call me')).toBeTruthy();
    expect(getByText('Moment')).toBeTruthy();
  });

  test('renders accessibility labels', () => {
    const { getByLabelText } = render(<FriendActionBubble {...defaultProps} />);
    expect(getByLabelText('Nudge friend')).toBeTruthy();
    expect(getByLabelText('Request a call')).toBeTruthy();
    expect(getByLabelText('Send moment')).toBeTruthy();
  });

  test('nudge press triggers haptic and callback', () => {
    const onNudge = jest.fn();
    const { getByLabelText } = render(
      <FriendActionBubble {...defaultProps} onNudge={onNudge} />,
    );
    fireEvent.press(getByLabelText('Nudge friend'));
    const Haptics = require('expo-haptics');
    expect(Haptics.impactAsync).toHaveBeenCalled();
  });

  test('call press triggers haptic', () => {
    const { getByLabelText } = render(<FriendActionBubble {...defaultProps} />);
    fireEvent.press(getByLabelText('Request a call'));
    const Haptics = require('expo-haptics');
    expect(Haptics.impactAsync).toHaveBeenCalled();
  });
});
