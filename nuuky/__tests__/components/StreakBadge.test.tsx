import React from 'react';
import { render } from '@testing-library/react-native';
import { StreakBadge, BoltIcon } from '../../components/StreakBadge';

jest.mock('react-native-svg', () => {
  const { View, Text } = require('react-native');
  return {
    __esModule: true,
    default: (props: any) => <View {...props} />,
    Path: (props: any) => <View {...props} />,
    Defs: (props: any) => <View {...props} />,
    LinearGradient: (props: any) => <View {...props} />,
    Stop: (props: any) => <View {...props} />,
  };
});

jest.mock('../../hooks/useTheme', () => ({
  useTheme: () => ({
    theme: { colors: { text: { primary: '#fff' } } },
    isDark: true,
  }),
}));

describe('StreakBadge', () => {
  test('returns null for broken streak', () => {
    const { toJSON } = render(
      <StreakBadge streak={{ state: 'broken', consecutive_days: 5 } as any} />
    );
    expect(toJSON()).toBeNull();
  });

  test('returns null for 0 days', () => {
    const { toJSON } = render(
      <StreakBadge streak={{ state: 'active', consecutive_days: 0 } as any} />
    );
    expect(toJSON()).toBeNull();
  });

  test('renders day count for active streak', () => {
    const { getByText } = render(
      <StreakBadge streak={{ state: 'active', consecutive_days: 3 } as any} />
    );
    expect(getByText('3')).toBeTruthy();
  });

  test('renders for hot streak (7+ days)', () => {
    const { getByText } = render(
      <StreakBadge streak={{ state: 'active', consecutive_days: 10 } as any} />
    );
    expect(getByText('10')).toBeTruthy();
  });

  test('renders for fire streak (15+ days)', () => {
    const { getByText } = render(
      <StreakBadge streak={{ state: 'active', consecutive_days: 20 } as any} />
    );
    expect(getByText('20')).toBeTruthy();
  });
});

describe('BoltIcon', () => {
  test('renders without crashing', () => {
    const { toJSON } = render(<BoltIcon />);
    expect(toJSON()).toBeTruthy();
  });

  test('renders with tier', () => {
    const { toJSON } = render(<BoltIcon tier="gold" size={16} />);
    expect(toJSON()).toBeTruthy();
  });
});
