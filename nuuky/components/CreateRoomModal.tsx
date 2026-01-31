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
import { Ionicons } from '@expo/vector-icons';
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
  const [roomName, setRoomName] = useState('');

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
    setRoomName('');
    onClose();
  };

  const handleCancel = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRoomName('');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.overlay}>
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
              style={styles.gradientBackground}
            >
              {/* Header Section */}
              <View style={styles.headerSection}>
                <View style={[styles.iconContainer, { backgroundColor: accent.soft }]}>
                  <Ionicons name="home" size={22} color={accent.primary} />
                </View>
                <View style={styles.headerText}>
                  <Text style={[styles.title, { color: theme.colors.text.primary }]}>Create Room</Text>
                  <Text style={styles.subtitle}>Start a space for friends</Text>
                </View>
              </View>

              {/* Input Section */}
              <View style={styles.inputSection}>
                <Text style={styles.sectionLabel}>ROOM NAME</Text>
                <View style={styles.inputCard}>
                  <TextInput
                    style={[styles.input, { color: theme.colors.text.primary }]}
                    placeholder="Enter a name..."
                    placeholderTextColor="rgba(255, 255, 255, 0.3)"
                    value={roomName}
                    onChangeText={setRoomName}
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
                  style={styles.cancelButton}
                  activeOpacity={0.7}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleCreate}
                  style={[
                    styles.createButton,
                    {
                      backgroundColor: canCreate ? accent.primary : 'rgba(255, 255, 255, 0.08)',
                    },
                  ]}
                  activeOpacity={0.7}
                  disabled={!canCreate}
                >
                  <Text
                    style={[
                      styles.createButtonText,
                      { color: canCreate ? '#FFFFFF' : 'rgba(255, 255, 255, 0.3)' },
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
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  keyboardView: {
    width: '100%',
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
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  // Header
  headerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
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
    color: 'rgba(255, 255, 255, 0.5)',
  },
  // Input Section
  inputSection: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.8,
    color: 'rgba(255, 255, 255, 0.4)',
    marginBottom: 10,
  },
  inputCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
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
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.5)',
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
