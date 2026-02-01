import React from 'react';
import { render } from '@testing-library/react-native';
import AnimatedGlow from '../../components/AnimatedGlow';

jest.mock('react-native-svg', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: (props: any) => <View {...props} />,
    Defs: (props: any) => <View {...props} />,
    RadialGradient: (props: any) => <View {...props} />,
    Stop: (props: any) => <View {...props} />,
    Rect: (props: any) => <View {...props} />,
  };
});

let mockIsDark = true;
jest.mock('../../hooks/useTheme', () => ({
  useTheme: () => ({ isDark: mockIsDark }),
}));

describe('AnimatedGlow', () => {
  test('renders in dark mode', () => {
    mockIsDark = true;
    const { toJSON } = render(<AnimatedGlow />);
    expect(toJSON()).toBeTruthy();
  });

  test('returns null in light mode', () => {
    mockIsDark = false;
    const { toJSON } = render(<AnimatedGlow />);
    expect(toJSON()).toBeNull();
  });
});
