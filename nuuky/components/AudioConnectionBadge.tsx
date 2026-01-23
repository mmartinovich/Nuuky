import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { typography, spacing, radius } from '../lib/theme';
import { AudioConnectionStatus } from '../types';

interface AudioConnectionBadgeProps {
  status: AudioConnectionStatus;
}

export const AudioConnectionBadge: React.FC<AudioConnectionBadgeProps> = ({
  status,
}) => {
  const { theme } = useTheme();

  const getStatusConfig = () => {
    switch (status) {
      case 'connected':
        return {
          icon: 'mic' as const,
          color: theme.colors.neon.green,
          text: 'Audio Active',
          showSpinner: false,
        };
      case 'connecting':
        return {
          icon: 'mic-outline' as const,
          color: theme.colors.mood.neutral.base,
          text: 'Connecting...',
          showSpinner: true,
        };
      case 'reconnecting':
        return {
          icon: 'sync' as const,
          color: theme.colors.mood.notGreat.base,
          text: 'Reconnecting...',
          showSpinner: true,
        };
      case 'error':
        return {
          icon: 'warning' as const,
          color: theme.colors.mood.reachOut.base,
          text: 'Connection Error',
          showSpinner: false,
        };
      default:
        return null;
    }
  };

  const config = getStatusConfig();
  if (!config) return null;

  return (
    <View
      style={[
        styles.container,
        {
          borderColor: config.color,
          backgroundColor: theme.colors.glass.background,
        },
      ]}
    >
      {config.showSpinner ? (
        <ActivityIndicator size="small" color={config.color} />
      ) : (
        <Ionicons name={config.icon} size={14} color={config.color} />
      )}
      <Text style={[styles.text, { color: config.color }]}>{config.text}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    borderWidth: 1,
    gap: spacing.xs,
  },
  text: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.medium as any,
  },
});
