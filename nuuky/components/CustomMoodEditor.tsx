import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { EmojiInput } from './EmojiInput';
import { typography, spacing, radius, CUSTOM_MOOD_COLORS, getCustomMoodColor } from '../lib/theme';
import { useTheme } from '../hooks/useTheme';

interface CustomMoodEditorProps {
  visible: boolean;
  onSave: (emoji: string, text: string, color: string) => void;
  onClose: () => void;
  initialEmoji?: string;
  initialText?: string;
  initialColor?: string;
}

export const CustomMoodEditor: React.FC<CustomMoodEditorProps> = ({
  visible,
  onSave,
  onClose,
  initialEmoji = '',
  initialText = '',
  initialColor = CUSTOM_MOOD_COLORS[0],
}) => {
  const { theme } = useTheme();
  const [emoji, setEmoji] = useState(initialEmoji);
  const [text, setText] = useState(initialText);
  const TEAL_COLOR = '#14B8A6'; // Teal-500

  const handleSave = () => {
    // Validate emoji - cleaned to remove extra whitespace and invisible characters
    const cleanedEmoji = emoji.trim();

    if (!cleanedEmoji) {
      Alert.alert('Missing Emoji', 'Please select an emoji');
      return;
    }

    // Validate text
    if (!text || text.trim().length < 1) {
      Alert.alert('Missing Message', 'Please add a status message');
      return;
    }

    if (text.length > 50) {
      Alert.alert('Message Too Long', 'Status message must be 50 characters or less');
      return;
    }

    onSave(cleanedEmoji, text.trim(), TEAL_COLOR);
    handleClose();
  };

  const handleClose = () => {
    // Reset form
    setEmoji('');
    setText('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={handleClose}
        />
        <View style={styles.container}>
          <LinearGradient colors={theme.gradients.card} style={[styles.modal, { borderColor: theme.colors.ui.border }]}>
            <ScrollView
              showsVerticalScrollIndicator={false}
              bounces={false}
              keyboardShouldPersistTaps="always"
            >
                {/* Header */}
                <View style={styles.header}>
                  <Text style={[styles.title, { color: theme.colors.text.primary }]}>Create Custom Mood</Text>
                  <Text style={[styles.subtitle, { color: theme.colors.text.secondary }]}>
                    Make it yours!
                  </Text>
                </View>

                {/* Emoji Input */}
                <EmojiInput
                  value={emoji}
                  onChangeEmoji={setEmoji}
                  placeholder="+"
                />

                {/* Text Input */}
                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: theme.colors.text.secondary }]}>Status Message</Text>
                  <TextInput
                    style={[styles.textInput, { borderColor: theme.colors.ui.border, color: theme.colors.text.primary }]}
                    value={text}
                    onChangeText={setText}
                    placeholder="How are you feeling?"
                    placeholderTextColor={theme.colors.text.tertiary}
                    maxLength={50}
                    returnKeyType="done"
                  />
                  <Text style={[styles.charCount, { color: theme.colors.text.tertiary }]}>{text.length}/50</Text>
                </View>

                {/* Buttons */}
                <View style={styles.buttons}>
                  <TouchableOpacity
                    onPress={handleSave}
                    style={styles.saveButton}
                    activeOpacity={0.7}
                  >
                    <LinearGradient
                      colors={['rgba(59, 130, 246, 0.3)', 'rgba(236, 72, 153, 0.3)']}
                      style={[styles.saveButtonGradient, { borderColor: theme.colors.text.accent }]}
                    >
                      <Text style={[styles.saveButtonText, { color: theme.colors.text.primary }]}>Save & Use</Text>
                    </LinearGradient>
                  </TouchableOpacity>

                  <TouchableOpacity onPress={handleClose} style={styles.cancelButton}>
                    <Text style={[styles.cancelText, { color: theme.colors.text.tertiary }]}>Cancel</Text>
                  </TouchableOpacity>
                </View>
            </ScrollView>
          </LinearGradient>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  container: {
    width: '100%',
    maxWidth: 400,
    maxHeight: '90%',
  },
  modal: {
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    backgroundColor: 'rgba(20, 20, 40, 0.95)',
  },
  header: {
    marginBottom: spacing.lg,
    alignItems: 'center',
  },
  title: {
    fontSize: typography.size['2xl'],
    fontWeight: typography.weight.bold,
    marginBottom: spacing.xs,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: typography.size.sm,
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
    marginBottom: spacing.xs,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: typography.size.base,
    minHeight: 48,
  },
  charCount: {
    fontSize: typography.size.xs,
    marginTop: spacing.xs,
    textAlign: 'right',
  },
  buttons: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  saveButton: {
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  saveButtonGradient: {
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radius.lg,
  },
  saveButtonText: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.bold,
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  cancelText: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.medium,
  },
});
