import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { CustomMoodEditor } from '../../components/CustomMoodEditor';

jest.mock('expo-blur', () => ({
  BlurView: ({ children, ...props }: any) => {
    const { View } = require('react-native');
    return <View {...props}>{children}</View>;
  },
}));

jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light' },
}));

jest.mock('react-native-reanimated', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: {
      View: ({ children, style, ...props }: any) => <View style={style} {...props}>{children}</View>,
    },
    useSharedValue: (v: any) => ({ value: v }),
    useAnimatedStyle: () => ({}),
    withTiming: (v: any, _config?: any, cb?: Function) => { cb?.(); return v; },
    runOnJS: (fn: any) => fn,
    Easing: { linear: {} },
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

jest.mock('../../components/EmojiInput', () => ({
  EmojiInput: () => null,
}));

describe('CustomMoodEditor', () => {
  const defaultProps = {
    visible: true,
    onSave: jest.fn(),
    onClose: jest.fn(),
  };

  test('renders title', () => {
    const { getByText } = render(<CustomMoodEditor {...defaultProps} />);
    expect(getByText('Custom Mood')).toBeTruthy();
  });

  test('renders subtitle', () => {
    const { getByText } = render(<CustomMoodEditor {...defaultProps} />);
    expect(getByText('Make it yours!')).toBeTruthy();
  });

  test('renders cancel and save buttons', () => {
    const { getByText } = render(<CustomMoodEditor {...defaultProps} />);
    expect(getByText('Cancel')).toBeTruthy();
    expect(getByText('Save & Use')).toBeTruthy();
  });

  test('renders status message input', () => {
    const { getByPlaceholderText } = render(<CustomMoodEditor {...defaultProps} />);
    expect(getByPlaceholderText('How are you feeling?')).toBeTruthy();
  });

  test('shows character count', () => {
    const { getByText } = render(<CustomMoodEditor {...defaultProps} />);
    expect(getByText('0/50')).toBeTruthy();
  });

  test('updates character count on input', () => {
    const { getByPlaceholderText, getByText } = render(<CustomMoodEditor {...defaultProps} />);
    fireEvent.changeText(getByPlaceholderText('How are you feeling?'), 'Hello');
    expect(getByText('5/50')).toBeTruthy();
  });

  test('renders with initial values', () => {
    const { getByDisplayValue } = render(
      <CustomMoodEditor {...defaultProps} initialText="Existing mood" />,
    );
    expect(getByDisplayValue('Existing mood')).toBeTruthy();
  });

  test('save button is disabled without emoji and text', () => {
    const onSave = jest.fn();
    const { getByText } = render(<CustomMoodEditor {...defaultProps} onSave={onSave} />);
    fireEvent.press(getByText('Save & Use'));
    expect(onSave).not.toHaveBeenCalled();
  });

  test('save button is disabled without text', () => {
    const onSave = jest.fn();
    const { getByText } = render(<CustomMoodEditor {...defaultProps} onSave={onSave} initialEmoji="😊" />);
    fireEvent.press(getByText('Save & Use'));
    expect(onSave).not.toHaveBeenCalled();
  });

  test('save with valid data calls onSave', () => {
    const onSave = jest.fn();
    const { getByPlaceholderText, getByText } = render(
      <CustomMoodEditor {...defaultProps} onSave={onSave} initialEmoji="😊" />
    );
    fireEvent.changeText(getByPlaceholderText('How are you feeling?'), 'Great day');
    fireEvent.press(getByText('Save & Use'));
    expect(onSave).toHaveBeenCalledWith('😊', 'Great day', expect.any(String));
  });

  test('cancel calls onClose', () => {
    const onClose = jest.fn();
    const { getByText } = render(<CustomMoodEditor {...defaultProps} onClose={onClose} />);
    fireEvent.press(getByText('Cancel'));
    expect(onClose).toHaveBeenCalled();
  });

  test('back button calls onBack when provided', () => {
    const onBack = jest.fn();
    const { getByText } = render(<CustomMoodEditor {...defaultProps} onBack={onBack} />);
    fireEvent.press(getByText('Cancel'));
    expect(onBack).toHaveBeenCalled();
  });
});
