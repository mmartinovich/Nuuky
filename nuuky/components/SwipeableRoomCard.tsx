import React, { useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { RectButton } from 'react-native-gesture-handler';
import Reanimated, {
  SharedValue,
  useAnimatedStyle,
  interpolate,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { RoomCard } from './RoomCard';
import { Room } from '../types';

const ACTION_WIDTH = 74; // Per-action width, iOS standard

// Tailwind colors
const TAILWIND_RED = '#EF4444';
const TAILWIND_AMBER = '#F59E0B';
const TAILWIND_GRAY = '#6B7280';

interface SwipeableRoomCardProps {
  room: Room;
  onPress: () => void;
  isCreator: boolean;
  isDefault: boolean;
  creatorName?: string;
  onDelete: (roomId: string) => Promise<boolean>;
  onLeave: (roomId: string) => Promise<void>;
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
    // Each action slides in progressively
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

export const SwipeableRoomCard: React.FC<SwipeableRoomCardProps> = ({
  room,
  onPress,
  isCreator,
  isDefault,
  creatorName,
  onDelete,
  onLeave,
}) => {
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
    (prog: SharedValue<number>, drag: SharedValue<number>) => {
      const destructiveLabel = isCreator ? 'Delete' : 'Leave';
      const destructiveIcon = isCreator ? 'trash-outline' : 'exit-outline';
      const destructiveColor = isCreator ? TAILWIND_RED : TAILWIND_AMBER;
      const totalActions = 1;

      return (
        <View style={{ width: ACTION_WIDTH * totalActions + 20, flexDirection: 'row', marginLeft: -20 }}>
          {/* Single destructive action */}
          <RightAction
            drag={drag}
            iconName={destructiveIcon}
            label={destructiveLabel}
            color={destructiveColor}
            index={0}
            totalActions={totalActions}
            onPress={handleDestructiveAction}
          />
        </View>
      );
    },
    [isCreator, handleDestructiveAction]
  );

  const onSwipeableOpen = useCallback((direction: string) => {
    // Light haptic when actions fully reveal
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (direction === 'right') {
      // Full swipe triggers heavy haptic
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }
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
      overshootRight={true}
      overshootFriction={8}
      friction={1.5}
      onSwipeableOpen={onSwipeableOpen}
      onSwipeableClose={onSwipeableClose}
      containerStyle={styles.swipeableContainer}
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

const styles = StyleSheet.create({
  swipeableContainer: {
    borderRadius: 16,
    overflow: 'hidden',
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
});
