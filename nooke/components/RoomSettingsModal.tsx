import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, typography, gradients } from '../lib/theme';

interface RoomSettingsModalProps {
  visible: boolean;
  roomName: string;
  roomId: string;
  isCreator: boolean;
  isDefault: boolean;
  onClose: () => void;
  onRename: (newName: string) => Promise<void>;
  onDelete: () => Promise<void>;
  onLeave: () => void;
  onInviteFriends: () => void;
  onSetDefault: () => Promise<void>;
}

export const RoomSettingsModal: React.FC<RoomSettingsModalProps> = ({
  visible,
  roomName,
  roomId,
  isCreator,
  isDefault,
  onClose,
  onRename,
  onDelete,
  onLeave,
  onInviteFriends,
  onSetDefault,
}) => {
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(roomName);
  const [loading, setLoading] = useState(false);

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
      Alert.alert('Success', 'Room renamed successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to rename room');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    // Block deletion if this is the default room
    if (isDefault) {
      Alert.alert(
        'Cannot Delete Default Room',
        'This is your default room. Please set another room as default before deleting.',
        [{ text: 'OK', style: 'default' }]
      );
      return;
    }

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

  const handleSetDefault = async () => {
    try {
      setLoading(true);
      await onSetDefault();
      Alert.alert('Success', 'Default room updated');
    } catch (error) {
      Alert.alert('Error', 'Failed to set default room');
    } finally {
      setLoading(false);
    }
  };

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
              {/* Default Room Section */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>DEFAULT ROOM</Text>
                {isDefault ? (
                  <View style={styles.settingItem}>
                    <View style={styles.settingInfo}>
                      <Ionicons
                        name="home"
                        size={24}
                        color={colors.mood.good.base}
                      />
                      <View style={styles.defaultInfo}>
                        <Text style={styles.settingLabel}>This is your default room</Text>
                        <Text style={styles.settingDescription}>
                          Shown when you open the app
                        </Text>
                      </View>
                    </View>
                    <Ionicons name="checkmark-circle" size={24} color={colors.mood.good.base} />
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.settingItem}
                    onPress={handleSetDefault}
                    disabled={loading}
                    activeOpacity={0.8}
                  >
                    <View style={styles.settingInfo}>
                      <Ionicons
                        name="home-outline"
                        size={24}
                        color={colors.text.secondary}
                      />
                      <View style={styles.defaultInfo}>
                        <Text style={styles.settingLabel}>Set as Default</Text>
                        <Text style={styles.settingDescription}>
                          Make this your home screen
                        </Text>
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={colors.text.secondary} />
                  </TouchableOpacity>
                )}
              </View>

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
});
