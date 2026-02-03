import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Image as CachedImage } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { RoomInvite } from '../types';
import { spacing, radius, typography, getMoodColor } from '../lib/theme';
import { useTheme } from '../hooks/useTheme';

interface InviteCardProps {
  invite: RoomInvite;
  onAccept: () => Promise<void>;
  onDecline: () => Promise<void>;
  cardStyle?: boolean; // When true, renders inline without card wrapper
}

export const InviteCard: React.FC<InviteCardProps> = ({ invite, onAccept, onDecline, cardStyle = false }) => {
  const { theme, isDark } = useTheme();
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

  const contentElement = (
    <View style={cardStyle ? styles.contentInline : styles.content}>
      {/* Header with sender info */}
      <View style={styles.header}>
        <View style={styles.senderRow}>
          {sender?.avatar_url ? (
            <CachedImage
              source={{ uri: sender.avatar_url }}
              style={[
                styles.avatar,
                { borderColor: theme.colors.glass.border, backgroundColor: theme.colors.bg.secondary },
                senderMoodColors && { borderColor: senderMoodColors.base }
              ]}
              cachePolicy="memory-disk"
              contentFit="cover"
              transition={200}
            />
          ) : sender ? (
            <LinearGradient
              colors={senderMoodColors?.gradient || theme.gradients.neonCyan}
              style={[styles.avatar, { borderColor: theme.colors.glass.border, backgroundColor: theme.colors.bg.secondary }]}
            >
              <Text style={[styles.avatarText, { color: theme.colors.text.primary }]}>
                {sender.display_name.charAt(0).toUpperCase()}
              </Text>
            </LinearGradient>
          ) : (
            <View style={[styles.avatar, { borderColor: theme.colors.glass.border, backgroundColor: theme.colors.bg.secondary }]} />
          )}

          <View style={styles.textContainer}>
            <Text style={[styles.roomName, { color: theme.colors.text.primary }]} numberOfLines={1}>
              {room?.name || 'Room'}
            </Text>
            <Text style={[styles.senderName, { color: theme.colors.text.secondary }]} numberOfLines={1}>
              from {sender?.display_name || 'Unknown'}
            </Text>
          </View>
        </View>

        {/* Time remaining badge */}
        {!isExpired ? (
          <View style={[styles.timeBadge, { borderColor: theme.colors.glass.border, backgroundColor: theme.colors.glass.background }]}>
            <Ionicons name="time-outline" size={12} color={theme.colors.text.secondary} />
            <Text style={[styles.timeText, { color: theme.colors.text.secondary }]}>{timeRemaining}</Text>
          </View>
        ) : (
          <View style={[styles.timeBadge, styles.expiredBadge, { backgroundColor: isDark ? 'rgba(236, 72, 153, 0.1)' : 'rgba(236, 72, 153, 0.08)', borderColor: isDark ? 'rgba(236, 72, 153, 0.3)' : 'rgba(236, 72, 153, 0.2)' }]}>
            <Text style={[styles.expiredText, { color: theme.colors.mood.reachOut.base }]}>Expired</Text>
          </View>
        )}
      </View>

      {/* Action buttons */}
      {!isExpired && (
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.button, styles.declineButton, { borderColor: theme.colors.glass.border, backgroundColor: theme.colors.glass.background }]}
            onPress={handleDecline}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator size="small" color={theme.colors.text.secondary} />
            ) : (
              <>
                <Ionicons name="close" size={16} color={theme.colors.text.secondary} />
                <Text style={[styles.declineText, { color: theme.colors.text.secondary }]}>Decline</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.acceptButton, { backgroundColor: theme.colors.mood.good.soft, borderColor: theme.colors.mood.good.base }]}
            onPress={handleAccept}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator size="small" color={theme.colors.text.primary} />
            ) : (
              <>
                <Ionicons name="checkmark" size={16} color={theme.colors.text.primary} />
                <Text style={[styles.acceptText, { color: theme.colors.text.primary }]}>Accept</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  if (cardStyle) {
    return contentElement;
  }

  return (
    <BlurView intensity={20} tint="dark" style={[styles.card, { borderColor: theme.colors.glass.border }]}>
      <LinearGradient
        colors={isExpired ? theme.gradients.card : theme.gradients.glass}
        style={styles.gradient}
      >
        {contentElement}
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
  },
  gradient: {
    padding: spacing.md,
  },
  content: {
    gap: spacing.md,
  },
  contentInline: {
    gap: spacing.md,
    paddingVertical: 12,
    paddingHorizontal: 14,
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.bold as any,
  },
  textContainer: {
    flex: 1,
    gap: 2,
  },
  roomName: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold as any,
  },
  senderName: {
    fontSize: typography.size.sm,
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    borderWidth: 1,
  },
  timeText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.medium as any,
  },
  expiredBadge: {},
  expiredText: {
    fontSize: typography.size.xs,
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
  declineButton: {},
  declineText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium as any,
  },
  acceptButton: {},
  acceptText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold as any,
  },
});
