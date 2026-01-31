import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
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
  const { accent } = useTheme();
  const participants = room.participants || [];
  const participantCount = participants.length;
  const maxMembers = 10;

  // Sort participants: active-in-room first → online-elsewhere (dimmed) → offline
  const sortedParticipants = [...participants].sort((a, b) => {
    const aOnline = a.user && isUserTrulyOnline(a.user.is_online, a.user.last_seen_at);
    const bOnline = b.user && isUserTrulyOnline(b.user.is_online, b.user.last_seen_at);
    const aActiveHere = aOnline && a.user?.default_room_id === room.id;
    const bActiveHere = bOnline && b.user?.default_room_id === room.id;

    // Active in this room first
    if (aActiveHere && !bActiveHere) return -1;
    if (!aActiveHere && bActiveHere) return 1;
    // Then online elsewhere
    if (aOnline && !bOnline) return -1;
    if (!aOnline && bOnline) return 1;
    return 0;
  });

  // Split participants into active-in-room (online + default_room matches) vs away
  const activeHereParticipants = sortedParticipants.filter(p =>
    p.user && isUserTrulyOnline(p.user.is_online, p.user.last_seen_at) && p.user.default_room_id === room.id
  );
  const awayParticipants = sortedParticipants.filter(p =>
    p.user && !(isUserTrulyOnline(p.user.is_online, p.user.last_seen_at) && p.user.default_room_id === room.id)
  );

  // Limit display: up to 5 active, up to 4 away
  const displayedActive = activeHereParticipants.slice(0, 5);
  const displayedAway = awayParticipants.slice(0, 4);
  const remainingCount = Math.max(0, participantCount - displayedActive.length - displayedAway.length);

  // Check if this is a home room (My Nūūky)
  const isHomeRoom = room.name === 'My Nūūky';

  // Format the room name for display
  const displayName = isHomeRoom && !isCreator && creatorName
    ? `${creatorName}'s Nūūky`
    : (room.name || 'Unnamed Room');

  // Only show subtitle for non-home rooms
  const showSubtitle = !isHomeRoom && !isCreator && creatorName;

  return (
    <TouchableOpacity
      activeOpacity={interactionStates?.pressed || 0.7}
      onPress={onPress}
      style={[
        styles.card,
        isDefault && [styles.cardSelected, { backgroundColor: accent.soft, borderColor: accent.primary + '40' }],
      ]}
    >
      {/* Selected indicator - left border accent */}
      {isDefault && (
        <View style={[styles.selectedIndicator, { backgroundColor: accent.primary }]} />
      )}
      
      <View style={styles.content}>
        {/* Room Header */}
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <View style={styles.titleTextContainer}>
              <Text style={styles.roomName} numberOfLines={1}>
                {displayName}
              </Text>
              {/* Show creator name for non-home rooms you were invited to */}
              {showSubtitle && (
                <Text style={styles.creatorSubtitle} numberOfLines={1}>
                  {creatorName}'s room
                </Text>
              )}
            </View>
          </View>
          
          {/* Right side: selected badge */}
          <View style={styles.headerRight}>
            {isDefault && (
              <View style={[styles.activeBadge, { backgroundColor: accent.soft }]}>
                <Text style={[styles.activeBadgeText, { color: accent.primary }]}>Active</Text>
              </View>
            )}
          </View>
        </View>

        {/* Participant Avatars - split into active here vs away */}
        <View style={styles.avatarRow}>
          {/* Active in this room */}
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
                  <Image
                    source={{ uri: user.avatar_url }}
                    style={[
                      styles.avatar,
                      { borderColor: isOnline ? moodColors.base : 'rgba(255,255,255,0.1)' }
                    ]}
                  />
                ) : (
                  <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: accent.soft, borderColor: accent.primary + '4D' }]}>
                    <Text style={styles.avatarText}>
                      {user.display_name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
                {isOnline && (
                  <View style={styles.avatarOnlineDot} />
                )}
              </View>
            );
          })}

          {/* Separator between active and away groups */}
          {displayedActive.length > 0 && displayedAway.length > 0 && (
            <View style={styles.avatarGroupSeparator} />
          )}

          {/* Away / not in this room */}
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
                  <Image
                    source={{ uri: user.avatar_url }}
                    style={styles.avatarSmall}
                  />
                ) : (
                  <View style={[styles.avatarSmall, styles.avatarPlaceholder, { backgroundColor: accent.soft, borderColor: accent.primary + '4D' }]}>
                    <Text style={styles.avatarTextSmall}>
                      {user.display_name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
              </View>
            );
          })}

          {remainingCount > 0 && (
            <View style={[styles.avatarContainer, { marginLeft: -8, zIndex: 0 }]}>
              <View style={[styles.avatarSmall, styles.remainingAvatar]}>
                <Text style={styles.remainingTextSmall}>+{remainingCount}</Text>
              </View>
            </View>
          )}

          {/* Member count */}
          {participantCount > 0 && (
            <Text style={styles.memberCountInline}>
              {participantCount}{participantCount >= 8 ? '/' + maxMembers : ''}
            </Text>
          )}

          {participantCount === 0 && (
            <Text style={styles.emptyText}>No members yet</Text>
          )}
        </View>
      </View>

      {/* Chevron */}
      <View style={styles.chevronContainer}>
        <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.3)" />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
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
    gap: spacing.sm + 4,
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
    color: '#FFFFFF',
  },
  creatorSubtitle: {
    fontSize: 12,
    fontWeight: '400',
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  activeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  activeBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
    borderColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  avatarPlaceholder: {
    // Colors set dynamically via inline styles
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
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
    borderColor: 'rgba(15, 15, 30, 1)',
  },
  avatarSmall: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  avatarTextSmall: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  avatarGroupSeparator: {
    width: 1,
    height: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginHorizontal: 8,
    borderRadius: 0.5,
  },
  remainingAvatar: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  remainingText: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.5)',
  },
  remainingTextSmall: {
    fontSize: 9,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.4)',
  },
  memberCountInline: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.4)',
    marginLeft: 8,
  },
  emptyText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.4)',
  },
  chevronContainer: {
    paddingRight: spacing.md,
  },
});

// Memoize to prevent re-renders when parent updates but room data hasn't changed
export const RoomCard = memo(RoomCardComponent, (prevProps, nextProps) => {
  // Only re-render if these specific props changed
  return (
    prevProps.room.id === nextProps.room.id &&
    prevProps.room.name === nextProps.room.name &&
    prevProps.isDefault === nextProps.isDefault &&
    prevProps.isCreator === nextProps.isCreator &&
    prevProps.creatorName === nextProps.creatorName &&
    prevProps.room.participants?.length === nextProps.room.participants?.length &&
    // Check if participants changed (by comparing user online status and last_seen_at)
    JSON.stringify(prevProps.room.participants?.map(p => ({ id: p.id, online: p.user?.is_online, lastSeen: p.user?.last_seen_at, defaultRoom: p.user?.default_room_id }))) ===
    JSON.stringify(nextProps.room.participants?.map(p => ({ id: p.id, online: p.user?.is_online, lastSeen: p.user?.last_seen_at, defaultRoom: p.user?.default_room_id })))
  );
});
