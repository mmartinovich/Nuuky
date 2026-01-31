import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Animated,
} from 'react-native';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import Reanimated, {
  SharedValue,
  useAnimatedStyle,
  interpolate,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { AppNotification, NotificationType } from '../types';
import { spacing, radius, typography } from '../lib/theme';
import { formatRelativeTime } from '../lib/utils';
import { useTheme } from '../hooks/useTheme';

const ACTION_WIDTH = 74;
const ACTION_GAP = 10;

interface NotificationCardProps {
  notification: AppNotification;
  onPress: () => void;
  onDelete: () => void;
  animationDelay?: number;
}

// Get icon and color based on notification type
const getNotificationStyle = (type: NotificationType, theme: any) => {
  switch (type) {
    case 'nudge':
      return {
        icon: 'hand-left' as const,
        color: theme.colors.mood.neutral.base,
        label: 'Nudge',
      };
    case 'flare':
      return {
        icon: 'flame' as const,
        color: theme.colors.neon.orange,
        label: 'Flare',
      };
    case 'friend_request':
      return {
        icon: 'person-add' as const,
        color: theme.colors.neon.cyan,
        label: 'Friend Request',
      };
    case 'friend_accepted':
      return {
        icon: 'checkmark-circle' as const,
        color: theme.colors.mood.good.base,
        label: 'Friend Accepted',
      };
    case 'room_invite':
      return {
        icon: 'people' as const,
        color: theme.colors.neon.purple,
        label: 'Room Invite',
      };
    case 'call_me':
      return {
        icon: 'call' as const,
        color: theme.colors.mood.good.base,
        label: 'Call Request',
      };
    default:
      return {
        icon: 'notifications' as const,
        color: theme.colors.text.secondary,
        label: 'Notification',
      };
  }
};

export const NotificationCard: React.FC<NotificationCardProps> = ({
  notification,
  onPress,
  onDelete,
  animationDelay = 0,
}) => {
  const { theme, isDark } = useTheme();
  const swipeableRef = useRef<any>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  // Animate in on mount
  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        delay: animationDelay,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        delay: animationDelay,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const notificationStyle = getNotificationStyle(notification.type, theme);
  const avatarUrl = notification.data.sender_avatar_url || notification.data.friend_avatar_url;

  // Handle delete with haptic feedback
  const handleDelete = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      onDelete();
    });
  };

  const renderRightActions = (
    _prog: SharedValue<number>,
    drag: SharedValue<number>,
  ) => {
    return (
      <RightActionButton
        drag={drag}
        onPress={() => {
          swipeableRef.current?.close();
          handleDelete();
        }}
      />
    );
  };

  return (
    <Animated.View
      style={[
        styles.animatedContainer,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <ReanimatedSwipeable
        ref={swipeableRef}
        renderRightActions={renderRightActions}
        rightThreshold={ACTION_WIDTH}
        overshootRight={false}
        friction={1.5}
        onSwipeableWillOpen={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }}
        enableTrackpadTwoFingerGesture
      >
        <TouchableOpacity activeOpacity={0.8} onPress={onPress}>
          <BlurView
            intensity={isDark ? 20 : 40}
            tint={theme.colors.blurTint}
            style={[
              styles.card,
              {
                borderColor: notification.is_read
                  ? theme.colors.glass.border
                  : `${theme.colors.neon.cyan}40`,
              },
            ]}
          >
            <LinearGradient
              colors={notification.is_read ? theme.gradients.card : theme.gradients.glass}
              style={styles.gradient}
            >
              <View style={styles.content}>
                {/* Avatar or Icon */}
                <View style={styles.iconContainer}>
                  {avatarUrl ? (
                    <Image
                      source={{ uri: avatarUrl }}
                      style={[styles.avatar, { borderColor: theme.colors.glass.border }]}
                    />
                  ) : (
                    <View
                      style={[
                        styles.iconCircle,
                        { backgroundColor: `${notificationStyle.color}20` },
                      ]}
                    >
                      <Ionicons
                        name={notificationStyle.icon}
                        size={20}
                        color={notificationStyle.color}
                      />
                    </View>
                  )}
                  {/* Unread dot */}
                  {!notification.is_read && (
                    <View
                      style={[
                        styles.unreadDot,
                        {
                          backgroundColor: theme.colors.neon.cyan,
                          borderColor: theme.colors.bg.primary,
                        },
                      ]}
                    />
                  )}
                </View>

                {/* Text content */}
                <View style={styles.textContainer}>
                  <Text
                    style={[
                      styles.title,
                      {
                        color: theme.colors.text.primary,
                        fontWeight: notification.is_read ? '500' : '600',
                      },
                    ]}
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
                  <Text style={[styles.time, { color: theme.colors.text.tertiary }]}>
                    {formatRelativeTime(notification.created_at)}
                  </Text>
                </View>

                {/* Chevron */}
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={theme.colors.text.tertiary}
                />
              </View>
            </LinearGradient>
          </BlurView>
        </TouchableOpacity>
      </ReanimatedSwipeable>
    </Animated.View>
  );
};

function RightActionButton({
  drag,
  onPress,
}: {
  drag: SharedValue<number>;
  onPress: () => void;
}) {
  const animatedStyle = useAnimatedStyle(() => {
    const dragValue = Math.abs(drag.value);
    const translateX = interpolate(
      dragValue,
      [0, ACTION_WIDTH + ACTION_GAP],
      [ACTION_WIDTH + ACTION_GAP, 0],
      'clamp'
    );
    const opacity = interpolate(
      dragValue,
      [0, ACTION_WIDTH * 0.5],
      [0, 1],
      'clamp'
    );
    return {
      transform: [{ translateX }],
      opacity,
    };
  });

  return (
    <Reanimated.View style={[styles.actionWrapper, animatedStyle]}>
      <TouchableOpacity
        style={styles.actionButton}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <Ionicons name="trash-outline" size={22} color="#FFFFFF" />
        <Text style={styles.actionLabel}>Delete</Text>
      </TouchableOpacity>
    </Reanimated.View>
  );
}

const styles = StyleSheet.create({
  animatedContainer: {
    marginBottom: spacing.sm,
  },
  card: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
  },
  gradient: {
    padding: spacing.md,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  iconContainer: {
    position: 'relative',
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
  unreadDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
  },
  textContainer: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: typography.size.md,
  },
  body: {
    fontSize: typography.size.sm,
    lineHeight: 18,
  },
  time: {
    fontSize: typography.size.xs,
    marginTop: 2,
  },
  actionWrapper: {
    width: ACTION_WIDTH + ACTION_GAP,
    paddingLeft: ACTION_GAP,
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#EF4444',
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
