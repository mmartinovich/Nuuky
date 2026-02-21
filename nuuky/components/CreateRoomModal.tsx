import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../hooks/useTheme';
import { radius } from '../lib/theme';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

interface CreateRoomModalProps {
  visible: boolean;
  onClose: () => void;
  onCreate: (name?: string, isPrivate?: boolean) => void;
  originPoint?: { x: number; y: number };
}

export const CreateRoomModal: React.FC<CreateRoomModalProps> = ({
  visible,
  onClose,
  onCreate,
  originPoint,
}) => {
  const { theme, accent } = useTheme();
  const insets = useSafeAreaInsets();
  const [roomName, setNuukName] = useState('');
  const creatingRef = useRef(false);

  const offsetX = (originPoint?.x ?? SCREEN_W / 2) - SCREEN_W / 2;
  const offsetY = (originPoint?.y ?? SCREEN_H / 2) - SCREEN_H / 2;

  const progress = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      progress.value = withTiming(1, { duration: 250, easing: Easing.out(Easing.cubic) });
    } else {
      progress.value = 0;
    }
  }, [visible]);

  const handleClose = useCallback(() => {
    progress.value = withTiming(0, { duration: 200, easing: Easing.in(Easing.cubic) }, () => {
      runOnJS(onClose)();
    });
  }, [onClose]);

  const canCreate = roomName.trim().length > 0;

  const handleCreate = () => {
    if (!canCreate || creatingRef.current) return;
    creatingRef.current = true;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onCreate(roomName.trim(), true);
    setNuukName('');
    handleClose();
    // Reset after a short delay to allow the close animation to finish
    setTimeout(() => { creatingRef.current = false; }, 500);
  };

  const handleCancel = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setNuukName('');
    handleClose();
  };

  const animatedStyle = useAnimatedStyle(() => {
    const p = progress.value;
    return {
      opacity: p,
      transform: [
        { translateX: offsetX * (1 - p) },
        { translateY: offsetY * (1 - p) },
        { scale: 0.3 + p * 0.7 },
      ],
    };
  });

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
  }));

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose} statusBarTranslucent>
      <View style={styles.fullScreen}>
        {/* Blurred backdrop */}
        <Animated.View style={[StyleSheet.absoluteFill, backdropStyle]}>
          <BlurView intensity={50} tint="dark" style={StyleSheet.absoluteFill}>
            <TouchableOpacity
              style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.4)' }]}
              activeOpacity={1}
              onPress={handleCancel}
            />
          </BlurView>
        </Animated.View>

        {/* Fullscreen content */}
        <Animated.View style={[styles.fullScreenContent, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 8 }, animatedStyle]}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardView}
          >
            {/* Header with X button */}
            <View style={styles.header}>
              <TouchableOpacity
                style={[styles.closeButton, { backgroundColor: theme.colors.glass.background }]}
                onPress={handleCancel}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={22} color={theme.colors.text.primary} />
              </TouchableOpacity>
            </View>

            {/* Title */}
            <Text style={[styles.title, { color: theme.colors.text.primary }]}>Create Room</Text>
            <Text style={[styles.subtitle, { color: theme.colors.text.tertiary }]}>Start a room with friends</Text>

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
                style={[styles.cancelBtn, { backgroundColor: 'rgba(255,59,48,0.12)', borderColor: 'rgba(255,59,48,0.3)' }]}
                activeOpacity={0.7}
              >
                <Text style={[styles.cancelBtnText, { color: '#FF3B30' }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleCreate}
                style={[
                  styles.createBtn,
                  { backgroundColor: canCreate ? accent.primary : theme.colors.glass.background },
                ]}
                activeOpacity={0.7}
                disabled={!canCreate}
              >
                <Text
                  style={[
                    styles.createBtnText,
                    { color: canCreate ? accent.textOnPrimary : theme.colors.text.tertiary },
                  ]}
                >
                  Create
                </Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  fullScreen: {
    flex: 1,
  },
  fullScreenContent: {
    flex: 1,
    paddingHorizontal: 24,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#999',
    marginBottom: 32,
  },
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
  buttons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
  createBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: radius.md,
  },
  createBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
