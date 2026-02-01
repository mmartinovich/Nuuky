import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Dimensions, Platform, Easing } from 'react-native';
import { Ionicons, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { User } from '../types';
import { typography } from '../lib/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface FriendActionBubbleProps {
  friend: User;
  position: { x: number; y: number };
  onDismiss: () => void;
  onNudge: () => void;
  onCallMe: () => void;
  onHeart: () => void;
  onInteraction?: () => void;
}

// Small particle heart that flies outward
const HeartParticle = ({ delay, angle, color }: { delay: number; angle: number; color: string }) => {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration: 600,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, []);

  const distance = 30;
  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, Math.cos(angle) * distance],
  });
  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, Math.sin(angle) * distance - 10], // slight upward bias
  });
  const scale = progress.interpolate({
    inputRange: [0, 0.3, 1],
    outputRange: [0, 1, 0],
  });
  const opacity = progress.interpolate({
    inputRange: [0, 0.2, 0.8, 1],
    outputRange: [0, 1, 1, 0],
  });

  return (
    <Animated.View
      style={{
        position: 'absolute',
        transform: [{ translateX }, { translateY }, { scale }],
        opacity,
      }}
    >
      <Ionicons name="heart" size={10} color={color} />
    </Animated.View>
  );
};

// Expanding ripple ring
const RippleRing = ({ delay, color }: { delay: number; color: string }) => {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration: 500,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, []);

  const scale = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.5, 2.2],
  });
  const opacity = progress.interpolate({
    inputRange: [0, 0.3, 1],
    outputRange: [0, 0.5, 0],
  });

  return (
    <Animated.View
      style={{
        position: 'absolute',
        width: 28,
        height: 28,
        borderRadius: 14,
        borderWidth: 2,
        borderColor: color,
        transform: [{ scale }],
        opacity,
      }}
    />
  );
};

// Sound wave arc for call
const SoundWave = ({ delay, side }: { delay: number; side: 'left' | 'right' }) => {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration: 400,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, []);

  const scale = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.6, 1.3],
  });
  const opacity = progress.interpolate({
    inputRange: [0, 0.2, 1],
    outputRange: [0, 0.7, 0],
  });
  const translateX = side === 'right' ? 10 : -10;

  return (
    <Animated.View
      style={{
        position: 'absolute',
        width: 8,
        height: 16,
        borderRadius: side === 'right' ? 0 : 8,
        borderTopRightRadius: side === 'right' ? 8 : 0,
        borderBottomRightRadius: side === 'right' ? 8 : 0,
        borderTopLeftRadius: side === 'left' ? 8 : 0,
        borderBottomLeftRadius: side === 'left' ? 8 : 0,
        borderWidth: 2,
        borderLeftWidth: side === 'right' ? 0 : 2,
        borderRightWidth: side === 'left' ? 0 : 2,
        borderColor: '#22C55E',
        transform: [{ translateX }, { scale }],
        opacity,
      }}
    />
  );
};

