import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { MoodPicker } from '../../components/MoodPicker';

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
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium' },
}));

jest.mock('react-native-reanimated', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: { View: ({ children, style, ...props }: any) => <View style={style} {...props}>{children}</View> },
    useSharedValue: (v: any) => ({ value: v }),
    useAnimatedStyle: () => ({}),
    withTiming: (v: any) => v,
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

jest.mock('../../components/EmojiInput', () => ({
  EmojiInput: () => null,
}));

describe('MoodPicker', () => {
  const defaultProps = {
    visible: true,
    currentMood: 'good' as const,
    onSelectMood: jest.fn(),
    onClose: jest.fn(),
  };

  test('renders title', () => {
    const { getByText } = render(<MoodPicker {...defaultProps} />);
    expect(getByText('How are you?')).toBeTruthy();
  });

  test('renders all preset moods', () => {
    const { getByText } = render(<MoodPicker {...defaultProps} />);
    expect(getByText('Feeling good')).toBeTruthy();
    expect(getByText('Neutral')).toBeTruthy();
    expect(getByText('Not great')).toBeTruthy();
    expect(getByText('Need support')).toBeTruthy();
  });

  test('renders custom mood section', () => {
    const { getByText } = render(<MoodPicker {...defaultProps} />);
    expect(getByText('Custom mood')).toBeTruthy();
  });

  test('shows existing custom mood text', () => {
    const { getByText } = render(
      <MoodPicker {...defaultProps} customMood={{ id: 'm1', user_id: 'u1', emoji: '🎉', text: 'Party', color: 'cyan', created_at: '' } as any} />
    );
    expect(getByText('Party')).toBeTruthy();
    expect(getByText('🎉')).toBeTruthy();
  });

  test('shows subtitle', () => {
    const { getByText } = render(<MoodPicker {...defaultProps} />);
    expect(getByText('Your friends will see this')).toBeTruthy();
  });
});
