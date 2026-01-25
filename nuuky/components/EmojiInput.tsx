import React from 'react';
import { View, StyleSheet, Text, TouchableOpacity, ScrollView } from 'react-native';
import { colors, typography, spacing, radius } from '../lib/theme';

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
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Pick an Emoji</Text>

      {/* Selected emoji display */}
      <View style={styles.selectedWrapper}>
        <Text style={styles.selectedEmoji}>{value || '+'}</Text>
      </View>

      {/* Emoji grid */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.emojiGrid}
      >
        {POPULAR_EMOJIS.map((emoji) => (
          <TouchableOpacity
            key={emoji}
            style={[
              styles.emojiButton,
              value === emoji && styles.emojiButtonSelected,
            ]}
            onPress={() => onChangeEmoji(emoji)}
            activeOpacity={0.7}
          >
            <Text style={styles.emojiText}>{emoji}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  selectedWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  selectedEmoji: {
    fontSize: 56,
    color: colors.text.primary,
  },
  emojiGrid: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
  },
  emojiButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiButtonSelected: {
    backgroundColor: 'rgba(20, 184, 166, 0.3)',
    borderWidth: 2,
    borderColor: '#14B8A6',
  },
  emojiText: {
    fontSize: 24,
  },
});
