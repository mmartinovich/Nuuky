import React from 'react';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';
import { encryptedStorage } from '../lib/secureStorage';
import { User, Friendship, Room, RoomParticipant, RoomInvite, AudioConnectionStatus, CustomMood, PresetMood, AppNotification, Anchor } from '../types';
import { ThemeMode } from '../lib/theme';

interface AppState {
  // Auth state
  currentUser: User | null;
  isAuthenticated: boolean;

  // Friends state
  friends: Friendship[];

  // Anchors state
  anchors: Anchor[];

  // Rooms state
  activeRooms: Room[];
  myRooms: Room[];
  currentRoom: Room | null;
  isInRoom: boolean;
  roomParticipants: RoomParticipant[];
  roomInvites: RoomInvite[];

  // Default room state
  defaultRoomId: string | null;

  // Home room state (permanently pinned "My Nuuky" room)
  homeRoomId: string | null;

  // Theme state
  themeMode: ThemeMode;

  // Network state
  isOnline: boolean;

  // Battery optimization
  lowPowerMode: boolean;

  // Audio state
  audioConnectionStatus: AudioConnectionStatus;
  audioError: string | null;
  // Using array instead of Set for proper JSON serialization
  speakingParticipants: string[];

  // Custom moods state
  customMoods: CustomMood[];
  activeCustomMood: CustomMood | null;

  // Notifications state
  notifications: AppNotification[];
  unreadNotificationCount: number;

  // Session timeout state
  sessionTimeoutMinutes: number;
  lastActivityTimestamp: number;
  sessionWarningShown: boolean;

  // Lo-fi music state
  lofiAutoPlay: boolean;
  lofiVolume: number;
  lofiSelectedTrack: string | null; // null = use mood-based default

  // Favorite friends state
  favoriteFriends: string[]; // Array of friend user IDs

  // Actions
  setCurrentUser: (user: User | null) => void;
  setFriends: (friends: Friendship[]) => void;
  addFriend: (friend: Friendship) => void;
  removeFriend: (friendId: string) => void;
  setAnchors: (anchors: Anchor[]) => void;
  setActiveRooms: (rooms: Room[]) => void;
  setMyRooms: (rooms: Room[]) => void;
  addMyRoom: (room: Room) => void;
  updateMyRoom: (roomId: string, updates: Partial<Room>) => void;
  removeMyRoom: (roomId: string) => void;
  setCurrentRoom: (room: Room | null) => void;
  setIsInRoom: (inRoom: boolean) => void;
  setRoomParticipants: (participants: RoomParticipant[]) => void;
  setRoomInvites: (invites: RoomInvite[]) => void;
  addRoomInvite: (invite: RoomInvite) => void;
  removeRoomInvite: (inviteId: string) => void;
  updateUserMood: (mood: PresetMood) => void;
  setCustomMoods: (moods: CustomMood[]) => void;
  addCustomMood: (mood: CustomMood) => void;
  updateCustomMood: (id: string, updates: Partial<CustomMood>) => void;
  deleteCustomMood: (id: string) => void;
  setActiveCustomMood: (mood: CustomMood | null) => void;
  setNotifications: (notifications: AppNotification[]) => void;
  addNotification: (notification: AppNotification) => void;
  markNotificationRead: (notificationId: string) => void;
  markAllNotificationsRead: () => void;
  removeNotification: (notificationId: string) => void;
  setDefaultRoomId: (roomId: string | null) => void;
  setHomeRoomId: (roomId: string | null) => void;
  setThemeMode: (mode: ThemeMode) => void;
  setIsOnline: (online: boolean) => void;
  setLowPowerMode: (enabled: boolean) => void;
  setAudioConnectionStatus: (status: AudioConnectionStatus) => void;
  setAudioError: (error: string | null) => void;
  addSpeakingParticipant: (participantId: string) => void;
  removeSpeakingParticipant: (participantId: string) => void;
  clearSpeakingParticipants: () => void;
  setLastActivity: () => void;
  setSessionTimeoutMinutes: (minutes: number) => void;
  showSessionWarning: (shown: boolean) => void;
  setLofiAutoPlay: (enabled: boolean) => void;
  setLofiVolume: (volume: number) => void;
  setLofiSelectedTrack: (track: string | null) => void;
  toggleFavoriteFriend: (friendId: string) => void;
  logout: () => void;
}

