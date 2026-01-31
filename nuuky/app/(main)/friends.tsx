import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  StatusBar,
  ListRenderItem,
  TextInput,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFriends } from "../../hooks/useFriends";
import { useContactSync } from "../../hooks/useContactSync";
import { useInvite } from "../../hooks/useInvite";
import { useStreaks } from "../../hooks/useStreaks";
import { useRoom } from "../../hooks/useRoom";
import { useAppStore } from "../../stores/appStore";
import { useTheme } from "../../hooks/useTheme";
import { typography, spacing, radius, getMoodColor, interactionStates } from "../../lib/theme";
import { User, MatchedContact, Friendship } from "../../types";
import { UserSearchModal } from "../../components/UserSearchModal";
import { SwipeableFriendCard } from "../../components/SwipeableFriendCard";
import { PickRoomModal } from "../../components/PickRoomModal";

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

  const { currentUser, setFriends } = useAppStore();

  const { loading: syncLoading, hasSynced, matches, syncContacts, clearMatches } = useContactSync();

  const { sending, shareInvite } = useInvite();
  const { inviteFriendToRoom } = useRoom();
  const { myRooms } = useAppStore();

  const { streaks } = useStreaks();
  const streakMap = useMemo(() => {
    const map = new Map<string, typeof streaks[0]>();
    for (const s of streaks) {
      map.set(s.friend_id, s);
    }
    return map;
  }, [streaks]);

  const [refreshing, setRefreshing] = useState(false);
  const [addedContacts, setAddedContacts] = useState<Set<string>>(new Set());
  const [isMounted, setIsMounted] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [inviteTarget, setInviteTarget] = useState<Friendship | null>(null);

  const filteredFriends = useMemo(() => {
    if (!searchQuery.trim()) return friends;
    const q = searchQuery.toLowerCase().trim();
    return friends.filter((f) => {
      const friend = f.friend as User;
      return friend.display_name?.toLowerCase().includes(q) ||
        friend.username?.toLowerCase().includes(q);
    });
  }, [friends, searchQuery]);
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
    (friendship: Friendship) => {
      const friend = friendship.friend as User;
      removeFriendship(friend.id);
    },
    [removeFriendship],
  );

  const handleInviteToRoom = useCallback(
    (friendship: Friendship) => {
      setInviteTarget(friendship);
    },
    [],
  );

  const handlePickRoom = useCallback(
    async (roomId: string) => {
      if (!inviteTarget) return;
      const friend = inviteTarget.friend as User;
      const success = await inviteFriendToRoom(roomId, friend.id);
      if (success) {
        Alert.alert("Sent", `Invite sent to ${friend.display_name}`);
      }
      setInviteTarget(null);
    },
    [inviteTarget, inviteFriendToRoom],
  );

  // Memoized render function for FlatList
  const renderFriendItem: ListRenderItem<Friendship> = useCallback(
    ({ item: friendship }) => (
      <SwipeableFriendCard
        friendship={friendship}
        onPress={() => handleInviteToRoom(friendship)}
        onRemove={handleRemoveFriend}
        textPrimaryColor={theme.colors.text.primary}
        streak={streakMap.get(friendship.friend_id)}
      />
    ),
    [handleRemoveFriend, handleInviteToRoom, theme.colors.text.primary, streakMap],
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
          data={initialLoading ? [] : filteredFriends}
          keyExtractor={keyExtractor}
          renderItem={renderFriendItem}
          // Optimize FlatList performance
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          windowSize={10}
          initialNumToRender={10}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          getItemLayout={(_, index) => ({
            length: 76 + 8, // Card height + separator
            offset: (76 + 8) * index,
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
                    <Text style={[styles.heroSubtitle, { color: theme.colors.text.tertiary }]}>
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
                    style={[styles.actionCard, { backgroundColor: theme.colors.glass.background, borderColor: theme.colors.glass.border }]}
                  >
                    <View style={[styles.actionIconContainer, { backgroundColor: accent.soft }]}>
                      <Ionicons name="at" size={20} color={accent.primary} />
                    </View>
                    <View style={styles.actionTextContainer}>
                      <Text style={[styles.actionTitle, { color: theme.colors.text.primary }]}>Search by Username</Text>
                      <Text style={[styles.actionSubtitle, { color: theme.colors.text.tertiary }]}>Find anyone on Nūūky</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={theme.colors.text.tertiary} />
                  </TouchableOpacity>

                  {/* Find Friends from Contacts Button */}
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={handleSyncContacts}
                    disabled={syncLoading}
                    style={[styles.actionCard, { backgroundColor: theme.colors.glass.background, borderColor: theme.colors.glass.border }, syncLoading && styles.buttonDisabled]}
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
                      <Text style={[styles.actionSubtitle, { color: theme.colors.text.tertiary }]}>Sync your phone contacts</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={theme.colors.text.tertiary} />
                  </TouchableOpacity>

                  {/* Invite Button */}
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={handleInviteToNooke}
                    disabled={sending}
                    style={[styles.actionCard, { backgroundColor: theme.colors.glass.background, borderColor: theme.colors.glass.border }, sending && styles.buttonDisabled]}
                  >
                    <View style={[styles.actionIconContainer, { backgroundColor: accent.soft }]}>
                      <Ionicons name="share-social-outline" size={20} color={accent.primary} />
                    </View>
                    <View style={styles.actionTextContainer}>
                      <Text style={[styles.actionTitle, { color: theme.colors.text.primary }]}>Invite to Nūūky</Text>
                      <Text style={[styles.actionSubtitle, { color: theme.colors.text.tertiary }]}>Share with anyone</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={theme.colors.text.tertiary} />
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
                              <View key={contact.id} style={[styles.contactCard, { backgroundColor: theme.colors.glass.background, borderColor: theme.colors.glass.border }]}>
                                <View style={styles.contactInfo}>
                                  <View style={[styles.contactAvatar, { backgroundColor: accent.soft }]}>
                                    <Ionicons name="person" size={20} color={accent.primary} />
                                  </View>
                                  <View style={styles.contactText}>
                                    <Text style={[styles.contactName, { color: theme.colors.text.primary }]}>
                                      {contact.displayName || contact.name}
                                    </Text>
                                    <Text style={[styles.contactPhone, { color: theme.colors.text.tertiary }]}>{contact.phoneNumbers[0]}</Text>
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

                {/* Friends Search & List Header */}
                <View style={[styles.section, { marginBottom: 8 }]}>
                  <View style={styles.sectionHeader}>
                    <Text style={[styles.sectionTitleText, { color: theme.colors.text.tertiary }]}>MY FRIENDS</Text>
                  </View>
                  {friends.length > 0 && (
                    <View style={[styles.searchBar, { borderColor: theme.colors.glass.border, backgroundColor: theme.colors.glass.background }]}>
                      <Ionicons name="search" size={18} color={theme.colors.text.tertiary} />
                      <TextInput
                        style={[styles.searchInput, { color: theme.colors.text.primary }]}
                        placeholder="Search friends..."
                        placeholderTextColor={theme.colors.text.tertiary}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        autoCorrect={false}
                        autoCapitalize="none"
                      />
                      {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery("")} activeOpacity={0.7}>
                          <Ionicons name="close-circle" size={18} color={theme.colors.text.tertiary} />
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
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
                <Text style={[styles.emptyMessage, { color: theme.colors.text.tertiary }]}>Search by username or sync contacts to find friends</Text>
              </View>
            ) : null
          }
        />
      </LinearGradient>

      {/* Username Search Modal */}
      <UserSearchModal visible={showSearchModal} onClose={() => setShowSearchModal(false)} />

      {/* Pick Room to Invite Modal */}
      <PickRoomModal
        visible={inviteTarget !== null}
        rooms={myRooms.filter(r => r.creator_id === currentUser?.id)}
        friendName={inviteTarget ? (inviteTarget.friend as User).display_name : ''}
        onClose={() => setInviteTarget(null)}
        onPick={handlePickRoom}
      />
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
    borderRadius: 16,
    borderWidth: 1,
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
    borderRadius: 16,
    borderWidth: 1,
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
  // Search Bar
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
    padding: 0,
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
    textAlign: "center",
    lineHeight: 20,
  },
});