export function FriendActionBubble({
  friend,
  position,
  onDismiss,
  onNudge,
  onCallMe,
  onHeart,
  onInteraction,
}: FriendActionBubbleProps) {
  const scaleAnim = useRef(new Animated.Value(0.3)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  // Track which button was sent for checkmark feedback
  const [sentAction, setSentAction] = useState<'nudge' | 'call' | 'heart' | null>(null);

  // Show particle/ripple effects
  const [showNudgeRipples, setShowNudgeRipples] = useState(false);
  const [showCallWaves, setShowCallWaves] = useState(false);
  const [showHeartParticles, setShowHeartParticles] = useState(false);

  // Button animation values
  const nudgeScale = useRef(new Animated.Value(1)).current;
  const nudgeTranslateX = useRef(new Animated.Value(0)).current;
  const nudgeRotate = useRef(new Animated.Value(0)).current;

  const callRotate = useRef(new Animated.Value(0)).current;
  const callScale = useRef(new Animated.Value(1)).current;
  const callTranslateY = useRef(new Animated.Value(0)).current;

  const heartScale = useRef(new Animated.Value(1)).current;
  const heartRotate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Snappy Apple-style spring animation
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 300,
        friction: 20,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Calculate bubble position - center above friend, clear of avatar
  const bubbleWidth = 190;
  const avatarRadius = 35; // Approximate avatar radius
  const bubbleX = Math.max(
    16,
    Math.min(position.x - bubbleWidth / 2, SCREEN_WIDTH - bubbleWidth - 16)
  );
  const bubbleY = position.y - avatarRadius - 80; // Position above avatar

  // Adjust if bubble would go off screen top
  const isAbove = bubbleY >= 100;
  const finalBubbleY = isAbove ? bubbleY : position.y + avatarRadius + 50;

  // Calculate tail position to point directly at avatar
  const tailOffset = position.x - bubbleX;

  // Helper to reset icon back from sent state
  const resetAfterSent = (scaleVal: Animated.Value, action: 'nudge' | 'call' | 'heart') => {
    setTimeout(() => {
      Animated.timing(scaleVal, { toValue: 0, duration: 100, useNativeDriver: true }).start(() => {
        setSentAction(null);
        Animated.spring(scaleVal, { toValue: 1, tension: 300, friction: 10, useNativeDriver: true }).start();
      });
    }, 1000);
  };

  const handleNudgePress = () => {
    if (sentAction) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    // Show ripple rings
    setShowNudgeRipples(true);
    setTimeout(() => setShowNudgeRipples(false), 800);

    // Wobble side-to-side (like a vibrating phone) + slight rotation + scale pulse
    Animated.parallel([
      // Side-to-side wobble
      Animated.sequence([
        Animated.timing(nudgeTranslateX, { toValue: 6, duration: 50, useNativeDriver: true }),
        Animated.timing(nudgeTranslateX, { toValue: -6, duration: 50, useNativeDriver: true }),
        Animated.timing(nudgeTranslateX, { toValue: 5, duration: 50, useNativeDriver: true }),
        Animated.timing(nudgeTranslateX, { toValue: -5, duration: 50, useNativeDriver: true }),
        Animated.timing(nudgeTranslateX, { toValue: 3, duration: 40, useNativeDriver: true }),
        Animated.timing(nudgeTranslateX, { toValue: -3, duration: 40, useNativeDriver: true }),
        Animated.timing(nudgeTranslateX, { toValue: 0, duration: 30, useNativeDriver: true }),
      ]),
      // Rotation wobble
      Animated.sequence([
        Animated.timing(nudgeRotate, { toValue: 1, duration: 50, useNativeDriver: true }),
        Animated.timing(nudgeRotate, { toValue: -1, duration: 60, useNativeDriver: true }),
        Animated.timing(nudgeRotate, { toValue: 1, duration: 60, useNativeDriver: true }),
        Animated.timing(nudgeRotate, { toValue: -1, duration: 60, useNativeDriver: true }),
        Animated.timing(nudgeRotate, { toValue: 0, duration: 40, useNativeDriver: true }),
      ]),
      // Scale punch
      Animated.sequence([
        Animated.timing(nudgeScale, { toValue: 1.4, duration: 80, easing: Easing.out(Easing.back(2)), useNativeDriver: true }),
        Animated.timing(nudgeScale, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]),
    ]).start(() => {
      // Squish to zero for icon swap
      Animated.timing(nudgeScale, { toValue: 0, duration: 100, easing: Easing.in(Easing.ease), useNativeDriver: true }).start(() => {
        setSentAction('nudge');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onNudge();
        onInteraction?.();
        Animated.spring(nudgeScale, { toValue: 1, tension: 300, friction: 10, useNativeDriver: true }).start(() => {
          resetAfterSent(nudgeScale, 'nudge');
        });
      });
    });
  };

  const handleCallPress = () => {
    if (sentAction) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    // Show sound waves
    setShowCallWaves(true);
    setTimeout(() => setShowCallWaves(false), 800);

    // Phone rings: tilt left-right rapidly, then "pick up" rotation to 0
    Animated.parallel([
      // Scale pop
      Animated.sequence([
        Animated.timing(callScale, { toValue: 1.3, duration: 80, easing: Easing.out(Easing.back(2)), useNativeDriver: true }),
        Animated.timing(callScale, { toValue: 1, duration: 150, useNativeDriver: true }),
      ]),
      // Bounce up slightly (like vibrating on a surface)
      Animated.sequence([
        Animated.timing(callTranslateY, { toValue: -3, duration: 50, useNativeDriver: true }),
        Animated.timing(callTranslateY, { toValue: 0, duration: 50, useNativeDriver: true }),
        Animated.timing(callTranslateY, { toValue: -2, duration: 50, useNativeDriver: true }),
        Animated.timing(callTranslateY, { toValue: 0, duration: 50, useNativeDriver: true }),
        Animated.timing(callTranslateY, { toValue: -1, duration: 40, useNativeDriver: true }),
        Animated.timing(callTranslateY, { toValue: 0, duration: 40, useNativeDriver: true }),
      ]),
      // Aggressive ring shake rotation
      Animated.sequence([
        Animated.timing(callRotate, { toValue: 1, duration: 40, useNativeDriver: true }),
        Animated.timing(callRotate, { toValue: -1, duration: 55, useNativeDriver: true }),
        Animated.timing(callRotate, { toValue: 1, duration: 55, useNativeDriver: true }),
        Animated.timing(callRotate, { toValue: -1, duration: 55, useNativeDriver: true }),
        Animated.timing(callRotate, { toValue: 1, duration: 55, useNativeDriver: true }),
        Animated.timing(callRotate, { toValue: -1, duration: 55, useNativeDriver: true }),
        // "Pick up" - smooth settle to 0
        Animated.timing(callRotate, { toValue: 0, duration: 80, easing: Easing.out(Easing.ease), useNativeDriver: true }),
      ]),
    ]).start(() => {
      // Brief green flash effect via scale squish -> swap
      Animated.timing(callScale, { toValue: 0, duration: 100, easing: Easing.in(Easing.ease), useNativeDriver: true }).start(() => {
        setSentAction('call');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onCallMe();
        onInteraction?.();
        Animated.spring(callScale, { toValue: 1, tension: 300, friction: 10, useNativeDriver: true }).start(() => {
          resetAfterSent(callScale, 'call');
        });
      });
    });
  };

  const handleHeartPress = () => {
    if (sentAction) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    // Show heart particles
    setShowHeartParticles(true);
    setTimeout(() => setShowHeartParticles(false), 900);

    // Realistic heartbeat: quick double-pump (lub-dub) + slight tilt
    Animated.parallel([
      // Double-pump heartbeat
      Animated.sequence([
        // First pump (lub)
        Animated.timing(heartScale, { toValue: 1.4, duration: 80, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(heartScale, { toValue: 1, duration: 80, useNativeDriver: true }),
        // Brief pause between beats
        Animated.delay(60),
        // Second pump (dub) - slightly smaller
        Animated.timing(heartScale, { toValue: 1.25, duration: 70, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(heartScale, { toValue: 1, duration: 70, useNativeDriver: true }),
        // Hold
        Animated.delay(40),
        // Final big pop before swap
        Animated.timing(heartScale, { toValue: 1.6, duration: 80, easing: Easing.out(Easing.back(3)), useNativeDriver: true }),
        // Squish to zero to hide icon for swap
        Animated.timing(heartScale, { toValue: 0, duration: 100, easing: Easing.in(Easing.ease), useNativeDriver: true }),
      ]),
      // Slight tilt during heartbeat
      Animated.sequence([
        Animated.timing(heartRotate, { toValue: 1, duration: 80, useNativeDriver: true }),
        Animated.timing(heartRotate, { toValue: -1, duration: 160, useNativeDriver: true }),
        Animated.timing(heartRotate, { toValue: 0, duration: 80, useNativeDriver: true }),
      ]),
    ]).start(() => {
      setSentAction('heart');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onHeart();
      onInteraction?.();
      // Pop checkmark back in
      Animated.spring(heartScale, { toValue: 1, tension: 300, friction: 10, useNativeDriver: true }).start(() => {
        resetAfterSent(heartScale, 'heart');
      });
    });
  };


  const handleDismiss = () => {
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 0.3,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start(onDismiss);
  };

  // Particle angles for heart burst (6 particles evenly distributed)
  const heartParticleAngles = [0, Math.PI / 3, (2 * Math.PI) / 3, Math.PI, (4 * Math.PI) / 3, (5 * Math.PI) / 3];

  return (
    <>
      {/* Invisible backdrop to catch taps */}
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={handleDismiss}
      />

      {/* Speech bubble */}
      <Animated.View
        style={[
          styles.bubbleContainer,
          {
            left: bubbleX,
            top: finalBubbleY,
            transform: [{ scale: scaleAnim }],
            opacity: opacityAnim,
          },
        ]}
        pointerEvents="box-none"
      >
        {/* Main bubble body */}
        <View style={styles.bubble}>
          {/* Action icons with labels */}
          <View style={styles.actionsRow}>
            {/* Nudge button */}
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleNudgePress}
              activeOpacity={0.6}
              accessibilityLabel="Nudge friend"
              accessibilityRole="button"
            >
              <View style={styles.iconWrapper}>
                {/* Ripple rings */}
                {showNudgeRipples && (
                  <>
                    <RippleRing delay={0} color="#3B82F6" />
                    <RippleRing delay={150} color="#3B82F6" />
                  </>
                )}
                <Animated.View
                  style={{
                    transform: [
                      { translateX: nudgeTranslateX },
                      { scale: nudgeScale },
                      {
                        rotate: nudgeRotate.interpolate({
                          inputRange: [-1, 1],
                          outputRange: ['-15deg', '15deg'],
                        }),
                      },
                    ],
                  }}
                >
                  {sentAction === 'nudge' ? (
                    <MaterialCommunityIcons name="hand-okay" size={26} color="#3B82F6" />
                  ) : (
                    <MaterialCommunityIcons name="hand-wave" size={20} color="#3B82F6" />
                  )}
                </Animated.View>
              </View>
              <Text style={styles.actionLabel}>{sentAction === 'nudge' ? 'Sent!' : 'Nudge'}</Text>
            </TouchableOpacity>

            {/* Call me button */}
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleCallPress}
              activeOpacity={0.6}
              accessibilityLabel="Request a call"
              accessibilityRole="button"
            >
              <View style={styles.iconWrapper}>
                {/* Sound wave arcs */}
                {showCallWaves && (
                  <>
                    <SoundWave delay={0} side="right" />
                    <SoundWave delay={120} side="right" />
                    <SoundWave delay={0} side="left" />
                    <SoundWave delay={120} side="left" />
                  </>
                )}
                <Animated.View
                  style={{
                    transform: [
                      { translateY: callTranslateY },
                      { scale: callScale },
                      {
                        rotate: callRotate.interpolate({
                          inputRange: [-1, 1],
                          outputRange: ['-25deg', '25deg'],
                        }),
                      },
                    ],
                  }}
                >
                  {sentAction === 'call' ? (
                    <MaterialCommunityIcons name="phone-check" size={26} color="#22C55E" />
                  ) : (
                    <Ionicons name="call" size={20} color="#22C55E" />
                  )}
                </Animated.View>
              </View>
              <Text style={styles.actionLabel}>{sentAction === 'call' ? 'Sent!' : 'Call me'}</Text>
            </TouchableOpacity>

            {/* Heart button */}
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleHeartPress}
              activeOpacity={0.6}
              accessibilityLabel="Send heart"
              accessibilityRole="button"
            >
              <View style={styles.iconWrapper}>
                {/* Heart particle burst */}
                {showHeartParticles &&
                  heartParticleAngles.map((angle, i) => (
                    <HeartParticle key={i} delay={i * 30} angle={angle} color={i % 2 === 0 ? '#EF4444' : '#F87171'} />
                  ))}
                <Animated.View
                  style={{
                    transform: [
                      { scale: heartScale },
                      {
                        rotate: heartRotate.interpolate({
                          inputRange: [-1, 1],
                          outputRange: ['-8deg', '8deg'],
                        }),
                      },
                    ],
                  }}
                >
                  {sentAction === 'heart' ? (
                    <MaterialCommunityIcons name="heart-multiple" size={26} color="#EF4444" />
                  ) : (
                    <Ionicons name="heart" size={20} color="#EF4444" />
                  )}
                </Animated.View>
              </View>
              <Text style={styles.actionLabel}>{sentAction === 'heart' ? 'Sent!' : 'Heart'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Bubble tail - positioned to point at avatar */}
        {isAbove ? (
          <View style={[styles.tailContainer, { left: tailOffset - 9 }]}>
            <View style={styles.tailDown} />
          </View>
        ) : (
          <View style={[styles.tailContainerUp, { left: tailOffset - 9 }]}>
            <View style={styles.tailUp} />
          </View>
        )}
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
  },
  bubbleContainer: {
    position: 'absolute',
    zIndex: 1001,
    width: 190,
  },
  bubble: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 10,
    overflow: 'visible',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  actionButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 44,
    minHeight: 44,
    padding: 2,
  },
  iconWrapper: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  actionLabel: {
    fontSize: 10,
    fontFamily: 'Outfit_600SemiBold',
    color: 'rgba(0, 0, 0, 0.7)',
    marginTop: 2,
    letterSpacing: 0.2,
  },
  tailContainer: {
    position: 'absolute',
    bottom: -9,
    alignItems: 'center',
  },
  tailDown: {
    width: 18,
    height: 18,
    backgroundColor: '#FFFFFF',
    transform: [{ rotate: '45deg' }],
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 1, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  tailContainerUp: {
    position: 'absolute',
    top: -9,
    alignItems: 'center',
  },
  tailUp: {
    width: 18,
    height: 18,
    backgroundColor: '#FFFFFF',
    transform: [{ rotate: '45deg' }],
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: -1, height: -1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
});
