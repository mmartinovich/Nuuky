import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { colors, spacing, radius, typography } from '../lib/theme';

interface ReportModalProps {
  visible: boolean;
  onClose: () => void;
  onReport: (reportType: string, details?: string) => void;
  userName: string;
}

export const ReportModal: React.FC<ReportModalProps> = ({
  visible,
  onClose,
  onReport,
  userName,
}) => {
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [details, setDetails] = useState('');

  const handleSubmit = () => {
    if (selectedType) {
      onReport(selectedType, details.trim() || undefined);
      setSelectedType(null);
      setDetails('');
      onClose();
    }
  };

  const handleCancel = () => {
    setSelectedType(null);
    setDetails('');
    onClose();
  };

  const reportTypes = [
    {
      type: 'harassment',
      title: 'Harassment',
      description: 'Unwanted contact or abusive behavior',
      icon: '⚠️',
    },
    {
      type: 'spam',
      title: 'Spam',
      description: 'Excessive or unwanted messages',
      icon: '📧',
    },
    {
      type: 'inappropriate',
      title: 'Inappropriate Content',
      description: 'Offensive or explicit content',
      icon: '🚫',
    },
    {
      type: 'other',
      title: 'Other',
      description: 'Something else',
      icon: '🔍',
    },
  ];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <BlurView intensity={80} style={styles.overlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <View style={styles.modalContainer}>
            <BlurView intensity={30} style={styles.modal}>
              {/* Header */}
              <View style={styles.header}>
                <Text style={styles.title}>Report {userName}</Text>
                <Text style={styles.subtitle}>Help us keep Nūūky safe</Text>
              </View>

              {/* Report Types */}
              <ScrollView
                style={styles.content}
                contentContainerStyle={styles.contentContainer}
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.typesList}>
                  {reportTypes.map((type) => (
                    <TouchableOpacity
                      key={type.type}
                      onPress={() => setSelectedType(type.type)}
                      style={[
                        styles.typeCard,
                        selectedType === type.type && styles.typeCardSelected,
                      ]}
                    >
                      <Text style={styles.typeIcon}>{type.icon}</Text>
                      <View style={styles.typeInfo}>
                        <Text style={styles.typeTitle}>{type.title}</Text>
                        <Text style={styles.typeDescription}>{type.description}</Text>
                      </View>
                      {selectedType === type.type && (
                        <View style={styles.checkmark}>
                          <Text style={styles.checkmarkText}>✓</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Optional Details */}
                <View style={styles.detailsSection}>
                  <Text style={styles.detailsLabel}>Additional Details (Optional)</Text>
                  <View style={styles.inputContainer}>
                    <TextInput
                      style={styles.input}
                      placeholder="Tell us more..."
                      placeholderTextColor={colors.text.tertiary}
                      value={details}
                      onChangeText={setDetails}
                      multiline
                      numberOfLines={4}
                      textAlignVertical="top"
                      maxLength={500}
                    />
                  </View>
                </View>
              </ScrollView>

              {/* Buttons */}
              <View style={styles.buttons}>
                <TouchableOpacity onPress={handleCancel} style={styles.cancelButton}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleSubmit}
                  disabled={!selectedType}
                  style={[styles.submitButton, !selectedType && styles.submitButtonDisabled]}
                >
                  <LinearGradient
                    colors={
                      selectedType
                        ? colors.mood.reachOut.gradient
                        : ['rgba(100, 100, 100, 0.3)', 'rgba(80, 80, 80, 0.3)']
                    }
                    style={styles.submitGradient}
                  >
                    <Text style={[styles.submitText, !selectedType && styles.submitTextDisabled]}>
                      Submit Report
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </BlurView>
          </View>
        </KeyboardAvoidingView>
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
  keyboardView: {
    width: '100%',
    alignItems: 'center',
  },
  modalContainer: {
    width: '85%',
    maxWidth: 400,
    maxHeight: '85%',
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
  content: {
    maxHeight: 500,
  },
  contentContainer: {
    padding: spacing.lg,
  },
  typesList: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  typeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.glass.background,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 2,
    borderColor: colors.glass.border,
  },
  typeCardSelected: {
    borderColor: colors.mood.reachOut.base,
    backgroundColor: 'rgba(236, 72, 153, 0.1)',
  },
  typeIcon: {
    fontSize: 28,
    marginRight: spacing.md,
  },
  typeInfo: {
    flex: 1,
  },
  typeTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    color: colors.text.primary,
    marginBottom: spacing.xs / 2,
  },
  typeDescription: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.mood.reachOut.base,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmarkText: {
    color: colors.text.primary,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
  },
  detailsSection: {
    marginTop: spacing.sm,
  },
  detailsLabel: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  inputContainer: {
    backgroundColor: colors.glass.background,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  input: {
    padding: spacing.md,
    fontSize: typography.sizes.md,
    color: colors.text.primary,
    minHeight: 100,
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
  submitButton: {
    flex: 1,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitGradient: {
    padding: spacing.md,
    alignItems: 'center',
  },
  submitText: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
  },
  submitTextDisabled: {
    color: colors.text.tertiary,
  },
});
