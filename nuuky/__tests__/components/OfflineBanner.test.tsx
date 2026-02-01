import React from 'react';
import { render } from '@testing-library/react-native';
import { OfflineBanner } from '../../components/OfflineBanner';
import { useAppStore } from '../../stores/appStore';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('../../hooks/useTheme', () => ({
  useTheme: () => ({
    theme: {
      colors: {
        status: { error: '#ff0000' },
        text: { primary: '#fff' },
      },
    },
  }),
}));

describe('OfflineBanner', () => {
  test('returns null when online', () => {
    useAppStore.setState({ isOnline: true });
    const { toJSON } = render(<OfflineBanner />);
    expect(toJSON()).toBeNull();
  });

  test('shows banner when offline', () => {
    useAppStore.setState({ isOnline: false });
    const { getByText } = render(<OfflineBanner />);
    expect(getByText('No internet connection')).toBeTruthy();
  });
});
