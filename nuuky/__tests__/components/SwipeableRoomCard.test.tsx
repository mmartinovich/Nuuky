import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Alert } from 'react-native';

jest.mock('react-native-gesture-handler/ReanimatedSwipeable', () => {
  const RN = require('react-native');
  const R = require('react');
  return {
    __esModule: true,
    default: R.forwardRef(({ children, onSwipeableOpen, onSwipeableClose, renderRightActions }: any, ref: any) => {
      R.useImperativeHandle(ref, () => ({ close: () => onSwipeableClose?.() }));
      return R.createElement(RN.View, { testID: 'swipeable' }, children, renderRightActions?.({ value: 0 }, { value: -80 }));
    }),
  };
});

jest.mock('react-native-reanimated', () => {
  const RN = require('react-native');
  const R = require('react');
  return {
    __esModule: true,
    default: { View: (props: any) => R.createElement(RN.View, props) },
    useAnimatedStyle: (fn: Function) => fn(),
    interpolate: jest.fn().mockReturnValue(0),
    SharedValue: {},
  };
});

jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn(),
  impactAsync: jest.fn(),
  NotificationFeedbackType: { Warning: 'warning' },
  ImpactFeedbackStyle: { Light: 'light' },
}));

jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));
jest.mock('expo-blur', () => ({ BlurView: ({ children }: any) => <>{children}</> }));
jest.mock('expo-linear-gradient', () => ({ LinearGradient: ({ children }: any) => <>{children}</> }));
jest.mock('../../hooks/useTheme', () => ({
  useTheme: () => ({
    theme: {
      colors: {
        text: { primary: '#fff', secondary: '#aaa', tertiary: '#666' },
        bg: { primary: '#000', secondary: '#111', card: '#222' },
        glass: { background: '#111', border: '#333', highlight: '#222' },
        accent: { primary: '#a855f7' },
        neon: { purple: '#a855f7', blue: '#3b82f6' },
        status: { online: '#0f0', error: '#f00', warning: '#f90' },
        ui: { borderLight: '#444' },
        moodColors: { glow: '#a855f7' },
      },
    },
  }),
}));

jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
    }),
  },
}));

import { SwipeableRoomCard } from '../../components/SwipeableRoomCard';

const mockRoom = {
  id: 'room-1',
  name: 'Test Room',
  created_by: 'user-1',
  created_at: new Date().toISOString(),
  max_participants: 5,
  participant_count: 2,
};

describe('SwipeableRoomCard', () => {
  const defaultProps = {
    room: mockRoom as any,
    onPress: jest.fn(),
    isCreator: true,
    isDefault: false,
    creatorName: 'Alice',
    onDelete: jest.fn().mockResolvedValue(true),
    onLeave: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => jest.clearAllMocks());

  test('renders room card', () => {
    const { getByText } = render(<SwipeableRoomCard {...defaultProps} />);
    expect(getByText('Test Room')).toBeTruthy();
  });

  test('renders Delete action for creator', () => {
    const { getByText } = render(<SwipeableRoomCard {...defaultProps} />);
    expect(getByText('Delete')).toBeTruthy();
  });

  test('renders Leave action for non-creator', () => {
    const { getByText } = render(<SwipeableRoomCard {...defaultProps} isCreator={false} />);
    expect(getByText('Leave')).toBeTruthy();
  });

  test('delete action triggers alert confirmation', () => {
    jest.spyOn(Alert, 'alert');
    const { getByText } = render(<SwipeableRoomCard {...defaultProps} />);
    fireEvent.press(getByText('Delete'));
    // The close callback shows the alert
    expect(Alert.alert).toHaveBeenCalledWith('Delete Room?', expect.any(String), expect.any(Array));
  });

  test('pressing card calls onPress', () => {
    const { getByText } = render(<SwipeableRoomCard {...defaultProps} />);
    fireEvent.press(getByText('Test Room'));
    expect(defaultProps.onPress).toHaveBeenCalled();
  });
});
