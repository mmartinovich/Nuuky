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
import { Ionicons } from '@expo/vector-icons';
import { colors, getMoodColor, interactionStates } from '../lib/theme';
import { useTheme } from '../hooks/useTheme';
import { RoomParticipant } from '../types';

// Friends page style constants
const PURPLE_ACCENT = '#A855F7';

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
  const { theme } = useTheme();
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
          <LinearGradient colors={theme.gradients.background} style={styles.gradientBackground}>
            {/* Header - Friends page style */}
            <View style={styles.header}>
              <View style={styles.headerLeft} />
              <Text style={styles.headerTitle}>Room Settings</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={handleClose}
                activeOpacity={interactionStates.pressed}
              >
                <Ionicons name="close" size={24} color={PURPLE_ACCENT} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.content}
              contentContainerStyle={styles.contentContainer}
              showsVerticalScrollIndicator={false}
            >
            {/* Room Name Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitleText}>ROOM NAME</Text>
              {isRenaming ? (
                <View style={styles.renameContainer}>
                  <TextInput
                    style={styles.input}
                    value={newName}
                    onChangeText={setNewName}
                    placeholder="Enter room name"
                    placeholderTextColor="rgba(255,255,255,0.3)"
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
                      activeOpacity={0.7}
                    >
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.saveButton}
                      onPress={handleRename}
                      disabled={loading}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.saveButtonText}>
                        {loading ? 'Saving...' : 'Save'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.actionCard}
                  onPress={() => isCreator && setIsRenaming(true)}
                  disabled={!isCreator}
                  activeOpacity={0.7}
                >
                  <View style={styles.actionIconContainer}>
                    <Ionicons name="chatbubble-outline" size={20} color={PURPLE_ACCENT} />
                  </View>
                  <View style={styles.actionTextContainer}>
                    <Text style={styles.actionTitle}>{roomName}</Text>
                    {isCreator && (
                      <Text style={styles.actionSubtitle}>Tap to rename</Text>
                    )}
                  </View>
                  {isCreator && (
                    <Ionicons name="pencil" size={18} color="rgba(255,255,255,0.3)" />
                  )}
                </TouchableOpacity>
              )}
            </View>

            {/* Members Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitleText}>MEMBERS</Text>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{participants?.length || 0}</Text>
                </View>
              </View>
              <View style={styles.membersList}>
                {sortedParticipants.map((participant) => {
                  const user = participant.user;
                  if (!user) return null;

                  const isCurrentUser = user.id === currentUserId;
                  const isRoomCreator = user.id === creatorId;
                  const canRemove = isCreator && !isCurrentUser && onRemoveParticipant;
                  const isRemoving = removingUserId === user.id;
                  const moodColors = getMoodColor(user.mood || 'neutral');

                  return (
                    <View key={participant.id} style={styles.memberCard}>
                      <View style={styles.memberInfo}>
                        {/* Avatar with mood border */}
                        <View style={styles.memberAvatarWrapper}>
                          {user.avatar_url ? (
                            <Image
                              source={{ uri: user.avatar_url }}
                              style={[
                                styles.memberAvatar,
                                {
                                  borderColor: user.is_online ? moodColors.base : "rgba(255,255,255,0.1)",
                                },
                              ]}
                            />
                          ) : (
                            <View
                              style={[
                                styles.memberAvatar,
                                styles.memberAvatarPlaceholder,
                                {
                                  borderColor: user.is_online ? moodColors.base : "rgba(255,255,255,0.1)",
                                },
                              ]}
                            >
                              <Ionicons name="person" size={20} color={PURPLE_ACCENT} />
                            </View>
                          )}
                          {user.is_online && <View style={styles.onlineIndicator} />}
                        </View>

                        {/* Name and status */}
                        <View style={styles.memberText}>
                          <View style={styles.nameRow}>
                            <Text style={styles.memberName} numberOfLines={1}>
                              {user.display_name}{isCurrentUser ? ' (You)' : ''}
                            </Text>
                            {isRoomCreator && (
                              <View style={styles.ownerBadge}>
                                <Ionicons name="star" size={10} color={PURPLE_ACCENT} />
                              </View>
                            )}
                          </View>
                          <Text style={styles.memberStatus}>
                            {user.is_online ? 'Online' : 'Offline'}
                          </Text>
                        </View>
                      </View>

                      {/* Remove button */}
                      {canRemove && (
                        <TouchableOpacity
                          style={styles.removeButton}
                          onPress={() => handleRemoveParticipant(user.id, user.display_name)}
                          disabled={isRemoving}
                          activeOpacity={0.7}
                        >
                          {isRemoving ? (
                            <ActivityIndicator size="small" color="#EF4444" />
                          ) : (
                            <Ionicons name="close-circle" size={22} color="#EF4444" />
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
              <Text style={styles.sectionTitleText}>ACTIONS</Text>
              <View style={styles.actionsContainer}>
                {/* Invite Friends */}
                <TouchableOpacity
                  style={styles.actionCard}
                  onPress={onInviteFriends}
                  activeOpacity={0.7}
                >
                  <View style={styles.actionIconContainer}>
                    <Ionicons name="person-add-outline" size={20} color={PURPLE_ACCENT} />
                  </View>
                  <View style={styles.actionTextContainer}>
                    <Text style={styles.actionTitle}>Invite Friends</Text>
                    <Text style={styles.actionSubtitle}>Add people to this room</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.3)" />
                </TouchableOpacity>

                {/* Leave Room */}
                <TouchableOpacity
                  style={styles.actionCard}
                  onPress={() => {
                    onLeave();
                    onClose();
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.actionIconContainer, styles.leaveIconContainer]}>
                    <Ionicons name="exit-outline" size={20} color="#EF4444" />
                  </View>
                  <View style={styles.actionTextContainer}>
                    <Text style={[styles.actionTitle, styles.leaveText]}>Leave Room</Text>
                    <Text style={styles.actionSubtitle}>Exit this room</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.3)" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Danger Zone (Creator Only) */}
            {isCreator && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitleText, styles.dangerSectionTitle]}>DANGER ZONE</Text>
                <TouchableOpacity
                  style={[styles.actionCard, styles.dangerCard]}
                  onPress={handleDelete}
                  disabled={loading}
                  activeOpacity={0.7}
                >
                  <View style={[styles.actionIconContainer, styles.dangerIconContainer]}>
                    <Ionicons name="trash-outline" size={20} color="#EF4444" />
                  </View>
                  <View style={styles.actionTextContainer}>
                    <Text style={[styles.actionTitle, styles.dangerText]}>Delete Room</Text>
                    <Text style={styles.actionSubtitle}>Permanently remove this room</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.3)" />
                </TouchableOpacity>
              </View>
            )}
            </ScrollView>
          </LinearGradient>
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
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  modalContainer: {
    width: '90%',
    maxWidth: 400,
    height: '75%',
    borderRadius: 24,
    overflow: 'hidden',
  },
  gradientBackground: {
    flex: 1,
    borderRadius: 24,
    overflow: 'hidden',
  },
  // Header - Friends page style
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
    flexShrink: 0,
  },
  headerLeft: {
    width: 44,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
    color: colors.text.primary,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(168, 85, 247, 0.1)',
  },
  content: {
    flex: 1,
    flexGrow: 1,
  },
  contentContainer: {
    padding: 24,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 24,
  },
  // Section header with badge - Friends page style
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitleText: {
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 0.5,
    color: 'rgba(255, 255, 255, 0.5)',
    marginBottom: 12,
  },
  badge: {
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginBottom: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: PURPLE_ACCENT,
  },
  // Action cards - Friends page style
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    gap: 12,
  },
  actionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(168, 85, 247, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionTextContainer: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 2,
  },
  actionSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  actionsContainer: {
    gap: 12,
  },
  // Leave/Danger styles
  leaveIconContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
  },
  leaveText: {
    color: '#EF4444',
  },
  dangerSectionTitle: {
    color: '#EF4444',
  },
  dangerCard: {
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  dangerIconContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
  },
  dangerText: {
    color: '#EF4444',
  },
  // Rename container
  renameContainer: {
    gap: 12,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.text.primary,
  },
  renameButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.5)',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: PURPLE_ACCENT,
    borderRadius: 16,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // Members list - Friends page style
  membersList: {
    gap: 8,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  memberAvatarWrapper: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  memberAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
  },
  memberAvatarPlaceholder: {
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#22C55E',
    borderWidth: 2,
    borderColor: colors.bg.primary,
  },
  memberText: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 2,
  },
  ownerBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  memberStatus: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  removeButton: {
    padding: 4,
  },
});
