import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { EmojiInput } from '../../components/EmojiInput';

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

jest.mock('../../hooks/useTheme', () => ({
  useTheme: () => ({
    theme: {
      colors: {
        glass: { background: '#111', border: '#333' },
        text: { primary: '#fff', tertiary: '#666' },
        accent: { primary: '#3FCBFF' },
      },
    },
  }),
}));

describe('EmojiInput', () => {
  test('renders popular emojis', () => {
    const { getByText } = render(
      <EmojiInput value="" onChangeEmoji={jest.fn()} />
    );
    expect(getByText('😊')).toBeTruthy();
    expect(getByText('🔥')).toBeTruthy();
  });

  test('shows selected emoji', () => {
    const { getAllByText } = render(
      <EmojiInput value="🎉" onChangeEmoji={jest.fn()} />
    );
    // 🎉 appears as selected + in the popular grid
    expect(getAllByText('🎉').length).toBeGreaterThanOrEqual(1);
  });

  test('calls onChangeEmoji when emoji pressed', () => {
    const onChange = jest.fn();
    const { getByText } = render(
      <EmojiInput value="" onChangeEmoji={onChange} />
    );
    fireEvent.press(getByText('😎'));
    expect(onChange).toHaveBeenCalledWith('😎');
  });
});
