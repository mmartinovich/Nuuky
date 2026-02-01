import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { FlareButton } from '../../components/FlareButton';

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
        status: { error: '#ff0000' },
        text: { primary: '#fff', secondary: '#999' },
        border: { subtle: '#333' },
      },
      gradients: { button: ['#000', '#111'] },
    },
  }),
}));

describe('FlareButton', () => {
  test('renders Send Flare by default', () => {
    const { getByText } = render(<FlareButton onPress={jest.fn()} />);
    expect(getByText('Send Flare')).toBeTruthy();
    expect(getByText('Need support?')).toBeTruthy();
  });

  test('renders Flare Active when active', () => {
    const { getByText } = render(<FlareButton onPress={jest.fn()} hasActiveFlare />);
    expect(getByText('Flare Active')).toBeTruthy();
    expect(getByText('Help is on the way')).toBeTruthy();
  });

  test('calls onPress', () => {
    const onPress = jest.fn();
    const { getByLabelText } = render(<FlareButton onPress={onPress} />);
    fireEvent.press(getByLabelText('Send a flare'));
    expect(onPress).toHaveBeenCalled();
  });

  test('shows active flare label', () => {
    const { getByLabelText } = render(<FlareButton onPress={jest.fn()} hasActiveFlare />);
    expect(getByLabelText('Flare is active')).toBeTruthy();
  });
});
