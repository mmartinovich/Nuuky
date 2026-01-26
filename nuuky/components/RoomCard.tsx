import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Room, User } from '../types';
import { colors, gradients, spacing, radius, typography, getMoodColor, interactionStates } from '../lib/theme';

interface RoomCardProps {
  room: Room;
  onPress: () => void;
  isCreator?: boolean;
  isDefault?: boolean;
}

export const RoomCard: React.FC<RoomCardProps> = ({ room, onPress, isCreator = false, isDefault = false }) => {
  const participants = room.participants || [];
  const participantCount = participants.length;
  const maxMembers = 10;
  const hasOnlineMembers = participants.some(p => p.user?.is_online);

  // Show first 5 participant avatars
  const displayedParticipants = participants.slice(0, 5);
  const remainingCount = Math.max(0, participantCount - 5);

  // Accent color for selected state
  const accentColor = '#A855F7';

  return (
    <TouchableOpacity 
      activeOpacity={interactionStates?.pressed || 0.7} 
      onPress={onPress}
      style={[
        styles.card,
        isDefault && styles.cardSelected,
      ]}
    >
      {/* Selected indicator - left border accent */}
      {isDefault && (
        <View style={styles.selectedIndicator} />
      )}
      
      <View style={styles.content}>
        {/* Room Header */}
        <View style={styles.header}>
          <View style={styles.titleRow}>
            {/* Online indicator */}
            {hasOnlineMembers && (
              <View style={styles.onlineIndicator} />
            )}
            <Text style={styles.roomName} numberOfLines={1}>
              {room.name || 'Unnamed Room'}
            </Text>
          </View>
          
          {/* Right side: member count + selected badge */}
          <View style={styles.headerRight}>
            {isDefault && (
              <View style={styles.activeBadge}>
                <Text style={styles.activeBadgeText}>Active</Text>
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
            const isOnline = user.is_online;
            
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
                  <View style={[styles.avatar, styles.avatarPlaceholder]}>
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
    backgroundColor: 'rgba(168, 85, 247, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.25)',
  },
  selectedIndicator: {
    position: 'absolute',
    left: 0,
    top: 8,
    bottom: 8,
    width: 3,
    backgroundColor: '#A855F7',
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
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  activeBadge: {
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  activeBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#A855F7',
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
    backgroundColor: 'rgba(168, 85, 247, 0.2)',
    borderColor: 'rgba(168, 85, 247, 0.3)',
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
