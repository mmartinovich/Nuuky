import React, { useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { User } from '../types';
import { colors, getMoodColor, getMoodDisplay, spacing, radius } from '../lib/theme';
import { isUserTrulyOnline } from '../lib/utils';

interface FriendOrbProps {
  friend: User;
  onPress: () => void;
}

export const FriendOrb: React.FC<FriendOrbProps> = ({ friend, onPress }) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0.6)).current;

  // Check if user is truly online (handles stale is_online flags from force-closed apps)
  const isOnline = useMemo(
    () => isUserTrulyOnline(isOnline, friend.last_seen_at),
    [isOnline, friend.last_seen_at]
  );

  // Get mood display (handles both preset and custom moods)
  const moodDisplay = getMoodDisplay(friend, friend.custom_mood);
  const moodColors = moodDisplay.type === 'custom' ? moodDisplay.color : getMoodColor(friend.mood);

  useEffect(() => {
    let pulseAnimation: Animated.CompositeAnimation | null = null;

    if (isOnline) {
      // Pulse animation for online friends
      pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(pulseAnim, {
              toValue: 1.15,
              duration: 2000,
              useNativeDriver: true,
            }),
            Animated.timing(glowAnim, {
              toValue: 0.9,
              duration: 2000,
              useNativeDriver: true,
            }),
          ]),
          Animated.parallel([
            Animated.timing(pulseAnim, {
              toValue: 1,
              duration: 2000,
              useNativeDriver: true,
            }),
            Animated.timing(glowAnim, {
              toValue: 0.6,
              duration: 2000,
              useNativeDriver: true,
            }),
          ]),
        ])
      );
      pulseAnimation.start();
    }

    // Cleanup on unmount
    return () => {
      pulseAnimation?.stop();
    };
  }, [isOnline]);

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={styles.container}
    >
      <View style={styles.orbWrapper}>
        {/* Outer glow */}
        <Animated.View
          style={[
            styles.outerGlow,
            {
              backgroundColor: moodColors.glow,
              opacity: isOnline ? glowAnim : 0.3,
              transform: [{ scale: isOnline ? pulseAnim : 1 }],
            },
          ]}
        />

        {/* Middle glow */}
        <Animated.View
          style={[
            styles.middleGlow,
            {
              backgroundColor: moodColors.glow,
              opacity: isOnline ? 0.5 : 0.2,
              transform: [{ scale: isOnline ? pulseAnim : 1 }],
            },
          ]}
        />

        {/* Core orb */}
        <View
          style={[
            styles.orb,
            {
              backgroundColor: moodColors.base,
              opacity: isOnline ? 1 : 0.5,
            },
          ]}
        >
          {/* Custom mood emoji */}
          {moodDisplay.type === 'custom' && (
            <Text style={styles.customEmoji}>{moodDisplay.emoji}</Text>
          )}
        </View>

        {/* Online indicator */}
        {isOnline && (
          <View style={styles.onlineRing}>
            <View
              style={[
                styles.onlineDot,
                { backgroundColor: moodColors.base },
              ]}
            />
          </View>
        )}
      </View>

      {/* Friend name */}
      <Text style={styles.name} numberOfLines={1}>
        {friend.display_name}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  orbWrapper: {
    width: 90,
    height: 90,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  outerGlow: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 45,
  },
  middleGlow: {
    position: 'absolute',
    width: 70,
    height: 70,
    borderRadius: 35,
  },
  orb: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customEmoji: {
    fontSize: 28,
    textAlign: 'center',
  },
  onlineRing: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.bg.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  onlineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  name: {
    fontSize: 13,
    color: colors.text.secondary,
    maxWidth: 90,
    textAlign: 'center',
  },
});
