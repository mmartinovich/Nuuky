import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  Image,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, typography, gradients, getMoodColor } from '../lib/theme';
import { RoomParticipant } from '../types';

interface RoomSettingsModalProps {
  visible: boolean;
  roomName: string;
  roomId: string;
  isCreator: boolean;
  creatorId: string;
  participants: RoomParticipant[];
  currentUserId: string;
  onClose: () => void;
  onRename: (newName: string) => Promise<void>;
  onDelete: () => Promise<void>;
  onLeave: () => void;
  onInviteFriends: () => void;
  onRemoveParticipant?: (userId: string, userName: string) => Promise<void>;
}

export const RoomSettingsModal: React.FC<RoomSettingsModalProps> = ({
  visible,
  roomName,
  roomId,
  isCreator,
  creatorId,
  participants,
  currentUserId,
  onClose,
  onRename,
  onDelete,
  onLeave,
  onInviteFriends,
  onRemoveParticipant,
}) => {
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(roomName);
  const [loading, setLoading] = useState(false);
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);

  const handleRename = async () => {
    if (!newName.trim()) {
      Alert.alert('Error', 'Please enter a room name');
      return;
    }

    if (newName === roomName) {
      setIsRenaming(false);
      return;
    }

    try {
      setLoading(true);
      await onRename(newName.trim());
      setIsRenaming(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to rename room');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Room',
      'Are you sure you want to delete this room? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await onDelete();
              onClose();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete room');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleRemoveParticipant = (userId: string, userName: string) => {
    Alert.alert(
      'Remove Member',
      `Remove ${userName} from this room?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              setRemovingUserId(userId);
              await onRemoveParticipant?.(userId, userName);
            } catch (error) {
              Alert.alert('Error', 'Failed to remove member');
            } finally {
              setRemovingUserId(null);
            }
          },
        },
      ]
    );
  };

  // Sort participants: creator first, then alphabetical
  const sortedParticipants = useMemo(() => {
    if (!participants || participants.length === 0) return [];
    return [...participants].sort((a, b) => {
      // Creator always first
      if (a.user_id === creatorId) return -1;
      if (b.user_id === creatorId) return 1;
      // Then alphabetical
      const nameA = a.user?.display_name || '';
      const nameB = b.user?.display_name || '';
      return nameA.localeCompare(nameB);
    });
  }, [participants, creatorId]);

  const handleClose = () => {
    setIsRenaming(false);
    setNewName(roomName);
    onClose();
  };
  
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Room Settings</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={handleClose}
                activeOpacity={0.8}
              >
                <Ionicons name="close" size={24} color={colors.text.primary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.content}
              contentContainerStyle={styles.contentContainer}
              showsVerticalScrollIndicator={false}
            >
              {/* Room Name Section */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>ROOM NAME</Text>
                {isRenaming ? (
                  <View style={styles.renameContainer}>
                    <TextInput
                      style={styles.input}
                      value={newName}
                      onChangeText={setNewName}
                      placeholder="Enter room name"
                      placeholderTextColor={colors.text.tertiary}
                      autoFocus
                      maxLength={50}
                    />
                    <View style={styles.renameButtons}>
                      <TouchableOpacity
                        style={styles.cancelButton}
                        onPress={() => {
                          setIsRenaming(false);
                          setNewName(roomName);
                        }}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.cancelButtonText}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.saveButton}
                        onPress={handleRename}
                        disabled={loading}
                        activeOpacity={0.8}
                      >
                        <LinearGradient colors={gradients.neonCyan} style={styles.saveGradient}>
                          <Text style={styles.saveButtonText}>
                            {loading ? 'Saving...' : 'Save'}
                          </Text>
                        </LinearGradient>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.settingItem}
                    onPress={() => isCreator && setIsRenaming(true)}
                    disabled={!isCreator}
                    activeOpacity={0.8}
                  >
                    <View style={styles.settingInfo}>
                      <Text style={styles.roomNameText}>{roomName}</Text>
                    </View>
                    {isCreator && (
                      <Ionicons name="pencil" size={20} color={colors.text.secondary} />
                    )}
                  </TouchableOpacity>
                )}
              </View>

              {/* Participants Section */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>MEMBERS ({participants?.length || 0})</Text>
                <View style={styles.participantsList}>
                  {sortedParticipants.map((participant) => {
                    const user = participant.user;
                    if (!user) return null;

                    const isCurrentUser = user.id === currentUserId;
                    const isRoomCreator = user.id === creatorId;
                    const canRemove = isCreator && !isCurrentUser && onRemoveParticipant;
                    const isRemoving = removingUserId === user.id;
                    const moodColors = getMoodColor(user.mood || 'neutral');

                    return (
                      <View key={participant.id} style={styles.participantItem}>
                        <View style={styles.participantInfo}>
                          {/* Avatar with mood border */}
                          <View style={styles.avatarContainer}>
                            {user.avatar_url ? (
                              <Image
                                source={{ uri: user.avatar_url }}
                                style={styles.avatar}
                              />
                            ) : (
                              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                                <Text style={styles.avatarText}>
                                  {user.display_name?.charAt(0).toUpperCase() || '?'}
                                </Text>
                              </View>
                            )}
                            <View
                              style={[
                                styles.avatarBorder,
                                { borderColor: moodColors.base },
                              ]}
                            />
                            {user.is_online && <View style={styles.onlineIndicator} />}
                          </View>

                          {/* Name and badges */}
                          <View style={styles.participantDetails}>
                            <View style={styles.nameRow}>
                              <Text style={styles.participantName} numberOfLines={1}>
                                {user.display_name}
                              </Text>
                              {isRoomCreator && (
                                <View style={styles.creatorBadge}>
                                  <Ionicons name="star" size={12} color={colors.neon.cyan} />
                                  <Text style={styles.creatorBadgeText}>Creator</Text>
                                </View>
                              )}
                            </View>
                          </View>
                        </View>

                        {/* Remove button (only for creator, not for current user) */}
                        {canRemove && (
                          <TouchableOpacity
                            style={styles.removeButton}
                            onPress={() => handleRemoveParticipant(user.id, user.display_name)}
                            disabled={isRemoving}
                            activeOpacity={0.7}
                          >
                            {isRemoving ? (
                              <ActivityIndicator size="small" color={colors.mood.reachOut.base} />
                            ) : (
                              <Ionicons
                                name="close-circle"
                                size={24}
                                color={colors.mood.reachOut.base}
                              />
                            )}
                          </TouchableOpacity>
                        )}
                      </View>
                    );
                  })}
                </View>
              </View>

              {/* Actions Section */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>ACTIONS</Text>

                {/* Invite Friends */}
                <TouchableOpacity
                  style={styles.settingItem}
                  onPress={onInviteFriends}
                  activeOpacity={0.8}
                >
                  <View style={styles.settingInfo}>
                    <Ionicons
                      name="person-add-outline"
                      size={24}
                      color={colors.mood.good.base}
                    />
                    <Text style={styles.settingLabel}>Invite Friends</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.text.secondary} />
                </TouchableOpacity>

                {/* Leave Room */}
                <TouchableOpacity
                  style={[styles.settingItem, styles.leaveItem]}
                  onPress={() => {
                    onLeave();
                    onClose();
                  }}
                  activeOpacity={0.8}
                >
                  <View style={styles.settingInfo}>
                    <Ionicons
                      name="exit-outline"
                      size={24}
                      color={colors.mood.reachOut.base}
                    />
                    <Text style={styles.leaveLabel}>Leave Room</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.text.secondary} />
                </TouchableOpacity>
              </View>

              {/* Danger Zone (Creator Only) */}
              {isCreator && (
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, styles.dangerTitle]}>DANGER ZONE</Text>

                  {/* Delete Room */}
                  <TouchableOpacity
                    style={[styles.settingItem, styles.dangerItem]}
                    onPress={handleDelete}
                    disabled={loading}
                    activeOpacity={0.8}
                  >
                    <View style={styles.settingInfo}>
                      <Ionicons name="trash-outline" size={24} color={colors.mood.reachOut.base} />
                      <Text style={styles.dangerLabel}>Delete Room</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={colors.text.secondary} />
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
        </View>
      </View>
    </Modal>
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
    height: '70%',
    borderRadius: radius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.glass.border,
    backgroundColor: colors.bg.secondary,
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
  contentContainer: {
    padding: spacing.lg,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold as any,
    color: colors.text.secondary,
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  dangerTitle: {
    color: colors.mood.reachOut.base,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.glass.background,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  dangerItem: {
    borderColor: colors.mood.reachOut.soft,
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  settingLabel: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.medium as any,
    color: colors.text.primary,
  },
  dangerLabel: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.medium as any,
    color: colors.mood.reachOut.base,
  },
  leaveItem: {
    marginTop: spacing.sm,
  },
  leaveLabel: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.medium as any,
    color: colors.mood.reachOut.base,
  },
  roomNameText: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold as any,
    color: colors.text.primary,
  },
  defaultInfo: {
    flex: 1,
  },
  settingDescription: {
    fontSize: typography.size.xs,
    color: colors.text.tertiary,
    marginTop: 2,
  },
  renameContainer: {
    gap: spacing.sm,
  },
  input: {
    backgroundColor: colors.glass.background,
    borderWidth: 1,
    borderColor: colors.glass.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: typography.size.md,
    color: colors.text.primary,
  },
  renameButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.glass.background,
    borderWidth: 1,
    borderColor: colors.glass.border,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold as any,
    color: colors.text.secondary,
  },
  saveButton: {
    flex: 1,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  saveGradient: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold as any,
    color: colors.text.primary,
  },
  // Participants list styles
  participantsList: {
    gap: spacing.sm,
  },
  participantItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.glass.background,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  participantInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.sm,
  },
  avatarContainer: {
    position: 'relative',
    width: 40,
    height: 40,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarPlaceholder: {
    backgroundColor: colors.glass.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.bold as any,
    color: colors.text.primary,
  },
  avatarBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 20,
    borderWidth: 2,
  },
  onlineIndicator: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.mood.good.base,
    borderWidth: 2,
    borderColor: colors.bg.secondary,
  },
  participantDetails: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  participantName: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.medium as any,
    color: colors.text.primary,
    flex: 1,
  },
  creatorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    backgroundColor: 'rgba(0, 240, 255, 0.1)',
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.3)',
  },
  creatorBadgeText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold as any,
    color: colors.neon.cyan,
  },
  removeButton: {
    padding: spacing.xs,
  },
});
