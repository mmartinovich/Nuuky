import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  PanResponder,
  Dimensions,
} from 'react-native';
import { Image as CachedImage } from 'expo-image';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../hooks/useTheme';
import { spacing, radius } from '../lib/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BANNER_HEIGHT = 80;
const AUTO_DISMISS_DELAY = 4000; // 4 seconds like Instagram

export interface InAppNotification {
  id: string;
  title: string;
  body: string;
  icon?: string;
  avatarUrl?: string;
  color?: string;
  onPress?: () => void;
}

interface Props {
  notification: InAppNotification | null;
  onDismiss: () => void;
}

export const InAppNotificationBanner: React.FC<Props> = ({ notification, onDismiss }) => {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(-BANNER_HEIGHT - insets.top - 20)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const dismissTimer = useRef<NodeJS.Timeout>();

  // Pan responder for swipe-to-dismiss
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only handle upward swipes
        return gestureState.dy < -5;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy < 0) {
          translateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy < -50 || gestureState.vy < -0.5) {
          // Swipe up to dismiss
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          dismissNotification();
        } else {
          // Spring back
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            tension: 100,
            friction: 10,
          }).start();
        }
      },
    })
  ).current;

  // Show notification with animation
  useEffect(() => {
    if (notification) {
      // Clear any existing timer
      if (dismissTimer.current) {
        clearTimeout(dismissTimer.current);
      }

      // Trigger haptic
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Slide down animation
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 80,
          friction: 12,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto-dismiss after delay
      dismissTimer.current = setTimeout(() => {
        dismissNotification();
      }, AUTO_DISMISS_DELAY);
    }

    return () => {
      if (dismissTimer.current) {
        clearTimeout(dismissTimer.current);
      }
    };
  }, [notification]);

  const dismissNotification = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -BANNER_HEIGHT - insets.top - 20,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss();
    });
  };

  const handlePress = () => {
    if (notification?.onPress) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      dismissNotification();
      // Small delay to let animation complete before navigation
      setTimeout(() => {
        notification.onPress?.();
      }, 100);
    }
  };

  if (!notification) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          paddingTop: insets.top + spacing.sm,
          transform: [{ translateY }],
          opacity,
        },
      ]}
      {...panResponder.panHandlers}
    >
      <TouchableOpacity
        activeOpacity={0.95}
        onPress={handlePress}
        style={styles.touchable}
      >
        <BlurView
          intensity={isDark ? 80 : 90}
          tint={theme.colors.blurTint}
          style={styles.blurContainer}
        >
          <LinearGradient
            colors={[
              `${theme.colors.glass.background}E6`,
              `${theme.colors.glass.background}CC`,
            ]}
            style={[
              styles.banner,
              {
                borderColor: notification.color
                  ? `${notification.color}40`
                  : theme.colors.glass.border,
                shadowColor: notification.color || theme.colors.neon.cyan,
              },
            ]}
          >
            {/* App icon or Avatar */}
            <View style={styles.iconContainer}>
              {notification.avatarUrl ? (
                <CachedImage
                  source={{ uri: notification.avatarUrl }}
                  style={[
                    styles.avatar,
                    { borderColor: theme.colors.glass.border },
                  ]}
                  cachePolicy="memory-disk"
                  contentFit="cover"
                  transition={200}
                />
              ) : (
                <View
                  style={[
                    styles.iconCircle,
                    {
                      backgroundColor: notification.color
                        ? `${notification.color}20`
                        : `${theme.colors.neon.purple}20`,
                    },
                  ]}
                >
                  <Ionicons
                    name={(notification.icon as any) || 'notifications'}
                    size={22}
                    color={notification.color || theme.colors.neon.purple}
                  />
                </View>
              )}
            </View>

            {/* Content */}
            <View style={styles.content}>
              <Text
                style={[styles.title, { color: theme.colors.text.primary }]}
                numberOfLines={1}
              >
                {notification.title}
              </Text>
              <Text
                style={[styles.body, { color: theme.colors.text.secondary }]}
                numberOfLines={2}
              >
                {notification.body}
              </Text>
            </View>

            {/* Dismiss button */}
            <TouchableOpacity
              style={styles.dismissButton}
              onPress={dismissNotification}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons
                name="close"
                size={20}
                color={theme.colors.text.tertiary}
              />
            </TouchableOpacity>

            {/* Swipe indicator */}
            <View
              style={[
                styles.swipeIndicator,
                { backgroundColor: theme.colors.text.tertiary },
              ]}
            />
          </LinearGradient>
        </BlurView>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    paddingHorizontal: spacing.md,
  },
  touchable: {
    width: '100%',
  },
  blurContainer: {
    borderRadius: radius.xl,
    overflow: 'hidden',
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.sm,
    borderRadius: radius.xl,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  iconContainer: {
    width: 44,
    height: 44,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  body: {
    fontSize: 13,
    lineHeight: 18,
  },
  dismissButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.xs,
  },
  swipeIndicator: {
    position: 'absolute',
    bottom: 6,
    alignSelf: 'center',
    width: 32,
    height: 3,
    borderRadius: 1.5,
    opacity: 0.3,
  },
});
