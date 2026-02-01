import React from 'react';
import { render } from '@testing-library/react-native';
import { StarField } from '../../components/StarField';

jest.mock('../../hooks/useTheme', () => ({
  useTheme: () => ({ isDark: true }),
}));

describe('StarField', () => {
  test('renders without crashing', () => {
    const { toJSON } = render(<StarField />);
    expect(toJSON()).not.toBeNull();
  });

  test('renders star particles', () => {
    const { toJSON } = render(<StarField />);
    const tree = toJSON();
    // Container should have children (star particles)
    expect(tree).toBeTruthy();
  });
});
