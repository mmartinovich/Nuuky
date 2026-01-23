import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { Room, User } from '../types';
import { colors, gradients, spacing, radius, typography, getMoodColor } from '../lib/theme';

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

  return (
    <TouchableOpacity activeOpacity={0.8} onPress={onPress}>
      <BlurView intensity={20} tint="dark" style={styles.card}>
        <LinearGradient
          colors={gradients.glass}
          style={styles.gradient}
        >
          <View style={styles.content}>
            {/* Room Header */}
            <View style={styles.header}>
              <View style={styles.titleRow}>
                {hasOnlineMembers && (
                  <View style={styles.onlineIndicator} />
                )}
                <Text style={styles.roomName} numberOfLines={1}>
                  {room.name || 'Unnamed Room'}
                </Text>
                {isDefault && (
                  <View style={styles.defaultBadge}>
                    <Ionicons name="home" size={12} color={colors.neon.cyan} />
                  </View>
                )}
                {isCreator && (
                  <View style={styles.creatorBadge}>
                    <Ionicons name="star" size={12} color={colors.neon.orange} />
                  </View>
                )}
              </View>
              <Text style={styles.memberCount}>
                {participantCount}/{maxMembers}
              </Text>
            </View>

            {/* Participant Avatars */}
            <View style={styles.avatarRow}>
              {displayedParticipants.map((participant, index) => {
                const user = participant.user;
                if (!user) return null;

                const moodColors = getMoodColor(user.mood);
                return (
                  <View
                    key={participant.id}
                    style={[
                      styles.avatarContainer,
                      { marginLeft: index > 0 ? -8 : 0 }
                    ]}
                  >
                    {user.avatar_url ? (
                      <Image
                        source={{ uri: user.avatar_url }}
                        style={[
                          styles.avatar,
                          { borderColor: moodColors.base }
                        ]}
                      />
                    ) : (
                      <LinearGradient
                        colors={moodColors.gradient}
                        style={styles.avatar}
                      >
                        <Text style={styles.avatarText}>
                          {user.display_name.charAt(0).toUpperCase()}
                        </Text>
                      </LinearGradient>
                    )}
                  </View>
                );
              })}

              {remainingCount > 0 && (
                <View style={[styles.avatarContainer, { marginLeft: -8 }]}>
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
        </LinearGradient>
      </BlurView>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  gradient: {
    padding: spacing.md,
  },
  content: {
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
    gap: spacing.xs,
    flex: 1,
  },
  onlineIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.mood.good.base,
    shadowColor: colors.mood.good.base,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  roomName: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.semibold as any,
    color: colors.text.primary,
    flex: 1,
  },
  defaultBadge: {
    backgroundColor: 'rgba(0, 240, 255, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.3)',
  },
  creatorBadge: {
    backgroundColor: 'rgba(255, 107, 53, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 53, 0.3)',
  },
  memberCount: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium as any,
    color: colors.text.secondary,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 32,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.glass.border,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.bg.secondary,
  },
  avatarText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.bold as any,
    color: colors.text.primary,
  },
  remainingAvatar: {
    backgroundColor: colors.bg.tertiary,
    borderColor: colors.glass.border,
  },
  remainingText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.medium as any,
    color: colors.text.secondary,
  },
  emptyText: {
    fontSize: typography.size.sm,
    color: colors.text.tertiary,
    fontStyle: 'italic',
  },
});
