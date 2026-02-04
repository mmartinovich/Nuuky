import React, { useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { Image as CachedImage } from 'expo-image';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import Reanimated, {
  SharedValue,
  useAnimatedStyle,
  interpolate,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { radius } from '../lib/theme';
import { useTheme } from '../hooks/useTheme';

const ACTION_WIDTH = 74;
const ACTION_GAP = 10;

interface SwipeableAnchorRowProps {
  anchorId: string;
  name: string;
  avatarUrl?: string;
  onRemove: (anchorId: string, name: string) => void;
}

export const SwipeableAnchorRow: React.FC<SwipeableAnchorRowProps> = ({
  anchorId,
  name,
  avatarUrl,
  onRemove,
}) => {
  const { theme, accent } = useTheme();
  const swipeableRef = useRef<any>(null);
  const pendingAction = useRef<'remove' | null>(null);

  const performRemoveAction = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    onRemove(anchorId, name);
  }, [anchorId, name, onRemove]);

  const handleRemoveAction = useCallback(() => {
    pendingAction.current = 'remove';
    swipeableRef.current?.close();
  }, []);

  const onSwipeableOpen = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const onSwipeableClose = useCallback(() => {
    if (pendingAction.current === 'remove') {
      pendingAction.current = null;
      Alert.alert('Remove Anchor?', `Remove ${name} as your safety anchor?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: performRemoveAction },
      ]);
    }
    pendingAction.current = null;
  }, [name, performRemoveAction]);

  const renderRightActions = useCallback(
    (_prog: SharedValue<number>, drag: SharedValue<number>) => {
      return (
        <RightActionButton
          drag={drag}
          onPress={handleRemoveAction}
        />
      );
    },
    [handleRemoveAction]
  );

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
        onLongPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          Alert.alert(name, '', [
            { text: 'Remove Anchor', style: 'destructive', onPress: performRemoveAction },
            { text: 'Cancel', style: 'cancel' },
          ]);
        }}
        delayLongPress={400}
        style={[
          styles.card,
          {
            backgroundColor: theme.colors.glass.background,
            borderColor: theme.colors.glass.border,
          },
        ]}
      >
        <View style={styles.rowContent}>
          {avatarUrl ? (
            <CachedImage
              source={{ uri: avatarUrl }}
              style={styles.avatar}
              cachePolicy="memory-disk"
              contentFit="cover"
            />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: accent.soft }]}>
              <Text style={[styles.avatarText, { color: accent.primary }]}>
                {name.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <View style={styles.textContainer}>
            <Text style={[styles.label, { color: theme.colors.text.primary }]}>
              {name}
            </Text>
            <Text style={[styles.description, { color: theme.colors.text.tertiary }]}>
              Safety Anchor
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    </ReanimatedSwipeable>
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
        <Text style={styles.actionLabel}>Remove</Text>
      </TouchableOpacity>
    </Reanimated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  rowContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 12,
  },
  avatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '600',
  },
  textContainer: {
    flex: 1,
    marginRight: 8,
  },
  label: {
    fontSize: 17,
    fontWeight: '400',
    letterSpacing: -0.41,
  },
  description: {
    fontSize: 13,
    fontWeight: '400',
    marginTop: 2,
  },
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
