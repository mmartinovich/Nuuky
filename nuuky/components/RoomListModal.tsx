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
import { spacing, radius, typography } from '../lib/theme';
import { useTheme } from '../hooks/useTheme';
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
  const { theme } = useTheme();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <BlurView intensity={80} style={styles.overlay}>
        <View style={styles.modalContainer}>
          <BlurView intensity={30} style={[styles.modal, { borderColor: theme.colors.glass.border }]}>
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: theme.colors.glass.border }]}>
              <Text style={[styles.title, { color: theme.colors.text.primary }]}>Active Rooms</Text>
              <TouchableOpacity onPress={onClose} style={[styles.closeButton, { backgroundColor: theme.colors.glass.background }]}>
                <Text style={[styles.closeText, { color: theme.colors.text.secondary }]}>✕</Text>
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
                  <Text style={[styles.emptyText, { color: theme.colors.text.secondary }]}>No active rooms</Text>
                  <Text style={[styles.emptySubtext, { color: theme.colors.text.tertiary }]}>Create one to get started</Text>
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
            <View style={[styles.footer, { borderTopColor: theme.colors.glass.border }]}>
              <TouchableOpacity onPress={onCreateRoom} style={styles.createButton}>
                <LinearGradient
                  colors={theme.colors.mood.neutral.gradient}
                  style={styles.createGradient}
                >
                  <Text style={[styles.createText, { color: theme.colors.text.primary }]}>+ Create Room</Text>
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
  const { theme } = useTheme();
  const participantCount = room.participants?.length || 0;
  const participantAvatars = room.participants?.slice(0, 3) || [];

  return (
    <BlurView intensity={20} style={[styles.roomCard, { borderColor: theme.colors.glass.border }]}>
      <View style={styles.roomContent}>
        <View style={styles.roomInfo}>
          <Text style={[styles.roomName, { color: theme.colors.text.primary }]}>{room.name || 'Unnamed Room'}</Text>
          <View style={styles.roomMeta}>
            <Text style={[styles.participantCount, { color: theme.colors.text.secondary }]}>
              {participantCount} {participantCount === 1 ? 'person' : 'people'}
            </Text>
            {room.is_private && (
              <View style={[styles.privateBadge, { backgroundColor: theme.colors.glass.background, borderColor: theme.colors.glass.border }]}>
                <Text style={[styles.privateBadgeText, { color: theme.colors.text.tertiary }]}>Private</Text>
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
                      <Image source={{ uri: user.avatar_url }} style={[styles.avatar, { borderColor: theme.colors.bg.primary }]} />
                    ) : (
                      <View style={[styles.avatar, styles.avatarPlaceholder, { borderColor: theme.colors.bg.primary, backgroundColor: theme.colors.glass.background }]}>
                        <Text style={[styles.avatarText, { color: theme.colors.text.primary }]}>
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
            <Text style={[styles.joinText, { color: theme.colors.text.primary }]}>Join</Text>
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
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: typography.sizes['2xl'],
    fontWeight: typography.weights.bold,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeText: {
    fontSize: typography.sizes.lg,
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
    marginBottom: spacing.xs,
  },
  emptySubtext: {
    fontSize: typography.sizes.sm,
  },
  roomCard: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
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
    fontWeight: typography.weights.medium,
  },
  privateBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: radius.sm,
    borderWidth: 1,
  },
  privateBadgeText: {
    fontSize: typography.sizes.xs,
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
  },
  avatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
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
  },
  footer: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    borderTopWidth: 1,
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
  },
});
