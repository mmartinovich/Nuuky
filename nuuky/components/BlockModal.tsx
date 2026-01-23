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

type BlockType = 'mute' | 'soft' | 'hard';

interface BlockModalProps {
  visible: boolean;
  onClose: () => void;
  onBlock: (blockType: BlockType) => void;
  userName: string;
}

export const BlockModal: React.FC<BlockModalProps> = ({
  visible,
  onClose,
  onBlock,
  userName,
}) => {
  const [selectedType, setSelectedType] = useState<BlockType | null>(null);

  const handleConfirm = () => {
    if (selectedType) {
      onBlock(selectedType);
      setSelectedType(null);
      onClose();
    }
  };

  const handleCancel = () => {
    setSelectedType(null);
    onClose();
  };

  const blockOptions = [
    {
      type: 'mute' as BlockType,
      title: 'Mute',
      description: "You won't see their presence or updates, but they can still see yours",
      icon: '🔇',
      color: colors.mood.neutral.base,
    },
    {
      type: 'soft' as BlockType,
      title: 'Soft Block',
      description: 'You appear offline to them. They can still send nudges (which you can ignore)',
      icon: '👻',
      color: colors.mood.notGreat.base,
    },
    {
      type: 'hard' as BlockType,
      title: 'Hard Block',
      description: 'Complete removal. They disappear from your friends list',
      icon: '🚫',
      color: '#EF4444',
    },
  ];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <BlurView intensity={80} style={styles.overlay}>
        <View style={styles.modalContainer}>
          <BlurView intensity={30} style={styles.modal}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Block {userName}</Text>
              <Text style={styles.subtitle}>All blocks are silent - they won't know</Text>
            </View>

            {/* Block Options */}
            <ScrollView
              style={styles.optionsList}
              contentContainerStyle={styles.optionsContent}
              showsVerticalScrollIndicator={false}
            >
              {blockOptions.map((option) => (
                <TouchableOpacity
                  key={option.type}
                  onPress={() => setSelectedType(option.type)}
                  style={[
                    styles.optionCard,
                    selectedType === option.type && styles.optionCardSelected,
                  ]}
                >
                  <View style={styles.optionHeader}>
                    <Text style={styles.optionIcon}>{option.icon}</Text>
                    <View style={styles.optionInfo}>
                      <Text style={styles.optionTitle}>{option.title}</Text>
                      {selectedType === option.type && (
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
              <TouchableOpacity onPress={handleCancel} style={styles.cancelButton}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleConfirm}
                disabled={!selectedType}
                style={[styles.confirmButton, !selectedType && styles.confirmButtonDisabled]}
              >
                <LinearGradient
                  colors={
                    selectedType
                      ? ['rgba(239, 68, 68, 0.8)', 'rgba(220, 38, 38, 0.8)']
                      : ['rgba(100, 100, 100, 0.3)', 'rgba(80, 80, 80, 0.3)']
                  }
                  style={styles.confirmGradient}
                >
                  <Text style={[styles.confirmText, !selectedType && styles.confirmTextDisabled]}>
                    Block
                  </Text>
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
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContainer: {
    width: '85%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  modal: {
    borderRadius: radius.xl,
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
    maxHeight: 400,
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
    borderColor: colors.mood.reachOut.base,
    backgroundColor: 'rgba(236, 72, 153, 0.1)',
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
  confirmButton: {
    flex: 1,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  confirmButtonDisabled: {
    opacity: 0.5,
  },
  confirmGradient: {
    padding: spacing.md,
    alignItems: 'center',
  },
  confirmText: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
  },
  confirmTextDisabled: {
    color: colors.text.tertiary,
  },
});
