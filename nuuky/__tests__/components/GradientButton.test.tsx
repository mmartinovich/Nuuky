import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { GradientButton } from '../../components/ui/GradientButton';

jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children, ...props }: any) => {
    const { View } = require('react-native');
    return <View {...props}>{children}</View>;
  },
}));

describe('GradientButton', () => {
  test('renders title text', () => {
    const { getByText } = render(<GradientButton title="Press Me" onPress={() => {}} />);
    expect(getByText('Press Me')).toBeTruthy();
  });

  test('calls onPress when pressed', () => {
    const onPress = jest.fn();
    const { getByRole } = render(<GradientButton title="Click" onPress={onPress} />);
    fireEvent.press(getByRole('button'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  test('does not call onPress when disabled', () => {
    const onPress = jest.fn();
    const { getByRole } = render(<GradientButton title="Click" onPress={onPress} disabled />);
    fireEvent.press(getByRole('button'));
    expect(onPress).not.toHaveBeenCalled();
  });

  test('does not call onPress when loading', () => {
    const onPress = jest.fn();
    const { getByRole } = render(<GradientButton title="Click" onPress={onPress} loading />);
    fireEvent.press(getByRole('button'));
    expect(onPress).not.toHaveBeenCalled();
  });

  test('shows loading indicator when loading', () => {
    const { queryByText } = render(
      <GradientButton title="Submit" onPress={() => {}} loading />
    );
    // Title should not be visible when loading
    expect(queryByText('Submit')).toBeNull();
  });

  test('accessibility state reflects disabled', () => {
    const { getByRole } = render(
      <GradientButton title="Click" onPress={() => {}} disabled />
    );
    expect(getByRole('button').props.accessibilityState.disabled).toBe(true);
  });

  test('uses accessibilityLabel when provided', () => {
    const { getByLabelText } = render(
      <GradientButton title="Click" onPress={() => {}} accessibilityLabel="Custom Label" />
    );
    expect(getByLabelText('Custom Label')).toBeTruthy();
  });
});
