import React, { memo } from 'react';
import { View, Text, Image, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { spacing, typography } from '../../lib/theme';
import { useTheme } from '../../hooks/useTheme';

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface AvatarProps {
  uri?: string | null;
  name?: string;
  size?: AvatarSize;
  showOnlineIndicator?: boolean;
  isOnline?: boolean;
  style?: ViewStyle;
}

const SIZE_MAP: Record<AvatarSize, number> = {
  xs: 24,
  sm: 32,
  md: 44,
  lg: 60,
  xl: 80,
};

const FONT_SIZE_MAP: Record<AvatarSize, number> = {
  xs: 10,
  sm: 12,
  md: 16,
  lg: 22,
  xl: 28,
};

const INDICATOR_SIZE_MAP: Record<AvatarSize, number> = {
  xs: 8,
  sm: 10,
  md: 12,
  lg: 14,
  xl: 16,
};

const getInitials = (name?: string): string => {
  if (!name) return '?';
  const parts = name.trim().split(' ');
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

export const Avatar: React.FC<AvatarProps> = memo(({
  uri,
  name,
  size = 'md',
  showOnlineIndicator = false,
  isOnline = false,
  style,
}) => {
  const { theme } = useTheme();
  const dimension = SIZE_MAP[size];
  const fontSize = FONT_SIZE_MAP[size];
  const indicatorSize = INDICATOR_SIZE_MAP[size];
  const initials = getInitials(name);

  return (
    <View
      style={[
        styles.container,
        { width: dimension, height: dimension, borderRadius: dimension / 2 },
        style,
      ]}
      accessibilityLabel={`Avatar for ${name || 'user'}`}
      accessibilityRole="image"
    >
      {uri ? (
        <Image
          source={{ uri }}
          style={[
            styles.image,
            { width: dimension, height: dimension, borderRadius: dimension / 2 },
          ]}
        />
      ) : (
        <LinearGradient
          colors={theme.gradients.button as [string, string]}
          style={[
            styles.fallback,
            { width: dimension, height: dimension, borderRadius: dimension / 2 },
          ]}
        >
          <Text style={[styles.initials, { fontSize, color: theme.colors.text.primary }]}>{initials}</Text>
        </LinearGradient>
      )}

      {showOnlineIndicator && (
        <View
          style={[
            styles.indicator,
            {
              width: indicatorSize,
              height: indicatorSize,
              borderRadius: indicatorSize / 2,
              backgroundColor: isOnline ? theme.colors.mood.good.base : theme.colors.text.tertiary,
              borderWidth: indicatorSize > 10 ? 2 : 1.5,
              borderColor: theme.colors.bg.primary,
            },
          ]}
          accessibilityLabel={isOnline ? 'Online' : 'Offline'}
        />
      )}
    </View>
  );
});

Avatar.displayName = 'Avatar';

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  image: {
    resizeMode: 'cover',
  },
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    fontWeight: typography.weight.bold as any,
  },
  indicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
  },
});

export default Avatar;
