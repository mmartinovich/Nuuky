import React, { useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import Reanimated, {
  SharedValue,
  useAnimatedStyle,
  interpolate,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { RoomCard } from './RoomCard';
import { Room } from '../types';
import { radius } from '../lib/theme';
import { useTheme } from '../hooks/useTheme';

const ACTION_WIDTH = 74;
const ACTION_GAP = 10;

interface SwipeableRoomCardProps {
  room: Room;
  onPress: () => void;
  isCreator: boolean;
  isDefault: boolean;
  creatorName?: string;
  onDelete: (roomId: string) => Promise<boolean>;
  onLeave: (roomId: string) => Promise<void>;
}

export const SwipeableRoomCard: React.FC<SwipeableRoomCardProps> = ({
  room,
  onPress,
  isCreator,
  isDefault,
  creatorName,
  onDelete,
  onLeave,
}) => {
  const { theme } = useTheme();
  const swipeableRef = useRef<any>(null);
  const pendingAction = useRef<'destructive' | null>(null);

  const performDestructiveAction = useCallback(async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    if (isCreator) {
      await onDelete(room.id);
    } else {
      await onLeave(room.id);
    }
  }, [isCreator, room.id, onDelete, onLeave]);

  const handleDestructiveAction = useCallback(() => {
    pendingAction.current = 'destructive';
    swipeableRef.current?.close();
  }, []);

  const renderRightActions = useCallback(
    (_prog: SharedValue<number>, drag: SharedValue<number>) => {
      const destructiveLabel = isCreator ? 'Delete' : 'Leave';
      const destructiveIcon = isCreator ? 'trash-outline' : 'exit-outline';

      return (
        <RightActionButton
          drag={drag}
          iconName={destructiveIcon}
          label={destructiveLabel}
          onPress={handleDestructiveAction}
        />
      );
    },
    [isCreator, handleDestructiveAction]
  );

  const onSwipeableOpen = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const onSwipeableClose = useCallback(() => {
    if (pendingAction.current === 'destructive') {
      pendingAction.current = null;
      const actionLabel = isCreator ? 'Delete' : 'Leave';
      const message = isCreator
        ? `This will permanently delete "${room.name || 'this room'}" and remove all members.`
        : `You will leave "${room.name || 'this room'}". You can rejoin later if invited.`;

      Alert.alert(`${actionLabel} Room?`, message, [
        { text: 'Cancel', style: 'cancel' },
        { text: actionLabel, style: 'destructive', onPress: performDestructiveAction },
      ]);
    }
    pendingAction.current = null;
  }, [isCreator, room.name, performDestructiveAction]);

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
      <RoomCard
        room={room}
        onPress={onPress}
        isCreator={isCreator}
        isDefault={isDefault}
        creatorName={creatorName}
      />
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
});
