import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, Alert, StatusBar, Image, Animated as RNAnimated } from "react-native";
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
import { useAppStore, useCurrentUser, useFriendsStore, useSpeakingParticipants, useActiveCustomMood } from "../../stores/appStore";
import { User } from "../../types";
import { MoodPicker } from "../../components/MoodPicker";

// Throttle mechanism for presence updates
let lastPresenceRefresh = 0;
const PRESENCE_REFRESH_THROTTLE_MS = 10000; // 10 seconds - reduced from 3s for battery

import { subscriptionManager } from "../../lib/subscriptionManager";
import { useMood } from "../../hooks/useMood";
import { useCustomMood } from "../../hooks/useCustomMood";
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
import { getMoodColor, getVibeText, getCustomMoodColor } from "../../lib/theme";
import { CentralOrb } from "../../components/CentralOrb";
import { FriendParticle } from "../../components/FriendParticle";
import { StarField } from "../../components/StarField";
import { FriendActionBubble } from "../../components/FriendActionBubble";
import { RoomListModal } from "../../components/RoomListModal";
import { CreateRoomModal } from "../../components/CreateRoomModal";
import { RoomSettingsModal } from "../../components/RoomSettingsModal";
import { TopHeader } from "../../components/TopHeader";
import { BottomNavBar } from "../../components/BottomNavBar";
import { SoundReactionPicker } from "../../components/SoundReactionPicker";
import { SoundReactionToast } from "../../components/SoundReactionToast";
import { useSoundReactions } from "../../hooks/useSoundReactions";
import { playPreview, stopPreview } from "../../lib/soundPlayer";
import { SoundReactionType } from "../../types";

const { width, height } = Dimensions.get("window");
const CENTER_X = width / 2;
const CENTER_Y = height / 2 - 20;

