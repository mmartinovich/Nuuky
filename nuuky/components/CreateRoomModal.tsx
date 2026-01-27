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
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../hooks/useTheme';

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
  const { theme, isDark } = useTheme();
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
      <BlurView
        intensity={isDark ? 60 : 40}
        tint={theme.colors.blurTint}
        style={styles.overlay}
      >
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
            <View
              style={[
                styles.modal,
                {
                  backgroundColor: theme.colors.bg.secondary,
                  borderColor: theme.colors.glass.border,
                },
              ]}
            >
              {/* Header Row */}
              <View style={styles.headerRow}>
                <View style={styles.iconContainer}>
                  <Ionicons name="home" size={24} color={theme.colors.neon.cyan} />
                </View>
                <View style={styles.headerText}>
                  <Text style={[styles.title, { color: theme.colors.text.primary }]}>
                    Create Room
                  </Text>
                  <Text style={[styles.subtitle, { color: theme.colors.text.tertiary }]}>
                    Start a space for friends
                  </Text>
                </View>
              </View>

              {/* Input */}
              <View
                style={[
                  styles.inputContainer,
                  { backgroundColor: 'rgba(255, 255, 255, 0.05)' },
                ]}
              >
                <TextInput
                  style={[styles.input, { color: theme.colors.text.primary }]}
                  placeholder="Room name"
                  placeholderTextColor={theme.colors.text.tertiary}
                  value={roomName}
                  onChangeText={setRoomName}
                  maxLength={30}
                  autoCorrect={false}
                  autoCapitalize="words"
                  autoFocus
                />
              </View>

              {/* Buttons */}
              <View style={styles.buttons}>
                <TouchableOpacity
                  onPress={handleCancel}
                  style={[
                    styles.button,
                    {
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      borderColor: 'rgba(255, 255, 255, 0.1)',
                    },
                  ]}
                  activeOpacity={0.7}
                >
                  <Ionicons name="close" size={18} color={theme.colors.text.secondary} style={styles.buttonIcon} />
                  <Text style={[styles.buttonText, { color: theme.colors.text.secondary }]}>
                    Cancel
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleCreate}
                  style={[
                    styles.button,
                    {
                      backgroundColor: canCreate ? 'rgba(50, 213, 131, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                      borderColor: canCreate ? 'rgba(50, 213, 131, 0.4)' : 'rgba(255, 255, 255, 0.1)',
                    },
                  ]}
                  activeOpacity={0.7}
                  disabled={!canCreate}
                >
                  <Ionicons
                    name="checkmark"
                    size={18}
                    color={canCreate ? '#32D583' : theme.colors.text.tertiary}
                    style={styles.buttonIcon}
                  />
                  <Text
                    style={[
                      styles.buttonText,
                      { color: canCreate ? '#32D583' : theme.colors.text.tertiary },
                    ]}
                  >
                    Create
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>
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
  },
  keyboardView: {
    width: '100%',
    alignItems: 'center',
  },
  modalContainer: {
    width: SCREEN_WIDTH - 48,
    maxWidth: 360,
  },
  modal: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 240, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: -0.3,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '400',
  },
  inputContainer: {
    borderRadius: 12,
    marginBottom: 16,
  },
  input: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontWeight: '500',
  },
  buttons: {
    flexDirection: 'row',
    gap: 10,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  buttonIcon: {
    marginRight: 6,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
