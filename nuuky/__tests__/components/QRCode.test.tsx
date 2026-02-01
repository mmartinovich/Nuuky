import React from 'react';
import { render } from '@testing-library/react-native';
import { QRCodeDisplay, QRCodeModal } from '../../components/QRCode';

jest.mock('expo-blur', () => ({
  BlurView: ({ children, ...props }: any) => {
    const { View } = require('react-native');
    return <View {...props}>{children}</View>;
  },
}));

jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children, ...props }: any) => {
    const { View } = require('react-native');
    return <View {...props}>{children}</View>;
  },
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

jest.mock('../../lib/logger', () => ({
  logger: { error: jest.fn() },
}));

jest.mock('../../hooks/useTheme', () => ({
  useTheme: () => ({
    theme: {
      colors: {
        glass: { border: '#333', background: '#111' },
        text: { primary: '#fff', tertiary: '#999' },
        blurTint: 'dark',
      },
      gradients: { card: ['#000', '#111'], glass: ['#111', '#222'] },
    },
    accent: { primary: '#3FCBFF', soft: 'rgba(63, 203, 255, 0.15)' },
    isDark: true,
  }),
}));

describe('QRCodeDisplay', () => {
  test('renders with title', () => {
    const { getByText } = render(
      <QRCodeDisplay value="https://example.com" title="Test Title" subtitle="Test Sub" />
    );
    expect(getByText('Test Title')).toBeTruthy();
    expect(getByText('Test Sub')).toBeTruthy();
  });

  test('renders without crashing', () => {
    const { toJSON } = render(<QRCodeDisplay value="test" />);
    expect(toJSON()).toBeTruthy();
  });

  test('renders copy and share buttons by default', () => {
    const { getByText } = render(<QRCodeDisplay value="test" />);
    expect(getByText('Copy')).toBeTruthy();
    expect(getByText('Share')).toBeTruthy();
  });

  test('hides buttons when disabled', () => {
    const { queryByText } = render(
      <QRCodeDisplay value="test" showCopyButton={false} showShareButton={false} />
    );
    expect(queryByText('Copy')).toBeNull();
    expect(queryByText('Share')).toBeNull();
  });
});

describe('QRCodeModal', () => {
  test('renders when visible', () => {
    const { getByText } = render(
      <QRCodeModal visible={true} value="https://example.com" title="Scan Me" onClose={jest.fn()} />
    );
    expect(getByText('Scan Me')).toBeTruthy();
  });

  test('renders default title', () => {
    const { getByText } = render(
      <QRCodeModal visible={true} value="test" onClose={jest.fn()} />
    );
    expect(getByText('QR Code')).toBeTruthy();
  });
});
