import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, Friendship, Room, RoomParticipant, RoomInvite, AudioConnectionStatus, CustomMood, PresetMood, AppNotification } from '../types';
import { ThemeMode } from '../lib/theme';

interface AppState {
  // Auth state
  currentUser: User | null;
  isAuthenticated: boolean;

  // Friends state
  friends: Friendship[];

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

  // Actions
  setCurrentUser: (user: User | null) => void;
  setFriends: (friends: Friendship[]) => void;
  addFriend: (friend: Friendship) => void;
  removeFriend: (friendId: string) => void;
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
  setLowPowerMode: (enabled: boolean) => void;
  setAudioConnectionStatus: (status: AudioConnectionStatus) => void;
  setAudioError: (error: string | null) => void;
  addSpeakingParticipant: (participantId: string) => void;
  removeSpeakingParticipant: (participantId: string) => void;
  clearSpeakingParticipants: () => void;
  logout: () => void;
}

// Memoized selectors for performance - prevents re-renders on unrelated state changes
export const useCurrentUser = () => useAppStore((state) => state.currentUser);
export const useFriendsStore = () => useAppStore((state) => state.friends);
export const useActiveRooms = () => useAppStore((state) => state.activeRooms);
export const useMyRooms = () => useAppStore((state) => state.myRooms);
export const useCurrentRoom = () => useAppStore((state) => state.currentRoom);
export const useRoomParticipants = () => useAppStore((state) => state.roomParticipants);
export const useRoomInvites = () => useAppStore((state) => state.roomInvites);
export const useSpeakingParticipants = () => useAppStore((state) => state.speakingParticipants);
export const useActiveCustomMood = () => useAppStore((state) => state.activeCustomMood);
export const useNotificationsStore = () => useAppStore((state) => state.notifications);
export const useUnreadNotificationCount = () => useAppStore((state) => state.unreadNotificationCount);
export const useThemeMode = () => useAppStore((state) => state.themeMode);
export const useDefaultRoomId = () => useAppStore((state) => state.defaultRoomId);
export const useHomeRoomId = () => useAppStore((state) => state.homeRoomId);
export const useAudioConnectionStatus = () => useAppStore((state) => state.audioConnectionStatus);
export const useLowPowerMode = () => useAppStore((state) => state.lowPowerMode);

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
  // Initial state
  currentUser: null,
  isAuthenticated: false,
  friends: [],
  activeRooms: [],
  myRooms: [],
  currentRoom: null,
  isInRoom: false,
  roomParticipants: [],
  roomInvites: [],
  defaultRoomId: null,
  homeRoomId: null,
  themeMode: 'dark' as ThemeMode,
  lowPowerMode: false,
  audioConnectionStatus: 'disconnected' as AudioConnectionStatus,
  audioError: null,
  speakingParticipants: [],
  customMoods: [],
  activeCustomMood: null,
  notifications: [],
  unreadNotificationCount: 0,

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
      ? { ...state.currentUser, mood }
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

  addNotification: (notification) => set((state) => ({
    notifications: [notification, ...state.notifications],
    unreadNotificationCount: state.unreadNotificationCount + (notification.is_read ? 0 : 1)
  })),

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

  logout: () => set((state) => ({
    currentUser: null,
    isAuthenticated: false,
    friends: [],
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
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        currentUser: state.currentUser,
        themeMode: state.themeMode,
        defaultRoomId: state.defaultRoomId,
        homeRoomId: state.homeRoomId,
        lowPowerMode: state.lowPowerMode,
      }),
    }
  )
);
