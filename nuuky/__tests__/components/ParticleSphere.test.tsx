import React from 'react';
import { render } from '@testing-library/react-native';

jest.mock('expo-linear-gradient', () => ({ LinearGradient: ({ children }: any) => <>{children}</> }));
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Medium: 'medium' },
}));
jest.mock('../../lib/logger', () => ({
  logger: { warn: jest.fn(), log: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

import ParticleSphere from '../../components/ParticleSphere';

describe('ParticleSphere', () => {
  test('renders without crashing', () => {
    const { toJSON } = render(<ParticleSphere />);
    expect(toJSON()).not.toBeNull();
  });

  test('renders with custom size', () => {
    const { toJSON } = render(<ParticleSphere size={200} />);
    expect(toJSON()).not.toBeNull();
  });

  test('renders with custom particle count', () => {
    const { toJSON } = render(<ParticleSphere particleCount={50} />);
    expect(toJSON()).not.toBeNull();
  });
});
