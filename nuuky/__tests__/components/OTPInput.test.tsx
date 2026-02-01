import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { OTPInput } from '../../components/ui/OTPInput';

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
        text: { primary: '#fff' },
        status: { error: '#FF0000', success: '#00FF00' },
        blurTint: 'dark',
      },
    },
  }),
}));

describe('OTPInput', () => {
  const defaultProps = {
    value: '',
    onChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders 6 input boxes by default', () => {
    const { getAllByDisplayValue } = render(<OTPInput {...defaultProps} />);
    // All empty boxes render with empty string
    expect(getAllByDisplayValue('')).toHaveLength(6);
  });

  test('renders custom length', () => {
    const { getAllByDisplayValue } = render(<OTPInput {...defaultProps} length={4} />);
    expect(getAllByDisplayValue('')).toHaveLength(4);
  });

  test('displays value digits', () => {
    const { getByDisplayValue } = render(<OTPInput {...defaultProps} value="12" />);
    expect(getByDisplayValue('1')).toBeTruthy();
    expect(getByDisplayValue('2')).toBeTruthy();
  });

  test('calls onChange on input', () => {
    const onChange = jest.fn();
    const { getAllByDisplayValue } = render(<OTPInput {...defaultProps} onChange={onChange} />);
    const inputs = getAllByDisplayValue('');
    fireEvent.changeText(inputs[0], '5');
    expect(onChange).toHaveBeenCalledWith('5');
  });

  test('handles paste of full OTP', () => {
    const onChange = jest.fn();
    const { getAllByDisplayValue } = render(<OTPInput {...defaultProps} onChange={onChange} />);
    const inputs = getAllByDisplayValue('');
    fireEvent.changeText(inputs[0], '123456');
    expect(onChange).toHaveBeenCalledWith('123456');
  });

  test('strips non-digit characters on paste', () => {
    const onChange = jest.fn();
    const { getAllByDisplayValue } = render(<OTPInput {...defaultProps} onChange={onChange} />);
    const inputs = getAllByDisplayValue('');
    fireEvent.changeText(inputs[0], '12a34b');
    expect(onChange).toHaveBeenCalledWith('1234');
  });
});
