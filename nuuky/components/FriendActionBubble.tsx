import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Dimensions, Platform } from 'react-native';
import { Ionicons, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { User } from '../types';
import { colors, typography } from '../lib/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface FriendActionBubbleProps {
  friend: User;
  position: { x: number; y: number };
  onDismiss: () => void;
  onNudge: () => void;
  onCallMe: () => void;
  onHeart: () => void;
}

export function FriendActionBubble({
  friend,
  position,
  onDismiss,
  onNudge,
  onCallMe,
  onHeart,
}: FriendActionBubbleProps) {
  const scaleAnim = useRef(new Animated.Value(0.3)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  // Button animation values
  const nudgeScale = useRef(new Animated.Value(1)).current;
  const callRotate = useRef(new Animated.Value(0)).current;
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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Slow wobble like waving
    Animated.sequence([
      Animated.timing(nudgeScale, {
        toValue: 1.15,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(nudgeScale, {
        toValue: 0.95,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(nudgeScale, {
        toValue: 1.1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(nudgeScale, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onNudge();
    });
  };

  const handleCallPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Quick wobble like phone ringing
    Animated.sequence([
      Animated.timing(callRotate, {
        toValue: 1,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(callRotate, {
        toValue: -1,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(callRotate, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(callRotate, {
        toValue: -1,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(callRotate, {
        toValue: 0,
        duration: 50,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onCallMe();
    });
  };

  const handleHeartPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Quick double-pulse
    Animated.sequence([
      Animated.timing(heartScale, {
        toValue: 1.3,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(heartScale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(heartScale, {
        toValue: 1.3,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(heartScale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onHeart();
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
                <MaterialCommunityIcons name="hand-wave" size={18} color="#3B82F6" />
              </Animated.View>
              <Text style={styles.actionLabel}>Nudge</Text>
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
                    {
                      rotate: callRotate.interpolate({
                        inputRange: [-1, 1],
                        outputRange: ['-15deg', '15deg'],
                      }),
                    },
                  ],
                }}
              >
                <Ionicons name="call" size={18} color="#22C55E" />
              </Animated.View>
              <Text style={styles.actionLabel}>Call me</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleHeartPress}
              activeOpacity={0.6}
              accessibilityLabel="Send heart"
              accessibilityRole="button"
            >
              <Animated.View style={{ transform: [{ scale: heartScale }] }}>
                <Ionicons name="heart" size={18} color="#EF4444" />
              </Animated.View>
              <Text style={styles.actionLabel}>Heart</Text>
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
