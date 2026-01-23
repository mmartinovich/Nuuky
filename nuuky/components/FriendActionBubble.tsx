import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Animated, Dimensions } from 'react-native';
import { Ionicons, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { User } from '../types';

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
  const heartScale = useRef(new Animated.Value(0)).current;
  const heartOpacity = useRef(new Animated.Value(0)).current;
  const [showHeartAnimation, setShowHeartAnimation] = useState(false);

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
  const bubbleWidth = 140;
  const avatarRadius = 35; // Approximate avatar radius
  const bubbleX = Math.max(
    16,
    Math.min(position.x - bubbleWidth / 2, SCREEN_WIDTH - bubbleWidth - 16)
  );
  const bubbleY = position.y - avatarRadius - 70; // Position well above avatar

  // Adjust if bubble would go off screen top
  const isAbove = bubbleY >= 100;
  const finalBubbleY = isAbove ? bubbleY : position.y + avatarRadius + 50;
  
  // Calculate tail position to point at friend
  const tailX = position.x - bubbleX;

  const handleHeartPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    // Show heart animation
    setShowHeartAnimation(true);
    heartScale.setValue(0.3); // Start small (same size as icon)
    heartOpacity.setValue(1);
    
    // Animate heart growing much bigger while fading out
    Animated.parallel([
      Animated.spring(heartScale, {
        toValue: 5, // Grow much bigger
        tension: 60,
        friction: 5,
        useNativeDriver: true,
      }),
      Animated.timing(heartOpacity, {
        toValue: 0, // Fade out as it grows
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowHeartAnimation(false);
      onHeart();
      // Don't close bubble - let user dismiss manually or tap another action
    });
  };

  const handleAction = (action: () => void) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    // Quick exit animation
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
    ]).start(() => {
      action();
      onDismiss();
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
          {/* Action icons - clean, no circles */}
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleAction(onNudge)}
              activeOpacity={0.6}
            >
              <MaterialCommunityIcons name="cursor-pointer" size={24} color="#A855F7" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleAction(onCallMe)}
              activeOpacity={0.6}
            >
              <Ionicons name="call" size={24} color="#34C759" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleHeartPress}
              activeOpacity={0.6}
            >
              <Ionicons name="heart" size={24} color="#FF0000" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Speech bubble tail - pointing down when above */}
        {isAbove && (
          <View 
            style={[
              styles.tailDown,
              { left: Math.max(14, Math.min(tailX - 10, bubbleWidth - 34)) }
            ]} 
          />
        )}
        
        {/* Speech bubble tail - pointing up when below */}
        {!isAbove && (
          <View 
            style={[
              styles.tailUp,
              { left: Math.max(14, Math.min(tailX - 10, bubbleWidth - 34)) }
            ]} 
          />
        )}
      </Animated.View>

      {/* Animated heart that grows and fades - positioned at heart button location */}
      {showHeartAnimation && (
        <Animated.View
          style={[
            styles.heartAnimation,
            {
              // Heart button is the 3rd button, at the right side of the bubble
              // Bubble: 140 width, 12px padding, 3 buttons with space-around
              // Heart is at approximately bubbleX + 110 (right third)
              left: bubbleX + 110,
              top: finalBubbleY + 24, // Center of bubble vertically (10 padding + ~14 to icon center)
              transform: [{ scale: heartScale }],
              opacity: heartOpacity,
            },
          ]}
          pointerEvents="none"
        >
          <Ionicons name="heart" size={60} color="#FF0000" />
        </Animated.View>
      )}
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
    width: 140,
  },
  bubble: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderRadius: 28, // Pill shape
    paddingHorizontal: 12,
    paddingVertical: 10,
    // Soft shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  actionButton: {
    padding: 6,
  },
  // Tail pointing down (bubble is above friend)
  tailDown: {
    position: 'absolute',
    bottom: -10,
    width: 0,
    height: 0,
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderTopWidth: 12,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: 'rgba(255, 255, 255, 0.85)',
    // Match bubble shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  // Tail pointing up (bubble is below friend)
  tailUp: {
    position: 'absolute',
    top: -10,
    width: 0,
    height: 0,
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderBottomWidth: 12,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: 'rgba(255, 255, 255, 0.85)',
  },
  heartAnimation: {
    position: 'absolute',
    width: 60,
    height: 60,
    marginLeft: -30, // Center horizontally
    marginTop: -30, // Center vertically
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1002,
  },
});
