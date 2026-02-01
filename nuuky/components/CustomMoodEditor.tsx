import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EmojiInput } from './EmojiInput';
import { radius, CUSTOM_MOOD_NEUTRAL_COLOR } from '../lib/theme';
import { useTheme } from '../hooks/useTheme';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

interface CustomMoodEditorProps {
  visible: boolean;
  onSave: (emoji: string, text: string, color: string) => void;
  onClose: () => void;
  onBack?: () => void;
  initialEmoji?: string;
  initialText?: string;
  originPoint?: { x: number; y: number };
}

export const CustomMoodEditor: React.FC<CustomMoodEditorProps> = ({
  visible,
  onSave,
  onClose,
  onBack,
  initialEmoji = '',
  initialText = '',
  originPoint,
}) => {
  const { theme, accent } = useTheme();
  const insets = useSafeAreaInsets();
  const [emoji, setEmoji] = useState(initialEmoji);
  const [text, setText] = useState(initialText);

  const offsetX = (originPoint?.x ?? SCREEN_W / 2) - SCREEN_W / 2;
  const offsetY = (originPoint?.y ?? SCREEN_H / 2) - SCREEN_H / 2;

  const progress = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      setEmoji(initialEmoji);
      setText(initialText);
      progress.value = withTiming(1, { duration: 300, easing: Easing.linear });
    } else {
      progress.value = 0;
    }
  }, [visible]);

  const handleBack = useCallback(() => {
    progress.value = withTiming(0, { duration: 200, easing: Easing.linear }, () => {
      if (onBack) {
        runOnJS(onBack)();
      } else {
        runOnJS(onClose)();
      }
    });
  }, [onBack, onClose]);

  const canSave = emoji.trim().length > 0 && text.trim().length > 0;

  const handleSave = () => {
    const cleanedEmoji = emoji.trim();

    if (!cleanedEmoji) {
      Alert.alert('Missing Emoji', 'Please select an emoji');
      return;
    }

    if (!text || text.trim().length < 1) {
      Alert.alert('Missing Message', 'Please add a status message');
      return;
    }

    if (text.length > 50) {
      Alert.alert('Message Too Long', 'Status message must be 50 characters or less');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSave(cleanedEmoji, text.trim(), CUSTOM_MOOD_NEUTRAL_COLOR);
    progress.value = withTiming(0, { duration: 200, easing: Easing.linear }, () => {
      runOnJS(onClose)();
    });
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
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleBack}
      statusBarTranslucent
    >
      <View style={styles.fullScreen}>
        {/* Blurred backdrop */}
        <Animated.View style={[StyleSheet.absoluteFill, backdropStyle]}>
          <BlurView intensity={50} tint="dark" style={StyleSheet.absoluteFill}>
            <TouchableOpacity
              style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.4)' }]}
              activeOpacity={1}
              onPress={handleBack}
            />
          </BlurView>
        </Animated.View>

        {/* Content */}
        <Animated.View style={[styles.fullScreenContent, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 8 }, animatedStyle]}>
          {/* Header with X button */}
          <View style={styles.header}>
            <TouchableOpacity
              style={[styles.closeButton, { backgroundColor: theme.colors.glass.background }]}
              onPress={handleBack}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={22} color={theme.colors.text.primary} />
            </TouchableOpacity>
          </View>

          {/* Title */}
          <Text style={[styles.headerTitle, { color: theme.colors.text.primary }]}>Custom Mood</Text>
          <Text style={[styles.subtitle, { color: theme.colors.text.tertiary }]}>Make it yours!</Text>

          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.formArea}
          >
            {/* Emoji Input */}
            <View style={styles.inputSection}>
              <EmojiInput
                value={emoji}
                onChangeEmoji={setEmoji}
              />
            </View>

            {/* Status Message */}
            <View style={styles.inputSection}>
              <Text style={[styles.sectionLabel, { color: theme.colors.text.tertiary }]}>STATUS MESSAGE</Text>
              <View style={[styles.inputCard, { backgroundColor: theme.colors.glass.background, borderColor: theme.colors.glass.border }]}>
                <TextInput
                  style={[styles.input, { color: theme.colors.text.primary }]}
                  value={text}
                  onChangeText={setText}
                  placeholder="How are you feeling?"
                  placeholderTextColor={theme.colors.text.tertiary}
                  maxLength={50}
                  returnKeyType="done"
                />
              </View>
              <Text style={[styles.charCount, { color: theme.colors.text.tertiary }]}>{text.length}/50</Text>
            </View>

            {/* Buttons */}
            <View style={styles.buttons}>
              <TouchableOpacity
                onPress={handleBack}
                style={[styles.cancelButton, { backgroundColor: 'rgba(239, 68, 68, 0.12)', borderColor: 'rgba(239, 68, 68, 0.3)' }]}
                activeOpacity={0.7}
              >
                <Text style={[styles.cancelButtonText, { color: '#EF4444' }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSave}
                style={[
                  styles.saveButton,
                  { backgroundColor: canSave ? accent.primary : theme.colors.glass.background },
                ]}
                activeOpacity={0.7}
                disabled={!canSave}
              >
                <Text
                  style={[
                    styles.saveButtonText,
                    { color: canSave ? accent.textOnPrimary : theme.colors.text.tertiary },
                  ]}
                >
                  Save & Use
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
  headerTitle: {
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 24,
  },
  formArea: {
    flex: 1,
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
  charCount: {
    fontSize: 11,
    marginTop: 4,
    textAlign: 'right',
  },
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
  saveButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: radius.md,
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
