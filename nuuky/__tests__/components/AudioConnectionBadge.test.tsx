import React from 'react';
import { render } from '@testing-library/react-native';
import { AudioConnectionBadge } from '../../components/AudioConnectionBadge';

jest.mock('../../hooks/useTheme', () => ({
  useTheme: () => ({
    theme: {
      colors: {
        neon: { green: '#00FF00' },
        mood: {
          neutral: { base: '#888' },
          notGreat: { base: '#FFA500' },
          reachOut: { base: '#FF0000' },
        },
        glass: { background: '#111' },
      },
    },
  }),
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

describe('AudioConnectionBadge', () => {
  test('renders nothing when disconnected', () => {
    const { toJSON } = render(<AudioConnectionBadge status="disconnected" />);
    expect(toJSON()).toBeNull();
  });

  test('renders for connected status', () => {
    const { toJSON } = render(<AudioConnectionBadge status="connected" />);
    expect(toJSON()).toBeTruthy();
  });

  test('renders for connecting status', () => {
    const { toJSON } = render(<AudioConnectionBadge status="connecting" />);
    expect(toJSON()).toBeTruthy();
  });

  test('renders for reconnecting status', () => {
    const { toJSON } = render(<AudioConnectionBadge status="reconnecting" />);
    expect(toJSON()).toBeTruthy();
  });

  test('renders for error status', () => {
    const { toJSON } = render(<AudioConnectionBadge status="error" />);
    expect(toJSON()).toBeTruthy();
  });
});
