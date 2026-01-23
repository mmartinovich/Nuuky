import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
} from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { colors, spacing, radius, typography } from '../lib/theme';

type Visibility = 'full' | 'limited' | 'minimal' | 'hidden';

interface VisibilityPickerProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (visibility: Visibility) => void;
  currentVisibility: Visibility;
  friendName: string;
}

export const VisibilityPicker: React.FC<VisibilityPickerProps> = ({
  visible,
  onClose,
  onSelect,
  currentVisibility,
  friendName,
}) => {
  const [selectedVisibility, setSelectedVisibility] = useState<Visibility>(currentVisibility);

  const handleSave = () => {
    onSelect(selectedVisibility);
    onClose();
  };

  const visibilityOptions = [
    {
      value: 'full' as Visibility,
      title: 'Full Access',
      description: 'They can see when you're online, your mood, and what rooms you're in',
      icon: '👁️',
      color: colors.mood.good.base,
    },
    {
      value: 'limited' as Visibility,
      title: 'Limited',
      description: 'They can see when you're online and your mood, but not rooms or other details',
      icon: '👤',
      color: colors.mood.neutral.base,
    },
    {
      value: 'minimal' as Visibility,
      title: 'Minimal',
      description: 'They only see you online. No mood, rooms, or activity details',
      icon: '🔒',
      color: colors.mood.notGreat.base,
    },
    {
      value: 'hidden' as Visibility,
      title: 'Hidden',
      description: 'You appear completely invisible to them unless you interact first',
      icon: '👻',
      color: colors.mood.reachOut.base,
    },
  ];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <BlurView intensity={80} style={styles.overlay}>
        <View style={styles.modalContainer}>
          <BlurView intensity={30} style={styles.modal}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Visibility for {friendName}</Text>
              <Text style={styles.subtitle}>Control what they can see about you</Text>
            </View>

            {/* Visibility Options */}
            <ScrollView
              style={styles.optionsList}
              contentContainerStyle={styles.optionsContent}
              showsVerticalScrollIndicator={false}
            >
              {visibilityOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  onPress={() => setSelectedVisibility(option.value)}
                  style={[
                    styles.optionCard,
                    selectedVisibility === option.value && styles.optionCardSelected,
                  ]}
                >
                  <View style={styles.optionHeader}>
                    <Text style={styles.optionIcon}>{option.icon}</Text>
                    <View style={styles.optionInfo}>
                      <Text style={styles.optionTitle}>{option.title}</Text>
                      {selectedVisibility === option.value && (
                        <View style={[styles.checkmark, { backgroundColor: option.color }]}>
                          <Text style={styles.checkmarkText}>✓</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <Text style={styles.optionDescription}>{option.description}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Buttons */}
            <View style={styles.buttons}>
              <TouchableOpacity onPress={onClose} style={styles.cancelButton}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={handleSave} style={styles.saveButton}>
                <LinearGradient
                  colors={colors.mood.neutral.gradient}
                  style={styles.saveGradient}
                >
                  <Text style={styles.saveText}>Save</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </BlurView>
        </View>
      </BlurView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContainer: {
    maxHeight: '85%',
  },
  modal: {
    borderTopLeftRadius: radius['2xl'],
    borderTopRightRadius: radius['2xl'],
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  header: {
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.glass.border,
  },
  title: {
    fontSize: typography.sizes['2xl'],
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
  },
  optionsList: {
    maxHeight: 450,
  },
  optionsContent: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  optionCard: {
    backgroundColor: colors.glass.background,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 2,
    borderColor: colors.glass.border,
  },
  optionCardSelected: {
    borderColor: colors.mood.neutral.base,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  optionIcon: {
    fontSize: 32,
    marginRight: spacing.md,
  },
  optionInfo: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  optionTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmarkText: {
    color: colors.text.primary,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
  },
  optionDescription: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  buttons: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.glass.border,
  },
  cancelButton: {
    flex: 1,
    padding: spacing.md,
    borderRadius: radius.full,
    backgroundColor: colors.glass.background,
    borderWidth: 1,
    borderColor: colors.glass.border,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    color: colors.text.secondary,
  },
  saveButton: {
    flex: 1,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  saveGradient: {
    padding: spacing.md,
    alignItems: 'center',
  },
  saveText: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
  },
});
