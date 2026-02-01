import React from 'react';
import { Text } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import { BaseModal } from '../../components/ui/BaseModal';

jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children, ...props }: any) => {
    const { View } = require('react-native');
    return <View {...props}>{children}</View>;
  },
}));

jest.mock('expo-blur', () => ({
  BlurView: ({ children, ...props }: any) => {
    const { View } = require('react-native');
    return <View {...props}>{children}</View>;
  },
}));

jest.mock('../../hooks/useTheme', () => ({
  useTheme: () => ({
    theme: {
      colors: {
        glass: { border: '#333', background: '#111' },
        text: { primary: '#fff', secondary: '#ccc', tertiary: '#999' },
      },
    },
  }),
}));

describe('BaseModal', () => {
  const defaultProps = {
    visible: true,
    onClose: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders children when visible', () => {
    const { getByText } = render(
      <BaseModal {...defaultProps}>
        <Text>Modal Content</Text>
      </BaseModal>
    );
    expect(getByText('Modal Content')).toBeTruthy();
  });

  test('renders title when provided', () => {
    const { getByText } = render(
      <BaseModal {...defaultProps} title="Test Title">
        <Text>Content</Text>
      </BaseModal>
    );
    expect(getByText('Test Title')).toBeTruthy();
  });

  test('renders subtitle when provided', () => {
    const { getByText } = render(
      <BaseModal {...defaultProps} title="Title" subtitle="Subtitle">
        <Text>Content</Text>
      </BaseModal>
    );
    expect(getByText('Subtitle')).toBeTruthy();
  });

  test('shows close button by default', () => {
    const { getByText } = render(
      <BaseModal {...defaultProps}>
        <Text>Content</Text>
      </BaseModal>
    );
    expect(getByText('Cancel')).toBeTruthy();
  });

  test('hides close button when showCloseButton is false', () => {
    const { queryByText } = render(
      <BaseModal {...defaultProps} showCloseButton={false}>
        <Text>Content</Text>
      </BaseModal>
    );
    expect(queryByText('Cancel')).toBeNull();
  });

  test('uses custom close button text', () => {
    const { getByText } = render(
      <BaseModal {...defaultProps} closeButtonText="Done">
        <Text>Content</Text>
      </BaseModal>
    );
    expect(getByText('Done')).toBeTruthy();
  });

  test('calls onClose when close button pressed', () => {
    const onClose = jest.fn();
    const { getByText } = render(
      <BaseModal {...defaultProps} onClose={onClose}>
        <Text>Content</Text>
      </BaseModal>
    );
    fireEvent.press(getByText('Cancel'));
    expect(onClose).toHaveBeenCalled();
  });

  test('renders footer when provided', () => {
    const { getByText, queryByText } = render(
      <BaseModal {...defaultProps} footer={<Text>Footer</Text>}>
        <Text>Content</Text>
      </BaseModal>
    );
    expect(getByText('Footer')).toBeTruthy();
    // Default close button should not show when footer is provided
    expect(queryByText('Cancel')).toBeNull();
  });
});
