import { logger } from '../lib/logger';
import React, { useState, useMemo, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
  LayoutAnimation,
  Platform,
  UIManager,
  Dimensions,
} from "react-native";
import { Image as CachedImage } from 'expo-image';
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { getMoodColor, interactionStates } from "../lib/theme";
import { useTheme } from "../hooks/useTheme";
import { useInviteLink } from "../hooks/useInviteLink";
import { RoomParticipant, User } from "../types";
import { isUserTrulyOnline } from "../lib/utils";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
  Easing,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

// Enable LayoutAnimation on Android
if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

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
  onRemoveParticipant?: (userId: string, userName: string) => Promise<void>;
  originPoint?: { x: number; y: number };
  friends?: User[];
  participantIds?: string[];
  onInvite?: (friendId: string) => Promise<void>;
}

const MAX_VISIBLE_AVATARS = 4;

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
  onRemoveParticipant,
  originPoint,
  friends,
  participantIds,
  onInvite,
}) => {
  const { theme, accent } = useTheme();
  const insets = useSafeAreaInsets();
  const { createInviteLink, shareInviteLink, loading: linkLoading } = useInviteLink();

  const offsetX = (originPoint?.x ?? SCREEN_W / 2) - SCREEN_W / 2;
  const offsetY = (originPoint?.y ?? SCREEN_H / 2) - SCREEN_H / 2;
  const progress = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      progress.value = withTiming(1, { duration: 250, easing: Easing.out(Easing.cubic) });
    } else {
      progress.value = 0;
    }
  }, [visible]);

  const animatedStyle = useAnimatedStyle(() => {
    const p = progress.value;
    return {
      opacity: p,
      transform: [
        { translateX: offsetX * (1 - p) },
        { translateY: offsetY * (1 - p) },
        { scale: 0.3 + p * 0.7 },
      ],
    };
  });

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
  }));
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(roomName);
  const [loading, setLoading] = useState(false);
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);
  const [sharingLink, setSharingLink] = useState(false);
  const [membersExpanded, setMembersExpanded] = useState(false);
  const [inviteExpanded, setInviteExpanded] = useState(false);
  const [invitingIds, setInvitingIds] = useState<Set<string>>(new Set());
  const [invitedIds, setInvitedIds] = useState<Set<string>>(new Set());
  const [inviteSearch, setInviteSearch] = useState("");

  const handleRename = async () => {
    if (!newName.trim()) {
      Alert.alert("Error", "Please enter a room name");
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
      Alert.alert("Error", "Failed to rename room");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    Alert.alert("Delete Room", "Are you sure you want to delete this room? This action cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            setLoading(true);
            await onDelete();
            onClose();
          } catch (error) {
            Alert.alert("Error", "Failed to delete room");
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  const handleRemoveParticipant = (userId: string, userName: string) => {
    Alert.alert("Remove Member", `Remove ${userName} from this room?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          try {
            setRemovingUserId(userId);
            await onRemoveParticipant?.(userId, userName);
          } catch (error) {
            Alert.alert("Error", "Failed to remove member");
          } finally {
            setRemovingUserId(null);
          }
        },
      },
    ]);
  };

  const toggleMembersExpanded = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setMembersExpanded(!membersExpanded);
  };

  const toggleInviteExpanded = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setInviteExpanded(!inviteExpanded);
    if (inviteExpanded) setInviteSearch("");
  };

  const availableFriends = useMemo(() => {
    if (!friends || !participantIds) return [];
    return friends.filter((f) => !participantIds.includes(f.id));
  }, [friends, participantIds]);

  const filteredFriends = useMemo(() => {
    if (!inviteSearch.trim()) return availableFriends;
    const q = inviteSearch.trim().toLowerCase();
    return availableFriends.filter((f) => f.display_name.toLowerCase().includes(q));
  }, [availableFriends, inviteSearch]);

  const handleInviteFriend = async (friendId: string) => {
    setInvitingIds((prev) => new Set(prev).add(friendId));
    try {
      await onInvite?.(friendId);
      setInvitedIds((prev) => new Set(prev).add(friendId));
    } finally {
      setInvitingIds((prev) => {
        const next = new Set(prev);
        next.delete(friendId);
        return next;
      });
    }
  };

  // Sort participants: creator first, then alphabetical
  const sortedParticipants = useMemo(() => {
    if (!participants || participants.length === 0) return [];
    return [...participants].sort((a, b) => {
      // Creator always first
      if (a.user_id === creatorId) return -1;
      if (b.user_id === creatorId) return 1;
      // Then alphabetical
      const nameA = a.user?.display_name || "";
      const nameB = b.user?.display_name || "";
      return nameA.localeCompare(nameB);
    });
  }, [participants, creatorId]);

  const handleShareLink = async () => {
    setSharingLink(true);
    try {
      // Create a new invite link
      const link = await createInviteLink(roomId, { expiresInHours: 24 * 7 }); // 7 days
      if (link) {
        await shareInviteLink(link.token, roomName);
      }
    } catch (error) {
      logger.error("Error sharing link:", error);
      Alert.alert("Error", "Failed to create share link");
    } finally {
      setSharingLink(false);
    }
  };

  const handleClose = useCallback(() => {
    setIsRenaming(false);
    setNewName(roomName);
    setMembersExpanded(false);
    setInviteExpanded(false);
    setInviteSearch("");
    setInvitedIds(new Set());
    progress.value = withTiming(0, { duration: 200, easing: Easing.in(Easing.cubic) }, () => {
      runOnJS(onClose)();
    });
  }, [onClose, roomName]);

  // Render avatar for the stack
  const renderStackedAvatar = (participant: RoomParticipant, index: number) => {
    const user = participant.user;
    if (!user) return null;

    const moodColors = getMoodColor(user.mood || "neutral");
    const isOnline = isUserTrulyOnline(user.is_online, user.last_seen_at);

    return (
      <View
        key={participant.id}
        style={[
          styles.stackedAvatarWrapper,
          index === 0 && styles.firstStackedAvatar,
        ]}
      >
        {user.avatar_url ? (
          <CachedImage
            source={{ uri: user.avatar_url }}
            style={[
              styles.stackedAvatar,
              {
                borderColor: isOnline ? moodColors.base : theme.colors.glass.border,
                backgroundColor: theme.colors.bg.secondary,
              },
            ]}
            cachePolicy="memory-disk"
            contentFit="cover"
            transition={200}
          />
        ) : (
          <View
            style={[
              styles.stackedAvatar,
              styles.stackedAvatarPlaceholder,
              {
                backgroundColor: accent.soft,
                borderColor: isOnline ? moodColors.base : theme.colors.glass.border,
              },
            ]}
          >
            <Ionicons name="person" size={16} color={accent.primary} />
          </View>
        )}
        {isOnline && <View style={[styles.stackedOnlineIndicator, { backgroundColor: theme.colors.status.success, borderColor: theme.colors.bg.secondary }]} />}
      </View>
    );
  };

  // Render expanded member row
  const renderExpandedMember = (participant: RoomParticipant, index: number) => {
    const user = participant.user;
    if (!user) return null;

    const isCurrentUser = user.id === currentUserId;
    const isRoomCreator = user.id === creatorId;
    const canRemove = isCreator && !isCurrentUser && onRemoveParticipant;
    const isRemoving = removingUserId === user.id;
    const moodColors = getMoodColor(user.mood || "neutral");
    const isOnline = isUserTrulyOnline(user.is_online, user.last_seen_at);

    return (
      <React.Fragment key={participant.id}>
        {index > 0 && <View style={[styles.memberRowSeparator, { backgroundColor: theme.colors.glass.border }]} />}
        <View style={styles.expandedMemberRow}>
          <View style={styles.memberInfo}>
            {/* Avatar with mood border */}
            <View style={styles.memberAvatarWrapper}>
              {user.avatar_url ? (
                <CachedImage
                  source={{ uri: user.avatar_url }}
                  style={[
                    styles.memberAvatar,
                    {
                      borderColor: isOnline ? moodColors.base : theme.colors.glass.border,
                    },
                  ]}
                  cachePolicy="memory-disk"
                  contentFit="cover"
                  transition={200}
                />
              ) : (
                <View
                  style={[
                    styles.memberAvatar,
                    styles.memberAvatarPlaceholder,
                    {
                      backgroundColor: accent.soft,
                      borderColor: isOnline ? moodColors.base : theme.colors.glass.border,
                    },
                  ]}
                >
                  <Ionicons name="person" size={18} color={accent.primary} />
                </View>
              )}
              {isOnline && <View style={[styles.onlineIndicator, { backgroundColor: theme.colors.status.success, borderColor: theme.colors.bg.primary }]} />}
            </View>

            {/* Name and status */}
            <View style={styles.memberText}>
              <View style={styles.nameRow}>
                <Text style={[styles.memberName, { color: theme.colors.text.primary }]} numberOfLines={1}>
                  {user.display_name}
                  {isCurrentUser ? " (You)" : ""}
                </Text>
                {isRoomCreator && (
                  <View style={[styles.ownerBadge, { backgroundColor: accent.soft }]}>
                    <Ionicons name="star" size={10} color={accent.primary} />
                  </View>
                )}
              </View>
              <Text style={[styles.memberStatus, { color: theme.colors.text.tertiary }]}>{isOnline ? "Online" : "Offline"}</Text>
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
                <ActivityIndicator size="small" color={theme.colors.status.error} />
              ) : (
                <Ionicons name="close-circle" size={20} color={theme.colors.status.error} />
              )}
            </TouchableOpacity>
          )}
        </View>
      </React.Fragment>
    );
  };

  const visibleAvatars = sortedParticipants.slice(0, MAX_VISIBLE_AVATARS);
  const overflowCount = sortedParticipants.length - MAX_VISIBLE_AVATARS;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose} statusBarTranslucent>
      <View style={styles.fullScreen}>
        <Animated.View style={[StyleSheet.absoluteFill, backdropStyle]}>
          <BlurView intensity={50} tint="dark" style={StyleSheet.absoluteFill}>
            <TouchableOpacity
              style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.4)" }]}
              activeOpacity={1}
              onPress={handleClose}
            />
          </BlurView>
        </Animated.View>

        <Animated.View style={[styles.fullScreenContent, animatedStyle]}>
          {/* ScrollView - underneath header */}
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={[
              styles.contentContainer,
              {
                paddingTop: insets.top + 120,
                paddingBottom: insets.bottom + 24,
              },
            ]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
              {/* Room Name Section */}
              <View style={styles.section}>
                <Text style={[styles.sectionTitleText, { color: theme.colors.text.tertiary }]}>ROOM NAME</Text>
                {isRenaming ? (
                  <View style={styles.renameContainer}>
                    <TextInput
                      style={[styles.input, { backgroundColor: theme.colors.glass.background, borderColor: theme.colors.glass.border, color: theme.colors.text.primary }]}
                      value={newName}
                      onChangeText={setNewName}
                      placeholder="Enter room name"
                      placeholderTextColor={theme.colors.text.tertiary}
                      autoFocus
                      maxLength={50}
                    />
                    <View style={styles.renameButtons}>
                      <TouchableOpacity
                        style={[styles.cancelButton, { backgroundColor: theme.colors.glass.background, borderColor: theme.colors.glass.border }]}
                        onPress={() => {
                          setIsRenaming(false);
                          setNewName(roomName);
                        }}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.cancelButtonText, { color: theme.colors.text.secondary }]}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.saveButton, { backgroundColor: accent.primary }]}
                        onPress={handleRename}
                        disabled={loading}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.saveButtonText, { color: accent.textOnPrimary }]}>{loading ? "Saving..." : "Save"}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <View style={[styles.groupedCard, { backgroundColor: theme.colors.glass.background, borderColor: theme.colors.glass.border }]}>
                    <TouchableOpacity
                      style={styles.groupedCardRow}
                      onPress={() => isCreator && setIsRenaming(true)}
                      disabled={!isCreator}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="chatbubble-outline" size={20} color={theme.colors.text.secondary} />
                      <View style={styles.actionTextContainer}>
                        <Text style={[styles.actionTitle, { color: theme.colors.text.primary }]}>{roomName}</Text>
                        {isCreator && <Text style={[styles.actionSubtitle, { color: theme.colors.text.tertiary }]}>Tap to rename</Text>}
                      </View>
                      {isCreator && <Ionicons name="pencil" size={16} color={theme.colors.text.tertiary} />}
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {/* Members Section - Compact Avatar Stack */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionTitleTextInline, { color: theme.colors.text.tertiary }]}>MEMBERS</Text>
                  <View style={[styles.badge, { backgroundColor: theme.colors.glass.background }]}>
                    <Text style={[styles.badgeText, { color: theme.colors.text.secondary }]}>{participants?.length || 0}</Text>
                  </View>
                </View>

                <View style={[styles.groupedCard, { backgroundColor: theme.colors.glass.background, borderColor: theme.colors.glass.border }]}>
                  {/* Avatar Stack Header */}
                  <TouchableOpacity
                    style={styles.avatarStackContainer}
                    onPress={toggleMembersExpanded}
                    activeOpacity={0.7}
                  >
                    <View style={styles.avatarStack}>
                      {visibleAvatars.map((participant, index) => 
                        renderStackedAvatar(participant, index)
                      )}
                      {overflowCount > 0 && (
                        <View style={[styles.stackedAvatarWrapper, styles.overflowBadge, { backgroundColor: theme.colors.glass.border, borderColor: theme.colors.glass.border }]}>
                          <Text style={[styles.overflowText, { color: theme.colors.text.secondary }]}>+{overflowCount}</Text>
                        </View>
                      )}
                    </View>
                    <Ionicons
                      name={membersExpanded ? "chevron-up" : "chevron-down"}
                      size={20}
                      color={theme.colors.text.tertiary}
                    />
                  </TouchableOpacity>

                  {/* Expanded Member List */}
                  {membersExpanded && (
                    <View style={styles.expandedMembersList}>
                      <View style={[styles.fullWidthSeparator, { backgroundColor: theme.colors.glass.border }]} />
                      {sortedParticipants.map((participant, index) =>
                        renderExpandedMember(participant, index)
                      )}
                    </View>
                  )}
                </View>
              </View>

              {/* Actions Section - Grouped Card */}
              <View style={styles.section}>
                <Text style={[styles.sectionTitleText, { color: theme.colors.text.tertiary }]}>ACTIONS</Text>
                {/* Invite Friends (Creator Only) - Expandable */}
                {isCreator && (
                  <View style={[styles.groupedCard, { backgroundColor: theme.colors.glass.background, borderColor: theme.colors.glass.border }]}>
                    <TouchableOpacity
                      style={styles.groupedCardRow}
                      onPress={toggleInviteExpanded}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.actionIconContainer, { backgroundColor: accent.soft }]}>
                        <Ionicons name="person-add-outline" size={18} color={accent.primary} />
                      </View>
                      <View style={styles.actionTextContainer}>
                        <Text style={[styles.actionTitle, { color: theme.colors.text.primary }]}>Invite Friends</Text>
                        <Text style={[styles.actionSubtitle, { color: theme.colors.text.tertiary }]}>
                          {availableFriends.length > 0 ? `${availableFriends.length} available` : "No friends available"}
                        </Text>
                      </View>
                      <Ionicons
                        name={inviteExpanded ? "chevron-up" : "chevron-down"}
                        size={20}
                        color={theme.colors.text.tertiary}
                      />
                    </TouchableOpacity>

                    {inviteExpanded && (
                      <View style={styles.expandedInviteList}>
                        <View style={[styles.fullWidthSeparator, { backgroundColor: theme.colors.glass.border }]} />
                        {availableFriends.length === 0 ? (
                          <View style={styles.inviteEmptyState}>
                            <Ionicons name="people-outline" size={32} color={theme.colors.text.tertiary} />
                            <Text style={[styles.inviteEmptyText, { color: theme.colors.text.tertiary }]}>
                              All friends are already in this room
                            </Text>
                          </View>
                        ) : (
                          <>
                          <View style={[styles.inviteSearchContainer, { borderBottomColor: theme.colors.glass.border }]}>
                            <Ionicons name="search" size={16} color={theme.colors.text.tertiary} />
                            <TextInput
                              style={[styles.inviteSearchInput, { color: theme.colors.text.primary }]}
                              value={inviteSearch}
                              onChangeText={setInviteSearch}
                              placeholder="Search friends..."
                              placeholderTextColor={theme.colors.text.tertiary}
                              autoCorrect={false}
                            />
                            {inviteSearch.length > 0 && (
                              <TouchableOpacity onPress={() => setInviteSearch("")} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                                <Ionicons name="close-circle" size={16} color={theme.colors.text.tertiary} />
                              </TouchableOpacity>
                            )}
                          </View>
                          <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={filteredFriends.length > 4}>
                          {filteredFriends.length === 0 ? (
                            <View style={styles.inviteEmptyState}>
                              <Text style={[styles.inviteEmptyText, { color: theme.colors.text.tertiary }]}>No matches</Text>
                            </View>
                          ) : filteredFriends.map((friend, index) => {
                            const isInviting = invitingIds.has(friend.id);
                            const isOnline = isUserTrulyOnline(friend.is_online, friend.last_seen_at);
                            return (
                              <React.Fragment key={friend.id}>
                                {index > 0 && <View style={[styles.memberRowSeparator, { backgroundColor: theme.colors.glass.border }]} />}
                                <View style={styles.expandedMemberRow}>
                                  <View style={styles.memberInfo}>
                                    <View style={styles.memberAvatarWrapper}>
                                      {friend.avatar_url ? (
                                        <CachedImage
                                          source={{ uri: friend.avatar_url }}
                                          style={[styles.memberAvatar, { borderColor: theme.colors.glass.border }]}
                                          cachePolicy="memory-disk"
                                          contentFit="cover"
                                          transition={200}
                                        />
                                      ) : (
                                        <View style={[styles.memberAvatar, styles.memberAvatarPlaceholder, { backgroundColor: accent.soft, borderColor: theme.colors.glass.border }]}>
                                          <Ionicons name="person" size={18} color={accent.primary} />
                                        </View>
                                      )}
                                      {isOnline && <View style={[styles.onlineIndicator, { backgroundColor: theme.colors.status.success, borderColor: theme.colors.bg.primary }]} />}
                                    </View>
                                    <View style={styles.memberText}>
                                      <Text style={[styles.memberName, { color: theme.colors.text.primary }]} numberOfLines={1}>
                                        {friend.display_name}
                                      </Text>
                                      <Text style={[styles.memberStatus, { color: theme.colors.text.tertiary }]}>{isOnline ? "Online" : "Offline"}</Text>
                                    </View>
                                  </View>
                                  {invitedIds.has(friend.id) ? (
                                    <View style={[styles.invitedBadge, { backgroundColor: `${theme.colors.status.success}20` }]}>
                                      <Ionicons name="checkmark" size={14} color={theme.colors.status.success} />
                                      <Text style={[styles.invitedText, { color: theme.colors.status.success }]}>Invited</Text>
                                    </View>
                                  ) : (
                                    <TouchableOpacity
                                      style={[styles.inviteButton, { backgroundColor: accent.primary }]}
                                      onPress={() => handleInviteFriend(friend.id)}
                                      disabled={isInviting}
                                      activeOpacity={0.7}
                                    >
                                      {isInviting ? (
                                        <ActivityIndicator size="small" color={accent.textOnPrimary} />
                                      ) : (
                                        <>
                                          <Ionicons name="send" size={12} color={accent.textOnPrimary} />
                                          <Text style={[styles.inviteButtonText, { color: accent.textOnPrimary }]}>Invite</Text>
                                        </>
                                      )}
                                    </TouchableOpacity>
                                  )}
                                </View>
                              </React.Fragment>
                            );
                          })}
                          </ScrollView>
                          </>
                        )}
                      </View>
                    )}
                  </View>
                )}

                {/* Share Link (Creator Only) */}
                {isCreator && (
                  <View style={[styles.groupedCard, { backgroundColor: theme.colors.glass.background, borderColor: theme.colors.glass.border, marginTop: 12 }]}>
                    <TouchableOpacity
                      style={styles.groupedCardRow}
                      onPress={handleShareLink}
                      disabled={sharingLink}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.actionIconContainer, { backgroundColor: accent.soft }]}>
                        {sharingLink ? (
                          <ActivityIndicator size="small" color={accent.primary} />
                        ) : (
                          <Ionicons name="link-outline" size={18} color={accent.primary} />
                        )}
                      </View>
                      <View style={styles.actionTextContainer}>
                        <Text style={[styles.actionTitle, { color: theme.colors.text.primary }]}>Share Link</Text>
                        <Text style={[styles.actionSubtitle, { color: theme.colors.text.tertiary }]}>Anyone with link can join</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color={theme.colors.text.tertiary} />
                    </TouchableOpacity>
                  </View>
                )}

                {/* Leave Room - Only for non-creators */}
                {!isCreator && (
                  <View style={[styles.groupedCard, styles.leaveCard, { backgroundColor: theme.colors.glass.background, borderColor: theme.colors.glass.border }]}>
                    <TouchableOpacity
                      style={styles.groupedCardRow}
                      onPress={() => {
                        onLeave();
                        onClose();
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.actionIconContainer, styles.leaveIconContainer, { backgroundColor: `${theme.colors.status.error}20` }]}>
                        <Ionicons name="exit-outline" size={18} color={theme.colors.status.error} />
                      </View>
                      <View style={styles.actionTextContainer}>
                        <Text style={[styles.actionTitle, styles.leaveText, { color: theme.colors.status.error }]}>Leave Room</Text>
                        <Text style={[styles.actionSubtitle, { color: theme.colors.text.tertiary }]}>Exit this room</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color={theme.colors.text.tertiary} />
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {/* Danger Zone (Creator Only) */}
              {isCreator && (
                <View style={styles.section}>
                  <Text style={[styles.sectionTitleText, styles.dangerSectionTitle, { color: theme.colors.status.error }]}>DANGER ZONE</Text>
                  <View style={[styles.groupedCard, styles.dangerCard, { backgroundColor: theme.colors.glass.background, borderColor: `${theme.colors.status.error}33` }]}>
                    <TouchableOpacity
                      style={styles.groupedCardRow}
                      onPress={handleDelete}
                      disabled={loading}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.actionIconContainer, styles.dangerIconContainer, { backgroundColor: `${theme.colors.status.error}20` }]}>

                        <Ionicons name="trash-outline" size={18} color={theme.colors.status.error} />
                      </View>
                      <View style={styles.actionTextContainer}>
                        <Text style={[styles.actionTitle, styles.dangerText, { color: theme.colors.status.error }]}>Delete Room</Text>
                        <Text style={[styles.actionSubtitle, { color: theme.colors.text.tertiary }]}>Permanently remove this room</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color={theme.colors.text.tertiary} />
                    </TouchableOpacity>
                  </View>
                </View>
              )}
          </ScrollView>

          {/* Header with gradient fade - absolute positioned on top */}
          <LinearGradient
            colors={['rgba(0,0,0,0.95)', 'rgba(0,0,0,0.85)', 'rgba(0,0,0,0.5)', 'transparent']}
            locations={[0, 0.4, 0.7, 1]}
            style={[styles.headerOverlay, { paddingTop: insets.top + 8 }]}
            pointerEvents="box-none"
          >
            <View style={styles.header} pointerEvents="box-none">
              <TouchableOpacity
                style={[styles.closeButton, { backgroundColor: theme.colors.glass.background }]}
                onPress={handleClose}
                activeOpacity={interactionStates.pressed}
              >
                <Ionicons name="close" size={22} color={theme.colors.text.primary} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.headerTitle, { color: theme.colors.text.primary }]}>Room Settings</Text>
          </LinearGradient>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  fullScreen: {
    flex: 1,
  },
  fullScreenContent: {
    flex: 1,
  },
  headerOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: "700",
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 24,
  },
  section: {
    marginBottom: 20,
  },
  // Section header with badge
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  sectionTitleText: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  sectionTitleTextInline: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  // Grouped card styles
  groupedCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  groupedCardRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  internalSeparator: {
    height: 1,
    marginLeft: 56,
  },
  // Action styles
  actionIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  actionTextContainer: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 1,
  },
  actionSubtitle: {
    fontSize: 12,
  },
  // Leave/Danger styles
  leaveCard: {
    marginTop: 12,
  },
  leaveIconContainer: {
  },
  leaveText: {
  },
  dangerSectionTitle: {
  },
  dangerCard: {
  },
  dangerIconContainer: {
  },
  dangerText: {
  },
  // Rename container
  renameContainer: {
    gap: 12,
  },
  input: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  renameButtons: {
    flexDirection: "row",
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderRadius: 16,
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  saveButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    alignItems: "center",
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  // Avatar Stack styles
  avatarStackContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  avatarStack: {
    flexDirection: "row",
    alignItems: "center",
  },
  stackedAvatarWrapper: {
    marginLeft: -10,
    position: "relative",
  },
  firstStackedAvatar: {
    marginLeft: 0,
  },
  stackedAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2,
  },
  stackedAvatarPlaceholder: {
    justifyContent: "center",
    alignItems: "center",
  },
  stackedOnlineIndicator: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
  },
  overflowBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  overflowText: {
    fontSize: 12,
    fontWeight: "600",
  },
  // Expanded member list
  expandedMembersList: {
    overflow: "hidden",
  },
  fullWidthSeparator: {
    height: 1,
  },
  expandedMemberRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  memberRowSeparator: {
    height: 1,
    marginLeft: 60,
  },
  memberInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 12,
  },
  memberAvatarWrapper: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
  },
  memberAvatarPlaceholder: {
    justifyContent: "center",
    alignItems: "center",
  },
  onlineIndicator: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
  },
  memberText: {
    flex: 1,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  memberName: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 1,
  },
  ownerBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: "center",
    alignItems: "center",
  },
  memberStatus: {
    fontSize: 12,
  },
  removeButton: {
    padding: 4,
  },
  expandedInviteList: {
    maxHeight: 320,
    overflow: "hidden",
  },
  inviteSearchContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: 1,
  },
  inviteSearchInput: {
    flex: 1,
    fontSize: 14,
    padding: 0,
  },
  inviteButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  inviteButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#FFF",
  },
  invitedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  invitedText: {
    fontSize: 13,
    fontWeight: "600",
  },
  inviteEmptyState: {
    alignItems: "center",
    paddingVertical: 20,
    paddingHorizontal: 16,
    gap: 8,
  },
  inviteEmptyText: {
    fontSize: 13,
    textAlign: "center",
  },
});
