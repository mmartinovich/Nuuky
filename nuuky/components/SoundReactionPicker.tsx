import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Pressable,
  PanResponder,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { SOUND_TYPES, SOUND_METADATA } from '../lib/soundPlayer';
import { SoundReactionType } from '../types';

interface SoundReactionPickerProps {
  visible: boolean;
  onSelect: (soundId: SoundReactionType) => void;
  onClose: () => void;
  canSend: boolean;
  cooldownProgress: number;
  lastSentSound: SoundReactionType | null;
  isGhostModeBlocked: boolean;
  isReconnecting?: boolean;
  anchorPosition: { x: number; y: number };
  accent: { primary: string; soft: string; [key: string]: any };
  theme: any;
  onPreview?: (soundId: SoundReactionType) => void;
  onPreviewEnd?: (soundId: SoundReactionType) => void;
}

const BUTTON_SIZE = 58;
const RADIUS = 115;
const START_ANGLE = -155;
const END_ANGLE = -25;

export const SoundReactionPicker: React.FC<SoundReactionPickerProps> = ({
  visible,
  onSelect,
  onClose,
  canSend,
  cooldownProgress,
  lastSentSound,
  isGhostModeBlocked,
  isReconnecting,
  anchorPosition,
  accent,
  theme,
  onPreview,
  onPreviewEnd,
}) => {
  const animValues = useRef(SOUND_TYPES.map(() => new Animated.Value(0))).current;
  const [shouldRender, setShouldRender] = useState(false);
  const [previewingId, setPreviewingId] = useState<SoundReactionType | null>(null);
  const closeTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Pan responder for pull-down to close
  const panResponder = useMemo(() => {
    const SWIPE_DOWN_THRESHOLD = 40;
    let didClose = false;

    return PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only capture if significant downward movement
        return gestureState.dy > 15 && Math.abs(gestureState.dx) < 50;
      },
      onPanResponderGrant: () => {
        didClose = false;
      },
      onPanResponderMove: (_, gestureState) => {
        if (!didClose && gestureState.dy > SWIPE_DOWN_THRESHOLD) {
          didClose = true;
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onClose();
        }
      },
      onPanResponderRelease: () => {},
    });
  }, [onClose]);

  const getButtonPosition = (index: number) => {
    const totalButtons = SOUND_TYPES.length;
    const angleStep = (END_ANGLE - START_ANGLE) / (totalButtons - 1);
    const angleDeg = START_ANGLE + (index * angleStep);
    const angleRad = (angleDeg * Math.PI) / 180;
    return {
      x: Math.cos(angleRad) * RADIUS,
      y: Math.sin(angleRad) * RADIUS,
    };
  };

  useEffect(() => {
    if (visible) {
      setShouldRender(true);

      // Reset and animate open
      animValues.forEach((anim, index) => {
        anim.setValue(0);
        Animated.spring(anim, {
          toValue: 1,
          tension: 350 - (index * 10),
          friction: 12,
          delay: index * 35,
          useNativeDriver: true,
        }).start();
      });

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // Auto close after 4 seconds
      closeTimerRef.current = setTimeout(() => {
        onClose();
      }, 4000);
    } else {
      // Clear auto-close timer
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
      }

      // Animate closed
      const animations = animValues.map((anim, index) => {
        return Animated.spring(anim, {
          toValue: 0,
          tension: 350 - (index * 10),
          friction: 12,
          delay: index * 25,
          useNativeDriver: true,
        });
      });

      Animated.parallel(animations).start(() => {
        setShouldRender(false);
      });
    }

    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
      }
    };
  }, [visible]);

  const handleSelect = (soundId: SoundReactionType) => {
    if (canSend && !isGhostModeBlocked) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onSelect(soundId);
      onClose();
    }
  };

  const handleLongPress = (soundId: SoundReactionType) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPreviewingId(soundId);
    onPreview?.(soundId);
  };

  const handlePressOut = () => {
    if (previewingId) {
      onPreviewEnd?.(previewingId);
      setPreviewingId(null);
    }
  };

  if (!shouldRender) return null;

  const isDisabled = !canSend || isGhostModeBlocked || isReconnecting;
  const centerX = anchorPosition.x;
  const centerY = anchorPosition.y;

  // Cooldown ring dimensions
  const RING_STROKE = 3;
  const ringRadius = (BUTTON_SIZE - RING_STROKE) / 2;
  const ringCircumference = 2 * Math.PI * ringRadius;
  // Ring fills up as cooldown completes (1 - progress means full when ready)
  const strokeDashoffset = ringCircumference * cooldownProgress;

  // Smooth opacity: 0.5 when on cooldown, 1.0 when ready
  const buttonOpacity = cooldownProgress > 0 ? 0.5 : 1;

  return (
    <View style={styles.overlay} pointerEvents="box-none" {...panResponder.panHandlers}>
      {/* Buttons */}
      {SOUND_TYPES.map((soundId, index) => {
        const pos = getButtonPosition(index);
        const metadata = SOUND_METADATA[soundId];
        const anim = animValues[index];

        return (
          <Animated.View
            key={soundId}
            style={[
              styles.buttonWrapper,
              {
                left: centerX + pos.x - BUTTON_SIZE / 2,
                top: centerY + pos.y - BUTTON_SIZE / 2,
                opacity: anim,
                transform: [
                  {
                    translateX: anim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-pos.x, 0],
                    }),
                  },
                  {
                    translateY: anim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-pos.y, 0],
                    }),
                  },
                  {
                    scale: anim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.5, 1],
                    }),
                  },
                ],
              },
            ]}
          >
            {/* Cooldown progress ring - only on last sent sound */}
            {cooldownProgress > 0 && lastSentSound === soundId && (
              <View style={styles.ringContainer}>
                <Svg width={BUTTON_SIZE} height={BUTTON_SIZE}>
                  <Circle
                    cx={BUTTON_SIZE / 2}
                    cy={BUTTON_SIZE / 2}
                    r={ringRadius}
                    stroke="#4ADE80"
                    strokeWidth={RING_STROKE}
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray={ringCircumference}
                    strokeDashoffset={strokeDashoffset}
                    rotation="-90"
                    origin={`${BUTTON_SIZE / 2}, ${BUTTON_SIZE / 2}`}
                  />
                </Svg>
              </View>
            )}
            <Pressable
              onPress={() => handleSelect(soundId)}
              onLongPress={() => handleLongPress(soundId)}
              onPressOut={handlePressOut}
              disabled={isDisabled}
              delayLongPress={250}
              style={({ pressed }) => [
                styles.button,
                pressed && styles.buttonPressed,
                { opacity: isDisabled ? buttonOpacity : 1 },
              ]}
            >
              <Ionicons
                name={metadata.icon as any}
                size={26}
                color="#FFFFFF"
              />
            </Pressable>
          </Animated.View>
        );
      })}

      {/* Ghost mode badge */}
      {isGhostModeBlocked && (
        <View style={[styles.badge, { left: centerX - 55, top: centerY - RADIUS - 45 }]}>
          <Text style={styles.badgeText}>🔇 Ghost Mode</Text>
        </View>
      )}

      {/* Reconnecting badge */}
      {isReconnecting && !isGhostModeBlocked && (
        <View style={[styles.badge, styles.reconnectingBadge, { left: centerX - 60, top: centerY - RADIUS - 45 }]}>
          <Text style={styles.badgeText}>Reconnecting...</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 99999,
    elevation: 99999,
  },
  buttonWrapper: {
    position: 'absolute',
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    zIndex: 99999,
    elevation: 99999,
  },
  button: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    backgroundColor: '#202025',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.12)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 10,
  },
  buttonPressed: {
    backgroundColor: '#303035',
    transform: [{ scale: 1.1 }],
  },
  ringContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 58, // BUTTON_SIZE
    height: 58, // BUTTON_SIZE
  },
  badge: {
    position: 'absolute',
    backgroundColor: 'rgba(255,80,80,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,80,80,0.4)',
    zIndex: 99999,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  reconnectingBadge: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderColor: 'rgba(255,255,255,0.2)',
  },
});
