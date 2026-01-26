import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StatusBar,
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppStore } from "../../stores/appStore";
import { useRoom } from "../../hooks/useRoom";
import { useRoomInvites } from "../../hooks/useRoomInvites";
import { useFirstTimeRoom } from "../../hooks/useFirstTimeRoom";
import { useDefaultRoom } from "../../hooks/useDefaultRoom";
import { useTheme } from "../../hooks/useTheme";
import { RoomCard } from "../../components/RoomCard";
import { InviteCard } from "../../components/InviteCard";
import { CreateRoomModal } from "../../components/CreateRoomModal";
import { spacing, radius, typography, interactionStates } from "../../lib/theme";

const { width } = Dimensions.get("window");

export default function RoomsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const { currentUser, myRooms } = useAppStore();
  const { loadMyRooms, canCreateRoom, createRoom } = useRoom();
  const { roomInvites, loading: invitesLoading, loadMyInvites, acceptInvite, declineInvite } = useRoomInvites();
  const { loading: firstTimeLoading } = useFirstTimeRoom();
  const { isDefaultRoom, setAsDefaultRoom } = useDefaultRoom();

  const [refreshing, setRefreshing] = useState(false);
  const [showInvites, setShowInvites] = useState(true);
  const [showCreateRoom, setShowCreateRoom] = useState(false);

  // Track if initial load has happened to prevent double loading
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    // Wait for first-time room creation to complete before loading
    if (!firstTimeLoading && !hasLoadedRef.current) {
      hasLoadedRef.current = true;
      loadData();
    }
  }, [firstTimeLoading]);

  // Refresh rooms list when screen comes into focus (only after initial load)
  useFocusEffect(
    React.useCallback(() => {
      // Skip if still in first-time loading or if this is the initial mount
      if (firstTimeLoading) return;
      // Only reload on subsequent focus events, not initial mount
      if (hasLoadedRef.current) {
        // Already loaded, this is a re-focus - skip duplicate load
        // Data is already fresh from myRooms in Zustand
      }
    }, [firstTimeLoading])
  );

  const loadData = async () => {
    await Promise.all([loadMyRooms(), loadMyInvites()]);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleCreateRoom = () => {
    setShowCreateRoom(true);
  };

  const handleCreateRoomSubmit = async (name?: string, isPrivate?: boolean) => {
    const room = await createRoom(name);
    if (room) {
      setShowCreateRoom(false);
      await loadMyRooms();
      await setAsDefaultRoom(room.id);
      router.replace("/(main)");
    }
  };

  const handleRoomPress = async (roomId: string) => {
    await setAsDefaultRoom(roomId);
    router.replace("/(main)");
  };

  const handleAcceptInvite = async (inviteId: string) => {
    const success = await acceptInvite(inviteId);
    if (success) {
      await loadMyRooms();
    }
  };

  const handleDeclineInvite = async (inviteId: string) => {
    await declineInvite(inviteId);
  };

  const hasInvites = roomInvites.length > 0;
  const hasRooms = myRooms.length > 0;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bg.primary }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <LinearGradient colors={theme.gradients.background} style={styles.gradient}>
        {/* Header - Clean Loóna style */}
        <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => router.back()} 
            activeOpacity={interactionStates?.pressed || 0.7}
          >
            <Ionicons name="chevron-back" size={28} color={theme.colors.text.primary} />
          </TouchableOpacity>

          <Text style={[styles.headerTitle, { color: theme.colors.text.primary }]}>Rooms</Text>

          <TouchableOpacity 
            style={styles.createButton} 
            onPress={handleCreateRoom} 
            activeOpacity={interactionStates?.pressed || 0.7}
          >
            <Ionicons name="add" size={28} color="#A855F7" />
          </TouchableOpacity>
        </View>

        {/* Content */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + spacing.xl }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.colors.text.secondary} />
          }
        >
          {/* Invites Section */}
          {hasInvites && (
            <View style={styles.section}>
              <TouchableOpacity
                style={styles.sectionHeader}
                onPress={() => setShowInvites(!showInvites)}
                activeOpacity={interactionStates?.pressed || 0.7}
              >
                <View style={styles.sectionTitleRow}>
                  <Text style={[styles.sectionTitle, { color: 'rgba(255,255,255,0.5)' }]}>INVITES</Text>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{roomInvites.length}</Text>
                  </View>
                </View>
                <Ionicons name={showInvites ? "chevron-up" : "chevron-down"} size={20} color="rgba(255,255,255,0.4)" />
              </TouchableOpacity>

              {showInvites && (
                <View style={styles.invitesList}>
                  {roomInvites.map((invite) => (
                    <InviteCard
                      key={invite.id}
                      invite={invite}
                      onAccept={() => handleAcceptInvite(invite.id)}
                      onDecline={() => handleDeclineInvite(invite.id)}
                    />
                  ))}
                </View>
              )}
            </View>
          )}

          {/* My Rooms Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: 'rgba(255,255,255,0.5)' }]}>MY ROOMS</Text>
            </View>

            {hasRooms ? (
              <View style={styles.roomsList}>
                {myRooms.map((room) => (
                  <RoomCard
                    key={room.id}
                    room={room}
                    onPress={() => handleRoomPress(room.id)}
                    isCreator={room.creator_id === currentUser?.id}
                    isDefault={isDefaultRoom(room.id)}
                  />
                ))}
              </View>
            ) : (
              <View style={styles.emptyState}>
                <View style={styles.emptyIconContainer}>
                  <Ionicons name="home-outline" size={36} color="#A855F7" />
                </View>
                <Text style={[styles.emptyTitle, { color: theme.colors.text.primary }]}>No Rooms Yet</Text>
                <Text style={styles.emptyMessage}>Create your first room to hang with friends</Text>
                <TouchableOpacity 
                  style={styles.emptyButton} 
                  onPress={handleCreateRoom} 
                  activeOpacity={interactionStates?.pressed || 0.7}
                >
                  <View style={styles.emptyButtonGradient}>
                    <Ionicons name="add" size={20} color="#FFFFFF" />
                    <Text style={styles.emptyButtonText}>Create Room</Text>
                  </View>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </ScrollView>

        {/* Create Room Modal */}
        <CreateRoomModal
          visible={showCreateRoom}
          onClose={() => setShowCreateRoom(false)}
          onCreate={handleCreateRoomSubmit}
        />
      </LinearGradient>
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
  createButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(168, 85, 247, 0.1)",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.screenPadding || 24,
    paddingTop: spacing.sm,
  },
  section: {
    marginBottom: spacing.xl,
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
  sectionTitle: {
    fontSize: 13,
    fontWeight: "500",
    letterSpacing: 0.5,
  },
  badge: {
    backgroundColor: "rgba(168, 85, 247, 0.15)",
    borderWidth: 0,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#A855F7",
  },
  invitesList: {
    gap: spacing.sm + 4,
  },
  roomsList: {
    gap: spacing.sm + 4,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing["3xl"],
    paddingHorizontal: spacing.xl,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(168, 85, 247, 0.08)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: spacing.xs,
  },
  emptyMessage: {
    fontSize: 15,
    textAlign: "center",
    marginBottom: spacing.xl,
    color: "rgba(255, 255, 255, 0.5)",
  },
  emptyButton: {
    borderRadius: 12,
    overflow: "hidden",
  },
  emptyButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: 14,
    paddingHorizontal: spacing.xl,
    backgroundColor: "#A855F7",
  },
  emptyButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
