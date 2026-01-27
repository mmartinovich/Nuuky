import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, Alert, StatusBar, Image } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { useRouter } from "expo-router";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { supabase } from "../../lib/supabase";
import { Animated as RNAnimated, PanResponder, Easing } from "react-native";

// AsyncStorage with fallback for when package isn't installed
let AsyncStorage: {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
};

try {
  AsyncStorage = require("@react-native-async-storage/async-storage").default;
} catch (e) {
  // Fallback to in-memory storage with LRU limit to prevent unbounded memory growth
  const MAX_STORAGE_ITEMS = 50;
  const memoryStorage: Map<string, string> = new Map();

  AsyncStorage = {
    getItem: async (key: string) => {
      const value = memoryStorage.get(key);
      if (value !== undefined) {
        // Move to end (most recently used)
        memoryStorage.delete(key);
        memoryStorage.set(key, value);
      }
      return value || null;
    },
    setItem: async (key: string, value: string) => {
      // Delete first to update position in Map
      memoryStorage.delete(key);
      memoryStorage.set(key, value);
      // Evict oldest entries if over limit
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
const PRESENCE_REFRESH_THROTTLE_MS = 3000; // Only refresh every 3 seconds
import { useMood } from "../../hooks/useMood";
import { useNudge } from "../../hooks/useNudge";
import { useFlare } from "../../hooks/useFlare";
import { usePresence } from "../../hooks/usePresence";
import { useRoom } from "../../hooks/useRoom";
import { useRoomInvites } from "../../hooks/useRoomInvites";
import { useDefaultRoom } from "../../hooks/useDefaultRoom";
import { useFirstTimeRoom } from "../../hooks/useFirstTimeRoom";
import { useTheme } from "../../hooks/useTheme";
import { useAudio } from "../../hooks/useAudio";
import { useNotifications } from "../../hooks/useNotifications";
import { getMoodColor, getVibeText, getCustomMoodColor, spacing, radius, typography } from "../../lib/theme";
import { CentralOrb } from "../../components/CentralOrb";
import { FriendParticle } from "../../components/FriendParticle";
import { StarField } from "../../components/StarField";
import { FriendActionBubble } from "../../components/FriendActionBubble";
import { RoomListModal } from "../../components/RoomListModal";
import { CreateRoomModal } from "../../components/CreateRoomModal";
import { RoomSettingsModal } from "../../components/RoomSettingsModal";
import { InviteFriendsModal } from "../../components/InviteFriendsModal";
import { AudioConnectionBadge } from "../../components/AudioConnectionBadge";

const { width, height } = Dimensions.get("window");
const CENTER_X = width / 2;
const CENTER_Y = height / 2;

export default function QuantumOrbitScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme, isDark, accent } = useTheme();
  const { currentUser, friends, speakingParticipants, activeCustomMood } = useAppStore();
  const { currentMood, changeMood } = useMood();
  const { sendNudge } = useNudge();
  const { sendFlare, activeFlares, myActiveFlare } = useFlare();
  const { updateActivity } = usePresence(); // Track presence while app is active
  const {
    activeRooms,
    createRoom,
    joinRoom: joinRoomFn,
    updateRoomName,
    deleteRoom,
    inviteFriendToRoom,
    participants,
    removeParticipant,
    myRooms,
    currentRoom,
  } = useRoom();
  const { roomInvites } = useRoomInvites();
  const { defaultRoom, defaultRoomId, isDefaultRoom, setAsDefaultRoom } = useDefaultRoom();
  
  // First-time user setup - creates "My Nūūky" room automatically
  const { loading: firstTimeLoading } = useFirstTimeRoom();

  // Audio integration - connect to default room's audio when available
  const {
    connectionStatus: audioConnectionStatus,
    isConnecting: isAudioConnecting,
    unmute: audioUnmute,
    mute: audioMute,
    disconnect: audioDisconnect,
  } = useAudio(defaultRoom?.id || null);

  // Notifications
  const { unreadCount: notificationCount } = useNotifications();

  const [loading, setLoading] = useState(false); // Start with false - friends from Zustand show immediately
  const [showMoodPicker, setShowMoodPicker] = useState(false);
  const [showHint, setShowHint] = useState(true); // Show hint by default until user interacts
  const [selectedFriend, setSelectedFriend] = useState<User | null>(null);
  const [bubblePosition, setBubblePosition] = useState({ x: 0, y: 0 });
  const [isMuted, setIsMuted] = useState(true); // Start muted by default
  const [showRoomList, setShowRoomList] = useState(false);
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [showRoomSettings, setShowRoomSettings] = useState(false);
  const [showInviteFriendsFromDefault, setShowInviteFriendsFromDefault] = useState(false);
  // Audio-reactive button animation
  const isCurrentUserSpeaking = currentUser?.id ? speakingParticipants.includes(currentUser.id) : false;
  // Separate animated values: scale uses native driver, glow uses JS driver
  const buttonScaleAnim = useRef(new RNAnimated.Value(1)).current;
  const buttonGlowAnim = useRef(new RNAnimated.Value(1)).current;
  // Animated rings for speaking visualization
  const ring1Anim = useRef(new RNAnimated.Value(0)).current;
  const ring2Anim = useRef(new RNAnimated.Value(0)).current;
  const ring3Anim = useRef(new RNAnimated.Value(0)).current;
  const ring4Anim = useRef(new RNAnimated.Value(0)).current;

  // Shared orbit angle for roulette rotation - all friends rotate together
  // Using React Native Animated API (works in Expo Go, can upgrade to Reanimated later)
  const orbitAngle = useRef(new RNAnimated.Value(0)).current;
  const orbitAngleValueRef = useRef(0); // Track the actual value
  const orbitVelocity = useRef(0);
  const lastAngleRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(Date.now());
  const decayAnimationRef = useRef<RNAnimated.CompositeAnimation | null>(null);
  const decayListenerRef = useRef<string | null>(null); // Track decay listener for cleanup

  // Cleanup animation listeners on unmount to prevent accumulation
  useEffect(() => {
    return () => {
      // Stop any running animation
      if (decayAnimationRef.current) {
        decayAnimationRef.current.stop();
        decayAnimationRef.current = null;
      }
      // Remove any active listener
      if (decayListenerRef.current) {
        orbitAngle.removeListener(decayListenerRef.current);
        decayListenerRef.current = null;
      }
    };
  }, []);

  // Pan gesture handler for drag-to-spin rotation
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false, // Never capture on start - let taps through
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        // Only capture after significant movement (drag, not tap)
        return Math.abs(gestureState.dx) > 15 || Math.abs(gestureState.dy) > 15;
      },
      onPanResponderTerminationRequest: () => true, // Allow other responders to take over
      onShouldBlockNativeResponder: () => false,
      onPanResponderGrant: (event) => {
        lastTimeRef.current = Date.now();
        // Clean up any existing decay animation and its listener
        if (decayAnimationRef.current) {
          decayAnimationRef.current.stop();
          decayAnimationRef.current = null;
        }
        if (decayListenerRef.current) {
          orbitAngle.removeListener(decayListenerRef.current);
          decayListenerRef.current = null;
        }
        orbitVelocity.current = 0;
        const touchX = event.nativeEvent.pageX;
        const touchY = event.nativeEvent.pageY;
        const { width, height } = Dimensions.get("window");
        lastAngleRef.current = Math.atan2(touchY - height / 2, touchX - width / 2);
      },
      onPanResponderMove: (event) => {
        if (lastAngleRef.current === null) return;
        const touchX = event.nativeEvent.pageX;
        const touchY = event.nativeEvent.pageY;
        const { width, height } = Dimensions.get("window");
        const currentAngle = Math.atan2(touchY - height / 2, touchX - width / 2);
        let deltaAngle = currentAngle - lastAngleRef.current;
        if (deltaAngle > Math.PI) deltaAngle -= 2 * Math.PI;
        else if (deltaAngle < -Math.PI) deltaAngle += 2 * Math.PI;

        const newValue = orbitAngleValueRef.current + deltaAngle;
        orbitAngleValueRef.current = newValue;
        orbitAngle.setValue(newValue);

        const currentTime = Date.now();
        const deltaTime = currentTime - lastTimeRef.current;
        if (deltaTime > 0) {
          orbitVelocity.current = (deltaAngle / deltaTime) * 1000;
        }
        lastTimeRef.current = currentTime;
        lastAngleRef.current = currentAngle;
      },
      onPanResponderRelease: () => {
        const velocity = orbitVelocity.current;
        if (Math.abs(velocity) > 0.1) {
          const targetValue = orbitAngleValueRef.current + velocity * 1.5;
          decayAnimationRef.current = RNAnimated.timing(orbitAngle, {
            toValue: targetValue,
            duration: Math.min(Math.abs(velocity) * 800, 2000),
            useNativeDriver: false, // Must be false - FriendParticles read _value on JS thread
            easing: Easing.out(Easing.cubic),
          });
          // Store listener reference for cleanup
          const listenerId = orbitAngle.addListener(({ value }) => {
            orbitAngleValueRef.current = value;
          });
          decayListenerRef.current = listenerId;
          decayAnimationRef.current.start(() => {
            orbitAngle.removeListener(listenerId);
            decayListenerRef.current = null;
            orbitVelocity.current = 0;
            decayAnimationRef.current = null;
          });
        }
        lastAngleRef.current = null;
      },
    }),
  ).current;

  // All hooks must be called before any conditional returns
  const currentVibe = useMemo(() => getVibeText(currentUser?.mood || "neutral"), [currentUser?.mood]);

  // Calculate friend list and positions - must be before conditional returns
  // Filter out any invalid friends (where friend data is missing)
  // Also filter out the current user - they are represented by the central orb character
  // Friends persist in Zustand, so they're available immediately on remount
  const friendList = friends
    .map((f) => f.friend as User)
    .filter((f): f is User => f !== null && f !== undefined && f.id !== currentUser?.id);

  // Get participant users from room (when in room mode)
  // Derive directly from myRooms using defaultRoom.id to avoid stale currentRoom data
  // Filter out the current user - they are represented by the central orb character
  const participantUsers: User[] = useMemo(() => {
    if (!defaultRoom) return [];

    // Get participants directly from myRooms - this is always up to date
    const roomData = myRooms.find((r) => r.id === defaultRoom.id);
    if (roomData && roomData.participants && roomData.participants.length > 0) {
      return roomData.participants
        .map((p) => p.user)
        .filter((u): u is User => u !== null && u !== undefined && u.id !== currentUser?.id);
    }

    // Only use participants fallback if currentRoom matches defaultRoom
    // This prevents showing stale data from the previous room during transitions
    if (currentRoom?.id === defaultRoom.id && participants.length > 0) {
      return participants
        .map((p) => p.user)
        .filter((u): u is User => u !== null && u !== undefined && u.id !== currentUser?.id);
    }

    // Return empty array during room transitions - data will load shortly
    return [];
  }, [defaultRoom?.id, myRooms, participants, currentRoom?.id, currentUser?.id]);

  // Use participants when in room mode, friends otherwise
  const orbitUsers = defaultRoom ? participantUsers : friendList;

  // CRITICAL: Immediately restore mock friends if they're missing
  // This prevents the Friends page from clearing them
  // This effect runs whenever friends array changes - if it becomes empty, restore immediately
  useEffect(() => {
    if (currentUser && friends.length === 0 && friendList.length === 0) {
      // Friends were cleared (possibly by Friends page) - restore immediately
      // Use silent mode so we don't show loading - friends will appear as soon as they're set
      loadFriends(true);
    }
  }, [currentUser?.id, friends.length, friendList.length]); // Use id to avoid re-running on mood change

  // Organic layout algorithm - calculate positions for friends
  // Ensures even distribution around central orb with no overlaps
  const calculateFriendPositions = (count: number) => {
    if (count === 0) return [];

    const positions: Array<{ x: number; y: number }> = [];
    const PARTICLE_SIZE = 60; // Size of friend particle
    const ORBITAL_MARGIN = 20; // Extra space for orbital motion
    const minDistance = PARTICLE_SIZE + ORBITAL_MARGIN; // Minimum center-to-center distance (80px)

    // Safe zones to avoid UI elements
    const safeZoneTop = 200; // Avoid top card
    const safeZoneBottom = height - 100; // Avoid bottom nav
    const safeZoneLeft = 50;
    const safeZoneRight = width - 50;

    // Calculate available space for radius
    const maxRadiusX = Math.min(CENTER_X - safeZoneLeft, safeZoneRight - CENTER_X);
    const maxRadiusY = Math.min(CENTER_Y - safeZoneTop, safeZoneBottom - CENTER_Y);
    const maxRadius = Math.min(maxRadiusX, maxRadiusY) - PARTICLE_SIZE / 2;

    // Start with base radius, use multiple layers if needed
    let baseRadius = 140;
    const radiusStep = 40; // Step between layers if needed
    const maxLayers = 3;

    // Distribute evenly around the circle
    for (let i = 0; i < count; i++) {
      const baseAngle = (i / count) * 2 * Math.PI;
      let placed = false;
      let layer = 0;

      // Try placing on different layers if needed
      while (!placed && layer < maxLayers) {
        const currentRadius = baseRadius + layer * radiusStep;

        // Try multiple angles around the base angle for better fit
        const angleVariations = [
          baseAngle, // Primary position
          baseAngle - 0.1, // Slight left
          baseAngle + 0.1, // Slight right
          baseAngle - 0.2,
          baseAngle + 0.2,
        ];

        for (const angle of angleVariations) {
          const x = CENTER_X + Math.cos(angle) * currentRadius;
          const y = CENTER_Y + Math.sin(angle) * currentRadius;

          // Check if within safe zones
          if (
            y >= safeZoneTop &&
            y <= safeZoneBottom &&
            x >= safeZoneLeft &&
            x <= safeZoneRight &&
            currentRadius <= maxRadius
          ) {
            // Check distance from all existing positions
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

      // Final fallback: place at base angle with minimum radius, even if slightly overlapping
      // This ensures all friends are visible
      if (!placed) {
        const fallbackRadius = Math.max(baseRadius, 120);
        const x = CENTER_X + Math.cos(baseAngle) * fallbackRadius;
        const y = CENTER_Y + Math.sin(baseAngle) * fallbackRadius;
        positions.push({ x, y });
      }
    }

    return positions;
  };

  // Recalculate positions when orbit users change (friends or room participants)
  // Use IDs as dependency to detect actual changes, not just length
  const orbitIds = useMemo(() => orbitUsers.map((f) => f.id).join(","), [orbitUsers]);
  const orbitPositions = useMemo(() => calculateFriendPositions(orbitUsers.length), [orbitUsers.length, orbitIds]);

  // Calculate base angles for each orbit user from their initial positions
  // These are used with orbitAngle to calculate final positions during rotation
  const orbitBaseAngles = useMemo(() => {
    return orbitPositions.map((pos) => {
      const deltaX = pos.x - CENTER_X;
      const deltaY = pos.y - CENTER_Y;
      return Math.atan2(deltaY, deltaX);
    });
  }, [orbitPositions]);

  // Calculate radius for each orbit user (distance from center)
  const orbitRadii = useMemo(() => {
    return orbitPositions.map((pos) => {
      const deltaX = pos.x - CENTER_X;
      const deltaY = pos.y - CENTER_Y;
      return Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    });
  }, [orbitPositions]);

  // Mood images are preloaded at app startup in _layout.tsx

  // Audio-reactive button pulsing animation
  useEffect(() => {
    if (!isMuted && isCurrentUserSpeaking) {
      // Create breathing-like pulse animation
      const pulseAnimation = RNAnimated.loop(
        RNAnimated.sequence([
          // Expand phase
          RNAnimated.parallel([
            RNAnimated.timing(buttonScaleAnim, {
              toValue: 1.12,
              duration: 800,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: false, // Use JS driver for all to avoid conflicts
            }),
            RNAnimated.timing(buttonGlowAnim, {
              toValue: 1.6,
              duration: 800,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: false,
            }),
          ]),
          // Contract phase
          RNAnimated.parallel([
            RNAnimated.timing(buttonScaleAnim, {
              toValue: 1,
              duration: 800,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: false, // Use JS driver for all to avoid conflicts
            }),
            RNAnimated.timing(buttonGlowAnim, {
              toValue: 1,
              duration: 800,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: false,
            }),
          ]),
        ]),
      );
      pulseAnimation.start();
      return () => pulseAnimation.stop();
    } else {
      // Reset to normal state when not speaking or muted
      buttonScaleAnim.setValue(1);
      buttonGlowAnim.setValue(1);
    }
  }, [isMuted, isCurrentUserSpeaking]);

  // Animated rings that expand outward when speaking
  useEffect(() => {
    if (!isMuted && isCurrentUserSpeaking) {
      // Create staggered ring animations - each ring expands and fades out
      const createRingAnimation = (ringAnim: RNAnimated.Value, delay: number) => {
        return RNAnimated.loop(
          RNAnimated.sequence([
            RNAnimated.delay(delay),
            RNAnimated.timing(ringAnim, {
              toValue: 1,
              duration: 1200,
              easing: Easing.out(Easing.ease),
              useNativeDriver: false,
            }),
            RNAnimated.timing(ringAnim, {
              toValue: 0,
              duration: 0,
              useNativeDriver: false,
            }),
          ])
        );
      };

      const ring1Animation = createRingAnimation(ring1Anim, 0);
      const ring2Animation = createRingAnimation(ring2Anim, 300);
      const ring3Animation = createRingAnimation(ring3Anim, 600);
      const ring4Animation = createRingAnimation(ring4Anim, 900);

      ring1Animation.start();
      ring2Animation.start();
      ring3Animation.start();
      ring4Animation.start();

      return () => {
        ring1Animation.stop();
        ring2Animation.stop();
        ring3Animation.stop();
        ring4Animation.stop();
      };
    } else {
      // Reset rings when not speaking
      ring1Anim.setValue(0);
      ring2Anim.setValue(0);
      ring3Anim.setValue(0);
      ring4Anim.setValue(0);
    }
  }, [isMuted, isCurrentUserSpeaking]);

  // Join default room when it's set
  useEffect(() => {
    if (defaultRoom && currentUser) {
      joinRoomFn(defaultRoom.id);
    }
  }, [defaultRoom?.id, currentUser?.id]); // Use id to avoid re-running on mood change

  // Friends persist in Zustand store across navigation, so avatars show immediately
  // No need to reload on focus - friends are already in store and realtime updates them

  useEffect(() => {
    if (currentUser) {
      // Always ensure loading is false if we have friends (they render immediately)
      if (friendList.length > 0) {
        setLoading(false);
      }

      // Check if we need to load friends
      const needsLoad = friendList.length === 0;

      if (needsLoad) {
        // No friends yet, load them
        setLoading(true);
        loadFriends(false);
      } else {
        // We have friends - refresh silently in background
        loadFriends(true);
      }

      loadHintState();
      const cleanup = setupRealtimeSubscription();
      return cleanup;
    } else {
      setLoading(false);
    }
  }, [currentUser?.id]); // Use id to avoid re-running on mood change

  const loadHintState = async () => {
    try {
      const hasInteracted = await AsyncStorage.getItem("hasInteractedWithOrb");
      if (hasInteracted === "true") {
        setShowHint(false);
      }
    } catch (_error) {
      // Default to showing hint if there's an error
    }
  };

  const saveInteractionState = async () => {
    try {
      await AsyncStorage.setItem("hasInteractedWithOrb", "true");
      setShowHint(false);
    } catch (_error) {
      // Silently fail
    }
  };

  const loadFriends = async (silent = false) => {
    if (!currentUser) {
      setLoading(false);
      return;
    }

    // Don't show loading state if this is a silent refresh
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

      // Friends data is handled by useFriends hook
      setLoading(false);
    } catch (_error: any) {
      // Friends data is handled by useFriends hook
      setLoading(false);
    } finally {
      // Only update loading state if not a silent refresh
      if (!silent) {
        setLoading(false);
      }
    }
  };

  const setupRealtimeSubscription = () => {
    if (!currentUser) return () => {};

    // Prevent duplicate subscriptions - return existing cleanup to properly cleanup on unmount
    if (activePresenceSubscription && activePresenceSubscription.userId === currentUser.id) {
      return activePresenceSubscription.cleanup;
    }

    if (activePresenceSubscription) {
      activePresenceSubscription.cleanup();
      activePresenceSubscription = null;
    }

    // Use unique channel name to prevent duplicate listeners
    const subscriptionId = ++presenceSubscriptionCounter;
    const channelName = `presence-changes-${subscriptionId}`;

    // Throttled refresh to prevent excessive API calls
    const throttledLoadFriends = () => {
      const now = Date.now();
      if (now - lastPresenceRefresh < PRESENCE_REFRESH_THROTTLE_MS) return;
      lastPresenceRefresh = now;
      // Silent refresh on realtime updates - don't show loading
      loadFriends(true);
    };

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "users",
        },
        throttledLoadFriends,
      )
      .subscribe();

    const cleanup = () => {
      supabase.removeChannel(channel);
      activePresenceSubscription = null;
    };

    activePresenceSubscription = { cleanup, userId: currentUser.id };

    return cleanup;
  };

  const handleFriendPress = useCallback((friend: User, friendIndex: number) => {
    // Calculate friend's current position based on orbit angle
    const baseAngle = orbitBaseAngles[friendIndex] || 0;
    const radiusVal = orbitRadii[friendIndex] || 150;
    const currentAngle = baseAngle + orbitAngleValueRef.current;
    const friendX = CENTER_X + Math.cos(currentAngle) * radiusVal;
    const friendY = CENTER_Y + Math.sin(currentAngle) * radiusVal;

    setBubblePosition({ x: friendX, y: friendY });
    setSelectedFriend(friend);
  }, [orbitBaseAngles, orbitRadii]);

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
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // TODO: Integrate with Supabase to send notification to friend to call
      // For now, just show feedback
      Alert.alert("Call Me Sent", `You requested ${selectedFriend.display_name} to call you`, [
        { text: "OK", style: "default" },
      ]);
    }
  }, [selectedFriend]);

  const handleHeart = useCallback(async () => {
    if (!selectedFriend) return;

    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    // Could integrate with Supabase to store heart reactions
    // Animation is handled in FriendActionBubble component
  }, [selectedFriend]);

  const getMoodLabel = useCallback((mood: User["mood"]) => {
    switch (mood) {
      case "good":
        return "Feeling good";
      case "neutral":
        return "Neutral";
      case "not_great":
        return "Not great";
      case "reach_out":
        return "Need support";
      default:
        return "Neutral";
    }
  }, []);

  const handleOrbPress = useCallback(() => {
    // Hide hint on first interaction
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

  const handleCreateRoom = useCallback(async (name?: string, isPrivate?: boolean) => {
    const room = await createRoom(name, isPrivate ? [] : undefined);
    if (room) {
      setShowCreateRoom(false);
      router.push(`/(main)/room/${room.id}`);
    }
  }, [createRoom, router]);

  const handleJoinRoom = useCallback(async (roomId: string) => {
    setShowRoomList(false);
    await joinRoomFn(roomId);
    router.push(`/(main)/room/${roomId}`);
  }, [joinRoomFn, router]);

  // NEVER show loading if we have friends - friends from Zustand always render immediately
  // Only show loading screen if we have no friends AND no user (initial auth)
  // Also show loading if first-time room is being created
  if ((loading && friendList.length === 0 && !currentUser) || (firstTimeLoading && !defaultRoom)) {
    return (
      <LinearGradient colors={theme.gradients.background} style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: theme.colors.text.secondary }]}>
            {firstTimeLoading ? "✨ creating your space..." : "✨ loading your vibe..."}
          </Text>
        </View>
      </LinearGradient>
    );
  }

  // Friends from Zustand store are always rendered immediately when they exist
  // This ensures avatars appear instantly when navigating back from other screens

  // Use custom mood color if active, otherwise use preset mood color
  const userMoodColors = activeCustomMood
    ? getCustomMoodColor(activeCustomMood.color)
    : getMoodColor(currentUser?.mood || "neutral");

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bg.primary }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* Neon Cyber Background */}
      <LinearGradient colors={theme.gradients.background} style={StyleSheet.absoluteFill} />

      {/* Animated Star Field */}
      <StarField />

      {/* Gesture handler for drag-to-spin - BEHIND interactive elements */}
      {/* Rendered before CentralOrb/FriendParticles so they receive touches first */}
      <View style={StyleSheet.absoluteFill} {...panResponder.panHandlers} pointerEvents="auto" />

      {/* Central Orb - Your Presence */}
      <CentralOrb
        moodColor={userMoodColors.base}
        glowColor={userMoodColors.glow}
        onPress={() => {
          updateActivity(); // Track activity on interaction
          handleOrbPress();
        }}
        hasActiveFlare={!!myActiveFlare}
        mood={currentUser?.mood}
        customMood={activeCustomMood}
        showHint={showHint}
      />

      {/* Orbit Particles - Shows room participants when in room, friends otherwise */}
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
        />
      )}

      {/* Top Header - Wordmark Logo */}
      <View style={styles.topHeader} pointerEvents="box-none">
        <Image source={require("../../assets/wordmark.png")} style={styles.wordmarkSmall} resizeMode="contain" />

        {/* Notification Bell Icon */}
        <TouchableOpacity
          style={[styles.notificationBell, { backgroundColor: accent.soft }]}
          onPress={() => router.push("/(main)/notifications")}
          activeOpacity={0.7}
        >
          <Ionicons name="notifications-outline" size={22} color={accent.primary} />
          {notificationCount > 0 && (
            <View style={[styles.notificationBadge, { backgroundColor: theme.colors.neon.pink, borderColor: theme.colors.bg.primary }]}>
              <Text style={styles.notificationBadgeText}>
                {notificationCount > 99 ? "99+" : notificationCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
        {defaultRoom ? (
          <TouchableOpacity
            style={[
              styles.roomPill,
              {
                backgroundColor: theme.colors.glass.background,
                borderColor: `rgba(0, 240, 255, 0.3)`,
                shadowColor: theme.colors.neon.cyan,
              },
            ]}
            onPress={() => setShowRoomSettings(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="home" size={14} color={theme.colors.neon.cyan} />
            <Text style={[styles.roomPillText, { color: theme.colors.text.primary }]}>
              {defaultRoom.name || "Room"}
            </Text>
          </TouchableOpacity>
        ) : (
          <Text style={[styles.moodText, { color: theme.colors.text.secondary }]}>{currentVibe}</Text>
        )}

        {/* Audio Status Badge */}
        {audioConnectionStatus !== "disconnected" && defaultRoom && (
          <View style={{ marginTop: 8 }}>
            <AudioConnectionBadge status={audioConnectionStatus} />
          </View>
        )}
      </View>

      {/* Bottom Navigation Bar */}
      <View style={[styles.bottomNav, { paddingBottom: Math.max(insets.bottom, 8) }]} pointerEvents="box-none">
        {/* Floating center button */}
        <View style={styles.floatingButtonWrapper} pointerEvents="box-none">
          {/* Animated rings - only visible when speaking */}
          {!isMuted && [ring1Anim, ring2Anim, ring3Anim, ring4Anim].map((ringAnim, index) => (
            <RNAnimated.View
              key={`ring-${index}`}
              pointerEvents="none"
              style={[
                styles.speakingRing,
                {
                  borderColor: accent.primary,
                  transform: [
                    {
                      scale: ringAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [1, 2.2 + index * 0.15],
                      }),
                    },
                  ],
                  opacity: ringAnim.interpolate({
                    inputRange: [0, 0.3, 1],
                    outputRange: [0.6, 0.4, 0],
                  }),
                },
              ]}
            />
          ))}
          <RNAnimated.View
            style={[
              styles.floatingButton,
              {
                transform: [{ scale: buttonScaleAnim }],
                backgroundColor: isMuted ? "transparent" : accent.primary,
                borderColor: accent.primary,
                shadowColor: accent.primary,
                shadowOpacity: isMuted
                  ? 0.2
                  : buttonGlowAnim.interpolate({
                      inputRange: [1, 1.6],
                      outputRange: [0.6, 0.9],
                    }),
                shadowRadius: isMuted
                  ? 8
                  : buttonGlowAnim.interpolate({
                      inputRange: [1, 1.6],
                      outputRange: [15, 30],
                    }),
              },
              isAudioConnecting && { opacity: 0.7 },
            ]}
          >
            <TouchableOpacity
              onPress={async () => {
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
              }}
              activeOpacity={0.85}
              style={styles.floatingButtonInner}
              disabled={isAudioConnecting}
            >
              {isAudioConnecting ? (
                <Ionicons name="hourglass" size={28} color={isMuted ? accent.primary : "#FFFFFF"} />
              ) : (
                <Ionicons name={isMuted ? "mic-off" : "mic"} size={28} color={isMuted ? accent.primary : "#FFFFFF"} />
              )}
            </TouchableOpacity>
          </RNAnimated.View>
        </View>

        {/* Navigation bar with SVG shape */}
        <View style={styles.navBarWrapper}>
          {/* Background fill below nav bar */}
          <View style={styles.navBarFill} />
          
          <Image 
            source={require("../../assets/nav-bar-shape.png")} 
            style={styles.navBarShape}
            resizeMode="stretch"
          />
          <View style={styles.navBarContent}>
            {/* Left icons */}
            <View style={styles.navSection}>
              <TouchableOpacity
                onPress={handleFlarePress}
                activeOpacity={0.7}
                disabled={!!myActiveFlare}
                style={styles.navTab}
              >
                <Ionicons name="flame" size={26} color="#FF3B30" />
                <Text style={styles.navLabel}>Flare</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                onPress={() => router.push("/(main)/friends")} 
                activeOpacity={0.7} 
                style={styles.navTab}
              >
                <Feather name="users" size={24} color="rgba(255, 255, 255, 0.85)" />
                <Text style={styles.navLabel}>Friends</Text>
              </TouchableOpacity>
            </View>

            {/* Center gap */}
            <View style={styles.centerGap} />

            {/* Right icons */}
            <View style={styles.navSection}>
              <TouchableOpacity 
                onPress={handleOpenRooms} 
                activeOpacity={0.7} 
                style={styles.navTab}
              >
                <Ionicons name="grid-outline" size={24} color="rgba(255, 255, 255, 0.85)" />
                {roomInvites.length > 0 && (
                  <View style={[styles.roomBadge, { backgroundColor: theme.colors.mood.neutral.base }]}>
                    <Text style={[styles.roomBadgeText, { color: theme.colors.text.primary }]}>{roomInvites.length}</Text>
                  </View>
                )}
                <Text style={styles.navLabel}>Rooms</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                onPress={() => router.push("/(main)/settings")} 
                activeOpacity={0.7} 
                style={styles.navTab}
              >
                <Feather name="settings" size={24} color="rgba(255, 255, 255, 0.7)" />
                <Text style={styles.navLabel}>Settings</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>

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

      {/* Mood Picker Modal */}
      <MoodPicker
        visible={showMoodPicker}
        currentMood={currentMood}
        onSelectMood={changeMood}
        onClose={() => setShowMoodPicker(false)}
      />

      {/* Room List Modal */}
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

      {/* Create Room Modal */}
      <CreateRoomModal visible={showCreateRoom} onClose={() => setShowCreateRoom(false)} onCreate={handleCreateRoom} />

      {/* Room Settings Modal (for default room) */}
      {defaultRoom && (
        <RoomSettingsModal
          visible={showRoomSettings}
          roomName={defaultRoom.name || "Room"}
          roomId={defaultRoom.id}
          isCreator={defaultRoom.creator_id === currentUser?.id}
          creatorId={defaultRoom.creator_id}
          participants={participants}
          currentUserId={currentUser?.id || ""}
          onClose={() => setShowRoomSettings(false)}
          onRename={async (name) => {
            const success = await updateRoomName(defaultRoom.id, name);
            if (!success) {
              throw new Error("Failed to rename room");
            }
          }}
          onDelete={async () => { await deleteRoom(defaultRoom.id); }}
          onLeave={() => {
            // Can't leave default room - would need to set another as default first
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

      {/* Invite Friends Modal (for default room) */}
      {defaultRoom && (
        <InviteFriendsModal
          visible={showInviteFriendsFromDefault}
          friends={friendList}
          participantIds={participants.map((p) => p.user_id)}
          onClose={() => setShowInviteFriendsFromDefault(false)}
          onInvite={async (friendId) => { await inviteFriendToRoom(defaultRoom.id, friendId); }}
        />
      )}

      {/* Grain Overlay */}
      <View style={styles.grain} pointerEvents="none" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    fontSize: 18,
    fontWeight: "600",
  },
  topHeader: {
    position: "absolute",
    top: 70,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  notificationBell: {
    position: "absolute",
    top: 0,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  notificationBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
    borderWidth: 2,
  },
  notificationBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  appTitle: {
    fontSize: 34,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  wordmarkSmall: {
    width: 120,
    height: 40,
  },
  moodText: {
    fontSize: 17,
    marginTop: 6,
    fontWeight: "500",
    letterSpacing: 0.2,
  },
  roomPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    borderWidth: 1,
    marginTop: 6,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  roomPillText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium as any,
  },
  // Bottom Navigation Bar
  bottomNav: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  navBarWrapper: {
    width: "100%",
    height: 70,
    position: "relative",
  },
  navBarFill: {
    position: "absolute",
    top: 40,
    left: -16,
    right: -16,
    bottom: -100,
    backgroundColor: "#1C1C1E",
  },
  navBarShape: {
    position: "absolute",
    top: 0,
    left: -16,
    right: -16,
    bottom: 0,
    width: Dimensions.get("window").width,
    height: "100%",
    tintColor: "#1C1C1E",
  },
  navBarContent: {
    position: "absolute",
    top: 8,
    left: 0,
    right: 0,
    height: 60,
    flexDirection: "row",
    alignItems: "center",
  },
  navSection: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-evenly",
    height: "100%",
  },
  centerGap: {
    width: 72,
  },
  floatingButtonWrapper: {
    position: "absolute",
    top: -18,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 20,
  },
  floatingButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
    borderWidth: 2,
  },
  speakingRing: {
    position: "absolute",
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1.5,
  },
  floatingButtonInner: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 27,
  },
  navTab: {
    alignItems: "center",
    justifyContent: "center",
    width: 52,
    height: 52,
  },
  roomBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  roomBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  navLabel: {
    fontSize: 10,
    fontWeight: "500",
    color: "rgba(255, 255, 255, 0.65)",
    letterSpacing: 0.1,
    marginTop: 2,
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