export default function QuantumOrbitScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme, isDark, accent } = useTheme();
  const currentUser = useCurrentUser();
  const friends = useFriendsStore();
  const speakingParticipants = useSpeakingParticipants();
  const activeCustomMood = useActiveCustomMood();
  const setFriends = useAppStore((s) => s.setFriends);
  const { currentMood, changeMood } = useMood();
  const { customMoods, createCustomMood, selectCustomMood, deleteCustomMood } = useCustomMood();
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

  // Check if user is in ghost mode
  const isGhostMode = useMemo(() => {
    if (!currentUser?.ghost_mode_until) return false;
    return new Date(currentUser.ghost_mode_until) > new Date();
  }, [currentUser?.ghost_mode_until]);

  // Sound reactions hook - needs to be declared before useAudio so we can pass handleDataReceived
  const soundReactionsRef = useRef<ReturnType<typeof useSoundReactions> | null>(null);

  const {
    connectionStatus: audioConnectionStatus,
    isConnecting: isAudioConnecting,
    unmute: audioUnmute,
    mute: audioMute,
    disconnect: audioDisconnect,
    isConnected: isAudioConnected,
  } = useAudio(defaultRoom?.id || null, (data, participant) => {
    soundReactionsRef.current?.handleDataReceived(data, participant);
  });

  // Sound reactions
  const soundReactions = useSoundReactions({
    currentUserId: currentUser?.id || null,
    currentUserName: currentUser?.display_name || 'Unknown',
    currentUserAvatarUrl: currentUser?.avatar_url,
    isGhostMode,
    isAudioConnected,
  });

  // Store ref for the audio callback
  useEffect(() => {
    soundReactionsRef.current = soundReactions;
  }, [soundReactions]);

  const { unreadCount: notificationCount } = useNotifications();
  const totalBadgeCount = notificationCount + roomInvites.length;

  const [loading, setLoading] = useState(true);
  const [showMoodPicker, setShowMoodPicker] = useState(false);
  const [showHint, setShowHint] = useState(true);
  const [selectedFriend, setSelectedFriend] = useState<User | null>(null);
  const [bubblePosition, setBubblePosition] = useState({ x: 0, y: 0 });
  const [isMuted, setIsMuted] = useState(true);
  const [showRoomList, setShowRoomList] = useState(false);
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [showRoomSettings, setShowRoomSettings] = useState(false);
  const [showSoundPicker, setShowSoundPicker] = useState(false);


  // Extracted hooks
  const isCurrentUserSpeaking = currentUser?.id ? speakingParticipants.includes(currentUser.id) : false;

  const {
    panResponder,
    orbitAngle,
    orbitAngleValueRef,
    isSpinning,
  } = useOrbitGestures();

  const { buttonScaleAnim, buttonGlowAnim, ringAnims } = useSpeakingAnimations({
    isCurrentUserSpeaking,
    isMuted,
  });

  const currentVibe = useMemo(() => getVibeText(currentUser?.mood || "neutral"), [currentUser?.mood]);

  // Calculate friend list and positions
  const friendList = useMemo(() => {
    if (!currentUser?.id) return [];
    return friends
      .map((f) => f.friend as User)
      .filter((f): f is User => f !== null && f !== undefined && f.id !== currentUser.id)
      .sort((a, b) => a.id.localeCompare(b.id));
  }, [friends, currentUser?.id]);

  const roomParticipants = useMemo(() => {
    if (!defaultRoomId) return [];
    const roomData = myRooms.find((r) => r.id === defaultRoomId);
    return roomData?.participants || [];
  }, [defaultRoomId, myRooms]);

  const participantUsers: User[] = useMemo(() => {
    if (!currentUser?.id || roomParticipants.length === 0) return [];
    return roomParticipants
      .map((p) => p.user)
      .filter((u): u is User => u !== null && u !== undefined && u.id !== currentUser.id)
      .sort((a, b) => a.id.localeCompare(b.id));
  }, [roomParticipants, currentUser?.id]);

  // If we know a default room exists (persisted ID), wait for participant data
  // instead of briefly showing friendList then switching.
  // If the user is the only participant, fall back to friendList so the orbit isn't empty.
  // Whether myRooms has loaded the default room's data yet
  const defaultRoomLoaded = !defaultRoomId || myRooms.some((r) => r.id === defaultRoomId);

  const orbitUsers = useMemo(() => {
    if (defaultRoomId) {
      if (!defaultRoomLoaded) {
        // Room data hasn't loaded yet — show nothing to avoid flash
        return [];
      }
      // Room loaded: show only room participants (empty orbit if alone)
      return participantUsers;
    }
    return friendList;
  }, [defaultRoomId, defaultRoomLoaded, participantUsers, friendList]);

  const orbitIds = useMemo(() => orbitUsers.map((f) => f.id).join(","), [orbitUsers]);

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

  const streakMap = useMemo(() => {
    const map = new Map<string, (typeof streaks)[0]>();
    for (const s of streaks) {
      map.set(s.friend_id, s);
    }
    return map;
  }, [streaks]);

  const activeFlareUserIds = useMemo(() => {
    return new Set(activeFlares.map((f: any) => f.user_id));
  }, [activeFlares]);

  const handleStreakInteraction = useCallback(() => {
    if (selectedFriend) {
      recordInteraction(selectedFriend.id);
    }
  }, [selectedFriend, recordInteraction]);

  // Join default room when it's set
  useEffect(() => {
    if (defaultRoom && currentUser) {
      joinRoomFn(defaultRoom.id).catch((err: any) => {
        console.error('Failed to auto-join default room:', err);
      });
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
      if (data) setFriends(data);
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

    const subscriptionId = `presence-changes-${currentUser.id}`;

    const throttledLoadFriends = () => {
      const now = Date.now();
      if (now - lastPresenceRefresh < PRESENCE_REFRESH_THROTTLE_MS) return;
      lastPresenceRefresh = now;
      loadFriends(true);
    };

    // Use subscriptionManager for automatic pause/resume on app background
    const cleanup = subscriptionManager.register(subscriptionId, () => {
      return supabase
        .channel(subscriptionId)
        .on("postgres_changes", {
          event: "UPDATE",
          schema: "public",
          table: "friendships",
          filter: `user_id=eq.${currentUser.id}`,
        }, throttledLoadFriends)
        .subscribe();
    });

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

  // Sound reaction handlers
  const handleSwipeUpMic = useCallback(async () => {
    if (!defaultRoom) {
      Alert.alert("No Room", "Join a room to send sound reactions.");
      return;
    }

    // Auto-reconnect if disconnected due to silence timeout
    if (!isAudioConnected) {
      // Reconnect in background - picker will enable once connected
      audioUnmute().then((success) => {
        if (success) {
          // Immediately mute again - we just needed to reconnect
          audioMute();
        }
      });
    }

    setShowSoundPicker(true);
  }, [defaultRoom, isAudioConnected, audioUnmute, audioMute]);

  const handleSoundSelect = useCallback(async (soundId: SoundReactionType) => {
    const result = await soundReactions.sendReaction(soundId);
    if (!result.success && result.error) {
      Alert.alert("Cannot Send", result.error);
    }
  }, [soundReactions]);

  // Calculate mic button position for picker anchor
  const micButtonPosition = useMemo(() => ({
    x: width / 2,
    y: height - insets.bottom - 70, // Approximate position above bottom nav
  }), [insets.bottom]);

  // Safety timeout: never stay on black screen for more than 5 seconds
  const [safetyTimeout, setSafetyTimeout] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setSafetyTimeout(true), 5000);
    return () => clearTimeout(timer);
  }, []);

  // Keep splash screen visible until orbit data has settled
  const orbitSettled = orbitUsers.length > 0 || defaultRoomLoaded || (!loading && friendList.length === 0);
  const isDataReady = !!currentUser && !firstTimeLoading && (orbitSettled || safetyTimeout);

  const fadeAnim = useRef(new RNAnimated.Value(0)).current;
  const [hasRevealedOnce, setHasRevealedOnce] = useState(false);

  useEffect(() => {
    if (isDataReady && !hasRevealedOnce) {
      SplashScreen.hideAsync();
      RNAnimated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }).start();
      setHasRevealedOnce(true);
    }
  }, [isDataReady]);

  if (!isDataReady) {
    return <View style={{ flex: 1, backgroundColor: '#050510' }} />;
  }

  const userMoodColors = activeCustomMood
    ? { base: accent.primary, glow: accent.glow, soft: accent.soft, gradient: accent.gradient }
    : getMoodColor(currentUser?.mood || "neutral");

  return (
    <>
    <RNAnimated.View style={[styles.container, { backgroundColor: theme.colors.bg.primary, opacity: fadeAnim }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      <LinearGradient colors={theme.gradients.background} style={StyleSheet.absoluteFill} />
      <AnimatedGlow />
      <StarField />
      <View style={[styles.grain, { backgroundColor: theme.colors.grain }]} pointerEvents="none" />

      {/* Gesture handler for drag-to-spin - disabled when sound picker is open */}
      {!showSoundPicker && (
        <View style={StyleSheet.absoluteFill} {...panResponder.panHandlers} pointerEvents="auto" />
      )}

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
        statusText={activeCustomMood?.text || currentVibe}
      />

      {/* Orbit Particles */}
      {orbitUsers.length > 0 &&
        orbitUsers.map((user, index) => (
          <FriendParticle
            key={`${user.id}-${defaultRoomId || 'none'}`}
            friend={user}
            index={index}
            total={orbitUsers.length}
            onPress={() => handleFriendPress(user, index)}
            hasActiveFlare={activeFlareUserIds.has(user.id)}
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
        currentUserId={currentUser?.id}
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
        onSwipeUpMic={handleSwipeUpMic}
        bottomInset={insets.bottom}
      />


      <MoodPicker
        visible={showMoodPicker}
        currentMood={currentMood}
        onSelectMood={changeMood}
        onClose={() => setShowMoodPicker(false)}
        originPoint={{ x: CENTER_X, y: CENTER_Y }}
        customMood={customMoods[0] || activeCustomMood || null}
        isCustomMoodActive={!!activeCustomMood}
        onSelectCustomMood={() => {
          const mood = customMoods[0] || activeCustomMood;
          if (mood) selectCustomMood(mood.id);
        }}
        onSaveCustomMood={async (emoji, text, color) => {
          await createCustomMood(emoji, text, color);
        }}
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
          onRemoveParticipant={async (userId, userName) => {
            await removeParticipant(defaultRoom.id, userId);
          }}
          friends={friendList}
          participantIds={roomParticipants.map((p) => p.user_id)}
          onInvite={async (friendId) => {
            await inviteFriendToRoom(defaultRoom.id, friendId);
          }}
        />
      )}

    </RNAnimated.View>

      {/* Sound Reactions - outside animated container for proper z-index */}
      <SoundReactionPicker
        visible={showSoundPicker}
        onSelect={handleSoundSelect}
        onClose={() => setShowSoundPicker(false)}
        canSend={soundReactions.canSend}
        cooldownProgress={soundReactions.cooldownProgress}
        lastSentSound={soundReactions.lastSentSound}
        isGhostModeBlocked={soundReactions.isGhostModeBlocked}
        isReconnecting={isAudioConnecting}
        anchorPosition={micButtonPosition}
        accent={accent}
        theme={theme}
        onPreview={playPreview}
        onPreviewEnd={stopPreview}
      />

      <SoundReactionToast
        reactions={soundReactions.receivedReactions}
        topInset={insets.top}
        theme={theme}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  grain: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.3,
    pointerEvents: "none",
  },
});
