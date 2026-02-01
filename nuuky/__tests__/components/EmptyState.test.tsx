import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { EmptyState } from '../../components/ui/EmptyState';

// Mock dependencies
jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children, ...props }: any) => {
    const { View } = require('react-native');
    return <View {...props}>{children}</View>;
  },
}));

describe('EmptyState', () => {
  test('renders title', () => {
    const { getByText } = render(<EmptyState title="No items" />);
    expect(getByText('No items')).toBeTruthy();
  });

  test('renders description when provided', () => {
    const { getByText } = render(<EmptyState title="Empty" description="Nothing here" />);
    expect(getByText('Nothing here')).toBeTruthy();
  });

  test('does not render description when not provided', () => {
    const { queryByText } = render(<EmptyState title="Empty" />);
    expect(queryByText('Nothing here')).toBeNull();
  });

  test('renders action button when both label and handler provided', () => {
    const onAction = jest.fn();
    const { getByText } = render(
      <EmptyState title="Empty" actionLabel="Add Item" onAction={onAction} />
    );
    expect(getByText('Add Item')).toBeTruthy();
  });

  test('does not render action button when only label provided', () => {
    const { queryByText } = render(
      <EmptyState title="Empty" actionLabel="Add Item" />
    );
    // GradientButton won't render because onAction is undefined
    expect(queryByText('Add Item')).toBeNull();
  });
});
