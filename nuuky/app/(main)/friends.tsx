import React, { useState, useRef, useEffect, useCallback, memo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  ActivityIndicator,
  StatusBar,
  ListRenderItem,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFriends } from "../../hooks/useFriends";
import { useContactSync } from "../../hooks/useContactSync";
import { useInvite } from "../../hooks/useInvite";
import { useAppStore } from "../../stores/appStore";
import { useTheme } from "../../hooks/useTheme";
import { typography, spacing, radius, getMoodColor, interactionStates } from "../../lib/theme";
import { User, MatchedContact, Friendship } from "../../types";
import { UserSearchModal } from "../../components/UserSearchModal";

// Memoized Friend Card component to prevent unnecessary re-renders
interface FriendCardProps {
  friendship: Friendship;
  onLongPress: () => void;
  textPrimaryColor: string;
}

const FriendCard = memo(
  ({ friendship, onLongPress, textPrimaryColor }: FriendCardProps) => {
    const friend = friendship.friend as User;
    const moodColors = getMoodColor(friend.mood);

    return (
      <TouchableOpacity style={styles.friendCard} activeOpacity={0.7} onLongPress={onLongPress}>
        <View style={styles.friendInfo}>
          <View style={styles.friendAvatarWrapper}>
            <View
              style={[
                styles.friendAvatar,
                {
                  backgroundColor: moodColors.base,
                  borderColor: friend.is_online ? moodColors.base : "rgba(255,255,255,0.1)",
                },
              ]}
            />
            {friend.is_online && <View style={styles.onlineIndicator} />}
          </View>

          <View style={styles.friendText}>
            <Text style={[styles.friendName, { color: textPrimaryColor }]}>{friend.display_name}</Text>
            <Text style={styles.friendStatus}>{friend.is_online ? "Online" : "Offline"}</Text>
          </View>
        </View>

        <View style={styles.chevronContainer}>
          <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.3)" />
        </View>
      </TouchableOpacity>
    );
  },
  (prevProps, nextProps) => {
    // Custom comparison - only re-render if relevant data changed
    const prevFriend = prevProps.friendship.friend as User;
    const nextFriend = nextProps.friendship.friend as User;
    return (
      prevProps.friendship.id === nextProps.friendship.id &&
      prevFriend.display_name === nextFriend.display_name &&
      prevFriend.mood === nextFriend.mood &&
      prevFriend.is_online === nextFriend.is_online &&
      prevProps.textPrimaryColor === nextProps.textPrimaryColor
    );
  },
);

