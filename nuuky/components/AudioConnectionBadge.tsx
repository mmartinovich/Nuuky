import React from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { radius } from '../lib/theme';
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
        <Ionicons name={config.icon} size={16} color={config.color} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 32,
    height: 32,
    borderRadius: radius.full,
    borderWidth: 1,
  },
});
