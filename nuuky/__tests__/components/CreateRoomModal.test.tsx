import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { CreateRoomModal } from '../../components/CreateRoomModal';

jest.mock('expo-blur', () => ({
  BlurView: ({ children, ...props }: any) => {
    const { View } = require('react-native');
    return <View {...props}>{children}</View>;
  },
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light' },
}));

jest.mock('react-native-reanimated', () => {
  const { View } = require('react-native');
  const Reanimated = {
    View: ({ children, style, ...props }: any) => <View style={style} {...props}>{children}</View>,
  };
  return {
    __esModule: true,
    default: Reanimated,
    useSharedValue: (v: any) => ({ value: v }),
    useAnimatedStyle: () => ({}),
    withTiming: (v: any, _config?: any, cb?: Function) => { cb?.(); return v; },
    runOnJS: (fn: any) => fn,
    Easing: { out: (e: any) => e, in: (e: any) => e, cubic: {} },
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
        text: { primary: '#fff', tertiary: '#666' },
      },
    },
    accent: { primary: '#3FCBFF', textOnPrimary: '#000' },
  }),
}));

describe('CreateRoomModal', () => {
  test('renders when visible', () => {
    const { getByText } = render(
      <CreateRoomModal visible={true} onClose={jest.fn()} onCreate={jest.fn()} />
    );
    expect(getByText('Create Room')).toBeTruthy();
  });

  test('has cancel button', () => {
    const { getByText } = render(
      <CreateRoomModal visible={true} onClose={jest.fn()} onCreate={jest.fn()} />
    );
    expect(getByText('Cancel')).toBeTruthy();
  });

  test('has input placeholder', () => {
    const { getByPlaceholderText } = render(
      <CreateRoomModal visible={true} onClose={jest.fn()} onCreate={jest.fn()} />
    );
    expect(getByPlaceholderText('Enter a name...')).toBeTruthy();
  });

  test('typing a name and pressing create calls onCreate', () => {
    const onCreate = jest.fn();
    const { getByPlaceholderText, getByText } = render(
      <CreateRoomModal visible={true} onClose={jest.fn()} onCreate={onCreate} />
    );
    fireEvent.changeText(getByPlaceholderText('Enter a name...'), 'My Room');
    fireEvent.press(getByText('Create'));
    expect(onCreate).toHaveBeenCalledWith('My Room', true);
  });

  test('create button does nothing with empty name', () => {
    const onCreate = jest.fn();
    const { getByText } = render(
      <CreateRoomModal visible={true} onClose={jest.fn()} onCreate={onCreate} />
    );
    fireEvent.press(getByText('Create'));
    expect(onCreate).not.toHaveBeenCalled();
  });

  test('cancel calls onClose', () => {
    const onClose = jest.fn();
    const { getByText } = render(
      <CreateRoomModal visible={true} onClose={onClose} onCreate={jest.fn()} />
    );
    fireEvent.press(getByText('Cancel'));
    expect(onClose).toHaveBeenCalled();
  });
});
