import React from 'react';
import { render } from '@testing-library/react-native';
import { ElectricBolt } from '../../components/ElectricBolt';

jest.mock('react-native-svg', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: ({ children, ...props }: any) => <View {...props}>{children}</View>,
    Svg: ({ children, ...props }: any) => <View {...props}>{children}</View>,
    Path: (props: any) => <View {...props} />,
    Defs: ({ children, ...props }: any) => <View {...props}>{children}</View>,
    LinearGradient: ({ children, ...props }: any) => <View {...props}>{children}</View>,
    Stop: (props: any) => <View {...props} />,
  };
});

jest.mock('../../hooks/useTheme', () => ({
  useTheme: () => ({
    isDark: true,
    theme: {
      colors: {
        neon: { cyan: '#0ff', purple: '#a855f7' },
        mood: { good: { base: '#0f0' } },
      },
    },
  }),
}));

describe('ElectricBolt', () => {
  const defaultProps = {
    fromX: 0,
    fromY: 0,
    toX: 100,
    toY: 100,
    state: 'active' as const,
    consecutiveDays: 5,
    boltIndex: 0,
  };

  test('renders without crashing', () => {
    const { toJSON } = render(<ElectricBolt {...defaultProps} />);
    expect(toJSON()).not.toBeNull();
  });

  test('renders with fading state', () => {
    const { toJSON } = render(<ElectricBolt {...defaultProps} state={'fading' as any} />);
    expect(toJSON()).not.toBeNull();
  });

  test('renders with zero distance', () => {
    const { toJSON } = render(<ElectricBolt {...defaultProps} fromX={50} fromY={50} toX={50} toY={50} />);
    expect(toJSON()).not.toBeNull();
  });
});
