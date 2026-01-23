import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { RoomInvite } from '../types';
import { colors, gradients, spacing, radius, typography, getMoodColor } from '../lib/theme';

interface InviteCardProps {
  invite: RoomInvite;
  onAccept: () => Promise<void>;
  onDecline: () => Promise<void>;
}

export const InviteCard: React.FC<InviteCardProps> = ({ invite, onAccept, onDecline }) => {
  const [timeRemaining, setTimeRemaining] = useState('');
  const [isExpired, setIsExpired] = useState(false);
  const [loading, setLoading] = useState(false);

  const sender = invite.sender;
  const room = invite.room;

  useEffect(() => {
    const updateTimeRemaining = () => {
      const now = new Date();
      const expiresAt = new Date(invite.expires_at);
      const diff = expiresAt.getTime() - now.getTime();

      if (diff <= 0) {
        setIsExpired(true);
        setTimeRemaining('Expired');
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      if (hours > 0) {
        setTimeRemaining(`${hours}h ${minutes}m left`);
      } else {
        setTimeRemaining(`${minutes}m left`);
      }
    };

    updateTimeRemaining();
    const interval = setInterval(updateTimeRemaining, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [invite.expires_at]);

  const handleAccept = async () => {
    if (loading || isExpired) return;
    setLoading(true);
    try {
      await onAccept();
    } finally {
      setLoading(false);
    }
  };

  const handleDecline = async () => {
    if (loading) return;
    setLoading(true);
    try {
      await onDecline();
    } finally {
      setLoading(false);
    }
  };

  const senderMoodColors = sender ? getMoodColor(sender.mood || 'neutral') : null;

  return (
    <BlurView intensity={20} tint="dark" style={styles.card}>
      <LinearGradient
        colors={isExpired ? gradients.card : gradients.glass}
        style={styles.gradient}
      >
        <View style={styles.content}>
          {/* Header with sender info */}
          <View style={styles.header}>
            <View style={styles.senderRow}>
              {sender?.avatar_url ? (
                <Image
                  source={{ uri: sender.avatar_url }}
                  style={[
                    styles.avatar,
                    senderMoodColors && { borderColor: senderMoodColors.base }
                  ]}
                />
              ) : sender ? (
                <LinearGradient
                  colors={senderMoodColors?.gradient || gradients.neonCyan}
                  style={styles.avatar}
                >
                  <Text style={styles.avatarText}>
                    {sender.display_name.charAt(0).toUpperCase()}
                  </Text>
                </LinearGradient>
              ) : (
                <View style={styles.avatar} />
              )}

              <View style={styles.textContainer}>
                <Text style={styles.roomName} numberOfLines={1}>
                  {room?.name || 'Room'}
                </Text>
                <Text style={styles.senderName} numberOfLines={1}>
                  from {sender?.display_name || 'Unknown'}
                </Text>
              </View>
            </View>

            {/* Time remaining badge */}
            {!isExpired ? (
              <View style={styles.timeBadge}>
                <Ionicons name="time-outline" size={12} color={colors.text.secondary} />
                <Text style={styles.timeText}>{timeRemaining}</Text>
              </View>
            ) : (
              <View style={[styles.timeBadge, styles.expiredBadge]}>
                <Text style={styles.expiredText}>Expired</Text>
              </View>
            )}
          </View>

          {/* Action buttons */}
          {!isExpired && (
            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.button, styles.declineButton]}
                onPress={handleDecline}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator size="small" color={colors.text.secondary} />
                ) : (
                  <>
                    <Ionicons name="close" size={16} color={colors.text.secondary} />
                    <Text style={styles.declineText}>Decline</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.acceptButton]}
                onPress={handleAccept}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator size="small" color={colors.text.primary} />
                ) : (
                  <>
                    <Ionicons name="checkmark" size={16} color={colors.text.primary} />
                    <Text style={styles.acceptText}>Accept</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </LinearGradient>
    </BlurView>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  gradient: {
    padding: spacing.md,
  },
  content: {
    gap: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  senderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: colors.glass.border,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.bg.secondary,
  },
  avatarText: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.bold as any,
    color: colors.text.primary,
  },
  textContainer: {
    flex: 1,
    gap: 2,
  },
  roomName: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold as any,
    color: colors.text.primary,
  },
  senderName: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  timeText: {
    fontSize: typography.size.xs,
    color: colors.text.secondary,
    fontWeight: typography.weight.medium as any,
  },
  expiredBadge: {
    backgroundColor: 'rgba(236, 72, 153, 0.1)',
    borderColor: 'rgba(236, 72, 153, 0.3)',
  },
  expiredText: {
    fontSize: typography.size.xs,
    color: colors.mood.reachOut.base,
    fontWeight: typography.weight.medium as any,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  declineButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderColor: colors.glass.border,
  },
  declineText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium as any,
    color: colors.text.secondary,
  },
  acceptButton: {
    backgroundColor: colors.mood.good.soft,
    borderColor: colors.mood.good.base,
  },
  acceptText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold as any,
    color: colors.text.primary,
  },
});
