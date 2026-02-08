import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { SOUND_METADATA } from '../lib/soundPlayer';
import { ReceivedReaction } from '../hooks/useSoundReactions';

interface SoundReactionToastProps {
  reactions: ReceivedReaction[];
  topInset: number;
  theme: any;
}

interface ToastItemProps {
  reaction: ReceivedReaction;
  index: number;
  theme: any;
}

const ToastItem: React.FC<ToastItemProps> = ({ reaction, index, theme }) => {
  const translateY = useRef(new Animated.Value(-50)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    // Animate in
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        tension: 100,
        friction: 10,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        tension: 100,
        friction: 10,
        useNativeDriver: true,
      }),
    ]).start();

    // Animate out before removal (handled by parent timer)
    const fadeOutTimer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: -20,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }, 2700); // Start fade 300ms before removal

    return () => clearTimeout(fadeOutTimer);
  }, []);

  const metadata = SOUND_METADATA[reaction.soundId];

  return (
    <Animated.View
      style={[
        styles.toastItem,
        {
          backgroundColor: theme.colors.bg.secondary,
          borderColor: theme.colors.border.primary,
          transform: [
            { translateY },
            { scale },
          ],
          opacity,
          marginTop: index > 0 ? 8 : 0,
        },
      ]}
    >
      {reaction.senderAvatarUrl ? (
        <Image
          source={{ uri: reaction.senderAvatarUrl }}
          style={styles.avatar}
        />
      ) : (
        <View style={[styles.avatarPlaceholder, { backgroundColor: theme.colors.bg.tertiary }]}>
          <Text style={styles.avatarInitial}>
            {reaction.senderName.charAt(0).toUpperCase()}
          </Text>
        </View>
      )}
      <Ionicons name={metadata.icon as any} size={18} color="#FFFFFF" style={styles.icon} />
      <Text style={[styles.message, { color: theme.colors.text.primary }]} numberOfLines={1}>
        <Text style={styles.senderName}>{reaction.senderName}</Text>
        {' sent '}
        <Text style={styles.soundName}>{metadata.label}</Text>
      </Text>
    </Animated.View>
  );
};

export const SoundReactionToast: React.FC<SoundReactionToastProps> = ({
  reactions,
  topInset,
  theme,
}) => {
  if (reactions.length === 0) return null;

  // Show max 3 toasts at once
  const visibleReactions = reactions.slice(-3);

  return (
    <View style={[styles.container, { top: topInset + 60 }]} pointerEvents="none">
      {visibleReactions.map((reaction, index) => (
        <ToastItem
          key={reaction.id}
          reaction={reaction}
          index={index}
          theme={theme}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    alignItems: 'center',
    zIndex: 90,
  },
  toastItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 24,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
    maxWidth: 280,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 8,
  },
  avatarPlaceholder: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  icon: {
    marginRight: 8,
  },
  message: {
    fontSize: 13,
    flex: 1,
  },
  senderName: {
    fontWeight: '600',
  },
  soundName: {
    fontWeight: '600',
  },
});
