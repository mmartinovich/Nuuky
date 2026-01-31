import React, { useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Image, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { PresetMood } from '../types';
import { getMoodImage, getMoodColor, radius } from '../lib/theme';
import { useTheme } from '../hooks/useTheme';

// Moved outside component to prevent recreation on each render
const MOODS: ReadonlyArray<{ mood: PresetMood; label: string; description: string }> = [
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
] as const;

interface MoodPickerProps {
  visible: boolean;
  currentMood: PresetMood;
  onSelectMood: (mood: PresetMood) => void;
  onClose: () => void;
}

export const MoodPicker: React.FC<MoodPickerProps> = ({
  visible,
  currentMood,
  onSelectMood,
  onClose,
}) => {
  const { theme, accent } = useTheme();

  const handleSelectMood = useCallback((mood: PresetMood) => {
    onSelectMood(mood);
    onClose();
  }, [onSelectMood, onClose]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      accessibilityViewIsModal={true}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
        accessibilityLabel="Close mood picker"
        accessibilityRole="button"
      >
        <View
          style={styles.modalContainer}
          onStartShouldSetResponder={() => true}
        >
          <LinearGradient colors={theme.gradients.background} style={styles.gradientBackground}>
            <ScrollView
                showsVerticalScrollIndicator={false}
                bounces={false}
                contentContainerStyle={styles.scrollContent}
              >
                {/* Header - Friends page style */}
                <View style={styles.header}>
                  <View style={styles.headerLeft} />
                  <Text style={[styles.headerTitle, { color: theme.colors.text.primary }]}>How are you?</Text>
                  <TouchableOpacity
                    style={[styles.closeButton, { backgroundColor: accent.soft }]}
                    onPress={onClose}
                    activeOpacity={0.7}
                    accessibilityLabel="Close mood picker"
                    accessibilityRole="button"
                  >
                    <Ionicons name="close" size={24} color={accent.primary} />
                  </TouchableOpacity>
                </View>

                {/* Subtitle */}
                <Text style={styles.subtitle}>Your friends will see this</Text>

                {/* Mood options */}
                <View style={styles.moodList}>
                  {MOODS.map(({ mood, label, description }) => {
                    const isSelected = currentMood === mood;
                    const moodColors = getMoodColor(mood);

                    return (
                      <TouchableOpacity
                        key={mood}
                        activeOpacity={0.7}
                        onPress={() => handleSelectMood(mood)}
                        style={[
                          styles.moodCard,
                          isSelected && { borderColor: moodColors.base, borderWidth: 2 },
                        ]}
                        accessibilityLabel={`${label}: ${description}`}
                        accessibilityRole="button"
                        accessibilityState={{ selected: isSelected }}
                      >
                        {/* Mood Creature Image */}
                        <View style={styles.imageWrapper}>
                          <Image
                            source={getMoodImage(mood)}
                            style={styles.moodImage}
                          />
                        </View>

                        {/* Text */}
                        <View style={styles.moodText}>
                          <Text style={[styles.moodLabel, { color: theme.colors.text.primary }]}>{label}</Text>
                          <Text style={styles.moodDescription}>
                            {description}
                          </Text>
                        </View>

                        {/* Check mark */}
                        {isSelected && (
                          <View style={[styles.checkmark, { backgroundColor: moodColors.base }]}>
                            <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Cancel button */}
                <TouchableOpacity
                  onPress={onClose}
                  style={styles.cancelButton}
                  accessibilityLabel="Cancel"
                  accessibilityRole="button"
                >
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
            </ScrollView>
          </LinearGradient>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 400,
    borderRadius: radius.xl,
    overflow: 'hidden',
  },
  gradientBackground: {
    borderRadius: radius.xl,
  },
  scrollContent: {
    padding: 24,
  },
  // Header - Friends page style
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  headerLeft: {
    width: 44,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.5)',
    textAlign: 'center',
    marginBottom: 24,
  },
  moodList: {
    gap: 12,
    marginBottom: 24,
  },
  moodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    gap: 12,
  },
  imageWrapper: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moodImage: {
    width: 56,
    height: 56,
    resizeMode: 'contain',
  },
  moodText: {
    flex: 1,
  },
  moodLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  moodDescription: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  checkmark: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  cancelText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.5)',
    fontWeight: '600',
  },
});
