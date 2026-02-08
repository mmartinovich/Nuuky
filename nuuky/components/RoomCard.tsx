import React, { memo, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Image as CachedImage } from 'expo-image';
import { Room, User } from '../types';
import { spacing, radius, typography, getMoodColor, interactionStates } from '../lib/theme';
import { useTheme } from '../hooks/useTheme';
import { isUserTrulyOnline } from '../lib/utils';

interface RoomCardProps {
  room: Room;
  onPress: () => void;
  onLongPress?: () => void;
  isCreator?: boolean;
  isDefault?: boolean;
  creatorName?: string;
  creatorAvatarUrl?: string;
}

const RoomCardComponent: React.FC<RoomCardProps> = ({ room, onPress, onLongPress, isCreator = false, isDefault = false, creatorName, creatorAvatarUrl }) => {
  const { accent, theme } = useTheme();
  const participants = room.participants || [];
  const participantCount = participants.length;
  const maxMembers = 10;

  const dynamicStyles = useMemo(() => ({
    card: { backgroundColor: theme.colors.glass.background },
    roomName: { color: theme.colors.text.primary },
    creatorSubtitle: { color: theme.colors.text.tertiary },
    avatar: { borderColor: theme.colors.ui.borderLight, backgroundColor: theme.colors.glass.background },
    avatarText: { color: theme.colors.text.primary },
    avatarOnlineDot: { borderColor: theme.colors.bg.primary },
    avatarSmall: { borderColor: theme.colors.ui.borderLight, backgroundColor: theme.colors.glass.background },
    avatarTextSmall: { color: theme.colors.text.primary },
    separator: { backgroundColor: theme.colors.ui.borderLight },
    remaining: { backgroundColor: theme.colors.glass.background, borderColor: theme.colors.ui.borderLight },
    dimText: { color: theme.colors.text.tertiary },
  }), [theme]);

  // Sort participants: active-in-room first → online-elsewhere (dimmed) → offline
  const { displayedActive, displayedAway, remainingCount } = useMemo(() => {
    const sorted = [...participants].sort((a, b) => {
      const aOnline = a.user && isUserTrulyOnline(a.user.is_online, a.user.last_seen_at);
      const bOnline = b.user && isUserTrulyOnline(b.user.is_online, b.user.last_seen_at);
      const aActiveHere = aOnline && a.user?.default_room_id === room.id;
      const bActiveHere = bOnline && b.user?.default_room_id === room.id;

      if (aActiveHere && !bActiveHere) return -1;
      if (!aActiveHere && bActiveHere) return 1;
      if (aOnline && !bOnline) return -1;
      if (!aOnline && bOnline) return 1;
      return 0;
    });

    const active = sorted.filter(p =>
      p.user && isUserTrulyOnline(p.user.is_online, p.user.last_seen_at) && p.user.default_room_id === room.id
    );
    const away = sorted.filter(p =>
      p.user && !(isUserTrulyOnline(p.user.is_online, p.user.last_seen_at) && p.user.default_room_id === room.id)
    );

    const dispActive = active.slice(0, 5);
    const dispAway = away.slice(0, 4);
    return {
      displayedActive: dispActive,
      displayedAway: dispAway,
      remainingCount: Math.max(0, participantCount - dispActive.length - dispAway.length),
    };
  }, [participants, room.id, participantCount]);

  const isHomeRoom = room.name === 'My Nūūky';
  const displayName = isHomeRoom && !isCreator && creatorName
    ? `${creatorName}'s Nūūky`
    : (room.name || 'Unnamed Room');
  const showSubtitle = !isHomeRoom && !isCreator && creatorName;

  return (
    <TouchableOpacity
      activeOpacity={interactionStates?.pressed || 0.7}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={400}
      style={[
        styles.card,
        dynamicStyles.card,
        { borderWidth: 1, borderColor: theme.colors.glass.border },
        isDefault && [styles.cardSelected, { backgroundColor: accent.soft, borderColor: accent.primary + '40' }],
      ]}
    >
      {isDefault && (
        <View style={[styles.selectedIndicator, { backgroundColor: accent.primary }]} />
      )}
      
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <View style={styles.titleTextContainer}>
              <Text style={[styles.roomName, dynamicStyles.roomName]} numberOfLines={1}>
                {displayName}
              </Text>
              {showSubtitle && (
                <Text style={[styles.creatorSubtitle, dynamicStyles.creatorSubtitle]} numberOfLines={1}>
                  {creatorName}'s room
                </Text>
              )}
            </View>
          </View>
          
          <View style={styles.headerRight}>
            {participantCount > 0 && (
              <Text style={[styles.memberCount, dynamicStyles.dimText]}>
                {participantCount}{participantCount >= 8 ? '/' + maxMembers : ''}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.avatarRow}>
          {displayedActive.map((participant, index) => {
            const user = participant.user;
            if (!user) return null;
            const moodColors = getMoodColor(user.mood);
            const isOnline = isUserTrulyOnline(user.is_online, user.last_seen_at);

            return (
              <View
                key={participant.id}
                style={[
                  styles.avatarContainer,
                  { marginLeft: index > 0 ? -10 : 0, zIndex: 10 - index }
                ]}
              >
                {user.avatar_url ? (
                  <CachedImage
                    source={{ uri: user.avatar_url }}
                    style={[
                      styles.avatar,
                      dynamicStyles.avatar,
                      { borderColor: isOnline ? moodColors.base : theme.colors.ui.borderLight }
                    ]}
                    cachePolicy="memory-disk"
                    contentFit="cover"
                    transition={200}
                  />
                ) : (
                  <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: accent.soft, borderColor: accent.primary + '4D' }]}>
                    <Text style={[styles.avatarText, dynamicStyles.avatarText]}>
                      {user.display_name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
                {isOnline && (
                  <View style={[styles.avatarOnlineDot, dynamicStyles.avatarOnlineDot]} />
                )}
              </View>
            );
          })}

          {displayedActive.length > 0 && displayedAway.length > 0 && (
            <View style={[styles.avatarGroupSeparator, dynamicStyles.separator]} />
          )}

          {displayedAway.map((participant, index) => {
            const user = participant.user;
            if (!user) return null;

            return (
              <View
                key={participant.id}
                style={[
                  styles.avatarContainer,
                  { marginLeft: index > 0 ? -8 : 0, zIndex: 5 - index, opacity: 0.45 }
                ]}
              >
                {user.avatar_url ? (
                  <CachedImage
                    source={{ uri: user.avatar_url }}
                    style={[styles.avatarSmall, dynamicStyles.avatarSmall]}
                    cachePolicy="memory-disk"
                    contentFit="cover"
                    transition={200}
                  />
                ) : (
                  <View style={[styles.avatarSmall, styles.avatarPlaceholder, { backgroundColor: accent.soft, borderColor: accent.primary + '4D' }]}>
                    <Text style={[styles.avatarTextSmall, dynamicStyles.avatarTextSmall]}>
                      {user.display_name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
              </View>
            );
          })}

          {remainingCount > 0 && (
            <View style={[styles.avatarContainer, { marginLeft: -8, zIndex: 0 }]}>
              <View style={[styles.avatarSmall, styles.remainingAvatar, dynamicStyles.remaining]}>
                <Text style={[styles.remainingTextSmall, dynamicStyles.dimText]}>+{remainingCount}</Text>
              </View>
            </View>
          )}

          {participantCount === 0 && (
            <Text style={[styles.emptyText, dynamicStyles.dimText]}>No members yet</Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.md,
    overflow: 'hidden',
    position: 'relative',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  cardSelected: {
    borderWidth: 1,
  },
  selectedIndicator: {
    position: 'absolute',
    left: 0,
    top: 8,
    bottom: 8,
    width: 3,
    borderRadius: 2,
  },
  content: {
    flex: 1,
    padding: spacing.sm + 4,
    paddingLeft: spacing.sm + 8,
    gap: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  titleTextContainer: {
    flex: 1,
  },
  roomName: {
    fontSize: 15,
    fontWeight: '600',
  },
  creatorSubtitle: {
    fontSize: 11,
    fontWeight: '400',
    marginTop: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  memberCount: {
    fontSize: 13,
    fontWeight: '500',
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 28,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarPlaceholder: {},
  avatarText: {
    fontSize: 11,
    fontWeight: '600',
  },
  avatarOnlineDot: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22C55E',
    borderWidth: 1.5,
  },
  avatarSmall: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarTextSmall: {
    fontSize: 9,
    fontWeight: '600',
  },
  avatarGroupSeparator: {
    width: 1,
    height: 20,
    marginHorizontal: 8,
    borderRadius: 0.5,
  },
  remainingAvatar: {},
  remainingText: {
    fontSize: 11,
    fontWeight: '600',
  },
  remainingTextSmall: {
    fontSize: 9,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 14,
  },
});

const participantsEqual = (
  a: Room['participants'],
  b: Room['participants'],
): boolean => {
  if (!a && !b) return true;
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (
      a[i].id !== b[i].id ||
      a[i].user?.is_online !== b[i].user?.is_online ||
      a[i].user?.last_seen_at !== b[i].user?.last_seen_at ||
      a[i].user?.default_room_id !== b[i].user?.default_room_id
    ) {
      return false;
    }
  }
  return true;
};

export const RoomCard = memo(RoomCardComponent, (prevProps, nextProps) => {
  return (
    prevProps.room.id === nextProps.room.id &&
    prevProps.room.name === nextProps.room.name &&
    prevProps.isDefault === nextProps.isDefault &&
    prevProps.isCreator === nextProps.isCreator &&
    prevProps.creatorName === nextProps.creatorName &&
    participantsEqual(prevProps.room.participants, nextProps.room.participants)
  );
});
