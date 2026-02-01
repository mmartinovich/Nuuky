import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { CustomMoodCard } from '../../components/CustomMoodCard';

import { Alert } from 'react-native';

jest.spyOn(Alert, 'alert').mockImplementation(jest.fn());

jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children, ...props }: any) => {
    const { View } = require('react-native');
    return <View {...props}>{children}</View>;
  },
}));

const mockMood = {
  id: 'mood1',
  user_id: 'user1',
  emoji: '🎉',
  text: 'Party Time',
  color: 'cyan',
  created_at: '2024-01-01',
};

describe('CustomMoodCard', () => {
  test('renders emoji and text', () => {
    const { getByText } = render(
      <CustomMoodCard customMood={mockMood as any} isSelected={false} onPress={jest.fn()} onDelete={jest.fn()} />
    );
    expect(getByText('🎉')).toBeTruthy();
    expect(getByText('Party Time')).toBeTruthy();
  });

  test('shows checkmark when selected', () => {
    const { getByText } = render(
      <CustomMoodCard customMood={mockMood as any} isSelected={true} onPress={jest.fn()} onDelete={jest.fn()} />
    );
    expect(getByText('✓')).toBeTruthy();
  });

  test('no checkmark when not selected', () => {
    const { queryByText } = render(
      <CustomMoodCard customMood={mockMood as any} isSelected={false} onPress={jest.fn()} onDelete={jest.fn()} />
    );
    expect(queryByText('✓')).toBeNull();
  });

  test('calls onPress on tap', () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <CustomMoodCard customMood={mockMood as any} isSelected={false} onPress={onPress} onDelete={jest.fn()} />
    );
    fireEvent.press(getByText('Party Time'));
    expect(onPress).toHaveBeenCalled();
  });

  test('long press shows delete alert', () => {
    const onDelete = jest.fn();
    const { getByText } = render(
      <CustomMoodCard customMood={mockMood as any} isSelected={false} onPress={jest.fn()} onDelete={onDelete} />
    );
    fireEvent(getByText('Party Time'), 'longPress');
    expect(Alert.alert).toHaveBeenCalledWith('Delete Custom Mood', expect.stringContaining('Party Time'), expect.any(Array));
  });
});
