import React from 'react';
import { render } from '@testing-library/react-native';
import { Text } from 'react-native';
import { ErrorBoundary } from '../../components/ErrorBoundary';

jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children, ...props }: any) => {
    const { View } = require('react-native');
    return <View {...props}>{children}</View>;
  },
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

jest.mock('../../lib/logger', () => ({
  logger: { error: jest.fn() },
}));

const ThrowError = () => {
  throw new Error('Test error');
};

describe('ErrorBoundary', () => {
  // Suppress console.error for expected errors
  const originalError = console.error;
  beforeAll(() => {
    console.error = jest.fn();
  });
  afterAll(() => {
    console.error = originalError;
  });

  test('renders children when no error', () => {
    const { getByText } = render(
      <ErrorBoundary>
        <Text>Hello</Text>
      </ErrorBoundary>
    );
    expect(getByText('Hello')).toBeTruthy();
  });

  test('renders fallback on error', () => {
    const { getByText } = render(
      <ErrorBoundary fallback={<Text>Custom Fallback</Text>}>
        <ThrowError />
      </ErrorBoundary>
    );
    expect(getByText('Custom Fallback')).toBeTruthy();
  });

  test('renders default error UI on error without fallback', () => {
    const { getByText } = render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );
    expect(getByText('Something went wrong')).toBeTruthy();
  });

  test('calls onError callback', () => {
    const onError = jest.fn();
    render(
      <ErrorBoundary onError={onError}>
        <ThrowError />
      </ErrorBoundary>
    );
    expect(onError).toHaveBeenCalledWith(expect.any(Error), expect.any(Object));
  });
});
