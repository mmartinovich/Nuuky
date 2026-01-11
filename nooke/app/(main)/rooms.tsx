import React, { useState, useEffect } from "react";
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
import { RoomCard } from "../../components/RoomCard";
import { InviteCard } from "../../components/InviteCard";
import { CreateRoomModal } from "../../components/CreateRoomModal";
import { colors, gradients, spacing, radius, typography } from "../../lib/theme";

const { width } = Dimensions.get("window");

export default function RoomsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { currentUser, myRooms } = useAppStore();
  const { loadMyRooms, canCreateRoom, createRoom } = useRoom();
  const { roomInvites, loading: invitesLoading, loadMyInvites, acceptInvite, declineInvite } = useRoomInvites();
  const { loading: firstTimeLoading } = useFirstTimeRoom();

  const [refreshing, setRefreshing] = useState(false);
  const [showInvites, setShowInvites] = useState(true);
  const [showCreateRoom, setShowCreateRoom] = useState(false);

  useEffect(() => {
    // Wait for first-time room creation to complete before loading
    if (!firstTimeLoading) {
      loadData();
    }
  }, [firstTimeLoading]);

  // Refresh rooms list when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      if (!firstTimeLoading) {
        loadData();
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
      router.push(`/(main)/room/${room.id}`);
    }
  };

  const handleRoomPress = (roomId: string) => {
    router.push(`/(main)/room/${roomId}`);
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
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={gradients.background} style={styles.gradient}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.8}>
            <Ionicons name="chevron-back" size={24} color={colors.text.primary} />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Rooms</Text>

          <TouchableOpacity style={styles.createButton} onPress={handleCreateRoom} activeOpacity={0.8}>
            <Ionicons name="add" size={24} color={colors.text.primary} />
          </TouchableOpacity>
        </View>

        {/* Content */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + spacing.xl }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.text.secondary} />
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
                  <Text style={styles.sectionTitle}>INVITES</Text>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{roomInvites.length}</Text>
                  </View>
                </View>
                <Ionicons name={showInvites ? "chevron-up" : "chevron-down"} size={20} color={colors.text.secondary} />
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
              <Text style={styles.sectionTitle}>MY ROOMS</Text>
            </View>

            {hasRooms ? (
              <View style={styles.roomsList}>
                {myRooms.map((room) => (
                  <RoomCard
                    key={room.id}
                    room={room}
                    onPress={() => handleRoomPress(room.id)}
                    isCreator={room.creator_id === currentUser?.id}
                  />
                ))}
              </View>
            ) : (
              <View style={styles.emptyState}>
                <View style={styles.emptyIconContainer}>
                  <Ionicons name="home-outline" size={48} color={colors.text.tertiary} />
                </View>
                <Text style={styles.emptyTitle}>No Rooms Yet</Text>
                <Text style={styles.emptyMessage}>Create your first room to hang with friends</Text>
                <TouchableOpacity style={styles.emptyButton} onPress={handleCreateRoom} activeOpacity={0.8}>
                  <LinearGradient colors={gradients.neonCyan} style={styles.emptyButtonGradient}>
                    <Ionicons name="add" size={20} color={colors.text.primary} />
                    <Text style={styles.emptyButtonText}>Create Room</Text>
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
    backgroundColor: colors.bg.primary,
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
    borderBottomColor: colors.glass.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  headerTitle: {
    fontSize: typography.size["2xl"],
    fontWeight: typography.weight.bold as any,
    color: colors.text.primary,
  },
  createButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.mood.good.soft,
    borderWidth: 1,
    borderColor: colors.mood.good.base,
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
    color: colors.text.secondary,
    letterSpacing: 1,
  },
  badge: {
    backgroundColor: colors.mood.reachOut.soft,
    borderWidth: 1,
    borderColor: colors.mood.reachOut.base,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  badgeText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold as any,
    color: colors.mood.reachOut.base,
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
    borderColor: colors.glass.border,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold as any,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  emptyMessage: {
    fontSize: typography.size.md,
    color: colors.text.tertiary,
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
    color: colors.text.primary,
  },
});
