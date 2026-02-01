import { useAppStore } from '../../stores/appStore';
import { mockUser } from './fixtures';

const initialState = {
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
  themeMode: 'dark' as const,
  isOnline: true,
  lowPowerMode: false,
  audioConnectionStatus: 'disconnected' as const,
  audioError: null,
  speakingParticipants: [],
  customMoods: [],
  activeCustomMood: null,
  notifications: [],
  unreadNotificationCount: 0,
  sessionTimeoutMinutes: 43200,
  lastActivityTimestamp: Date.now(),
  sessionWarningShown: false,
};

export const resetStore = () => {
  useAppStore.setState(initialState);
};

export const setAuthenticatedUser = (overrides = {}) => {
  const user = mockUser(overrides);
  useAppStore.setState({
    currentUser: user,
    isAuthenticated: true,
  });
  return user;
};
