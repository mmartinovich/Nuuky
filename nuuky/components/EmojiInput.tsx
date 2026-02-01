import React, { useRef, useState } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, ScrollView, TextInput, Keyboard } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { spacing, radius } from '../lib/theme';
import { useTheme } from '../hooks/useTheme';

const POPULAR_EMOJIS = [
  '😊', '😎', '🥳', '😴', '🤔', '😤', '🥺', '❤️',
  '🔥', '✨', '💪', '🎉', '🌟', '💯', '🙏', '👋',
  '☕', '🎮', '📚', '💼', '🏃', '🎵', '🌈', '⚡',
];

interface EmojiInputProps {
  value: string;
  onChangeEmoji: (emoji: string) => void;
  placeholder?: string;
}

export const EmojiInput: React.FC<EmojiInputProps> = ({
  value,
  onChangeEmoji,
}) => {
  const { theme } = useTheme();
  const inputRef = useRef<TextInput>(null);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  const handleChangeText = (text: string) => {
    if (text.length > 0) {
      const emojiRegex = /\p{Extended_Pictographic}(\u200D\p{Extended_Pictographic}|\uFE0F)*/gu;
      const matches = [...text.matchAll(emojiRegex)];
      const lastEmoji = matches[matches.length - 1]?.[0];
      if (lastEmoji) {
        onChangeEmoji(lastEmoji);
        Keyboard.dismiss();
        setIsKeyboardOpen(false);
        return;
      }
    }
    setTimeout(() => {
      inputRef.current?.setNativeProps({ text: '' });
    }, 0);
  };

  const handleOpenKeyboard = () => {
    setIsKeyboardOpen(true);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <TouchableOpacity
          style={[
            styles.selectedBox,
            { backgroundColor: theme.colors.glass.background, borderColor: theme.colors.glass.border },
          ]}
          onPress={handleOpenKeyboard}
          activeOpacity={0.7}
        >
          {value ? (
            <Text style={styles.selectedEmoji}>{value}</Text>
          ) : (
            <Ionicons name="keypad-outline" size={24} color={theme.colors.text.tertiary} />
          )}
        </TouchableOpacity>

        {/* Emoji grid */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.emojiGrid}
          keyboardShouldPersistTaps="always"
        >
          {POPULAR_EMOJIS.map((emoji) => (
            <TouchableOpacity
              key={emoji}
              style={[
                styles.emojiButton,
                { backgroundColor: theme.colors.glass.background },
                value === emoji && {
                  backgroundColor: theme.colors.accent.primary + '4D',
                  borderWidth: 2,
                  borderColor: theme.colors.accent.primary,
                },
              ]}
              onPress={() => onChangeEmoji(emoji)}
              activeOpacity={0.7}
            >
              <Text style={styles.emojiText}>{emoji}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {isKeyboardOpen && (
        <TextInput
          ref={inputRef}
          style={[styles.keyboardInput, { backgroundColor: theme.colors.glass.background, borderColor: theme.colors.glass.border, color: theme.colors.text.primary }]}
          onChangeText={handleChangeText}
          autoCorrect={false}
          placeholder="Tap 🌐 for emojis"
          placeholderTextColor={theme.colors.text.tertiary}
          autoFocus
          onBlur={() => setIsKeyboardOpen(false)}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  selectedBox: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedEmoji: {
    fontSize: 32,
  },
  keyboardInput: {
    marginTop: spacing.xs,
    height: 40,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 16,
  },
  emojiGrid: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  emojiButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiText: {
    fontSize: 24,
  },
});
