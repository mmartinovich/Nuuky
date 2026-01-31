import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, typography } from '../lib/theme';
import { useTheme } from '../hooks/useTheme';
import { Room } from '../types';

interface PickRoomModalProps {
  visible: boolean;
  rooms: Room[];
  friendName: string;
  onClose: () => void;
  onPick: (roomId: string) => Promise<void>;
}

export const PickRoomModal: React.FC<PickRoomModalProps> = ({
  visible,
  rooms,
  friendName,
  onClose,
  onPick,
}) => {
  const { theme, accent } = useTheme();
  const [inviting, setInviting] = useState<string | null>(null);

  const handlePick = async (roomId: string) => {
    setInviting(roomId);
    try {
      await onPick(roomId);
    } finally {
      setInviting(null);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />

        <View style={[styles.modalContainer, { borderColor: theme.colors.glass.border }]}>
          <BlurView intensity={80} tint="dark" style={styles.modal}>
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: theme.colors.glass.border }]}>
              <Text style={[styles.title, { color: theme.colors.text.primary }]}>Invite {friendName}</Text>
              <TouchableOpacity style={[styles.closeButton, { backgroundColor: theme.colors.glass.background }]} onPress={onClose} activeOpacity={0.8}>
                <Ionicons name="close" size={24} color={theme.colors.text.primary} />
              </TouchableOpacity>
            </View>

            {/* Content */}
            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
              {rooms.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="people-outline" size={48} color={theme.colors.text.tertiary} />
                  <Text style={[styles.emptyTitle, { color: theme.colors.text.primary }]}>No Rooms</Text>
                  <Text style={[styles.emptyMessage, { color: theme.colors.text.tertiary }]}>
                    Create a room first to invite friends.
                  </Text>
                </View>
              ) : (
                <View style={styles.roomsList}>
                  <Text style={[styles.subtitle, { color: theme.colors.text.tertiary }]}>Choose a Room</Text>
                  {rooms.map((room) => (
                    <RoomItem
                      key={room.id}
                      room={room}
                      onPick={() => handlePick(room.id)}
                      isInviting={inviting === room.id}
                      accent={accent}
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

interface RoomItemProps {
  room: Room;
  onPick: () => void;
  isInviting: boolean;
  accent: { primary: string; soft: string };
}

const RoomItem: React.FC<RoomItemProps> = ({ room, onPick, isInviting, accent }) => {
  const { theme } = useTheme();
  return (
    <View style={[styles.roomItem, { backgroundColor: theme.colors.glass.background, borderColor: theme.colors.glass.border }]}>
      <View style={styles.roomInfo}>
        <View style={[styles.roomIcon, { backgroundColor: accent.soft }]}>
          <Ionicons name="people" size={20} color={accent.primary} />
        </View>
        <Text style={[styles.roomName, { color: theme.colors.text.primary }]} numberOfLines={1}>
          {room.name || 'Unnamed Room'}
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.inviteButton, { backgroundColor: accent.primary }]}
        onPress={onPick}
        disabled={isInviting}
        activeOpacity={0.8}
      >
        {isInviting ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <>
            <Ionicons name="send" size={16} color="#FFFFFF" />
            <Text style={styles.inviteButtonText}>Invite</Text>
          </>
        )}
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
  },
  title: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold as any,
    flex: 1,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  subtitle: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium as any,
    letterSpacing: 0.3,
    marginBottom: spacing.sm,
  },
  roomsList: {
    padding: spacing.md,
  },
  roomItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  roomInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  roomIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  roomName: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold as any,
    flex: 1,
  },
  inviteButton: {
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  inviteButtonText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold as any,
    color: '#FFFFFF',
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
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  emptyMessage: {
    fontSize: typography.size.sm,
    textAlign: 'center',
  },
});
