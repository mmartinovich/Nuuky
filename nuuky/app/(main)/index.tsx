import React, { useEffect, useState, useMemo, useCallback } from "react";
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, Alert, StatusBar, Image } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import * as SplashScreen from "expo-splash-screen";
import { supabase } from "../../lib/supabase";
import AnimatedGlow from "../../components/AnimatedGlow";

// AsyncStorage with fallback for when package isn't installed
let AsyncStorage: {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
};

try {
  AsyncStorage = require("@react-native-async-storage/async-storage").default;
} catch (e) {
  const MAX_STORAGE_ITEMS = 50;
  const memoryStorage: Map<string, string> = new Map();

  AsyncStorage = {
    getItem: async (key: string) => {
      const value = memoryStorage.get(key);
      if (value !== undefined) {
        memoryStorage.delete(key);
        memoryStorage.set(key, value);
      }
      return value || null;
    },
    setItem: async (key: string, value: string) => {
      memoryStorage.delete(key);
      memoryStorage.set(key, value);
      if (memoryStorage.size > MAX_STORAGE_ITEMS) {
        const firstKey = memoryStorage.keys().next().value;
        if (firstKey) memoryStorage.delete(firstKey);
      }
    },
    removeItem: async (key: string) => {
      memoryStorage.delete(key);
    },
  };
}
import { useAppStore } from "../../stores/appStore";
import { User } from "../../types";
import { MoodPicker } from "../../components/MoodPicker";

// Module-level subscription tracking to prevent duplicates
let activePresenceSubscription: { cleanup: () => void; userId: string } | null = null;
let presenceSubscriptionCounter = 0;

// Throttle mechanism for presence updates
let lastPresenceRefresh = 0;
const PRESENCE_REFRESH_THROTTLE_MS = 3000;

import { useMood } from "../../hooks/useMood";
import { useNudge } from "../../hooks/useNudge";
import { useCallMe } from "../../hooks/useCallMe";
import { useHeart } from "../../hooks/useHeart";
import { useFlare } from "../../hooks/useFlare";
import { useStreaks } from "../../hooks/useStreaks";
import { usePresence } from "../../hooks/usePresence";
import { useRoom } from "../../hooks/useRoom";
import { useRoomInvites } from "../../hooks/useRoomInvites";
import { useDefaultRoom } from "../../hooks/useDefaultRoom";
import { useFirstTimeRoom } from "../../hooks/useFirstTimeRoom";
import { useTheme } from "../../hooks/useTheme";
import { useAudio } from "../../hooks/useAudio";
import { useNotifications } from "../../hooks/useNotifications";
import { useOrbitGestures } from "../../hooks/useOrbitGestures";
import { useSpeakingAnimations } from "../../hooks/useSpeakingAnimations";
import { useStreakBolts } from "../../hooks/useStreakBolts";
import { getMoodColor, getVibeText, getCustomMoodColor } from "../../lib/theme";
import { CentralOrb } from "../../components/CentralOrb";
import { FriendParticle } from "../../components/FriendParticle";
import { StarField } from "../../components/StarField";
import { FriendActionBubble } from "../../components/FriendActionBubble";
import { RoomListModal } from "../../components/RoomListModal";
import { CreateRoomModal } from "../../components/CreateRoomModal";
import { RoomSettingsModal } from "../../components/RoomSettingsModal";
import { InviteFriendsModal } from "../../components/InviteFriendsModal";
import { ElectricBolt } from "../../components/ElectricBolt";
import { TopHeader } from "../../components/TopHeader";
import { BottomNavBar } from "../../components/BottomNavBar";

const { width, height } = Dimensions.get("window");
const CENTER_X = width / 2;
const CENTER_Y = height / 2 - 20;

