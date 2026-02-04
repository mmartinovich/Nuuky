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
  isCreator?: boolean;
  isDefault?: boolean;
  creatorName?: string;
}

const RoomCardComponent: React.FC<RoomCardProps> = ({ room, onPress, isCreator = false, isDefault = false, creatorName }) => {
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
  const sortedParticipants = [...participants].sort((a, b) => {
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

  const activeHereParticipants = sortedParticipants.filter(p =>
    p.user && isUserTrulyOnline(p.user.is_online, p.user.last_seen_at) && p.user.default_room_id === room.id
  );
  const awayParticipants = sortedParticipants.filter(p =>
    p.user && !(isUserTrulyOnline(p.user.is_online, p.user.last_seen_at) && p.user.default_room_id === room.id)
  );

  const displayedActive = activeHereParticipants.slice(0, 5);
  const displayedAway = awayParticipants.slice(0, 4);
  const remainingCount = Math.max(0, participantCount - displayedActive.length - displayedAway.length);

  const isHomeRoom = room.name === 'My Nūūky';
  const displayName = isHomeRoom && !isCreator && creatorName
    ? `${creatorName}'s Nūūky`
    : (room.name || 'Unnamed Room');
  const showSubtitle = !isHomeRoom && !isCreator && creatorName;

  return (
    <TouchableOpacity
      activeOpacity={interactionStates?.pressed || 0.7}
      onPress={onPress}
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
    padding: spacing.md,
    paddingLeft: spacing.md + 4,
    gap: spacing.sm,
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
    fontSize: 17,
    fontWeight: '600',
  },
  creatorSubtitle: {
    fontSize: 12,
    fontWeight: '400',
    marginTop: 2,
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
    minHeight: 36,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarPlaceholder: {},
  avatarText: {
    fontSize: 14,
    fontWeight: '600',
  },
  avatarOnlineDot: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#22C55E',
    borderWidth: 2,
  },
  avatarSmall: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarTextSmall: {
    fontSize: 11,
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

export const RoomCard = memo(RoomCardComponent, (prevProps, nextProps) => {
  return (
    prevProps.room.id === nextProps.room.id &&
    prevProps.room.name === nextProps.room.name &&
    prevProps.isDefault === nextProps.isDefault &&
    prevProps.isCreator === nextProps.isCreator &&
    prevProps.creatorName === nextProps.creatorName &&
    prevProps.room.participants?.length === nextProps.room.participants?.length &&
    JSON.stringify(prevProps.room.participants?.map(p => ({ id: p.id, online: p.user?.is_online, lastSeen: p.user?.last_seen_at, defaultRoom: p.user?.default_room_id }))) ===
    JSON.stringify(nextProps.room.participants?.map(p => ({ id: p.id, online: p.user?.is_online, lastSeen: p.user?.last_seen_at, defaultRoom: p.user?.default_room_id })))
  );
});