// Memoized selectors for performance - prevents re-renders on unrelated state changes
export const useCurrentUser = () => useAppStore((state) => state.currentUser);
export const useFriendsStore = () => useAppStore(useShallow((state) => state.friends));
export const useAnchorsStore = () => useAppStore(useShallow((state) => state.anchors));
export const useActiveRooms = () => useAppStore(useShallow((state) => state.activeRooms));
export const useMyRooms = () => useAppStore(useShallow((state) => state.myRooms));
export const useCurrentRoom = () => useAppStore((state) => state.currentRoom);
export const useRoomParticipants = () => useAppStore(useShallow((state) => state.roomParticipants));
export const useRoomInvites = () => useAppStore(useShallow((state) => state.roomInvites));
export const useSpeakingParticipants = () => useAppStore(useShallow((state) => state.speakingParticipants));
export const useActiveCustomMood = () => useAppStore((state) => state.activeCustomMood);
export const useNotificationsStore = () => useAppStore(useShallow((state) => state.notifications));
export const useUnreadNotificationCount = () => useAppStore((state) => state.unreadNotificationCount);
export const useThemeMode = () => useAppStore((state) => state.themeMode);
export const useDefaultRoomId = () => useAppStore((state) => state.defaultRoomId);
export const useHomeRoomId = () => useAppStore((state) => state.homeRoomId);
export const useAudioConnectionStatus = () => useAppStore((state) => state.audioConnectionStatus);
export const useIsOnline = () => useAppStore((state) => state.isOnline);
export const useLowPowerMode = () => useAppStore((state) => state.lowPowerMode);
export const useFavoriteFriends = () => useAppStore(useShallow((state) => state.favoriteFriends));

// Track hydration state for async storage
let hasHydratedStore = false;

export const useHasHydrated = () => {
  const [hydrated, setHydrated] = React.useState(hasHydratedStore);

  React.useEffect(() => {
    // If already hydrated, no need to subscribe
    if (hasHydratedStore) {
      setHydrated(true);
      return;
    }

    // Subscribe to hydration
    const unsubFinishHydration = useAppStore.persist.onFinishHydration(() => {
      hasHydratedStore = true;
      setHydrated(true);
    });

    return () => {
      unsubFinishHydration();
    };
  }, []);

  return hydrated;
};

