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
import { useFirstTimeRoom } from "../../hooks/useFirstTimeRoom";
import { useDefaultRoom } from "../../hooks/useDefaultRoom";
import { useHomeRoom } from "../../hooks/useHomeRoom";
import { useTheme } from "../../hooks/useTheme";
import { RoomCard } from "../../components/RoomCard";
import { SwipeableRoomCard } from "../../components/SwipeableRoomCard";
import { CreateRoomModal } from "../../components/CreateRoomModal";
import { spacing, radius, typography, interactionStates } from "../../lib/theme";

const { width } = Dimensions.get("window");

export default function RoomsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme, isDark, accent } = useTheme();
  const { currentUser, myRooms } = useAppStore();
  const { loadMyRooms, canCreateRoom, createRoom, deleteRoom, leaveRoomById } = useRoom();
  const { loading: firstTimeLoading } = useFirstTimeRoom();
  const { isDefaultRoom, setAsDefaultRoom } = useDefaultRoom();
  const { isHomeRoom } = useHomeRoom();

  const [refreshing, setRefreshing] = useState(false);
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
    await loadMyRooms();
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

  const handleRoomPress = (roomId: string) => {
    setAsDefaultRoom(roomId);
    router.replace("/(main)");
  };

  const handleDeleteRoom = async (roomId: string): Promise<boolean> => {
    const result = await deleteRoom(roomId);
    return result;
  };

  const handleLeaveRoom = async (roomId: string): Promise<void> => {
    await leaveRoomById(roomId);
  };

  const hasRooms = myRooms.length > 0;

  // Separate home room (permanently pinned) from other rooms
  const homeRoom = myRooms.find(room => isHomeRoom(room.id));
  const otherRooms = myRooms.filter(room => !isHomeRoom(room.id));

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
            style={[styles.createButton, { backgroundColor: accent.soft }]}
            onPress={handleCreateRoom}
            activeOpacity={interactionStates?.pressed || 0.7}
          >
            <Ionicons name="add" size={28} color={accent.primary} />
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
          {hasRooms ? (
            <>
              {/* My Nūūky Section - Home Room (permanently pinned) */}
              {homeRoom && (
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Text style={[styles.sectionTitle, { color: theme.colors.text.tertiary }]}>MY NŪŪKY</Text>
                  </View>
                  <View style={styles.defaultRoomContainer}>
                    <RoomCard
                      room={homeRoom}
                      onPress={() => handleRoomPress(homeRoom.id)}
                      isCreator={homeRoom.creator_id === currentUser?.id}
                      isDefault={isDefaultRoom(homeRoom.id)}
                      creatorName={homeRoom.creator?.display_name}
                    />
                  </View>
                </View>
              )}

              {/* Other Rooms Section - swipeable */}
              {otherRooms.length > 0 && (
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Text style={[styles.sectionTitle, { color: theme.colors.text.tertiary }]}>OTHER NUUKS</Text>
                  </View>
                  <View style={styles.roomsList}>
                    {otherRooms.map((room) => (
                      <SwipeableRoomCard
                        key={room.id}
                        room={room}
                        onPress={() => handleRoomPress(room.id)}
                        isCreator={room.creator_id === currentUser?.id}
                        isDefault={isDefaultRoom(room.id)}
                        creatorName={room.creator?.display_name}
                        onDelete={handleDeleteRoom}
                        onLeave={handleLeaveRoom}
                      />
                    ))}
                  </View>
                </View>
              )}
            </>
          ) : (
            <View style={styles.section}>
              <View style={styles.emptyState}>
                <View style={[styles.emptyIconContainer, { backgroundColor: accent.soft }]}>
                  <Ionicons name="people-outline" size={36} color={accent.primary} />
                </View>
                <Text style={[styles.emptyTitle, { color: theme.colors.text.primary }]}>No Rooms Yet</Text>
                <Text style={[styles.emptyMessage, { color: theme.colors.text.tertiary }]}>Create your first room to hang with friends</Text>
                <TouchableOpacity
                  style={styles.emptyButton}
                  onPress={handleCreateRoom}
                  activeOpacity={interactionStates?.pressed || 0.7}
                >
                  <View style={[styles.emptyButtonGradient, { backgroundColor: accent.primary }]}>
                    <Ionicons name="add" size={20} color="#FFFFFF" />
                    <Text style={styles.emptyButtonText}>Create Room</Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          )}
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
  sectionTitle: {
    fontSize: 13,
    fontWeight: "500",
    letterSpacing: 0.5,
  },
  roomsList: {
    gap: spacing.sm + 4,
  },
  defaultRoomContainer: {
    // Slightly larger visual treatment for the default room
    marginBottom: spacing.xs,
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
  },
  emptyButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
