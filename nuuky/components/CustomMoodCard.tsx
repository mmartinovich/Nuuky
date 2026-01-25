import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { CustomMood } from '../types';
import { colors, gradients, typography, spacing, radius, getCustomMoodColor } from '../lib/theme';

interface CustomMoodCardProps {
  customMood: CustomMood;
  isSelected: boolean;
  onPress: () => void;
  onDelete: () => void;
}

export const CustomMoodCard: React.FC<CustomMoodCardProps> = ({
  customMood,
  isSelected,
  onPress,
  onDelete,
}) => {
  const moodColors = getCustomMoodColor(customMood.color);

  const handleLongPress = () => {
    Alert.alert(
      'Delete Custom Mood',
      `Delete "${customMood.text}"?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: onDelete,
        },
      ]
    );
  };

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      onLongPress={handleLongPress}
      delayLongPress={500}
    >
      <LinearGradient
        colors={isSelected ? gradients.button : gradients.card}
        style={[
          styles.card,
          {
            borderColor: isSelected ? moodColors.base : colors.ui.border,
            borderWidth: isSelected ? 2 : 1,
          },
        ]}
      >
        {/* Emoji */}
        <View style={styles.emojiWrapper}>
          <Text style={styles.emoji}>{customMood.emoji}</Text>
        </View>

        {/* Text */}
        <View style={styles.textWrapper}>
          <Text style={styles.text} numberOfLines={1}>
            {customMood.text}
          </Text>
          <Text style={styles.hint}>Long press to delete</Text>
        </View>

        {/* Check mark */}
        {isSelected && (
          <View style={[styles.checkmark, { backgroundColor: moodColors.base }]}>
            <Text style={styles.checkmarkText}>✓</Text>
          </View>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.lg,
  },
  emojiWrapper: {
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  emoji: {
    fontSize: 48,
  },
  textWrapper: {
    flex: 1,
  },
  text: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.medium,
    color: colors.text.primary,
    marginBottom: spacing.xs / 2,
  },
  hint: {
    fontSize: typography.size.xs,
    color: colors.text.tertiary,
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmarkText: {
    fontSize: typography.size.sm,
    color: colors.text.primary,
    fontWeight: typography.weight.bold,
  },
});