export default function QuantumOrbitScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme, isDark, accent } = useTheme();
  const { currentUser, friends, speakingParticipants, activeCustomMood } = useAppStore();
  const { currentMood, changeMood } = useMood();
  const { sendNudge } = useNudge();
  const { sendCallMe } = useCallMe();
  const { sendHeart } = useHeart();
  const { sendFlare, activeFlares, myActiveFlare } = useFlare();
  const { streaks, recordInteraction } = useStreaks();
  const { updateActivity } = usePresence();
  const {
    activeRooms,
    createRoom,
    joinRoom: joinRoomFn,
    updateRoomName,
    deleteRoom,
    inviteFriendToRoom,
    removeParticipant,
    myRooms,
  } = useRoom();
  const { roomInvites } = useRoomInvites();
  const { defaultRoom, defaultRoomId, isDefaultRoom, setAsDefaultRoom } = useDefaultRoom();

  const { loading: firstTimeLoading } = useFirstTimeRoom();

  const {
    connectionStatus: audioConnectionStatus,
    isConnecting: isAudioConnecting,
    unmute: audioUnmute,
    mute: audioMute,
    disconnect: audioDisconnect,
  } = useAudio(defaultRoom?.id || null);

  const { unreadCount: notificationCount } = useNotifications();
  const totalBadgeCount = notificationCount + roomInvites.length;

  const [loading, setLoading] = useState(false);
  const [showMoodPicker, setShowMoodPicker] = useState(false);
  const [showHint, setShowHint] = useState(true);
  const [selectedFriend, setSelectedFriend] = useState<User | null>(null);
  const [bubblePosition, setBubblePosition] = useState({ x: 0, y: 0 });
  const [isMuted, setIsMuted] = useState(true);
  const [showRoomList, setShowRoomList] = useState(false);
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [showRoomSettings, setShowRoomSettings] = useState(false);
  const [showInviteFriendsFromDefault, setShowInviteFriendsFromDefault] = useState(false);

  // Extracted hooks
  const isCurrentUserSpeaking = currentUser?.id ? speakingParticipants.includes(currentUser.id) : false;

  const {
    panResponder,
    orbitAngle,
    orbitAngleValueRef,
    isSpinning,
    boltPositionsRef,
    boltTick,
    setBoltTick,
    computeBoltPositionsRef,
  } = useOrbitGestures();

  const { buttonScaleAnim, buttonGlowAnim, ringAnims } = useSpeakingAnimations({
    isCurrentUserSpeaking,
    isMuted,
  });

  const currentVibe = useMemo(() => getVibeText(currentUser?.mood || "neutral"), [currentUser?.mood]);

  // Calculate friend list and positions
  const friendList = friends
    .map((f) => f.friend as User)
    .filter((f): f is User => f !== null && f !== undefined && f.id !== currentUser?.id);

  const roomParticipants = useMemo(() => {
    if (!defaultRoomId) return [];
    const roomData = myRooms.find((r) => r.id === defaultRoomId);
    return roomData?.participants || [];
  }, [defaultRoomId, myRooms]);

  const participantUsers: User[] = useMemo(() => {
    if (roomParticipants.length === 0) return [];
    return roomParticipants
      .map((p) => p.user)
      .filter((u): u is User => u !== null && u !== undefined && u.id !== currentUser?.id);
  }, [roomParticipants, currentUser?.id]);

  const orbitUsers = defaultRoom ? participantUsers : friendList;

  useEffect(() => {
    if (currentUser && friends.length === 0 && friendList.length === 0) {
      loadFriends(true);
    }
  }, [currentUser?.id, friends.length, friendList.length]);

  // Organic layout algorithm
  const calculateFriendPositions = (count: number) => {
    if (count === 0) return [];

    const positions: Array<{ x: number; y: number }> = [];
    const PARTICLE_SIZE = 60;
    const ORBITAL_MARGIN = 20;
    const minDistance = PARTICLE_SIZE + ORBITAL_MARGIN;

    const safeZoneTop = 200;
    const safeZoneBottom = height - 100;
    const safeZoneLeft = 50;
    const safeZoneRight = width - 50;

    const maxRadiusX = Math.min(CENTER_X - safeZoneLeft, safeZoneRight - CENTER_X);
    const maxRadiusY = Math.min(CENTER_Y - safeZoneTop, safeZoneBottom - CENTER_Y);
    const maxRadius = Math.min(maxRadiusX, maxRadiusY) - PARTICLE_SIZE / 2;

    let baseRadius = 155;
    const radiusStep = 40;
    const maxLayers = 3;

    for (let i = 0; i < count; i++) {
      const baseAngle = (i / count) * 2 * Math.PI;
      let placed = false;
      let layer = 0;

      while (!placed && layer < maxLayers) {
        const currentRadius = baseRadius + layer * radiusStep;
        const angleVariations = [baseAngle, baseAngle - 0.1, baseAngle + 0.1, baseAngle - 0.2, baseAngle + 0.2];

        for (const angle of angleVariations) {
          const x = CENTER_X + Math.cos(angle) * currentRadius;
          const y = CENTER_Y + Math.sin(angle) * currentRadius;

          if (y >= safeZoneTop && y <= safeZoneBottom && x >= safeZoneLeft && x <= safeZoneRight && currentRadius <= maxRadius) {
            let tooClose = false;
            for (const pos of positions) {
              const distance = Math.sqrt(Math.pow(x - pos.x, 2) + Math.pow(y - pos.y, 2));
              if (distance < minDistance) {
                tooClose = true;
                break;
              }
            }

            if (!tooClose) {
              positions.push({ x, y });
              placed = true;
              break;
            }
          }
        }
        layer++;
      }

      if (!placed) {
        const fallbackRadius = Math.max(baseRadius, 120);
        const x = CENTER_X + Math.cos(baseAngle) * fallbackRadius;
        const y = CENTER_Y + Math.sin(baseAngle) * fallbackRadius;
        positions.push({ x, y });
      }
    }

    return positions;
  };

  const orbitIds = useMemo(() => orbitUsers.map((f) => f.id).join(","), [orbitUsers]);
  const orbitPositions = useMemo(() => calculateFriendPositions(orbitUsers.length), [orbitUsers.length, orbitIds]);

  const orbitBaseAngles = useMemo(() => {
    return orbitPositions.map((pos) => {
      const deltaX = pos.x - CENTER_X;
      const deltaY = pos.y - CENTER_Y;
      return Math.atan2(deltaY, deltaX);
    });
  }, [orbitPositions]);

  const orbitRadii = useMemo(() => {
    return orbitPositions.map((pos) => {
      const deltaX = pos.x - CENTER_X;
      const deltaY = pos.y - CENTER_Y;
      return Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    });
  }, [orbitPositions]);

  const { activeBolts, streakMap } = useStreakBolts({
    streaks,
    orbitUsers,
    orbitBaseAngles,
    orbitRadii,
    orbitAngleValueRef,
    orbitAngle,
    boltTick,
    setBoltTick,
    isSpinning,
    boltPositionsRef,
    computeBoltPositionsRef,
  });

  const handleStreakInteraction = useCallback(() => {
    if (selectedFriend) {
      recordInteraction(selectedFriend.id);
    }
  }, [selectedFriend, recordInteraction]);

  // Join default room when it's set
  useEffect(() => {
    if (defaultRoom && currentUser) {
      joinRoomFn(defaultRoom.id);
    }
  }, [defaultRoom?.id, currentUser?.id]);

  useEffect(() => {
    if (currentUser) {
      if (friendList.length > 0) {
        setLoading(false);
      }

      const needsLoad = friendList.length === 0;

      if (needsLoad) {
        setLoading(true);
        loadFriends(false);
      } else {
        loadFriends(true);
      }

      loadHintState();
      const cleanup = setupRealtimeSubscription();
      return cleanup;
    } else {
      setLoading(false);
    }
  }, [currentUser?.id]);

  const loadHintState = async () => {
    try {
      const hasInteracted = await AsyncStorage.getItem("hasInteractedWithOrb");
      if (hasInteracted === "true") {
        setShowHint(false);
      }
    } catch (_error) {}
  };

  const saveInteractionState = async () => {
    try {
      await AsyncStorage.setItem("hasInteractedWithOrb", "true");
      setShowHint(false);
    } catch (_error) {}
  };

  const loadFriends = async (silent = false) => {
    if (!currentUser) {
      setLoading(false);
      return;
    }

    if (!silent) {
      setLoading(true);
    }

    try {
      const { data, error } = await supabase
        .from("friendships")
        .select(
          `
          *,
          friend:friend_id (
            id,
            display_name,
            mood,
            is_online,
            last_seen_at,
            avatar_url
          )
        `,
        )
        .eq("user_id", currentUser.id)
        .eq("status", "accepted");

      if (error) throw error;
      setLoading(false);
    } catch (_error: any) {
      setLoading(false);
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  const setupRealtimeSubscription = () => {
    if (!currentUser) return () => {};

    if (activePresenceSubscription && activePresenceSubscription.userId === currentUser.id) {
      return activePresenceSubscription.cleanup;
    }

    if (activePresenceSubscription) {
      activePresenceSubscription.cleanup();
      activePresenceSubscription = null;
    }

    const subscriptionId = ++presenceSubscriptionCounter;
    const channelName = `presence-changes-${subscriptionId}`;

    const throttledLoadFriends = () => {
      const now = Date.now();
      if (now - lastPresenceRefresh < PRESENCE_REFRESH_THROTTLE_MS) return;
      lastPresenceRefresh = now;
      loadFriends(true);
    };

    const channel = supabase
      .channel(channelName)
      .on("postgres_changes", { event: "*", schema: "public", table: "users" }, throttledLoadFriends)
      .subscribe();

    const cleanup = () => {
      supabase.removeChannel(channel);
      activePresenceSubscription = null;
    };

    activePresenceSubscription = { cleanup, userId: currentUser.id };
    return cleanup;
  };

  const handleFriendPress = useCallback(
    (friend: User, friendIndex: number) => {
      const baseAngle = orbitBaseAngles[friendIndex] || 0;
      const radiusVal = orbitRadii[friendIndex] || 150;
      const currentAngle = baseAngle + orbitAngleValueRef.current;
      const friendX = CENTER_X + Math.cos(currentAngle) * radiusVal;
      const friendY = CENTER_Y + Math.sin(currentAngle) * radiusVal;

      setBubblePosition({ x: friendX, y: friendY });
      setSelectedFriend(friend);
    },
    [orbitBaseAngles, orbitRadii],
  );

  const handleDismissBubble = useCallback(() => {
    setSelectedFriend(null);
  }, []);

  const handleNudge = useCallback(async () => {
    if (selectedFriend) {
      await sendNudge(selectedFriend.id, selectedFriend.display_name);
    }
  }, [selectedFriend, sendNudge]);

  const handleCallMe = useCallback(async () => {
    if (selectedFriend) {
      await sendCallMe(selectedFriend.id, selectedFriend.display_name);
    }
  }, [selectedFriend, sendCallMe]);

  const handleHeart = useCallback(async () => {
    if (!selectedFriend) return;
    await sendHeart(selectedFriend.id, selectedFriend.display_name);
  }, [selectedFriend, sendHeart]);

  const handleOrbPress = useCallback(() => {
    if (showHint) {
      saveInteractionState();
    }
    setShowMoodPicker(true);
  }, [showHint]);

  const handleFlarePress = useCallback(async () => {
    if (myActiveFlare) {
      Alert.alert("Flare Active", "You already have an active flare. Only one flare can be active at a time.");
      return;
    }
    await sendFlare();
  }, [myActiveFlare, sendFlare]);

  const handleOpenRooms = useCallback(() => {
    router.push("/(main)/rooms");
  }, [router]);

  const handleCreateRoom = useCallback(
    async (name?: string, isPrivate?: boolean) => {
      const room = await createRoom(name, isPrivate ? [] : undefined);
      if (room) {
        setShowCreateRoom(false);
        router.push(`/(main)/room/${room.id}`);
      }
    },
    [createRoom, router],
  );

  const handleJoinRoom = useCallback(
    async (roomId: string) => {
      setShowRoomList(false);
      await joinRoomFn(roomId);
      router.push(`/(main)/room/${roomId}`);
    },
    [joinRoomFn, router],
  );

  const handleMicToggle = useCallback(async () => {
    if (!defaultRoom) {
      Alert.alert("No Room", "Please join or create a room first to use voice chat.");
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (isMuted) {
      const success = await audioUnmute();
      if (success) setIsMuted(false);
    } else {
      await audioMute();
      setIsMuted(true);
    }
  }, [defaultRoom, isMuted, audioUnmute, audioMute]);

  // Keep splash screen visible until data is loaded
  const isDataReady = !((loading && friendList.length === 0 && !currentUser) || (firstTimeLoading && !defaultRoom));

  useEffect(() => {
    if (isDataReady) {
      SplashScreen.hideAsync();
    }
  }, [isDataReady]);

  if (!isDataReady) {
    return null;
  }

  const userMoodColors = activeCustomMood
    ? getCustomMoodColor(activeCustomMood.color)
    : getMoodColor(currentUser?.mood || "neutral");

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bg.primary }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      <LinearGradient colors={theme.gradients.background} style={StyleSheet.absoluteFill} />
      <AnimatedGlow />
      <StarField />

      {/* Electric Bolt Layer */}
      {activeBolts.length > 0 && !isSpinning && boltPositionsRef.current.length === activeBolts.length && (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          {activeBolts.map(({ streak: s }, i) => (
            <ElectricBolt
              key={s.friend_id}
              fromX={CENTER_X}
              fromY={CENTER_Y}
              toX={boltPositionsRef.current[i]?.x ?? CENTER_X}
              toY={boltPositionsRef.current[i]?.y ?? CENTER_Y}
              state={s.state}
              consecutiveDays={s.consecutive_days}
              boltIndex={i}
            />
          ))}
        </View>
      )}

      {/* Gesture handler for drag-to-spin */}
      <View style={StyleSheet.absoluteFill} {...panResponder.panHandlers} pointerEvents="auto" />

      {/* Central Orb */}
      <CentralOrb
        moodColor={userMoodColors.base}
        glowColor={userMoodColors.glow}
        onPress={() => {
          updateActivity();
          handleOrbPress();
        }}
        hasActiveFlare={!!myActiveFlare}
        mood={currentUser?.mood}
        customMood={activeCustomMood}
        showHint={showHint}
      />

      {/* Orbit Particles */}
      {orbitUsers.length > 0 &&
        orbitUsers.map((user, index) => (
          <FriendParticle
            key={user.id}
            friend={user}
            index={index}
            total={orbitUsers.length}
            onPress={() => handleFriendPress(user, index)}
            hasActiveFlare={activeFlares.some((f: any) => f.user_id === user.id)}
            position={orbitPositions[index] || { x: CENTER_X, y: CENTER_Y }}
            baseAngle={orbitBaseAngles[index] || 0}
            radius={orbitRadii[index] || 150}
            orbitAngle={orbitAngle}
            streak={streakMap.get(user.id)}
          />
        ))}

      {/* Friend Action Bubble */}
      {selectedFriend && (
        <FriendActionBubble
          friend={selectedFriend}
          position={bubblePosition}
          onDismiss={handleDismissBubble}
          onNudge={handleNudge}
          onCallMe={handleCallMe}
          onHeart={handleHeart}
          onInteraction={handleStreakInteraction}
        />
      )}

      <TopHeader
        accent={accent}
        theme={theme}
        totalBadgeCount={totalBadgeCount}
        defaultRoom={defaultRoom}
        currentVibe={currentVibe}
        audioConnectionStatus={audioConnectionStatus}
        onNotificationPress={() => router.push("/(main)/notifications")}
        onRoomPillPress={() => setShowRoomSettings(true)}
      />

      <BottomNavBar
        accent={accent}
        theme={theme}
        isMuted={isMuted}
        isAudioConnecting={isAudioConnecting}
        hasDefaultRoom={!!defaultRoom}
        myActiveFlare={myActiveFlare}
        ringAnims={ringAnims}
        buttonScaleAnim={buttonScaleAnim}
        buttonGlowAnim={buttonGlowAnim}
        onMicToggle={handleMicToggle}
        onFlarePress={handleFlarePress}
        onFriendsPress={() => router.push("/(main)/friends")}
        onRoomsPress={handleOpenRooms}
        onSettingsPress={() => router.push("/(main)/settings")}
        bottomInset={insets.bottom}
      />

      {/* Active Flares Alert */}
      {activeFlares.length > 0 && (
        <View style={styles.flaresAlert}>
          <BlurView
            intensity={isDark ? 50 : 30}
            tint={theme.colors.blurTint}
            style={[
              styles.flaresBlur,
              {
                borderColor: theme.colors.neon.pink,
                shadowColor: theme.colors.neon.pink,
              },
            ]}
          >
            <LinearGradient
              colors={theme.gradients.neonPink}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.flaresGradient}
            >
              <Text style={[styles.flaresTitle, { color: theme.colors.text.primary }]}>
                🚨 {activeFlares.length} friend{activeFlares.length > 1 ? "s" : ""} need u rn
              </Text>
              {activeFlares.slice(0, 2).map((flare: any) => (
                <Text key={flare.id} style={[styles.flaresText, { color: theme.colors.text.secondary }]}>
                  💜 {flare.user.display_name}
                </Text>
              ))}
            </LinearGradient>
          </BlurView>
        </View>
      )}

      <MoodPicker
        visible={showMoodPicker}
        currentMood={currentMood}
        onSelectMood={changeMood}
        onClose={() => setShowMoodPicker(false)}
      />

      <RoomListModal
        visible={showRoomList}
        onClose={() => setShowRoomList(false)}
        rooms={activeRooms}
        onJoinRoom={handleJoinRoom}
        onCreateRoom={() => {
          setShowRoomList(false);
          setShowCreateRoom(true);
        }}
      />

      <CreateRoomModal visible={showCreateRoom} onClose={() => setShowCreateRoom(false)} onCreate={handleCreateRoom} />

      {defaultRoom && (
        <RoomSettingsModal
          visible={showRoomSettings}
          roomName={defaultRoom.name || "Room"}
          roomId={defaultRoom.id}
          isCreator={defaultRoom.creator_id === currentUser?.id}
          creatorId={defaultRoom.creator_id}
          participants={roomParticipants}
          currentUserId={currentUser?.id || ""}
          onClose={() => setShowRoomSettings(false)}
          onRename={async (name) => {
            const success = await updateRoomName(defaultRoom.id, name);
            if (!success) {
              throw new Error("Failed to rename room");
            }
          }}
          onDelete={async () => {
            await deleteRoom(defaultRoom.id);
          }}
          onLeave={() => {
            Alert.alert("Cannot Leave", "Set another room as default before leaving this room.");
          }}
          onInviteFriends={() => {
            setShowRoomSettings(false);
            setShowInviteFriendsFromDefault(true);
          }}
          onRemoveParticipant={async (userId, userName) => {
            await removeParticipant(defaultRoom.id, userId);
          }}
        />
      )}

      {defaultRoom && (
        <InviteFriendsModal
          visible={showInviteFriendsFromDefault}
          friends={friendList}
          participantIds={roomParticipants.map((p) => p.user_id)}
          onClose={() => setShowInviteFriendsFromDefault(false)}
          onInvite={async (friendId) => {
            await inviteFriendToRoom(defaultRoom.id, friendId);
          }}
        />
      )}

      <View style={styles.grain} pointerEvents="none" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flaresAlert: {
    position: "absolute",
    top: 160,
    left: 20,
    right: 20,
  },
  flaresBlur: {
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 2,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 15,
  },
  flaresGradient: {
    padding: 18,
  },
  flaresTitle: {
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 10,
    textTransform: "lowercase",
  },
  flaresText: {
    fontSize: 14,
    marginTop: 6,
    fontWeight: "600",
  },
  grain: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 240, 255, 0.01)",
    opacity: 0.3,
    pointerEvents: "none",
  },
});
