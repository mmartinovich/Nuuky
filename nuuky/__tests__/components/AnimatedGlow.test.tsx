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

let mockLowPowerMode = false;
jest.mock('../../stores/appStore', () => ({
  useLowPowerMode: () => mockLowPowerMode,
}));

describe('AnimatedGlow', () => {
  test('renders when low power mode is off', () => {
    mockLowPowerMode = false;
    const { toJSON } = render(<AnimatedGlow />);
    expect(toJSON()).toBeTruthy();
  });

  test('returns null in low power mode', () => {
    mockLowPowerMode = true;
    const { toJSON } = render(<AnimatedGlow />);
    expect(toJSON()).toBeNull();
  });
});