// Also export a non-hook version for checks outside React
export const getHasHydrated = () => hasHydratedStore;

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
  // Initial state
  currentUser: null,
  isAuthenticated: false,
  friends: [],
  anchors: [],
  activeRooms: [],
  myRooms: [],
  currentRoom: null,
  isInRoom: false,
  roomParticipants: [],
  roomInvites: [],
  defaultRoomId: null,
  homeRoomId: null,
  themeMode: 'dark' as ThemeMode,
  isOnline: true,
  lowPowerMode: false,
  audioConnectionStatus: 'disconnected' as AudioConnectionStatus,
  audioError: null,
  speakingParticipants: [],
  customMoods: [],
  activeCustomMood: null,
  notifications: [],
  unreadNotificationCount: 0,
  sessionTimeoutMinutes: 43200, // 30 days - Instagram/Snapchat style (essentially no timeout)
  lastActivityTimestamp: Date.now(),
  sessionWarningShown: false,

  // Lo-fi music state
  lofiAutoPlay: true, // ON by default
  lofiVolume: 0.7, // Default volume (70%)
  lofiSelectedTrack: null, // null = use mood-based default

  // Favorite friends
  favoriteFriends: [],

  // Actions
  setCurrentUser: (user) => set({ currentUser: user, isAuthenticated: !!user }),

  setFriends: (friends) => {
    set({ friends });
  },

  addFriend: (friend) => set((state) => ({
    friends: [...state.friends, friend]
  })),

  removeFriend: (friendId) => set((state) => ({
    friends: state.friends.filter(f => f.id !== friendId)
  })),

  setAnchors: (anchors) => set({ anchors }),

  setActiveRooms: (rooms) => set({ activeRooms: rooms }),

  setMyRooms: (rooms) => set({ myRooms: rooms }),

  addMyRoom: (room) => set((state) => ({
    myRooms: [...state.myRooms, room]
  })),

  updateMyRoom: (roomId, updates) => set((state) => ({
    myRooms: state.myRooms.map(room =>
      room.id === roomId ? { ...room, ...updates } : room
    )
  })),

  removeMyRoom: (roomId) => set((state) => ({
    myRooms: state.myRooms.filter(r => r.id !== roomId)
  })),

  setCurrentRoom: (room) => set({
    currentRoom: room,
    isInRoom: !!room
  }),

  setIsInRoom: (inRoom) => set({ isInRoom: inRoom }),

  setRoomParticipants: (participants) => set({ roomParticipants: participants }),

  setRoomInvites: (invites) => set({ roomInvites: invites }),

  addRoomInvite: (invite) => set((state) => ({
    roomInvites: [...state.roomInvites, invite]
  })),

  removeRoomInvite: (inviteId) => set((state) => ({
    roomInvites: state.roomInvites.filter(i => i.id !== inviteId)
  })),

  updateUserMood: (mood) => set((state) => ({
    currentUser: state.currentUser
      ? { ...state.currentUser, mood, custom_mood_id: undefined, custom_mood: undefined }
      : null
  })),

  setCustomMoods: (moods) => set({ customMoods: moods }),

  addCustomMood: (mood) => set((state) => ({
    customMoods: [...state.customMoods, mood]
  })),

  updateCustomMood: (id, updates) => set((state) => ({
    customMoods: state.customMoods.map(mood =>
      mood.id === id ? { ...mood, ...updates } : mood
    )
  })),

  deleteCustomMood: (id) => set((state) => ({
    customMoods: state.customMoods.filter(mood => mood.id !== id),
    activeCustomMood: state.activeCustomMood?.id === id ? null : state.activeCustomMood
  })),

  setActiveCustomMood: (mood) => set((state) => ({
    activeCustomMood: mood,
    currentUser: mood && state.currentUser
      ? { ...state.currentUser, custom_mood_id: mood.id }
      : state.currentUser
  })),

  setNotifications: (notifications) => set({
    notifications,
    unreadNotificationCount: notifications.filter(n => !n.is_read).length
  }),

  addNotification: (notification) => set((state) => {
    // Prevent duplicates
    if (state.notifications.some(n => n.id === notification.id)) return state;
    const updated = [notification, ...state.notifications].slice(0, 200);
    return {
      notifications: updated,
      unreadNotificationCount: updated.filter(n => !n.is_read).length,
    };
  }),

  markNotificationRead: (notificationId) => set((state) => {
    const notification = state.notifications.find(n => n.id === notificationId);
    if (!notification || notification.is_read) return state;
    return {
      notifications: state.notifications.map(n =>
        n.id === notificationId ? { ...n, is_read: true } : n
      ),
      unreadNotificationCount: Math.max(0, state.unreadNotificationCount - 1)
    };
  }),

  markAllNotificationsRead: () => set((state) => ({
    notifications: state.notifications.map(n => ({ ...n, is_read: true })),
    unreadNotificationCount: 0
  })),

  removeNotification: (notificationId) => set((state) => {
    const notification = state.notifications.find(n => n.id === notificationId);
    return {
      notifications: state.notifications.filter(n => n.id !== notificationId),
      unreadNotificationCount: notification && !notification.is_read
        ? Math.max(0, state.unreadNotificationCount - 1)
        : state.unreadNotificationCount
    };
  }),

  setDefaultRoomId: (roomId) => set({ defaultRoomId: roomId }),

  setHomeRoomId: (roomId) => set({ homeRoomId: roomId }),

  setThemeMode: (mode) => set({ themeMode: mode }),

  setIsOnline: (online) => set({ isOnline: online }),
  setLowPowerMode: (enabled) => set({ lowPowerMode: enabled }),

  setAudioConnectionStatus: (status) => set({ audioConnectionStatus: status }),

  setAudioError: (error) => set({ audioError: error }),

  addSpeakingParticipant: (participantId) => set((state) => ({
    speakingParticipants: state.speakingParticipants.includes(participantId)
      ? state.speakingParticipants
      : [...state.speakingParticipants, participantId]
  })),

  removeSpeakingParticipant: (participantId) => set((state) => ({
    speakingParticipants: state.speakingParticipants.filter(id => id !== participantId)
  })),

  clearSpeakingParticipants: () => set({ speakingParticipants: [] }),

  setLastActivity: () => set({
    lastActivityTimestamp: Date.now(),
    sessionWarningShown: false,
  }),

  setSessionTimeoutMinutes: (minutes) => set({ sessionTimeoutMinutes: minutes }),

  showSessionWarning: (shown) => set({ sessionWarningShown: shown }),

  setLofiAutoPlay: (enabled) => set({ lofiAutoPlay: enabled }),

  setLofiVolume: (volume) => set({ lofiVolume: Math.max(0, Math.min(1, volume)) }),

  setLofiSelectedTrack: (track) => set({ lofiSelectedTrack: track }),

  toggleFavoriteFriend: (friendId) => set((state) => ({
    favoriteFriends: state.favoriteFriends.includes(friendId)
      ? state.favoriteFriends.filter(id => id !== friendId)
      : [...state.favoriteFriends, friendId]
  })),

  logout: () => set((state) => ({
    currentUser: null,
    isAuthenticated: false,
    friends: [],
    anchors: [],
    activeRooms: [],
    myRooms: [],
    currentRoom: null,
    isInRoom: false,
    roomParticipants: [],
    roomInvites: [],
    defaultRoomId: null,
    homeRoomId: null,
    // Reset audio state
    audioConnectionStatus: 'disconnected' as AudioConnectionStatus,
    audioError: null,
    speakingParticipants: [],
    // Reset custom moods
    customMoods: [],
    activeCustomMood: null,
    // Reset notifications
    notifications: [],
    unreadNotificationCount: 0,
    // Preserve theme preference on logout
    themeMode: state.themeMode,
  }))
}),
    {
      name: 'nooke-storage',
      storage: createJSONStorage(() => encryptedStorage),
      partialize: (state) => ({
        currentUser: state.currentUser,
        themeMode: state.themeMode,
        defaultRoomId: state.defaultRoomId,
        homeRoomId: state.homeRoomId,
        lowPowerMode: state.lowPowerMode,
        lofiAutoPlay: state.lofiAutoPlay,
        lofiVolume: state.lofiVolume,
        lofiSelectedTrack: state.lofiSelectedTrack,
        favoriteFriends: state.favoriteFriends,
      }),
    }
  )
);
