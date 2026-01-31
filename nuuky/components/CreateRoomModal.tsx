import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../hooks/useTheme';
import { radius } from '../lib/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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
  const { theme, accent } = useTheme();
  const [roomName, setNuukName] = useState('');

  // Simple animations
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 100,
          friction: 10,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      scaleAnim.setValue(0.95);
      opacityAnim.setValue(0);
    }
  }, [visible]);

  const canCreate = roomName.trim().length > 0;

  const handleCreate = () => {
    if (!canCreate) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onCreate(roomName.trim(), true);
    setNuukName('');
    onClose();
  };

  const handleCancel = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setNuukName('');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={[styles.overlay, { backgroundColor: theme.colors.ui.overlay }]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <Animated.View
            style={[
              styles.modalContainer,
              {
                opacity: opacityAnim,
                transform: [{ scale: scaleAnim }],
              },
            ]}
          >
            <LinearGradient
              colors={theme.gradients.background}
              style={[styles.gradientBackground, { borderColor: theme.colors.glass.border }]}
            >
              {/* Header Section */}
              <View style={styles.headerSection}>
                <View style={styles.headerText}>
                  <Text style={[styles.title, { color: theme.colors.text.primary }]}>Create Room</Text>
                  <Text style={[styles.subtitle, { color: theme.colors.text.tertiary }]}>Start a room with friends</Text>
                </View>
              </View>

              {/* Input Section */}
              <View style={styles.inputSection}>
                <Text style={[styles.sectionLabel, { color: theme.colors.text.tertiary }]}>ROOM NAME</Text>
                <View style={[styles.inputCard, { backgroundColor: theme.colors.glass.background, borderColor: theme.colors.glass.border }]}>
                  <TextInput
                    style={[styles.input, { color: theme.colors.text.primary }]}
                    placeholder="Enter a name..."
                    placeholderTextColor={theme.colors.text.tertiary}
                    value={roomName}
                    onChangeText={setNuukName}
                    maxLength={30}
                    autoCorrect={false}
                    autoCapitalize="words"
                    autoFocus
                  />
                </View>
              </View>

              {/* Buttons */}
              <View style={styles.buttons}>
                <TouchableOpacity
                  onPress={handleCancel}
                  style={[styles.cancelButton, { backgroundColor: theme.colors.glass.background, borderColor: theme.colors.glass.border }]}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.cancelButtonText, { color: theme.colors.text.tertiary }]}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleCreate}
                  style={[
                    styles.createButton,
                    {
                      backgroundColor: canCreate ? accent.primary : theme.colors.glass.background,
                    },
                  ]}
                  activeOpacity={0.7}
                  disabled={!canCreate}
                >
                  <Text
                    style={[
                      styles.createButtonText,
                      { color: canCreate ? '#FFFFFF' : theme.colors.text.tertiary },
                    ]}
                  >
                    Create
                  </Text>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyboardView: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: SCREEN_WIDTH - 48,
    maxWidth: 360,
    borderRadius: radius.xl,
    overflow: 'hidden',
  },
  gradientBackground: {
    padding: 24,
    borderRadius: radius.xl,
    borderWidth: 1,
  },
  // Header
  headerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    letterSpacing: -0.3,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '400',
  },
  // Input Section
  inputSection: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  inputCard: {
    borderRadius: radius.md,
    borderWidth: 1,
  },
  input: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontWeight: '500',
  },
  // Buttons
  buttons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  createButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: radius.md,
  },
  createButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
