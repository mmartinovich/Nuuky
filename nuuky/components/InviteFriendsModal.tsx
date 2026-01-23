import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, radius, typography, gradients } from '../lib/theme';
import { User } from '../types';

interface InviteFriendsModalProps {
  visible: boolean;
  friends: User[];
  participantIds: string[];
  onClose: () => void;
  onInvite: (friendId: string) => Promise<void>;
}

export const InviteFriendsModal: React.FC<InviteFriendsModalProps> = ({
  visible,
  friends,
  participantIds,
  onClose,
  onInvite,
}) => {
  const [inviting, setInviting] = useState<Set<string>>(new Set());

  // Filter out friends who are already in the room
  const availableFriends = friends.filter((friend) => !participantIds.includes(friend.id));

  const handleInvite = async (friendId: string) => {
    setInviting((prev) => new Set(prev).add(friendId));
    try {
      await onInvite(friendId);
    } finally {
      setInviting((prev) => {
        const next = new Set(prev);
        next.delete(friendId);
        return next;
      });
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />

        <View style={styles.modalContainer}>
          <BlurView intensity={80} tint="dark" style={styles.modal}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Invite Friends</Text>
              <TouchableOpacity style={styles.closeButton} onPress={onClose} activeOpacity={0.8}>
                <Ionicons name="close" size={24} color={colors.text.primary} />
              </TouchableOpacity>
            </View>

            {/* Content */}
            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
              {availableFriends.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="people-outline" size={48} color={colors.text.tertiary} />
                  <Text style={styles.emptyTitle}>No Friends Available</Text>
                  <Text style={styles.emptyMessage}>
                    All your friends are already in this room or you have no friends to invite.
                  </Text>
                </View>
              ) : (
                <View style={styles.friendsList}>
                  {availableFriends.map((friend) => (
                    <FriendItem
                      key={friend.id}
                      friend={friend}
                      onInvite={() => handleInvite(friend.id)}
                      isInviting={inviting.has(friend.id)}
                    />
                  ))}
                </View>
              )}
            </ScrollView>
          </BlurView>
        </View>
      </View>
    </Modal>
  );
};

interface FriendItemProps {
  friend: User;
  onInvite: () => void;
  isInviting: boolean;
}

const FriendItem: React.FC<FriendItemProps> = ({ friend, onInvite, isInviting }) => {
  return (
    <View style={styles.friendItem}>
      <View style={styles.friendInfo}>
        {/* Avatar */}
        <View style={styles.avatarContainer}>
          {friend.avatar_url ? (
            <Image source={{ uri: friend.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarText}>{friend.display_name.charAt(0).toUpperCase()}</Text>
            </View>
          )}

          {/* Online indicator */}
          {friend.is_online && (
            <View style={styles.onlineIndicator}>
              <View style={styles.onlineDot} />
            </View>
          )}
        </View>

        {/* Name */}
        <Text style={styles.friendName}>{friend.display_name}</Text>
      </View>

      {/* Invite Button */}
      <TouchableOpacity
        style={styles.inviteButton}
        onPress={onInvite}
        disabled={isInviting}
        activeOpacity={0.8}
      >
        <LinearGradient colors={gradients.neonCyan} style={styles.inviteGradient}>
          {isInviting ? (
            <ActivityIndicator size="small" color={colors.text.primary} />
          ) : (
            <>
              <Ionicons name="send" size={16} color={colors.text.primary} />
              <Text style={styles.inviteButtonText}>Invite</Text>
            </>
          )}
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContainer: {
    width: '90%',
    maxWidth: 400,
    height: '60%',
    borderRadius: radius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  modal: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.glass.border,
  },
  title: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold as any,
    color: colors.text.primary,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  content: {
    flex: 1,
  },
  friendsList: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    backgroundColor: colors.glass.background,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  friendInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarPlaceholder: {
    backgroundColor: colors.glass.background,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  avatarText: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.bold as any,
    color: colors.text.primary,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.bg.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  onlineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.mood.good.base,
  },
  friendName: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold as any,
    color: colors.text.primary,
    flex: 1,
  },
  inviteButton: {
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  inviteGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  inviteButtonText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold as any,
    color: colors.text.primary,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing['3xl'],
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold as any,
    color: colors.text.primary,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  emptyMessage: {
    fontSize: typography.size.sm,
    color: colors.text.tertiary,
    textAlign: 'center',
  },
});
