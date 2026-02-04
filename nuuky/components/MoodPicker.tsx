import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Pressable, Modal, Image, ScrollView, TextInput, Dimensions } from 'react-native';
import { Image as CachedImage } from 'expo-image';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { PresetMood, CustomMood, MoodSelfie } from '../types';
import { getMoodImage, getMoodColor, getCustomMoodColor, radius, CUSTOM_MOOD_NEUTRAL_COLOR } from '../lib/theme';
import { useTheme } from '../hooks/useTheme';
import { EmojiInput } from './EmojiInput';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

const MOODS: ReadonlyArray<{ mood: PresetMood; label: string; description: string }> = [
  { mood: 'good', label: 'Feeling good', description: 'Positive and available' },
  { mood: 'neutral', label: 'Neutral', description: 'Just here, nothing special' },
  { mood: 'not_great', label: 'Not great', description: 'Having a rough time' },
  { mood: 'reach_out', label: 'Need support', description: 'Could use some company' },
] as const;

interface MoodPickerProps {
  visible: boolean;
  currentMood: PresetMood;
  onSelectMood: (mood: PresetMood) => void;
  onClose: () => void;
  customMood?: CustomMood | null;
  isCustomMoodActive?: boolean;
  onSelectCustomMood?: () => void;
  onSaveCustomMood?: (emoji: string, text: string, color: string) => void;
  originPoint?: { x: number; y: number };
  moodSelfie?: MoodSelfie | null;
  onCaptureSelfie?: () => Promise<boolean>;
  onPickFromLibrary?: () => Promise<boolean>;
  onDeleteSelfie?: () => void;
  selfieLoading?: boolean;
}

