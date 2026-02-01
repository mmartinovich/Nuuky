import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Image as CachedImage } from 'expo-image';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import Reanimated, {
  SharedValue,
  useAnimatedStyle,
  interpolate,
} from 'react-native-reanimated';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { AppNotification, NotificationType } from '../types';
import { spacing, radius, typography } from '../lib/theme';
import { formatRelativeTime } from '../lib/utils';
import { useTheme } from '../hooks/useTheme';

const ACTION_WIDTH = 64;
const ACTION_GAP = 8;

interface NotificationCardProps {
  notification: AppNotification;
  onPress: () => void;
  onDelete: () => void;
  animationDelay?: number;
  selectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: () => void;
  onEnterSelectionMode?: () => void;
}

// Get icon and color based on notification type
const getNotificationStyle = (type: NotificationType) => {
  switch (type) {
    case 'nudge':
      return {
        icon: 'hand-wave' as const,
        iconSet: 'mci' as const,
        color: '#3B82F6',
      };
    case 'call_me':
      return {
        icon: 'call' as const,
        iconSet: 'ionicons' as const,
        color: '#22C55E',
      };
    case 'flare':
      return {
        icon: 'heart' as const,
        iconSet: 'ionicons' as const,
        color: '#EF4444',
      };
    case 'friend_request':
      return {
        icon: 'person-add' as const,
        iconSet: 'ionicons' as const,
        color: '#3B82F6',
      };
    case 'friend_accepted':
      return {
        icon: 'checkmark-circle' as const,
        iconSet: 'ionicons' as const,
        color: '#22C55E',
      };
    case 'room_invite':
      return {
        icon: 'people' as const,
        iconSet: 'ionicons' as const,
        color: '#A855F7',
      };
    default:
      return {
        icon: 'notifications' as const,
        iconSet: 'ionicons' as const,
        color: '#9CA3AF',
      };
  }
};

export const NotificationCard: React.FC<NotificationCardProps> = ({
  notification,
  onPress,
  onDelete,
  animationDelay = 0,
  selectionMode = false,
  isSelected = false,
  onToggleSelect,
  onEnterSelectionMode,
}) => {
  const { theme, accent } = useTheme();
  const swipeableRef = useRef<any>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const checkboxAnim = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(checkboxAnim, {
      toValue: selectionMode ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [selectionMode]);

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

  const notificationStyle = getNotificationStyle(notification.type);
  const avatarUrl = notification.data.sender_avatar_url || notification.data.friend_avatar_url;

  // Strip leading emojis from title (they come baked in from edge functions)
  const cleanTitle = notification.title.replace(/^[\p{Emoji_Presentation}\p{Extended_Pictographic}\uFE0F\u200D]+\s*/u, '');

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

  const handlePress = () => {
    if (selectionMode) {
      onToggleSelect?.();
    }
  };

  const handleLongPress = () => {
    if (!selectionMode) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onEnterSelectionMode?.();
    }
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
        enabled={!selectionMode}
        onSwipeableWillOpen={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }}
        enableTrackpadTwoFingerGesture
      >
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={handlePress}
          onLongPress={handleLongPress}
          delayLongPress={400}
        >
          <View
            style={[
              styles.card,
              {
                backgroundColor: theme.colors.glass.background,
                borderColor: theme.colors.glass.border,
              },
            ]}
          >
            <View style={styles.content}>
              {/* Selection checkbox — animated width pushes content right */}
              <Animated.View
                style={[
                  styles.checkboxWrapper,
                  {
                    width: checkboxAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, 20],
                    }),
                    opacity: checkboxAnim,
                  },
                ]}
                pointerEvents={selectionMode ? 'auto' : 'none'}
              >
                <View
                  style={[
                    styles.checkbox,
                    {
                      borderColor: isSelected ? accent.primary : theme.colors.text.tertiary,
                      backgroundColor: isSelected ? accent.primary : 'transparent',
                    },
                  ]}
                >
                  {isSelected && (
                    <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                  )}
                </View>
              </Animated.View>

              {/* Avatar + type badge */}
              <View style={styles.iconContainer}>
                {avatarUrl ? (
                  <CachedImage
                    source={{ uri: avatarUrl }}
                    style={[styles.avatar, { borderColor: theme.colors.glass.border }]}
                    cachePolicy="memory-disk"
                    contentFit="cover"
                    transition={200}
                  />
                ) : (
                  <View
                    style={[
                      styles.avatar,
                      {
                        backgroundColor: theme.colors.glass.background,
                        borderColor: theme.colors.glass.border,
                        justifyContent: 'center',
                        alignItems: 'center',
                      },
                    ]}
                  >
                    <Ionicons name="person" size={16} color={theme.colors.text.tertiary} />
                  </View>
                )}
                {/* Type icon badge */}
                <View style={[styles.typeBadge, { backgroundColor: theme.colors.bg.primary }]}>
                  <View style={[styles.typeBadgeInner, { backgroundColor: `${notificationStyle.color}25` }]}>
                    {notificationStyle.iconSet === 'mci' ? (
                      <MaterialCommunityIcons
                        name={notificationStyle.icon as any}
                        size={10}
                        color={notificationStyle.color}
                      />
                    ) : (
                      <Ionicons
                        name={notificationStyle.icon as any}
                        size={10}
                        color={notificationStyle.color}
                      />
                    )}
                  </View>
                </View>
              </View>

              {/* Text content */}
              <View style={styles.textContainer}>
                <Text
                  style={[
                    styles.title,
                    {
                      color: theme.colors.text.primary,
                      fontWeight: '500',
                    },
                  ]}
                  numberOfLines={1}
                >
                  {cleanTitle}
                </Text>
              </View>

              {/* Time */}
              <Text style={[styles.time, { color: theme.colors.text.tertiary }]}>
                {formatRelativeTime(notification.created_at)}
              </Text>
            </View>
          </View>
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
        <Ionicons name="trash-outline" size={20} color="#FFFFFF" />
      </TouchableOpacity>
    </Reanimated.View>
  );
}

const styles = StyleSheet.create({
  animatedContainer: {
    marginBottom: 6,
  },
  card: {
    borderRadius: radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    position: 'relative',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
  },
  typeBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  typeBadgeInner: {
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: typography.size.sm,
  },
  body: {
    fontSize: typography.size.xs,
    lineHeight: 15,
  },
  time: {
    fontSize: typography.size.xs,
    flexShrink: 0,
  },
  actionWrapper: {
    width: ACTION_WIDTH + ACTION_GAP,
    paddingLeft: ACTION_GAP,
    justifyContent: 'center',
  },
  actionButton: {
    height: '100%',
    backgroundColor: '#EF4444',
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
