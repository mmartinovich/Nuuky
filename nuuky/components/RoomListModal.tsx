import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { colors, spacing, radius, typography } from '../lib/theme';
import { Room } from '../types';

interface RoomListModalProps {
  visible: boolean;
  onClose: () => void;
  rooms: Room[];
  onJoinRoom: (roomId: string) => void;
  onCreateRoom: () => void;
}

export const RoomListModal: React.FC<RoomListModalProps> = ({
  visible,
  onClose,
  rooms,
  onJoinRoom,
  onCreateRoom,
}) => {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <BlurView intensity={80} style={styles.overlay}>
        <View style={styles.modalContainer}>
          <BlurView intensity={30} style={styles.modal}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Active Rooms</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Text style={styles.closeText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Room List */}
            <ScrollView
              style={styles.roomList}
              contentContainerStyle={styles.roomListContent}
              showsVerticalScrollIndicator={false}
            >
              {rooms.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyText}>No active rooms</Text>
                  <Text style={styles.emptySubtext}>Create one to get started</Text>
                </View>
              ) : (
                rooms.map((room) => (
                  <RoomCard
                    key={room.id}
                    room={room}
                    onJoin={() => onJoinRoom(room.id)}
                  />
                ))
              )}
            </ScrollView>

            {/* Create Button */}
            <View style={styles.footer}>
              <TouchableOpacity onPress={onCreateRoom} style={styles.createButton}>
                <LinearGradient
                  colors={colors.mood.neutral.gradient}
                  style={styles.createGradient}
                >
                  <Text style={styles.createText}>+ Create Room</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </BlurView>
        </View>
      </BlurView>
    </Modal>
  );
};

const RoomCard: React.FC<{ room: Room; onJoin: () => void }> = ({ room, onJoin }) => {
  const participantCount = room.participants?.length || 0;
  const participantAvatars = room.participants?.slice(0, 3) || [];

  return (
    <BlurView intensity={20} style={styles.roomCard}>
      <View style={styles.roomContent}>
        <View style={styles.roomInfo}>
          <Text style={styles.roomName}>{room.name || 'Unnamed Room'}</Text>
          <View style={styles.roomMeta}>
            <Text style={styles.participantCount}>
              {participantCount} {participantCount === 1 ? 'person' : 'people'}
            </Text>
            {room.is_private && (
              <View style={styles.privateBadge}>
                <Text style={styles.privateBadgeText}>Private</Text>
              </View>
            )}
          </View>

          {/* Participant Avatars */}
          {participantAvatars.length > 0 && (
            <View style={styles.avatarRow}>
              {participantAvatars.map((participant, index) => {
                const user = participant.user;
                if (!user) return null;

                return (
                  <View key={participant.id} style={[styles.avatarWrapper, { marginLeft: index > 0 ? -8 : 0 }]}>
                    {user.avatar_url ? (
                      <Image source={{ uri: user.avatar_url }} style={styles.avatar} />
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
            </View>
          )}
        </View>

        <TouchableOpacity onPress={onJoin} style={styles.joinButton}>
          <LinearGradient
            colors={['rgba(34, 197, 94, 0.3)', 'rgba(22, 163, 74, 0.3)']}
            style={styles.joinGradient}
          >
            <Text style={styles.joinText}>Join</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </BlurView>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContainer: {
    height: '80%',
  },
  modal: {
    flex: 1,
    borderTopLeftRadius: radius['2xl'],
    borderTopRightRadius: radius['2xl'],
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.glass.border,
  },
  title: {
    fontSize: typography.sizes['2xl'],
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.glass.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeText: {
    fontSize: typography.sizes.lg,
    color: colors.text.secondary,
  },
  roomList: {
    flex: 1,
  },
  roomListContent: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing['2xl'],
  },
  emptyText: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  emptySubtext: {
    fontSize: typography.sizes.sm,
    color: colors.text.tertiary,
  },
  roomCard: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.glass.border,
    marginBottom: spacing.sm,
  },
  roomContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  roomInfo: {
    flex: 1,
  },
  roomName: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  roomMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  participantCount: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
    fontWeight: typography.weights.medium,
  },
  privateBadge: {
    backgroundColor: colors.glass.background,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  privateBadgeText: {
    fontSize: typography.sizes.xs,
    color: colors.text.tertiary,
    fontWeight: typography.weights.medium,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrapper: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.bg.primary,
  },
  avatarPlaceholder: {
    backgroundColor: colors.glass.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
  },
  joinButton: {
    borderRadius: radius.full,
    overflow: 'hidden',
    marginLeft: spacing.md,
  },
  joinGradient: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  joinText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
  },
  footer: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    borderTopWidth: 1,
    borderTopColor: colors.glass.border,
  },
  createButton: {
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  createGradient: {
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  createText: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
  },
});
