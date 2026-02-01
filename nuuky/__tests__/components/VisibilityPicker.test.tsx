import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { VisibilityPicker } from '../../components/VisibilityPicker';

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

jest.mock('../../hooks/useTheme', () => ({
  useTheme: () => ({
    theme: {
      colors: {
        glass: { background: '#111', border: '#333' },
        text: { primary: '#fff', secondary: '#999', tertiary: '#666' },
        mood: {
          good: { base: '#0f0', gradient: ['#0f0', '#0a0'] },
          neutral: { base: '#888', gradient: ['#888', '#666'] },
          notGreat: { base: '#f80' },
          reachOut: { base: '#f0f' },
        },
      },
    },
  }),
}));

describe('VisibilityPicker', () => {
  const defaultProps = {
    visible: true,
    onClose: jest.fn(),
    onSelect: jest.fn(),
    currentVisibility: 'full' as const,
    friendName: 'Alice',
  };

  test('renders title with friend name', () => {
    const { getByText } = render(<VisibilityPicker {...defaultProps} />);
    expect(getByText('Visibility for Alice')).toBeTruthy();
  });

  test('renders all visibility options', () => {
    const { getByText } = render(<VisibilityPicker {...defaultProps} />);
    expect(getByText('Full Access')).toBeTruthy();
    expect(getByText('Limited')).toBeTruthy();
    expect(getByText('Minimal')).toBeTruthy();
    expect(getByText('Hidden')).toBeTruthy();
  });

  test('has save and cancel buttons', () => {
    const { getByText } = render(<VisibilityPicker {...defaultProps} />);
    expect(getByText('Save')).toBeTruthy();
    expect(getByText('Cancel')).toBeTruthy();
  });

  test('calls onSelect and onClose on save', () => {
    const onSelect = jest.fn();
    const onClose = jest.fn();
    const { getByText } = render(
      <VisibilityPicker {...defaultProps} onSelect={onSelect} onClose={onClose} />
    );
    fireEvent.press(getByText('Save'));
    expect(onSelect).toHaveBeenCalledWith('full');
    expect(onClose).toHaveBeenCalled();
  });

  test('selecting different option and saving', () => {
    const onSelect = jest.fn();
    const { getByText } = render(
      <VisibilityPicker {...defaultProps} onSelect={onSelect} />
    );
    fireEvent.press(getByText('Hidden'));
    fireEvent.press(getByText('Save'));
    expect(onSelect).toHaveBeenCalledWith('hidden');
  });
});
