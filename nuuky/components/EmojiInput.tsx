import React, { useRef, useState } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, ScrollView, TextInput, Keyboard, ActionSheetIOS, Platform, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image as CachedImage } from 'expo-image';
import { spacing, radius } from '../lib/theme';
import { useTheme } from '../hooks/useTheme';

const POPULAR_EMOJIS = [
  '😊', '😎', '🥳', '😴', '🤔', '😤', '🥺', '❤️',
  '🔥', '✨', '💪', '🎉', '🌟', '💯', '🙏', '👋',
  '☕', '🎮', '📚', '💼', '🏃', '🎵', '🌈', '⚡',
];

interface EmojiInputProps {
  value: string;
  onChangeEmoji: (emoji: string) => void;
  placeholder?: string;
  // Selfie props
  onCameraPress?: () => Promise<boolean> | void;
  onLibraryPress?: () => Promise<boolean> | void;
  selfieUrl?: string | null;
  onDeleteSelfie?: () => void;
  selfieLoading?: boolean;
}

export const EmojiInput: React.FC<EmojiInputProps> = ({
  value,
  onChangeEmoji,
  onCameraPress,
  onLibraryPress,
  selfieUrl,
  onDeleteSelfie,
  selfieLoading,
}) => {
  const { theme } = useTheme();
  const inputRef = useRef<TextInput>(null);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  const hasSelfie = !!selfieUrl;

  const handleChangeText = (text: string) => {
    if (text.length > 0) {
      const emojiRegex = /\p{Extended_Pictographic}(\u200D\p{Extended_Pictographic}|\uFE0F)*/gu;
      const matches = [...text.matchAll(emojiRegex)];
      const lastEmoji = matches[matches.length - 1]?.[0];
      if (lastEmoji) {
        onChangeEmoji(lastEmoji);
        Keyboard.dismiss();
        setIsKeyboardOpen(false);
        return;
      }
    }
    setTimeout(() => {
      inputRef.current?.setNativeProps({ text: '' });
    }, 0);
  };

  const handleOpenKeyboard = () => {
    setIsKeyboardOpen(true);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  const handlePhotoPress = () => {
    if (hasSelfie) {
      onDeleteSelfie?.();
      return;
    }

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Take Photo', 'Choose from Library', 'Cancel'],
          cancelButtonIndex: 2,
        },
        (buttonIndex) => {
          if (buttonIndex === 0) onCameraPress?.();
          if (buttonIndex === 1) onLibraryPress?.();
        }
      );
    } else {
      // Android fallback using Alert
      Alert.alert(
        'Add Photo',
        undefined,
        [
          { text: 'Take Photo', onPress: () => onCameraPress?.() },
          { text: 'Choose from Library', onPress: () => onLibraryPress?.() },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        {/* Single photo button with action sheet */}
        {(onCameraPress || onLibraryPress) && (
          <TouchableOpacity
            style={[
              styles.selectedBox,
              { backgroundColor: theme.colors.glass.background, borderColor: theme.colors.glass.border },
              hasSelfie && { borderColor: '#EC4899', borderWidth: 2, backgroundColor: '#EC4899' },
            ]}
            onPress={handlePhotoPress}
            activeOpacity={0.7}
            disabled={selfieLoading}
            accessibilityLabel={hasSelfie ? 'Remove photo' : 'Add photo to mood'}
            accessibilityHint={hasSelfie ? 'Tap to remove attached photo' : 'Opens options to take a photo or choose from library'}
            accessibilityRole="button"
          >
            {hasSelfie ? (
              <View style={styles.selfieContainer}>
                <CachedImage
                  source={{ uri: selfieUrl! }}
                  style={styles.selfiePreview}
                  contentFit="cover"
                />
                <View style={styles.selfieDeleteHint}>
                  <Ionicons name="close" size={10} color="#FFF" />
                </View>
              </View>
            ) : (
              <Ionicons
                name={selfieLoading ? 'hourglass-outline' : 'camera'}
                size={24}
                color={theme.colors.text.primary}
              />
            )}
          </TouchableOpacity>
        )}

        {/* Selected emoji box */}
        <TouchableOpacity
          style={[
            styles.selectedBox,
            { backgroundColor: theme.colors.glass.background, borderColor: theme.colors.glass.border },
          ]}
          onPress={handleOpenKeyboard}
          activeOpacity={0.7}
        >
          {value ? (
            <Text style={styles.selectedEmoji}>{value}</Text>
          ) : (
            <Ionicons name="keypad-outline" size={24} color={theme.colors.text.tertiary} />
          )}
        </TouchableOpacity>

        {/* Emoji grid */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.emojiGrid}
          keyboardShouldPersistTaps="always"
        >
          {POPULAR_EMOJIS.map((emoji) => (
            <TouchableOpacity
              key={emoji}
              style={[
                styles.emojiButton,
                { backgroundColor: theme.colors.glass.background },
                value === emoji && !hasSelfie && {
                  backgroundColor: theme.colors.accent.primary + '4D',
                  borderWidth: 2,
                  borderColor: theme.colors.accent.primary,
                },
              ]}
              onPress={() => onChangeEmoji(emoji)}
              activeOpacity={0.7}
            >
              <Text style={styles.emojiText}>{emoji}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {isKeyboardOpen && (
        <TextInput
          ref={inputRef}
          style={[styles.keyboardInput, { backgroundColor: theme.colors.glass.background, borderColor: theme.colors.glass.border, color: theme.colors.text.primary }]}
          onChangeText={handleChangeText}
          autoCorrect={false}
          placeholder="Tap 🌐 for emojis"
          placeholderTextColor={theme.colors.text.tertiary}
          autoFocus
          onBlur={() => setIsKeyboardOpen(false)}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  selectedBox: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedEmoji: {
    fontSize: 32,
  },
  keyboardInput: {
    marginTop: spacing.xs,
    height: 40,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 16,
  },
  emojiGrid: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  emojiButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiText: {
    fontSize: 24,
  },
  selfieContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  selfiePreview: {
    width: '100%',
    height: '100%',
    borderRadius: radius.md - 2,
  },
  selfieDeleteHint: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