export const MoodPicker: React.FC<MoodPickerProps> = ({
  visible,
  currentMood,
  onSelectMood,
  onClose,
  customMood,
  isCustomMoodActive,
  onSelectCustomMood,
  onSaveCustomMood,
  originPoint,
  moodSelfie,
  onCaptureSelfie,
  onPickFromLibrary,
  onDeleteSelfie,
  selfieLoading,
}) => {
  const { theme, accent } = useTheme();
  const insets = useSafeAreaInsets();

  const [isEditing, setIsEditing] = useState(false);
  const [editEmoji, setEditEmoji] = useState('');
  const [editText, setEditText] = useState('');

  const offsetX = (originPoint?.x ?? SCREEN_W / 2) - SCREEN_W / 2;
  const offsetY = (originPoint?.y ?? SCREEN_H / 2) - SCREEN_H / 2;

  const progress = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      progress.value = withTiming(1, { duration: 250, easing: Easing.out(Easing.cubic) });
      // Reset editing state, pre-fill if custom mood exists
      setIsEditing(false);
      setEditEmoji(customMood?.emoji ?? '');
      setEditText(customMood?.text ?? '');
      // Prefetch selfie image so it's ready immediately
      if (moodSelfie?.image_url) {
        CachedImage.prefetch(moodSelfie.image_url);
      }
    } else {
      progress.value = 0;
    }
  }, [visible]);

  const handleClose = useCallback(() => {
    progress.value = withTiming(0, { duration: 200, easing: Easing.in(Easing.cubic) }, () => {
      runOnJS(onClose)();
    });
  }, [onClose]);

  const handleSelectMood = useCallback((mood: PresetMood) => {
    onSelectMood(mood);
    handleClose();
  }, [onSelectMood, handleClose]);

  const handleStartEditing = useCallback(() => {
    setEditEmoji(customMood?.emoji ?? '');
    setEditText(customMood?.text ?? '');
    setIsEditing(true);
  }, [customMood]);

  const handleSaveCustom = useCallback(() => {
    const cleanedEmoji = editEmoji.trim();
    const cleanedText = editText.trim();
    if (!cleanedEmoji || !cleanedText) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSaveCustomMood?.(cleanedEmoji, cleanedText, CUSTOM_MOOD_NEUTRAL_COLOR);
    setIsEditing(false);
    handleClose();
  }, [editEmoji, editText, onSaveCustomMood, handleClose]);

  const canSave = editEmoji.trim().length > 0 && editText.trim().length > 0;

  // Check if selfie is active (not expired)
  const isSelfieActive = moodSelfie && new Date(moodSelfie.expires_at) > new Date();

  const handleCaptureSelfie = useCallback(async (): Promise<boolean> => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const success = await onCaptureSelfie?.();
    if (success) {
      handleClose();
    }
    return success ?? false;
  }, [onCaptureSelfie, handleClose]);

  const handlePickFromLibrary = useCallback(async (): Promise<boolean> => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const success = await onPickFromLibrary?.();
    if (success) {
      handleClose();
    }
    return success ?? false;
  }, [onPickFromLibrary, handleClose]);

  const handleDeleteSelfie = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onDeleteSelfie?.();
  }, [onDeleteSelfie]);

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
      onRequestClose={handleClose}
      accessibilityViewIsModal={true}
      statusBarTranslucent
    >
      <View style={styles.fullScreen}>
        <Animated.View style={[StyleSheet.absoluteFill, backdropStyle]}>
          <BlurView intensity={50} tint="dark" style={StyleSheet.absoluteFill}>
            <TouchableOpacity
              style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.4)' }]}
              activeOpacity={1}
              onPress={handleClose}
            />
          </BlurView>
        </Animated.View>

        <Animated.View style={[styles.fullScreenContent, animatedStyle]}>
          {/* ScrollView - underneath header */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            bounces={false}
            contentContainerStyle={[
              styles.scrollContent,
              {
                paddingTop: insets.top + 130,
                paddingBottom: insets.bottom + 24,
              },
            ]}
            style={styles.scrollView}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.moodList}>
              {MOODS.map(({ mood, label, description }) => {
                const isSelected = !isCustomMoodActive && currentMood === mood;
                const moodColors = getMoodColor(mood);

                return (
                  <TouchableOpacity
                    key={mood}
                    activeOpacity={0.7}
                    onPress={() => handleSelectMood(mood)}
                    style={[
                      styles.moodCard,
                      { backgroundColor: theme.colors.glass.background, borderColor: theme.colors.glass.border },
                      isSelected && { borderColor: moodColors.base, borderWidth: 2, backgroundColor: moodColors.soft },
                    ]}
                  >
                    <View style={styles.imageWrapper}>
                      <Image source={getMoodImage(mood)} style={styles.moodImage} />
                    </View>
                    <View style={styles.moodText}>
                      <Text style={[styles.moodLabel, { color: theme.colors.text.primary }]}>{label}</Text>
                      <Text style={[styles.moodDescription, { color: theme.colors.text.tertiary }]}>{description}</Text>
                    </View>
                    {isSelected && (
                      <View style={[styles.checkmark, { backgroundColor: moodColors.base, shadowColor: moodColors.base }]}>
                        <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}

              {/* Custom Mood Card — expandable inline editor */}
              <View
                style={[
                  styles.customCard,
                  { backgroundColor: theme.colors.glass.background, borderColor: theme.colors.glass.border },
                  !isEditing && customMood && isCustomMoodActive && {
                    borderColor: accent.primary,
                    borderWidth: 2,
                    backgroundColor: accent.primary + '18',
                  },
                  !isEditing && !customMood && { borderStyle: 'dashed' as const },
                ]}
              >
                {/* Top row: tap to select, edit button */}
                <Pressable
                  style={styles.customTopRow}
                  onPress={() => {
                    if (isEditing) return;
                    if (customMood) {
                      if (!isCustomMoodActive) {
                        onSelectCustomMood?.();
                        handleClose();
                      }
                    } else {
                      handleStartEditing();
                    }
                  }}
                  onLongPress={() => {
                    if (customMood && !isEditing) {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      handleStartEditing();
                    }
                  }}
                  delayLongPress={400}
                >
                  <View style={styles.imageWrapperSmall}>
                    {customMood && !isEditing ? (
                      isSelfieActive && moodSelfie?.image_url ? (
                        <CachedImage source={{ uri: moodSelfie.image_url }} style={styles.selfieImage} cachePolicy="memory-disk" contentFit="cover" />
                      ) : (
                        <Text style={{ fontSize: 42 }}>{customMood.emoji}</Text>
                      )
                    ) : isEditing && editEmoji ? (
                      <Text style={{ fontSize: 42 }}>{editEmoji}</Text>
                    ) : (
                      <Ionicons name="add-circle-outline" size={36} color={theme.colors.text.tertiary} />
                    )}
                  </View>
                  <View style={styles.moodText}>
                    <Text style={[styles.moodLabel, { color: theme.colors.text.primary }]}>
                      {customMood && !isEditing ? customMood.text : 'Custom mood'}
                    </Text>
                    <Text style={[styles.moodDescription, { color: theme.colors.text.tertiary }]}>
                      {customMood && !isEditing ? 'Hold to edit' : 'Pick your own emoji & message'}
                    </Text>
                  </View>
                  {isCustomMoodActive && !isEditing && customMood && (
                    <View style={[styles.checkmark, { backgroundColor: accent.primary, shadowColor: accent.primary }]}>
                      <Ionicons name="checkmark" size={20} color={accent.textOnPrimary} />
                    </View>
                  )}
                </Pressable>

                {/* Expanded editor */}
                {isEditing && (
                  <View style={styles.editorArea}>
                    <View style={styles.editorDivider}>
                      <View style={[styles.dividerLine, { backgroundColor: theme.colors.glass.border }]} />
                    </View>

                    <EmojiInput
                      value={editEmoji}
                      onChangeEmoji={setEditEmoji}
                      onCameraPress={handleCaptureSelfie}
                      onLibraryPress={handlePickFromLibrary}
                      selfieUrl={isSelfieActive ? moodSelfie?.image_url : null}
                      onDeleteSelfie={handleDeleteSelfie}
                      selfieLoading={selfieLoading}
                    />

                    <View style={[styles.textInputCard, { backgroundColor: theme.colors.glass.background, borderColor: theme.colors.glass.border }]}>
                      <TextInput
                        style={[styles.textInput, { color: theme.colors.text.primary }]}
                        value={editText}
                        onChangeText={setEditText}
                        placeholder="How are you feeling?"
                        placeholderTextColor={theme.colors.text.tertiary}
                        maxLength={20}
                        returnKeyType="done"
                      />
                      <Text style={[styles.charCounter, { color: theme.colors.text.tertiary }]}>{editText.length}/20</Text>
                    </View>

                    <View style={styles.editorButtons}>
                      <TouchableOpacity
                        onPress={() => setIsEditing(false)}
                        style={[styles.editorCancel, { backgroundColor: 'rgba(239,68,68,0.12)', borderColor: 'rgba(239,68,68,0.3)' }]}
                        activeOpacity={0.7}
                      >
                        <Text style={{ color: '#EF4444', fontSize: 14, fontWeight: '600' }}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={handleSaveCustom}
                        style={[styles.editorSave, { backgroundColor: canSave ? accent.primary : theme.colors.glass.background }]}
                        activeOpacity={0.7}
                        disabled={!canSave}
                      >
                        <Text style={{ color: canSave ? accent.textOnPrimary : theme.colors.text.tertiary, fontSize: 14, fontWeight: '600' }}>
                          Save & Use
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            </View>
          </ScrollView>

          {/* Header with gradient fade - absolute positioned on top */}
          <LinearGradient
            colors={['rgba(0,0,0,0.95)', 'rgba(0,0,0,0.85)', 'rgba(0,0,0,0.5)', 'transparent']}
            locations={[0, 0.4, 0.7, 1]}
            style={[styles.headerOverlay, { paddingTop: insets.top + 8 }]}
            pointerEvents="box-none"
          >
            <View style={styles.header} pointerEvents="box-none">
              <TouchableOpacity
                style={[styles.closeButton, { backgroundColor: theme.colors.glass.background }]}
                onPress={handleClose}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={22} color={theme.colors.text.primary} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.headerTitle, { color: theme.colors.text.primary }]}>How are you?</Text>
            <Text style={[styles.subtitle, { color: theme.colors.text.tertiary }]}>Your friends will see this</Text>
          </LinearGradient>
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
  },
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingBottom: 20,
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
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
  },
  moodList: {
    gap: 12,
  },
  moodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: 12,
  },
  imageWrapper: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageWrapperSmall: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selfieImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  moodImage: {
    width: 56,
    height: 56,
    resizeMode: 'contain',
  },
  moodText: {
    flex: 1,
  },
  moodLabel: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 3,
    letterSpacing: -0.2,
  },
  moodDescription: {
    fontSize: 12,
    opacity: 0.6,
  },
  checkmark: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
  },
  // Custom mood card
  customCard: {
    borderRadius: radius.md,
    borderWidth: 1,
    padding: 16,
  },
  customTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  // Inline editor
  editorArea: {
    gap: 12,
  },
  editorDivider: {
    paddingVertical: 8,
  },
  dividerLine: {
    height: 1,
  },
  textInputCard: {
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  textInput: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    fontWeight: '500',
  },
  charCounter: {
    fontSize: 11,
    paddingRight: 12,
  },
  editorButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  editorCancel: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  editorSave: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: radius.md,
  },
});
