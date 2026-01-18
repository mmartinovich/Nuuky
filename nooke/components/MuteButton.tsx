import React from 'react';
import {
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../hooks/useTheme';
import { radius } from '../lib/theme';

interface MuteButtonProps {
  isMuted: boolean;
  isConnecting: boolean;
  onPress: () => void;
  size?: number;
}

export const MuteButton: React.FC<MuteButtonProps> = ({
  isMuted,
  isConnecting,
  onPress,
  size = 64,
}) => {
  const { theme, isDark } = useTheme();

  const handlePress = () => {
    console.log('[MuteButton] Button pressed', { isMuted, isConnecting });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    console.log('[MuteButton] Calling onPress handler');
    onPress();
    console.log('[MuteButton] onPress handler called');
  };

  const iconSize = size * 0.45;

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.8}
      disabled={isConnecting}
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderColor: !isMuted ? theme.colors.neon.green : theme.colors.glass.border,
        },
      ]}
    >
      <BlurView
        intensity={isDark ? 30 : 15}
        tint={theme.colors.blurTint}
        style={[
          styles.blur,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
          },
        ]}
      >
        {isConnecting ? (
          <ActivityIndicator size="small" color={theme.colors.text.primary} />
        ) : (
          <Ionicons
            name={isMuted ? 'mic-off' : 'mic'}
            size={iconSize}
            color={isMuted ? theme.colors.text.tertiary : theme.colors.neon.green}
          />
        )}
      </BlurView>

      {/* Glow effect when unmuted */}
      {!isMuted && !isConnecting && (
        <View
          style={[
            styles.glow,
            { backgroundColor: 'rgba(57, 255, 20, 0.15)' },
          ]}
          pointerEvents="none"
        />
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    overflow: 'hidden',
  },
  blur: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  glow: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: radius.full,
  },
});
