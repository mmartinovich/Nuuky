import React, { useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Alert, Image, TouchableOpacity } from 'react-native';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import Reanimated, {
  SharedValue,
  useAnimatedStyle,
  interpolate,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { User, Friendship, Streak } from '../types';
import { getMoodColor, radius } from '../lib/theme';
import { isUserTrulyOnline, formatRelativeTime } from '../lib/utils';
import { BoltIcon, BoltTier } from './StreakBadge';
import { useTheme } from '../hooks/useTheme';

const ACTION_WIDTH = 74;
const ACTION_GAP = 10;

interface SwipeableFriendCardProps {
  friendship: Friendship;
  onPress?: () => void;
  onRemove: (friendship: Friendship) => void;
  textPrimaryColor: string;
  streak?: Streak;
}

export const SwipeableFriendCard: React.FC<SwipeableFriendCardProps> = ({
  friendship,
  onPress,
  onRemove,
  textPrimaryColor,
  streak,
}) => {
  const { theme } = useTheme();
  const swipeableRef = useRef<any>(null);
  const pendingAction = useRef<'remove' | null>(null);
  const friend = friendship.friend as User;
  const moodColors = getMoodColor(friend.mood);
  const isOnline = isUserTrulyOnline(isOnline, friend.last_seen_at);

  const performRemoveAction = useCallback(async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    onRemove(friendship);
  }, [friendship, onRemove]);

  const handleRemoveAction = useCallback(() => {
    pendingAction.current = 'remove';
    swipeableRef.current?.close();
  }, []);

  const renderRightActions = useCallback(
    (_prog: SharedValue<number>, drag: SharedValue<number>) => {
      return (
        <RightActionButton
          drag={drag}
          iconName="trash-outline"
          label="Remove"
          onPress={handleRemoveAction}
        />
      );
    },
    [handleRemoveAction]
  );

  const onSwipeableOpen = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const onSwipeableClose = useCallback(() => {
    if (pendingAction.current === 'remove') {
      pendingAction.current = null;

      Alert.alert('Remove Friend?', `Remove ${friend.display_name} from your friends?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: performRemoveAction },
      ]);
    }
    pendingAction.current = null;
  }, [friend.display_name, performRemoveAction]);

  return (
    <ReanimatedSwipeable
      ref={swipeableRef}
      renderRightActions={renderRightActions}
      rightThreshold={ACTION_WIDTH}
      overshootRight={false}
      friction={1.5}
      onSwipeableOpen={onSwipeableOpen}
      onSwipeableClose={onSwipeableClose}
      enableTrackpadTwoFingerGesture
    >
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={onPress}
        onLongPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          Alert.alert(friend.display_name, '', [
            { text: 'Remove Friend', style: 'destructive', onPress: performRemoveAction },
            { text: 'Cancel', style: 'cancel' },
          ]);
        }}
        delayLongPress={400}
        style={[
          styles.friendCard,
          {
            backgroundColor: theme.colors.glass.background,
            borderColor: theme.colors.glass.border,
          }
        ]}
      >
        <View style={styles.friendInfo}>
          <View style={styles.friendAvatarWrapper}>
            {friend.avatar_url ? (
              <Image
                source={{ uri: friend.avatar_url }}
                style={[
                  styles.friendAvatar,
                  {
                    borderColor: isOnline ? moodColors.base : theme.colors.ui.borderLight,
                  },
                ]}
              />
            ) : (
              <View
                style={[
                  styles.friendAvatar,
                  {
                    backgroundColor: moodColors.base,
                    borderColor: isOnline ? moodColors.base : theme.colors.ui.borderLight,
                    justifyContent: 'center',
                    alignItems: 'center',
                  },
                ]}
              >
                <Text style={styles.avatarText}>
                  {friend.display_name.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            {isOnline && <View style={[styles.onlineIndicator, { borderColor: theme.colors.bg.primary }]} />}
          </View>

          <View style={styles.friendText}>
            <Text style={[styles.friendName, { color: textPrimaryColor }]}>{friend.display_name}</Text>
            {isOnline ? (
              <Text style={[styles.friendStatus, { color: '#22C55E' }]}>Online</Text>
            ) : friend.last_seen_at ? (
              <Text style={[styles.friendStatus, { color: theme.colors.text.tertiary }]}>{formatRelativeTime(friend.last_seen_at)}</Text>
            ) : null}
          </View>
        </View>

        {streak && streak.state !== 'broken' && streak.consecutive_days >= 1 && (() => {
          const days = streak.consecutive_days;
          const tier: BoltTier = days >= 15 ? 'fire' : days >= 7 ? 'gold' : 'teal';
          const borderColors = {
            teal: 'rgba(0, 220, 240, 0.5)',
            gold: 'rgba(255, 184, 0, 0.6)',
            fire: 'rgba(224, 27, 27, 0.7)',
          };
          const textColors = {
            teal: '#00f0ff',
            gold: '#FFB800',
            fire: '#FF6B35',
          };
          return (
            <View style={[styles.streakInline, { borderColor: borderColors[tier] }]}>
              <BoltIcon size={14} tier={tier} />
              <Text style={[styles.streakCount, { color: textColors[tier] }]}>{days}</Text>
            </View>
          );
        })()}
      </TouchableOpacity>
    </ReanimatedSwipeable>
  );
};

function RightActionButton({
  drag,
  iconName,
  label,
  onPress,
}: {
  drag: SharedValue<number>;
  iconName: string;
  label: string;
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
        <Ionicons name={iconName as any} size={22} color="#FFFFFF" />
        <Text style={styles.actionLabel}>{label}</Text>
      </TouchableOpacity>
    </Reanimated.View>
  );
}

const styles = StyleSheet.create({
  actionWrapper: {
    width: ACTION_WIDTH + ACTION_GAP,
    paddingLeft: ACTION_GAP,
    justifyContent: 'center',
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
  friendCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  friendInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 12,
  },
  friendAvatarWrapper: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  friendAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  onlineIndicator: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#22C55E",
    borderWidth: 2,
  },
  friendText: {
    flex: 1,
  },
  friendName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 2,
  },
  friendStatus: {
    fontSize: 13,
  },
  streakInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(15, 25, 45, 0.9)',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
  },
  streakCount: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
