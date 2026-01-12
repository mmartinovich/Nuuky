import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { User } from '../types';
import { colors, gradients, getMoodColor, getMoodImage, typography, spacing, radius } from '../lib/theme';

interface MoodPickerProps {
  visible: boolean;
  currentMood: User['mood'];
  onSelectMood: (mood: User['mood']) => void;
  onClose: () => void;
}

const MOODS: Array<{ mood: User['mood']; label: string; description: string }> = [
  {
    mood: 'good',
    label: 'Feeling good',
    description: 'Positive and available',
  },
  {
    mood: 'neutral',
    label: 'Neutral',
    description: 'Just here, nothing special',
  },
  {
    mood: 'not_great',
    label: 'Not great',
    description: 'Having a rough time',
  },
  {
    mood: 'reach_out',
    label: 'Need support',
    description: 'Could use some company',
  },
];

export const MoodPicker: React.FC<MoodPickerProps> = ({
  visible,
  currentMood,
  onSelectMood,
  onClose,
}) => {
  const handleSelectMood = (mood: User['mood']) => {
    onSelectMood(mood);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <BlurView intensity={20} style={styles.overlay} tint="dark">
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        >
          <View
            style={styles.container}
            onStartShouldSetResponder={() => true}
          >
            <LinearGradient colors={gradients.card} style={styles.modal}>
              {/* Header */}
              <View style={styles.header}>
                <Text style={styles.title}>How are you feeling?</Text>
                <Text style={styles.subtitle}>
                  Your friends will see this
                </Text>
              </View>

              {/* Mood options */}
              <View style={styles.moodList}>
                {MOODS.map(({ mood, label, description }) => {
                  const moodColors = getMoodColor(mood);
                  const isSelected = currentMood === mood;

                  return (
                    <TouchableOpacity
                      key={mood}
                      activeOpacity={0.7}
                      onPress={() => handleSelectMood(mood)}
                    >
                      <LinearGradient
                        colors={isSelected ? gradients.button : gradients.card}
                        style={[
                          styles.moodOption,
                          isSelected && styles.moodOptionSelected,
                        ]}
                      >
                        {/* Mood Creature Image */}
                        <View style={styles.imageWrapper}>
                          <Image
                            source={getMoodImage(mood)}
                            style={styles.moodImage}
                            fadeDuration={0}
                          />
                        </View>

                        {/* Text */}
                        <View style={styles.moodText}>
                          <Text style={styles.moodLabel}>{label}</Text>
                          <Text style={styles.moodDescription}>
                            {description}
                          </Text>
                        </View>

                        {/* Check mark */}
                        {isSelected && (
                          <View style={styles.checkmark}>
                            <Text style={styles.checkmarkText}>✓</Text>
                          </View>
                        )}
                      </LinearGradient>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Cancel button */}
              <TouchableOpacity onPress={onClose} style={styles.cancelButton}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </LinearGradient>
          </View>
        </TouchableOpacity>
      </BlurView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
  },
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  container: {
    width: '100%',
    maxWidth: 400,
  },
  modal: {
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.ui.border,
    backgroundColor: 'rgba(20, 20, 40, 0.95)',
  },
  header: {
    marginBottom: spacing.lg,
    alignItems: 'center',
  },
  title: {
    fontSize: typography.size['2xl'],
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
  },
  moodList: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  moodOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.ui.border,
  },
  moodOptionSelected: {
    borderColor: colors.text.accent,
    borderWidth: 2,
  },
  imageWrapper: {
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  moodImage: {
    width: 60,
    height: 60,
    resizeMode: 'contain',
  },
  moodText: {
    flex: 1,
  },
  moodLabel: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.medium,
    color: colors.text.primary,
    marginBottom: spacing.xs / 2,
  },
  moodDescription: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.text.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmarkText: {
    fontSize: typography.size.sm,
    color: colors.text.primary,
    fontWeight: typography.weight.bold,
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  cancelText: {
    fontSize: typography.size.base,
    color: colors.text.tertiary,
    fontWeight: typography.weight.medium,
  },
});
