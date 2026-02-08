import React, { useEffect, useRef, useMemo, memo } from 'react';
import { View, StyleSheet, Dimensions, TouchableOpacity, Animated, Easing, Text, GestureResponderHandlers } from 'react-native';
import { Image as CachedImage } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { User, Streak, MoodSelfie } from '../types';
import { getMoodColor, getCustomMoodColor } from '../lib/theme';
import { useLowPowerMode } from '../stores/appStore';
import { isUserTrulyOnline } from '../lib/utils';
import { StreakBadge } from './StreakBadge';
import { useTheme } from '../hooks/useTheme';

const { width, height } = Dimensions.get('window');
const CENTER_X = width / 2;
const CENTER_Y = height / 2 - 20;
const PARTICLE_SIZE = 60;

// Track active listeners by friend ID to prevent accumulation
// WeakRef-style cleanup: entries are always cleaned up by the owning component's effect cleanup
const activeListeners = new Map<string, { cleanup: () => void }>();

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
  streak?: Streak;
  panHandlers?: GestureResponderHandlers;
}

function FriendParticleComponent({
  friend,
  index,
  total,
  onPress,
  hasActiveFlare,
  position,
  baseAngle,
  radius,
  orbitAngle,
  streak,
  panHandlers,
}: FriendParticleProps) {
  const lowPowerMode = useLowPowerMode();
  const { theme } = useTheme();



  // Check if user is truly online (handles stale is_online flags from force-closed apps)
  const isOnline = useMemo(
    () => isUserTrulyOnline(friend.is_online, friend.last_seen_at),
    [friend.is_online, friend.last_seen_at]
  );
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const flareAnim1 = useRef(new Animated.Value(0)).current;
  const flareAnim2 = useRef(new Animated.Value(0)).current;
  const flareAnim3 = useRef(new Animated.Value(0)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;

  const centerX = CENTER_X;
  const centerY = CENTER_Y;

  // Local oscillation for organic floating movement
  const localOrbitAnim = useRef(new Animated.Value(0)).current;
  
  // Track animated values in refs for synchronous access without private API (_value)
  const orbitAngleRef = useRef(0);
  const localOrbitRef2 = useRef(0);

  // Use Animated.Value for positions to avoid React re-renders
  // Include current orbit rotation so particles appear at the correct position on first paint
  const fullInitialAngle = baseAngle + orbitAngleRef.current;
  const translateXAnim = useRef(new Animated.Value(Math.cos(fullInitialAngle) * radius)).current;
  const translateYAnim = useRef(new Animated.Value(Math.sin(fullInitialAngle) * radius)).current;
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
    const oscillation = Animated.loop(
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
    );
    oscillation.start();

    return () => {
      oscillation.stop();
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
    const currentAngle = baseAngle + orbitAngleRef.current + (lowPowerMode ? 0 : localOrbitRef2.current);
    let lastComputedX = Math.cos(currentAngle) * radius;
    let lastComputedY = Math.sin(currentAngle) * radius;
    let pendingUpdate = false;

    const updatePosition = () => {
      // Batch updates using requestAnimationFrame for smoother rendering
      if (pendingUpdate) return;
      pendingUpdate = true;

      requestAnimationFrame(() => {
        pendingUpdate = false;
        // Combine parent orbit rotation with local oscillation
        const angle = baseAngle + orbitAngleRef.current + (lowPowerMode ? 0 : localOrbitRef2.current);
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
      });
    };

    const orbitListener = orbitAngle.addListener(({ value }) => {
      orbitAngleRef.current = value;
      updatePosition();
    });
    // Only add local listener if not in low power mode (oscillation disabled anyway)
    const localListener = lowPowerMode ? null : localOrbitAnim.addListener(({ value }) => {
      localOrbitRef2.current = value;
      updatePosition();
    });

    const cleanup = () => {
      orbitAngle.removeListener(orbitListener);
      if (localListener) localOrbitAnim.removeListener(localListener);
      activeListeners.delete(friendId);
    };

    activeListeners.set(friendId, { cleanup });

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
    const anims: Animated.CompositeAnimation[] = [];

    if (hasActiveFlare) {
      [flareAnim1, flareAnim2, flareAnim3].forEach((anim, i) => {
        const animation = Animated.loop(
          Animated.sequence([
            Animated.delay(i * 400),
            Animated.timing(anim, {
              toValue: 1,
              duration: 1200,
              easing: Easing.out(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(anim, {
              toValue: 0,
              duration: 0,
              useNativeDriver: true,
            }),
          ])
        );
        animation.start();
        anims.push(animation);
      });
    } else {
      flareAnim1.setValue(0);
      flareAnim2.setValue(0);
      flareAnim3.setValue(0);
    }

    return () => {
      anims.forEach(a => a.stop());
    };
  }, [hasActiveFlare]);

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  const moodColors = useMemo(
    () => friend.custom_mood?.color
      ? getCustomMoodColor(friend.custom_mood.color)
      : getMoodColor(friend.mood || 'neutral'),
    [friend.custom_mood?.color, friend.mood]
  );

  // Check if friend has an active mood selfie (not expired)
  const hasSelfie = useMemo(() => {
    if (!friend.mood_selfie) return false;
    return new Date(friend.mood_selfie.expires_at) > new Date();
  }, [friend.mood_selfie]);

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
        {/* Drag handler wrapper - enables drag-to-spin on avatar */}
        <View {...panHandlers} pointerEvents="auto">

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
                borderColor: hasActiveFlare ? '#EF4444' : moodColors.base,
                borderWidth: 4,
                opacity: 0.9,
                shadowColor: hasActiveFlare ? '#EF4444' : moodColors.base,
                shadowOpacity: hasActiveFlare ? 0.8 : 0.5,
                shadowRadius: 8,
                shadowOffset: { width: 0, height: 0 },
                elevation: 8,
                zIndex: 1,
              }
            ]}
          />

          {/* Red alert glow behind avatar */}
          {hasActiveFlare && (
            <Animated.View
              style={[
                styles.flareGlow,
                {
                  opacity: flareAnim1.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [0.4, 0.7, 0.4],
                  }),
                  transform: [{ scale: flareAnim1.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [0.9, 1.05, 0.9],
                  }) }],
                },
              ]}
              pointerEvents="none"
            />
          )}

          {/* Pulsating red rings for active flare */}
          {hasActiveFlare && [flareAnim1, flareAnim2, flareAnim3].map((anim, i) => (
            <Animated.View
              key={`flare-ring-${i}`}
              style={[
                styles.flareRing,
                {
                  borderColor: '#EF4444',
                  opacity: anim.interpolate({
                    inputRange: [0, 0.7, 1],
                    outputRange: [0.9, 0.4, 0],
                  }),
                  transform: [{ scale: anim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1.0, 1.6],
                  }) }],
                },
              ]}
              pointerEvents="none"
            />
          ))}
          
          {/* Avatar circle - on top (shows selfie when active) */}
          <View style={styles.avatarContainer}>
            {hasSelfie && friend.mood_selfie ? (
              <>
                <CachedImage
                  source={{ uri: friend.mood_selfie.image_url }}
                  style={styles.avatar}
                  cachePolicy="memory-disk"
                  contentFit="cover"
                  transition={0}
                  recyclingKey={`selfie-${friend.id}`}
                />
                {/* Initials behind image as instant fallback while image loads from disk */}
                <View style={[styles.avatarPlaceholder, { backgroundColor: `${moodColors.base}30`, position: 'absolute', width: '100%', height: '100%', zIndex: 0 }]}>
                  <Text style={[styles.initialsText, { color: theme.colors.text.primary }]}>{getInitials(friend.display_name)}</Text>
                </View>
              </>
            ) : friend.avatar_url ? (
              <>
                <CachedImage
                  source={{ uri: friend.avatar_url }}
                  style={styles.avatar}
                  cachePolicy="memory-disk"
                  contentFit="cover"
                  transition={0}
                  recyclingKey={friend.id}
                />
                {/* Initials behind image as instant fallback while image loads from disk */}
                <View style={[styles.avatarPlaceholder, { backgroundColor: `${moodColors.base}30`, position: 'absolute', width: '100%', height: '100%', zIndex: 0 }]}>
                  <Text style={[styles.initialsText, { color: theme.colors.text.primary }]}>{getInitials(friend.display_name)}</Text>
                </View>
              </>
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: `${moodColors.base}30` }]}>
                <Text style={[styles.initialsText, { color: theme.colors.text.primary }]}>{getInitials(friend.display_name)}</Text>
              </View>
            )}
          </View>

          {/* Camera badge for active selfie */}
          {hasSelfie && (
            <View style={styles.selfieBadge}>
              <Ionicons name="camera" size={10} color="#FFFFFF" />
            </View>
          )}

          {/* Streak Badge */}
          {streak && streak.state !== 'broken' && (
            <StreakBadge streak={streak} />
          )}

          {/* Online indicator - positioned outside avatar circle at top-right */}
          {isOnline && (
            <Animated.View
              style={[
                styles.onlineIndicator,
                {
                  borderColor: theme.colors.text.primary,
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
        </View>

      {/* Name label - show first name only */}
      <Text style={[styles.nameLabel, { color: theme.colors.text.secondary }]} numberOfLines={1}>
        {friend.display_name.split(' ')[0]}
      </Text>
      </Animated.View>
    </Animated.View>
  );
}

// Memoize component to prevent unnecessary re-renders
// Only re-render when friend data, position, or speaking state actually changes
export const FriendParticle = memo(FriendParticleComponent, (prevProps, nextProps) => {
  return (
    prevProps.friend.id === nextProps.friend.id &&
    prevProps.friend.mood === nextProps.friend.mood &&
    prevProps.friend.custom_mood_id === nextProps.friend.custom_mood_id &&
    prevProps.friend.avatar_url === nextProps.friend.avatar_url &&
    prevProps.friend.is_online === nextProps.friend.is_online &&
    prevProps.friend.last_seen_at === nextProps.friend.last_seen_at &&
    prevProps.friend.mood_selfie?.id === nextProps.friend.mood_selfie?.id &&
    prevProps.friend.mood_selfie?.expires_at === nextProps.friend.mood_selfie?.expires_at &&
    prevProps.position.x === nextProps.position.x &&
    prevProps.position.y === nextProps.position.y &&
    prevProps.hasActiveFlare === nextProps.hasActiveFlare &&
    prevProps.baseAngle === nextProps.baseAngle &&
    prevProps.radius === nextProps.radius &&
    prevProps.onPress === nextProps.onPress &&
    prevProps.streak?.consecutive_days === nextProps.streak?.consecutive_days &&
    prevProps.streak?.state === nextProps.streak?.state
    // Note: orbitAngle is an Animated.Value that changes continuously
    // We don't include it in comparison as it's handled by animation listeners
  );
});

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
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#22C55E',
    borderWidth: 2,
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 8,
    zIndex: 200,
  },
  nameLabel: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
    maxWidth: 80,
    letterSpacing: 0.1,
  },
  flareRing: {
    position: 'absolute',
    width: PARTICLE_SIZE + 8,
    height: PARTICLE_SIZE + 8,
    borderRadius: (PARTICLE_SIZE + 8) / 2,
    borderWidth: 2.5,
    zIndex: 2,
  },
  flareGlow: {
    position: 'absolute',
    width: PARTICLE_SIZE + 24,
    height: PARTICLE_SIZE + 24,
    borderRadius: (PARTICLE_SIZE + 24) / 2,
    backgroundColor: 'rgba(239, 68, 68, 0.25)',
    zIndex: 0,
  },
  selfieBadge: {
    position: 'absolute',
    top: -2,
    left: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#EC4899',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#1a1a2e',
    shadowColor: '#EC4899',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 8,
    zIndex: 200,
  },
});
