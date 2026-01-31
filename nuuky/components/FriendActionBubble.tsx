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

  // Button animation values
  const nudgeScale = useRef(new Animated.Value(1)).current;
  const callRotate = useRef(new Animated.Value(0)).current;
  const callScale = useRef(new Animated.Value(1)).current;
  const heartScale = useRef(new Animated.Value(1)).current;

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

  const handleNudgePress = () => {
    if (sentAction) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    // Punchy scale with overshoot
    Animated.sequence([
        Animated.timing(nudgeScale, { toValue: 1.5, duration: 100, easing: Easing.out(Easing.back(2)), useNativeDriver: true }),
        Animated.timing(nudgeScale, { toValue: 0.8, duration: 100, useNativeDriver: true }),
        Animated.timing(nudgeScale, { toValue: 1.3, duration: 100, useNativeDriver: true }),
        Animated.timing(nudgeScale, { toValue: 0.9, duration: 80, useNativeDriver: true }),
        // Squish to zero for icon swap
        Animated.timing(nudgeScale, { toValue: 0, duration: 100, easing: Easing.in(Easing.ease), useNativeDriver: true }),
    ]).start(() => {
      setSentAction('nudge');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onNudge();
      onInteraction?.();
      Animated.spring(nudgeScale, { toValue: 1, tension: 300, friction: 10, useNativeDriver: true }).start(() => {
        setTimeout(() => {
          Animated.timing(nudgeScale, { toValue: 0, duration: 100, useNativeDriver: true }).start(() => {
            setSentAction(null);
            Animated.spring(nudgeScale, { toValue: 1, tension: 300, friction: 10, useNativeDriver: true }).start();
          });
        }, 1000);
      });
    });
  };

  const handleCallPress = () => {
    if (sentAction) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    // Scale pop + aggressive ring shake
    Animated.parallel([
      Animated.sequence([
        Animated.timing(callScale, { toValue: 1.4, duration: 80, easing: Easing.out(Easing.back(2)), useNativeDriver: true }),
        Animated.timing(callScale, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]),
      Animated.sequence([
        Animated.timing(callRotate, { toValue: 1, duration: 40, useNativeDriver: true }),
        Animated.timing(callRotate, { toValue: -1, duration: 60, useNativeDriver: true }),
        Animated.timing(callRotate, { toValue: 1, duration: 60, useNativeDriver: true }),
        Animated.timing(callRotate, { toValue: -1, duration: 60, useNativeDriver: true }),
        Animated.timing(callRotate, { toValue: 1, duration: 60, useNativeDriver: true }),
        Animated.timing(callRotate, { toValue: -1, duration: 60, useNativeDriver: true }),
        Animated.timing(callRotate, { toValue: 0, duration: 40, useNativeDriver: true }),
      ]),
    ]).start(() => {
      // Squish to zero for icon swap
      Animated.timing(callScale, { toValue: 0, duration: 100, easing: Easing.in(Easing.ease), useNativeDriver: true }).start(() => {
        setSentAction('call');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onCallMe();
        onInteraction?.();
        Animated.spring(callScale, { toValue: 1, tension: 300, friction: 10, useNativeDriver: true }).start(() => {
          setTimeout(() => {
            Animated.timing(callScale, { toValue: 0, duration: 100, useNativeDriver: true }).start(() => {
              setSentAction(null);
              Animated.spring(callScale, { toValue: 1, tension: 300, friction: 10, useNativeDriver: true }).start();
            });
          }, 1000);
        });
      });
    });
  };

  const handleHeartPress = () => {
    if (sentAction) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    // Heartbeat then squish down to swap icon, pop back as checkmark
    Animated.sequence([
        Animated.timing(heartScale, { toValue: 1.6, duration: 100, easing: Easing.out(Easing.back(2)), useNativeDriver: true }),
        Animated.timing(heartScale, { toValue: 0.8, duration: 100, useNativeDriver: true }),
        Animated.delay(80),
        Animated.timing(heartScale, { toValue: 1.5, duration: 100, easing: Easing.out(Easing.back(2)), useNativeDriver: true }),
        // Squish to zero to hide icon for swap
        Animated.timing(heartScale, { toValue: 0, duration: 100, easing: Easing.in(Easing.ease), useNativeDriver: true }),
    ]).start(() => {
      setSentAction('heart');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onHeart();
      onInteraction?.();
      // Pop checkmark back in
      Animated.spring(heartScale, { toValue: 1, tension: 300, friction: 10, useNativeDriver: true }).start(() => {
        setTimeout(() => {
          // Squish out checkmark, swap back to heart, pop in
          Animated.timing(heartScale, { toValue: 0, duration: 100, useNativeDriver: true }).start(() => {
            setSentAction(null);
            Animated.spring(heartScale, { toValue: 1, tension: 300, friction: 10, useNativeDriver: true }).start();
          });
        }, 1000);
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
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleNudgePress}
              activeOpacity={0.6}
              accessibilityLabel="Nudge friend"
              accessibilityRole="button"
            >
              <Animated.View style={{ transform: [{ scale: nudgeScale }] }}>
                {sentAction === 'nudge' ? (
                  <MaterialCommunityIcons name="check-bold" size={28} color="#3B82F6" />
                ) : (
                  <MaterialCommunityIcons name="hand-wave" size={20} color="#3B82F6" />
                )}
              </Animated.View>
              <Text style={styles.actionLabel}>{sentAction === 'nudge' ? 'Sent!' : 'Nudge'}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleCallPress}
              activeOpacity={0.6}
              accessibilityLabel="Request a call"
              accessibilityRole="button"
            >
              <Animated.View
                style={{
                  transform: [
                    { scale: callScale },
                    {
                      rotate: callRotate.interpolate({
                        inputRange: [-1, 1],
                        outputRange: ['-20deg', '20deg'],
                      }),
                    },
                  ],
                }}
              >
                {sentAction === 'call' ? (
                  <MaterialCommunityIcons name="check-bold" size={28} color="#22C55E" />
                ) : (
                  <Ionicons name="call" size={20} color="#22C55E" />
                )}
              </Animated.View>
              <Text style={styles.actionLabel}>{sentAction === 'call' ? 'Sent!' : 'Call me'}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleHeartPress}
              activeOpacity={0.6}
              accessibilityLabel="Send heart"
              accessibilityRole="button"
            >
              <Animated.View style={{ transform: [{ scale: heartScale }] }}>
                {sentAction === 'heart' ? (
                  <MaterialCommunityIcons name="check-bold" size={28} color="#EF4444" />
                ) : (
                  <Ionicons name="heart" size={20} color="#EF4444" />
                )}
              </Animated.View>
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
