import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { RoomSettingsModal } from '../../components/RoomSettingsModal';

jest.mock('expo-blur', () => ({
  BlurView: ({ children, ...props }: any) => {
    const { View } = require('react-native');
    return <View {...props}>{children}</View>;
  },
}));

jest.mock('expo-image', () => ({ Image: 'CachedImage' }));
jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));

jest.mock('react-native-reanimated', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: {
      View: ({ children, style, ...props }: any) => <View style={style} {...props}>{children}</View>,
    },
    useSharedValue: (v: any) => ({ value: v }),
    useAnimatedStyle: () => ({}),
    withTiming: (v: any) => v,
    runOnJS: (fn: any) => fn,
    Easing: { out: (e: any) => e, cubic: {} },
  };
});

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0 }),
}));

jest.mock('../../hooks/useTheme', () => ({
  useTheme: () => ({
    theme: {
      colors: {
        glass: { background: '#111', border: '#333' },
        text: { primary: '#fff', secondary: '#999', tertiary: '#666' },
        bg: { primary: '#000' },
        ui: { borderLight: '#444' },
        mood: { good: { base: '#0f0' }, neutral: { base: '#888' } },
        status: { error: '#EF4444', success: '#22C55E' },
        neon: { cyan: '#0ff', purple: '#a855f7' },
      },
    },
    accent: { primary: '#3FCBFF', soft: 'rgba(63,203,255,0.15)', textOnPrimary: '#000' },
  }),
}));

jest.mock('../../hooks/useInviteLink', () => ({
  useInviteLink: () => ({
    createInviteLink: jest.fn(),
    shareInviteLink: jest.fn(),
    loading: false,
  }),
}));

jest.mock('../../lib/theme', () => ({
  getMoodColor: () => ({ base: '#888' }),
  interactionStates: { pressed: 0.7 },
  spacing: { xs: 4, sm: 8, md: 16, lg: 24 },
  radius: { sm: 4, md: 8, lg: 12, xl: 16 },
  typography: { size: { xs: 10, sm: 12, md: 14, lg: 16, xl: 20, '2xl': 24 }, weight: { medium: '500', semibold: '600', bold: '700' } },
}));

jest.mock('../../lib/utils', () => ({
  isUserTrulyOnline: jest.fn().mockReturnValue(false),
}));

jest.mock('../../lib/logger', () => ({ logger: { error: jest.fn() } }));

const defaultProps = {
  visible: true,
  roomName: 'Test Room',
  roomId: 'room1',
  isCreator: true,
  creatorId: 'u1',
  participants: [
    { id: 'p1', user_id: 'u1', user: { id: 'u1', display_name: 'Me', mood: 'good', is_online: true, last_seen_at: null, avatar_url: null } },
    { id: 'p2', user_id: 'u2', user: { id: 'u2', display_name: 'Alice', mood: 'neutral', is_online: false, last_seen_at: null, avatar_url: null } },
  ] as any[],
  currentUserId: 'u1',
  onClose: jest.fn(),
  onRename: jest.fn().mockResolvedValue(undefined),
  onDelete: jest.fn().mockResolvedValue(undefined),
  onLeave: jest.fn(),
};

describe('RoomSettingsModal', () => {
  test('renders room name', () => {
    const { getByText } = render(<RoomSettingsModal {...defaultProps} />);
    expect(getByText('Test Room')).toBeTruthy();
  });

  test('shows members section', () => {
    const { getByText } = render(<RoomSettingsModal {...defaultProps} />);
    expect(getByText('MEMBERS')).toBeTruthy();
  });

  test('shows delete button for creator', () => {
    const { getByText } = render(<RoomSettingsModal {...defaultProps} />);
    expect(getByText('Delete Room')).toBeTruthy();
  });

  test('shows leave button for non-creator', () => {
    const { getByText } = render(
      <RoomSettingsModal {...defaultProps} isCreator={false} />,
    );
    expect(getByText('Leave Room')).toBeTruthy();
  });

  test('shows participant count', () => {
    const { getByText } = render(<RoomSettingsModal {...defaultProps} />);
    expect(getByText('2')).toBeTruthy();
  });
});