export default function FriendsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme, isDark, accent } = useTheme();

  const {
    friends,
    loading,
    initialLoading,
    hasLoadedOnce,
    addFriend: addFriendHook,
    removeFriendship,
    refreshFriends,
  } = useFriends();

  const { setFriends } = useAppStore();

  const { loading: syncLoading, hasSynced, matches, syncContacts, clearMatches } = useContactSync();

  const { sending, shareInvite } = useInvite();

  const [refreshing, setRefreshing] = useState(false);
  const [addedContacts, setAddedContacts] = useState<Set<string>>(new Set());
  const [isMounted, setIsMounted] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const hasEverHadFriends = useRef(friends.length > 0);

  useEffect(() => {
    if (friends.length > 0) {
      hasEverHadFriends.current = true;
    }
  }, [friends.length]);

  useEffect(() => {
    const timer = setTimeout(() => setIsMounted(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const handleSyncContacts = async () => {
    await syncContacts();
  };

  const handleAddFromContacts = async (contact: MatchedContact) => {
    if (contact.userId) {
      const success = await addFriendHook(contact.userId);
      if (success) {
        setAddedContacts((prev) => new Set(prev).add(contact.userId!));
      }
    }
  };

  const handleInviteToNooke = async () => {
    await shareInvite();
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    // Clear store first to ensure fresh data
    setFriends([]);
    await refreshFriends();
    setRefreshing(false);
  };

  const handleRemoveFriend = useCallback(
    (friendship: any) => {
      const friend = friendship.friend as User;
      Alert.alert("Remove Friend", `Remove ${friend.display_name} from your friends?`, [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => removeFriendship(friend.id),
        },
      ]);
    },
    [removeFriendship],
  );

  // Memoized render function for FlatList
  const renderFriendItem: ListRenderItem<Friendship> = useCallback(
    ({ item: friendship }) => (
      <FriendCard
        friendship={friendship}
        onLongPress={() => handleRemoveFriend(friendship)}
        textPrimaryColor={theme.colors.text.primary}
      />
    ),
    [handleRemoveFriend, theme.colors.text.primary],
  );

  // Key extractor for FlatList
  const keyExtractor = useCallback((item: Friendship) => item.id, []);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bg.primary }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <LinearGradient colors={theme.gradients.background} style={styles.gradient}>
        {/* Header - Loóna style */}
        <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={interactionStates.pressed}
          >
            <Ionicons name="chevron-back" size={28} color={theme.colors.text.primary} />
          </TouchableOpacity>

          <Text style={[styles.headerTitle, { color: theme.colors.text.primary }]}>Friends</Text>

          <TouchableOpacity
            style={[styles.refreshButton, { backgroundColor: accent.soft }]}
            onPress={async () => {
              setFriends([]);
              await refreshFriends();
            }}
            activeOpacity={interactionStates.pressed}
          >
            <Ionicons name="refresh" size={24} color={accent.primary} />
          </TouchableOpacity>
        </View>

        <FlatList
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + spacing["3xl"] }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.colors.text.secondary} />
          }
          data={initialLoading ? [] : friends}
          keyExtractor={keyExtractor}
          renderItem={renderFriendItem}
          // Optimize FlatList performance
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          windowSize={10}
          initialNumToRender={10}
          getItemLayout={(_, index) => ({
            length: 76, // Approximate height of friend card
            offset: 76 * index,
            index,
          })}
          ListHeaderComponent={
            initialLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.colors.text.secondary} />
              </View>
            ) : (
              <>
                {/* Hero Section */}
                {isMounted && hasLoadedOnce && !hasSynced && friends.length === 0 && !hasEverHadFriends.current && (
                  <View style={styles.heroSection}>
                    <View style={[styles.heroIconContainer, { backgroundColor: accent.soft }]}>
                      <Ionicons name="people" size={32} color={accent.primary} />
                    </View>
                    <Text style={[styles.heroTitle, { color: theme.colors.text.primary }]}>Connect with Friends</Text>
                    <Text style={styles.heroSubtitle}>
                      Find friends who are already on Nūūky or invite new ones to join
                    </Text>
                  </View>
                )}

                {/* Action Buttons */}
                <View style={styles.actionsSection}>
                  {/* Search by Username Button */}
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => setShowSearchModal(true)}
                    style={styles.actionCard}
                  >
                    <View style={[styles.actionIconContainer, { backgroundColor: accent.soft }]}>
                      <Ionicons name="at" size={20} color={accent.primary} />
                    </View>
                    <View style={styles.actionTextContainer}>
                      <Text style={[styles.actionTitle, { color: theme.colors.text.primary }]}>Search by Username</Text>
                      <Text style={styles.actionSubtitle}>Find anyone on Nūūky</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.3)" />
                  </TouchableOpacity>

                  {/* Find Friends from Contacts Button */}
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={handleSyncContacts}
                    disabled={syncLoading}
                    style={[styles.actionCard, syncLoading && styles.buttonDisabled]}
                  >
                    <View style={[styles.actionIconContainer, { backgroundColor: accent.soft }]}>
                      {syncLoading ? (
                        <ActivityIndicator size="small" color={accent.primary} />
                      ) : (
                        <Ionicons name="people" size={20} color={accent.primary} />
                      )}
                    </View>
                    <View style={styles.actionTextContainer}>
                      <Text style={[styles.actionTitle, { color: theme.colors.text.primary }]}>
                        {syncLoading ? "Searching..." : "Find from Contacts"}
                      </Text>
                      <Text style={styles.actionSubtitle}>Sync your phone contacts</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.3)" />
                  </TouchableOpacity>

                  {/* Invite Button */}
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={handleInviteToNooke}
                    disabled={sending}
                    style={[styles.actionCard, sending && styles.buttonDisabled]}
                  >
                    <View style={[styles.actionIconContainer, { backgroundColor: accent.soft }]}>
                      <Ionicons name="share-social-outline" size={20} color={accent.primary} />
                    </View>
                    <View style={styles.actionTextContainer}>
                      <Text style={[styles.actionTitle, { color: theme.colors.text.primary }]}>Invite to Nūūky</Text>
                      <Text style={styles.actionSubtitle}>Share with anyone</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.3)" />
                  </TouchableOpacity>
                </View>

                {/* Contacts on Nūūky */}
                {hasSynced &&
                  (() => {
                    const notYetAddedContacts = matches.onNuuky.filter((contact) => {
                      const isAlreadyFriend =
                        addedContacts.has(contact.userId || "") || friends.some((f) => f.friend_id === contact.userId);
                      return !isAlreadyFriend;
                    });

                    if (notYetAddedContacts.length === 0) return null;

                    return (
                      <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                          <View style={styles.sectionTitleRow}>
                            <Text style={styles.sectionTitleText}>PEOPLE ON NŪŪKY</Text>
                            <View style={[styles.badge, { backgroundColor: accent.soft }]}>
                              <Text style={[styles.badgeText, { color: accent.primary }]}>
                                {notYetAddedContacts.length}
                              </Text>
                            </View>
                          </View>
                        </View>

                        <View style={styles.contactsList}>
                          {notYetAddedContacts.map((contact) => {
                            return (
                              <View key={contact.id} style={styles.contactCard}>
                                <View style={styles.contactInfo}>
                                  <View style={[styles.contactAvatar, { backgroundColor: accent.soft }]}>
                                    <Ionicons name="person" size={20} color={accent.primary} />
                                  </View>
                                  <View style={styles.contactText}>
                                    <Text style={[styles.contactName, { color: theme.colors.text.primary }]}>
                                      {contact.displayName || contact.name}
                                    </Text>
                                    <Text style={styles.contactPhone}>{contact.phoneNumbers[0]}</Text>
                                  </View>
                                </View>

                                <TouchableOpacity
                                  onPress={() => handleAddFromContacts(contact)}
                                  disabled={loading}
                                  style={[styles.addContactButton, { backgroundColor: accent.primary }]}
                                  activeOpacity={0.7}
                                >
                                  <Text style={styles.addButtonText}>Add</Text>
                                </TouchableOpacity>
                              </View>
                            );
                          })}
                        </View>
                      </View>
                    );
                  })()}

                {/* Friends List Header */}
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitleText}>MY FRIENDS</Text>
                  </View>
                </View>
              </>
            )
          }
          ListEmptyComponent={
            !initialLoading ? (
              <View style={styles.emptyState}>
                <View style={[styles.emptyIconContainer, { backgroundColor: accent.soft }]}>
                  <Ionicons name="person-add-outline" size={36} color={accent.primary} />
                </View>
                <Text style={[styles.emptyTitle, { color: theme.colors.text.primary }]}>No Friends Yet</Text>
                <Text style={styles.emptyMessage}>Search by username or sync contacts to find friends</Text>
              </View>
            ) : null
          }
        />
      </LinearGradient>

      {/* Username Search Modal */}
      <UserSearchModal visible={showSearchModal} onClose={() => setShowSearchModal(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.screenPadding || 24,
    paddingBottom: spacing.lg,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  placeholderButton: {
    width: 44,
    height: 44,
  },
  refreshButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  loadingContainer: {
    paddingVertical: spacing["3xl"],
    alignItems: "center",
    justifyContent: "center",
  },
  // Hero Section
  heroSection: {
    alignItems: "center",
    paddingVertical: 32,
    paddingHorizontal: 24,
  },
  heroIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 8,
    textAlign: "center",
  },
  heroSubtitle: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    color: "rgba(255, 255, 255, 0.5)",
  },
  // Actions Section
  actionsSection: {
    gap: 12,
    marginBottom: 24,
  },
  actionCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
    gap: 12,
  },
  actionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  actionTextContainer: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 2,
  },
  actionSubtitle: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.5)",
  },
  // Section Headers
  section: {
    marginBottom: spacing["2xl"],
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  sectionTitleText: {
    fontSize: 13,
    fontWeight: "500",
    letterSpacing: 0.5,
    color: "rgba(255,255,255,0.5)",
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  // Contact Cards
  contactsList: {
    gap: spacing.sm,
  },
  contactCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
  },
  contactInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 12,
  },
  contactAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  contactText: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 2,
  },
  contactPhone: {
    fontSize: 13,
    color: "rgba(255,255,255,0.5)",
  },
  addContactButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  // Friends List
  friendsList: {
    gap: spacing.sm,
  },
  friendCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
  },
  friendInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 12,
  },
  friendAvatarWrapper: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  friendAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
  },
  onlineIndicator: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#22C55E",
    borderWidth: 2,
    borderColor: "#0d0d1a",
  },
  friendText: {
    flex: 1,
  },
  friendName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 2,
  },
  friendStatus: {
    fontSize: 13,
    color: "rgba(255,255,255,0.5)",
  },
  chevronContainer: {
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  // Empty State
  emptyState: {
    alignItems: "center",
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.5)",
    textAlign: "center",
    lineHeight: 20,
  },
});
