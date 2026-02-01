import React from 'react';
import { render } from '@testing-library/react-native';

jest.mock('expo-blur', () => ({ BlurView: ({ children }: any) => <>{children}</> }));
jest.mock('expo-linear-gradient', () => ({ LinearGradient: ({ children }: any) => <>{children}</> }));
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Medium: 'medium' },
}));

jest.mock('../../hooks/useTheme', () => ({
  useTheme: () => ({
    theme: {
      colors: {
        text: { primary: '#fff', secondary: '#aaa', tertiary: '#666' },
        bg: { primary: '#000' },
        glass: { background: '#111', border: '#333' },
        accent: { primary: '#a855f7' },
        neon: { purple: '#a855f7' },
        status: { online: '#0f0' },
        moodColors: { glow: '#a855f7' },
      },
    },
  }),
}));

jest.mock('../../components/FriendParticle', () => ({
  FriendParticle: () => null,
}));

jest.mock('../../components/CentralOrb', () => ({
  CentralOrb: () => null,
}));

import { OrbitView } from '../../components/OrbitView';

const mockUser = {
  id: 'user-1',
  display_name: 'Me',
  mood: 'good',
};

describe('OrbitView', () => {
  test('renders without crashing', () => {
    const { toJSON } = render(
      <OrbitView participants={[]} currentUser={mockUser as any} />
    );
    expect(toJSON()).not.toBeNull();
  });

  test('renders with participants', () => {
    const friend = { id: 'f1', display_name: 'Friend', mood: 'okay' };
    const { toJSON } = render(
      <OrbitView participants={[friend as any]} currentUser={mockUser as any} />
    );
    expect(toJSON()).not.toBeNull();
  });
});
