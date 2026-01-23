import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Switch,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { colors, spacing, radius, typography } from '../lib/theme';

interface CreateRoomModalProps {
  visible: boolean;
  onClose: () => void;
  onCreate: (name?: string, isPrivate?: boolean) => void;
}

export const CreateRoomModal: React.FC<CreateRoomModalProps> = ({
  visible,
  onClose,
  onCreate,
}) => {
  const [roomName, setRoomName] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);

  const handleCreate = () => {
    onCreate(roomName.trim() || undefined, isPrivate);
    setRoomName('');
    setIsPrivate(false);
    onClose();
  };

  const handleCancel = () => {
    setRoomName('');
    setIsPrivate(false);
    onClose();
  };

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
                <Text style={styles.title}>Create Room</Text>
                <Text style={styles.subtitle}>
                  Start a space where friends can hang out
                </Text>
              </View>

              {/* Room Name Input */}
              <View style={styles.inputSection}>
                <Text style={styles.label}>Room Name (optional)</Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.input}
                    placeholder="My Room"
                    placeholderTextColor={colors.text.tertiary}
                    value={roomName}
                    onChangeText={setRoomName}
                    maxLength={50}
                  />
                </View>
              </View>

              {/* Private Toggle */}
              <View style={styles.switchSection}>
                <View style={styles.switchInfo}>
                  <Text style={styles.switchLabel}>Private Room</Text>
                  <Text style={styles.switchDescription}>
                    Only friends you invite can join
                  </Text>
                </View>
                <Switch
                  value={isPrivate}
                  onValueChange={setIsPrivate}
                  trackColor={{
                    false: colors.glass.background,
                    true: colors.mood.neutral.base,
                  }}
                  thumbColor={colors.text.primary}
                />
              </View>

              {/* Buttons */}
              <View style={styles.buttons}>
                <TouchableOpacity onPress={handleCancel} style={styles.cancelButton}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={handleCreate} style={styles.createButton}>
                  <LinearGradient
                    colors={colors.mood.neutral.gradient}
                    style={styles.createGradient}
                  >
                    <Text style={styles.createText}>Create</Text>
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
  inputSection: {
    padding: spacing.lg,
  },
  label: {
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
    fontWeight: typography.weights.medium,
  },
  switchSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  switchInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  switchLabel: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    color: colors.text.primary,
    marginBottom: spacing.xs / 2,
  },
  switchDescription: {
    fontSize: typography.sizes.xs,
    color: colors.text.tertiary,
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
  createButton: {
    flex: 1,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  createGradient: {
    padding: spacing.md,
    alignItems: 'center',
  },
  createText: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
  },
});
