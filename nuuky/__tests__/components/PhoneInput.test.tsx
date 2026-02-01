import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { PhoneInput } from '../../components/ui/PhoneInput';

jest.mock('expo-blur', () => ({
  BlurView: ({ children, ...props }: any) => {
    const { View } = require('react-native');
    return <View {...props}>{children}</View>;
  },
}));

jest.mock('react-native-country-picker-modal', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: (props: any) => <View testID="country-picker" />,
    DARK_THEME: {},
  };
});

jest.mock('@expo/vector-icons', () => ({ Feather: 'Feather' }));

jest.mock('../../hooks/useTheme', () => ({
  useTheme: () => ({
    theme: {
      colors: {
        glass: { background: '#111', border: '#333' },
        text: { primary: '#fff', secondary: '#999', tertiary: '#666' },
        bg: { secondary: '#111', tertiary: '#222' },
        mood: { neutral: { base: '#888' } },
        status: { error: '#EF4444', success: '#22C55E' },
        blurTint: 'dark',
      },
    },
  }),
}));

jest.mock('../../lib/theme', () => ({
  spacing: { xs: 4, sm: 8, md: 16, lg: 24 },
  radius: { md: 8, lg: 12 },
  typography: { size: { xs: 10, sm: 12, base: 16, lg: 18, xl: 20 }, weight: { medium: '500', semibold: '600' } },
  interactionStates: { pressed: 0.7 },
}));

jest.mock('../../lib/phoneUtils', () => ({
  formatPhoneDisplay: (v: string) => v,
  getDialCode: (c: string) => c === 'US' ? '+1' : '+44',
  getPhonePlaceholder: () => '(555) 123-4567',
  getMaxPhoneLength: () => 10,
}));

describe('PhoneInput', () => {
  const defaultProps = {
    value: '',
    countryCode: 'US' as any,
    onChangePhone: jest.fn(),
    onChangeCountry: jest.fn(),
  };

  test('renders label', () => {
    const { getByText } = render(<PhoneInput {...defaultProps} />);
    expect(getByText('PHONE NUMBER')).toBeTruthy();
  });

  test('renders dial code', () => {
    const { getByText } = render(<PhoneInput {...defaultProps} />);
    expect(getByText('+1')).toBeTruthy();
  });

  test('renders hint text', () => {
    const { getByText } = render(<PhoneInput {...defaultProps} />);
    expect(getByText('Helps your friends find you on Nuuky')).toBeTruthy();
  });

  test('renders error message', () => {
    const { getByText } = render(<PhoneInput {...defaultProps} error="Invalid number" />);
    expect(getByText('Invalid number')).toBeTruthy();
  });

  test('calls onChangePhone with digits only', () => {
    const onChangePhone = jest.fn();
    const { getByPlaceholderText } = render(<PhoneInput {...defaultProps} onChangePhone={onChangePhone} />);
    fireEvent.changeText(getByPlaceholderText('(555) 123-4567'), '555abc123');
    expect(onChangePhone).toHaveBeenCalledWith('555123');
  });
});
