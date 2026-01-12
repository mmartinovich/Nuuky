import { create } from 'zustand';
import { User, Friendship, Room, RoomParticipant, RoomInvite } from '../types';

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
  updateUserMood: (mood: User['mood']) => void;
  setDefaultRoomId: (roomId: string | null) => void;
  logout: () => void;
}

export const useAppStore = create<AppState>((set) => ({
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

  // Actions
  setCurrentUser: (user) => set({ currentUser: user, isAuthenticated: !!user }),

  setFriends: (friends) => {
    console.log(`[Store] setFriends called with ${friends.length} friends`);
    if (friends.length > 0) {
      console.log('[Store] First friend:', JSON.stringify(friends[0], null, 2));
    }
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

  setDefaultRoomId: (roomId) => set({ defaultRoomId: roomId }),

  logout: () => set({
    currentUser: null,
    isAuthenticated: false,
    friends: [],
    activeRooms: [],
    myRooms: [],
    currentRoom: null,
    isInRoom: false,
    roomParticipants: [],
    roomInvites: [],
    defaultRoomId: null
  })
}));
