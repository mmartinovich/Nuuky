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
import { spacing, radius, typography } from "../../lib/theme";

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
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + spacing.md, borderBottomColor: theme.colors.glass.border }]}>
          <TouchableOpacity style={[styles.backButton, { borderColor: theme.colors.glass.border }]} onPress={() => router.back()} activeOpacity={0.8}>
            <Ionicons name="chevron-back" size={24} color={theme.colors.text.primary} />
          </TouchableOpacity>

          <Text style={[styles.headerTitle, { color: theme.colors.text.primary }]}>Rooms</Text>

          <TouchableOpacity style={[styles.createButton, { backgroundColor: theme.colors.mood.good.soft, borderColor: theme.colors.mood.good.base }]} onPress={handleCreateRoom} activeOpacity={0.8}>
            <Ionicons name="add" size={24} color={theme.colors.text.primary} />
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
                activeOpacity={0.8}
              >
                <View style={styles.sectionTitleRow}>
                  <Text style={[styles.sectionTitle, { color: theme.colors.text.secondary }]}>INVITES</Text>
                  <View style={[styles.badge, { backgroundColor: theme.colors.mood.reachOut.soft, borderColor: theme.colors.mood.reachOut.base }]}>
                    <Text style={[styles.badgeText, { color: theme.colors.mood.reachOut.base }]}>{roomInvites.length}</Text>
                  </View>
                </View>
                <Ionicons name={showInvites ? "chevron-up" : "chevron-down"} size={20} color={theme.colors.text.secondary} />
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
              <Text style={[styles.sectionTitle, { color: theme.colors.text.secondary }]}>MY ROOMS</Text>
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
                <View style={[styles.emptyIconContainer, { borderColor: theme.colors.glass.border }]}>
                  <Ionicons name="home-outline" size={48} color={theme.colors.text.tertiary} />
                </View>
                <Text style={[styles.emptyTitle, { color: theme.colors.text.primary }]}>No Rooms Yet</Text>
                <Text style={[styles.emptyMessage, { color: theme.colors.text.tertiary }]}>Create your first room to hang with friends</Text>
                <TouchableOpacity style={styles.emptyButton} onPress={handleCreateRoom} activeOpacity={0.8}>
                  <LinearGradient colors={theme.gradients.neonCyan} style={styles.emptyButtonGradient}>
                    <Ionicons name="add" size={20} color={theme.colors.text.primary} />
                    <Text style={[styles.emptyButtonText, { color: theme.colors.text.primary }]}>Create Room</Text>
                  </LinearGradient>
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
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
  },
  headerTitle: {
    fontSize: typography.size["2xl"],
    fontWeight: typography.weight.bold as any,
  },
  createButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
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
    fontSize: typography.size.sm,
    fontWeight: typography.weight.bold as any,
    letterSpacing: 1,
  },
  badge: {
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  badgeText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold as any,
  },
  invitesList: {
    gap: spacing.sm,
  },
  roomsList: {
    gap: spacing.md,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing["3xl"],
    paddingHorizontal: spacing.xl,
  },
  emptyIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold as any,
    marginBottom: spacing.xs,
  },
  emptyMessage: {
    fontSize: typography.size.md,
    textAlign: "center",
    marginBottom: spacing.xl,
  },
  emptyButton: {
    borderRadius: radius.md,
    overflow: "hidden",
  },
  emptyButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  emptyButtonText: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold as any,
  },
});
