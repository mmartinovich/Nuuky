import React, { useEffect, useRef, useMemo } from 'react';
import { View, StyleSheet, Dimensions, TouchableOpacity, Animated, Easing, Text, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { User } from '../types';
import { getMoodColor } from '../lib/theme';
import { useLowPowerMode } from '../stores/appStore';
import { isUserTrulyOnline } from '../lib/utils';

const { width, height } = Dimensions.get('window');
const CENTER_X = width / 2;
const CENTER_Y = height / 2;
const PARTICLE_SIZE = 60;

// Track active listeners by friend ID to prevent accumulation
const activeListeners = new Map<string, { orbitListener: string; localListener: string; cleanup: () => void }>();

interface FriendParticleProps {
  friend: User;
  index: number;
  total: number;
  onPress: () => void;
  hasActiveFlare: boolean;
  position: { x: number; y: number };
  baseAngle: number;
  radius: number;
  orbitAngle: Animated.Value;
}

export function FriendParticle({
  friend,
  index,
  total,
  onPress,
  hasActiveFlare,
  position,
  baseAngle,
  radius,
  orbitAngle,
}: FriendParticleProps) {
  const lowPowerMode = useLowPowerMode();

  // Check if user is truly online (handles stale is_online flags from force-closed apps)
  const isOnline = useMemo(
    () => isUserTrulyOnline(friend.is_online, friend.last_seen_at),
    [friend.is_online, friend.last_seen_at]
  );
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const flareAnim = useRef(new Animated.Value(0)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;

  const centerX = CENTER_X;
  const centerY = CENTER_Y;

  // Local oscillation for organic floating movement
  const localOrbitAnim = useRef(new Animated.Value(0)).current;
  
  // Use Animated.Value for positions to avoid React re-renders
  const translateXAnim = useRef(new Animated.Value(Math.cos(baseAngle) * radius)).current;
  const translateYAnim = useRef(new Animated.Value(Math.sin(baseAngle) * radius)).current;
  const lastUpdateTime = useRef(Date.now());
  const localOffsetRef = useRef(0);

  // Start gentle oscillation animation for organic floating
  // Optimized: Longer duration = fewer updates = better battery
  // Low power mode disables this animation entirely
  useEffect(() => {
    // Skip oscillation animation in low power mode
    if (lowPowerMode) {
      localOrbitAnim.setValue(0);
      return;
    }

    const oscillationAmplitude = 0.08; // Radians - reduced for subtlety
    const oscillationDuration = 12000 + (index * 3000); // 12-27 seconds (slower = less battery)
    const startDirection = index % 2 === 0 ? 1 : -1;

    // Smooth oscillation loop - longer duration for battery optimization
    Animated.loop(
      Animated.sequence([
        Animated.timing(localOrbitAnim, {
          toValue: oscillationAmplitude * startDirection,
          duration: oscillationDuration / 2,
          easing: Easing.sin,
          useNativeDriver: false, // Required for position calculation
        }),
        Animated.timing(localOrbitAnim, {
          toValue: -oscillationAmplitude * startDirection,
          duration: oscillationDuration,
          easing: Easing.sin,
          useNativeDriver: false,
        }),
        Animated.timing(localOrbitAnim, {
          toValue: 0,
          duration: oscillationDuration / 2,
          easing: Easing.sin,
          useNativeDriver: false,
        }),
      ])
    ).start();

    return () => {
      localOrbitAnim.stopAnimation();
    };
  }, [index, lowPowerMode]);

  // Update position when orbit angle or local oscillation changes
  // Uses setValue instead of setState to avoid React re-renders (60fps without lag)
  useEffect(() => {
    const friendId = friend.id;

    // Clean up any existing listeners for this friend before adding new ones
    if (activeListeners.has(friendId)) {
      activeListeners.get(friendId)?.cleanup();
      activeListeners.delete(friendId);
    }

    // Cache last computed values to skip unnecessary updates
    let lastComputedX = Math.cos(baseAngle) * radius;
    let lastComputedY = Math.sin(baseAngle) * radius;
    let pendingUpdate = false;

    const updatePosition = () => {
      // Batch updates using requestAnimationFrame for smoother rendering
      if (pendingUpdate) return;
      pendingUpdate = true;

      requestAnimationFrame(() => {
        pendingUpdate = false;
        const parentAngle = (orbitAngle as any)._value || 0;
        const localOffset = lowPowerMode ? 0 : ((localOrbitAnim as any)._value || 0);

        // Combine parent orbit rotation with local oscillation
        const angle = baseAngle + parentAngle + localOffset;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;

        // Only update if position actually changed (avoid unnecessary setValue calls)
        const dx = Math.abs(x - lastComputedX);
        const dy = Math.abs(y - lastComputedY);
        if (dx > 0.5 || dy > 0.5) {
          lastComputedX = x;
          lastComputedY = y;
          translateXAnim.setValue(x);
          translateYAnim.setValue(y);
        }
        localOffsetRef.current = localOffset;
      });
    };

    const orbitListener = orbitAngle.addListener(updatePosition);
    // Only add local listener if not in low power mode (oscillation disabled anyway)
    const localListener = lowPowerMode ? null : localOrbitAnim.addListener(updatePosition);

    const cleanup = () => {
      orbitAngle.removeListener(orbitListener);
      if (localListener) localOrbitAnim.removeListener(localListener);
      activeListeners.delete(friendId);
    };

    activeListeners.set(friendId, { orbitListener, localListener: localListener || '', cleanup });

    return cleanup;
  }, [friend.id, baseAngle, radius, orbitAngle, localOrbitAnim, lowPowerMode]);

  // Lightweight animations - native-driven for performance
  // Disabled in low power mode
  useEffect(() => {
    // Skip animations in low power mode
    if (lowPowerMode) {
      bounceAnim.setValue(0);
      pulseAnim.setValue(0);
      return;
    }

    // Very subtle bounce - minimal overhead
    const bounceAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(bounceAnim, {
          toValue: 1,
          duration: 3000 + index * 300,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
        Animated.timing(bounceAnim, {
          toValue: 0,
          duration: 3000 + index * 300,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
      ])
    );
    bounceAnimation.start();

    // Gentle pulse for online friends only
    let pulseAnimation: Animated.CompositeAnimation | null = null;
    if (isOnline) {
      pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 2000,
            easing: Easing.ease,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0,
            duration: 2000,
            easing: Easing.ease,
            useNativeDriver: true,
          }),
        ])
      );
      pulseAnimation.start();
    }

    // Cleanup on unmount
    return () => {
      bounceAnimation.stop();
      pulseAnimation?.stop();
    };
  }, [isOnline, index, lowPowerMode]);

  useEffect(() => {
    let flareAnimation: Animated.CompositeAnimation | null = null;
    
    if (hasActiveFlare) {
      flareAnimation = Animated.loop(
        Animated.timing(flareAnim, {
          toValue: 1,
          duration: 350,
          easing: Easing.ease,
          useNativeDriver: true,
        })
      );
      flareAnimation.start();
    } else {
      flareAnim.setValue(0);
    }

    // Cleanup on unmount
    return () => {
      flareAnimation?.stop();
    };
  }, [hasActiveFlare]);

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  const moodColors = getMoodColor(friend.mood || 'neutral');
  
  // Get initials from display name
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Very subtle floating animation
  const bounceTranslate = bounceAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -3],
  });

  // Subtle glow for online friends
  const glowOpacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.25, 0.4],
  });

  const flareScale = flareAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1.0, 1.8],
  });

  const flareOpacity = flareAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.9],
  });

  return (
    <Animated.View
      style={[
        styles.container,
        {
          left: centerX - PARTICLE_SIZE / 2,
          top: centerY - PARTICLE_SIZE / 2,
          transform: [
            { translateX: translateXAnim },
            { translateY: translateYAnim },
          ],
        },
      ]}
      pointerEvents="box-none"
    >
      <Animated.View
        style={{
          transform: [{ translateY: bounceTranslate }],
        }}
        pointerEvents="box-none"
      >
      {/* Emergency Flare Alert */}
      {hasActiveFlare && (
        <Animated.View
          style={[
            styles.flareGlow,
            {
              transform: [{ scale: flareScale }],
              opacity: flareOpacity,
            },
          ]}
          pointerEvents="none"
        >
          <LinearGradient
            colors={['rgba(244, 112, 182, 0.5)', 'rgba(236, 72, 153, 0.3)', 'transparent']}
            style={styles.flareCircle}
          />
        </Animated.View>
      )}

      {/* Main Particle with Avatar */}
      <TouchableOpacity activeOpacity={0.8} onPress={handlePress} style={{ zIndex: 100 }}>
        <View style={styles.particleWrapper}>
          {/* Prominent outer glow for all friends - brighter for online (behind everything) */}
          <Animated.View
            style={[
              styles.glow,
              {
                opacity: isOnline ? glowOpacity : 0.12,
                zIndex: -1,
              },
            ]}
            pointerEvents="none"
          >
            <LinearGradient
              colors={[`${moodColors.glow}`, `${moodColors.base}35`, 'transparent']}
              style={styles.glowCircle}
            />
          </Animated.View>

          {/* Mood-colored ring - same for all friends */}
          <View
            style={[
              styles.moodRing,
              {
                borderColor: moodColors.base,
                borderWidth: 4,
                opacity: 0.9,
                shadowColor: moodColors.base,
                shadowOpacity: 0.5,
                shadowRadius: 8,
                shadowOffset: { width: 0, height: 0 },
                elevation: 8,
                zIndex: 1,
              }
            ]}
          />
          
          {/* Avatar circle - on top */}
          <View style={styles.avatarContainer}>
            {friend.avatar_url ? (
              <Image
                source={{ uri: friend.avatar_url }}
                style={styles.avatar}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: `${moodColors.base}30` }]}>
                <Text style={styles.initialsText}>{getInitials(friend.display_name)}</Text>
              </View>
            )}
          </View>

          {/* Online indicator - positioned outside avatar circle at top-right */}
          {isOnline && (
            <Animated.View 
              style={[
                styles.onlineIndicator,
                {
                  opacity: pulseAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.8, 1],
                  }),
                  transform: [{
                    scale: pulseAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [1, 1.2],
                    }),
                  }],
                },
              ]} 
            />
          )}
        </View>
      </TouchableOpacity>

      {/* Name label - show first name only */}
      <Text style={styles.nameLabel} numberOfLines={1}>
        {friend.display_name.split(' ')[0]}
      </Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    width: PARTICLE_SIZE * 2.2,
    height: PARTICLE_SIZE * 2.2,
    top: -PARTICLE_SIZE * 0.6,
    left: -PARTICLE_SIZE * 0.6,
    zIndex: -1,
  },
  glowCircle: {
    width: '100%',
    height: '100%',
    borderRadius: 9999,
  },
  particleWrapper: {
    width: PARTICLE_SIZE,
    height: PARTICLE_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    zIndex: 10,
  },
  moodRing: {
    position: 'absolute',
    width: PARTICLE_SIZE + 8,
    height: PARTICLE_SIZE + 8,
    borderRadius: 9999,
    borderWidth: 3,
    elevation: 5,
  },
  avatarContainer: {
    width: PARTICLE_SIZE,
    height: PARTICLE_SIZE,
    borderRadius: PARTICLE_SIZE / 2,
    overflow: 'hidden',
    elevation: 20,
    zIndex: 100,
    position: 'relative',
    backgroundColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  avatar: {
    width: '100%',
    height: '100%',
    zIndex: 101,
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  initialsText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#ffffff',
  },
  onlineIndicator: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#34D399',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.9)',
    shadowColor: '#34D399',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 8,
  },
  nameLabel: {
    marginTop: 8,
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
    textAlign: 'center',
    maxWidth: 80,
    letterSpacing: 0.1,
  },
  flareGlow: {
    position: 'absolute',
    width: PARTICLE_SIZE * 3,
    height: PARTICLE_SIZE * 3,
  },
  flareCircle: {
    width: '100%',
    height: '100%',
    borderRadius: 9999,
  },
});
