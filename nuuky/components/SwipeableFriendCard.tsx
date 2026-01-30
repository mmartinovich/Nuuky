import React, { useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Alert, Image, TouchableOpacity } from 'react-native';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { RectButton } from 'react-native-gesture-handler';
import Reanimated, {
  SharedValue,
  useAnimatedStyle,
  interpolate,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { User, Friendship } from '../types';
import { getMoodColor } from '../lib/theme';
import { isUserTrulyOnline } from '../lib/utils';

const ACTION_WIDTH = 74; // Per-action width, iOS standard
const TAILWIND_RED = '#EF4444';

interface SwipeableFriendCardProps {
  friendship: Friendship;
  onRemove: (friendship: Friendship) => void;
  textPrimaryColor: string;
}

function RightAction({
  drag,
  iconName,
  label,
  color,
  index,
  totalActions,
  onPress,
}: {
  drag: SharedValue<number>;
  iconName: string;
  label: string;
  color: string;
  index: number;
  totalActions: number;
  onPress: () => void;
}) {
  const actionOffset = ACTION_WIDTH * (totalActions - index);

  const animatedStyle = useAnimatedStyle(() => {
    const dragValue = Math.abs(drag.value);
    const translateX = interpolate(
      dragValue,
      [0, actionOffset],
      [actionOffset, 0],
      'clamp'
    );

    return {
      transform: [{ translateX }],
    };
  });

  return (
    <Reanimated.View style={[styles.actionButton, animatedStyle]}>
      <RectButton
        style={[styles.actionButtonInner, { backgroundColor: color }]}
        onPress={onPress}
      >
        <Ionicons name={iconName as any} size={24} color="#FFFFFF" />
        <Text style={styles.actionText}>{label}</Text>
      </RectButton>
    </Reanimated.View>
  );
}

export const SwipeableFriendCard: React.FC<SwipeableFriendCardProps> = ({
  friendship,
  onRemove,
  textPrimaryColor,
}) => {
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
    (prog: SharedValue<number>, drag: SharedValue<number>) => {
      return (
        <View style={{ width: ACTION_WIDTH + 20, flexDirection: 'row', marginLeft: -20 }}>
          <RightAction
            drag={drag}
            iconName="trash-outline"
            label="Remove"
            color={TAILWIND_RED}
            index={0}
            totalActions={1}
            onPress={handleRemoveAction}
          />
        </View>
      );
    },
    [handleRemoveAction]
  );

  const onSwipeableOpen = useCallback((direction: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (direction === 'right') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }
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
      overshootRight={true}
      overshootFriction={8}
      friction={1.5}
      onSwipeableOpen={onSwipeableOpen}
      onSwipeableClose={onSwipeableClose}
      containerStyle={styles.swipeableContainer}
      enableTrackpadTwoFingerGesture
    >
      <View style={styles.friendCard}>
        <View style={styles.friendInfo}>
          <View style={styles.friendAvatarWrapper}>
            {friend.avatar_url ? (
              <Image
                source={{ uri: friend.avatar_url }}
                style={[
                  styles.friendAvatar,
                  {
                    borderColor: isOnline ? moodColors.base : "rgba(255,255,255,0.1)",
                  },
                ]}
              />
            ) : (
              <View
                style={[
                  styles.friendAvatar,
                  {
                    backgroundColor: moodColors.base,
                    borderColor: isOnline ? moodColors.base : "rgba(255,255,255,0.1)",
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
            {isOnline && <View style={styles.onlineIndicator} />}
          </View>

          <View style={styles.friendText}>
            <Text style={[styles.friendName, { color: textPrimaryColor }]}>{friend.display_name}</Text>
            <Text style={styles.friendStatus}>{isOnline ? "Online" : "Offline"}</Text>
          </View>
        </View>
      </View>
    </ReanimatedSwipeable>
  );
};

const styles = StyleSheet.create({
  swipeableContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
  },
  actionButton: {
    width: ACTION_WIDTH + 20, // Extended to go underneath card
    height: '100%',
  },
  actionButtonInner: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'flex-end', // Align content to the right
    paddingRight: 20, // Space from right edge
    gap: 4,
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  friendCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
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
    borderColor: "#0d0d1a",
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
    color: "rgba(255,255,255,0.5)",
  },
});
