import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Room, User } from '../types';
import { colors, gradients, spacing, radius, typography, getMoodColor, interactionStates } from '../lib/theme';
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
  const hasOnlineMembers = participants.some(p =>
    p.user && isUserTrulyOnline(p.user.is_online, p.user.last_seen_at)
  );

  // Show first 5 participant avatars
  const displayedParticipants = participants.slice(0, 5);
  const remainingCount = Math.max(0, participantCount - 5);

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
            {/* Online indicator */}
            {hasOnlineMembers && (
              <View style={styles.onlineIndicator} />
            )}
            <View style={styles.titleTextContainer}>
              <Text style={styles.roomName} numberOfLines={1}>
                {room.name || 'Unnamed Room'}
              </Text>
              {/* Show creator name for rooms you were invited to */}
              {!isCreator && creatorName && (
                <Text style={styles.creatorSubtitle} numberOfLines={1}>
                  {creatorName}'s room
                </Text>
              )}
            </View>
          </View>
          
          {/* Right side: member count + selected badge */}
          <View style={styles.headerRight}>
            {isDefault && (
              <View style={[styles.activeBadge, { backgroundColor: accent.soft }]}>
                <Text style={[styles.activeBadgeText, { color: accent.primary }]}>Active</Text>
              </View>
            )}
            <Text style={styles.memberCount}>
              {participantCount}/{maxMembers}
            </Text>
          </View>
        </View>

        {/* Participant Avatars */}
        <View style={styles.avatarRow}>
          {displayedParticipants.map((participant, index) => {
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
              </View>
            );
          })}

          {remainingCount > 0 && (
            <View style={[styles.avatarContainer, { marginLeft: -10, zIndex: 0 }]}>
              <View style={[styles.avatar, styles.remainingAvatar]}>
                <Text style={styles.remainingText}>+{remainingCount}</Text>
              </View>
            </View>
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
    borderRadius: 16,
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
  onlineIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22C55E',
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
  memberCount: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.5)',
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
  remainingAvatar: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  remainingText: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.5)',
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
    JSON.stringify(prevProps.room.participants?.map(p => ({ id: p.id, online: p.user?.is_online, lastSeen: p.user?.last_seen_at }))) ===
    JSON.stringify(nextProps.room.participants?.map(p => ({ id: p.id, online: p.user?.is_online, lastSeen: p.user?.last_seen_at })))
  );
});
