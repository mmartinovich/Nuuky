import React from 'react';
import { render } from '@testing-library/react-native';
import { Avatar } from '../../components/ui/Avatar';

// Mock dependencies
jest.mock('expo-image', () => ({
  Image: (props: any) => {
    const { View } = require('react-native');
    return <View testID="expo-image" {...props} />;
  },
}));

jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children, ...props }: any) => {
    const { View } = require('react-native');
    return <View {...props}>{children}</View>;
  },
}));

jest.mock('../../hooks/useTheme', () => ({
  useTheme: () => ({
    theme: {
      gradients: { button: ['#000', '#111'] },
      colors: {
        text: { primary: '#fff', tertiary: '#999' },
        bg: { primary: '#000' },
        mood: { good: { base: '#32D583' } },
      },
    },
  }),
}));

describe('Avatar', () => {
  test('renders with image URI', () => {
    const { getByTestId } = render(<Avatar uri="https://example.com/pic.jpg" name="Test" />);
    expect(getByTestId('expo-image')).toBeTruthy();
  });

  test('renders initials when no URI', () => {
    const { getByText } = render(<Avatar name="John Doe" />);
    expect(getByText('JD')).toBeTruthy();
  });

  test('renders single initial for single name', () => {
    const { getByText } = render(<Avatar name="John" />);
    expect(getByText('J')).toBeTruthy();
  });

  test('renders ? for no name', () => {
    const { getByText } = render(<Avatar />);
    expect(getByText('?')).toBeTruthy();
  });

  test('shows online indicator when enabled', () => {
    const { getByLabelText } = render(
      <Avatar name="Test" showOnlineIndicator isOnline />
    );
    expect(getByLabelText('Online')).toBeTruthy();
  });

  test('shows offline indicator', () => {
    const { getByLabelText } = render(
      <Avatar name="Test" showOnlineIndicator isOnline={false} />
    );
    expect(getByLabelText('Offline')).toBeTruthy();
  });

  test('hides indicator when showOnlineIndicator is false', () => {
    const { queryByLabelText } = render(
      <Avatar name="Test" showOnlineIndicator={false} />
    );
    expect(queryByLabelText('Online')).toBeNull();
    expect(queryByLabelText('Offline')).toBeNull();
  });

  test('accessibility label includes name', () => {
    const { getByLabelText } = render(<Avatar name="Alice" />);
    expect(getByLabelText('Avatar for Alice')).toBeTruthy();
  });
});
