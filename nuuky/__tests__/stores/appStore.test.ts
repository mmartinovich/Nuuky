import { renderHook, act } from '@testing-library/react-native';
import { useAppStore } from '../../stores/appStore';
import { resetStore, setAuthenticatedUser } from '../__utils__/mockStore';
import { mockUser, mockFriendship, mockRoom, mockRoomInvite, mockCustomMood, mockNotification, mockRoomParticipant } from '../__utils__/fixtures';

describe('appStore', () => {
  beforeEach(() => {
    resetStore();
  });

  // === Auth State ===
  test('setCurrentUser updates user and auth state', () => {
    const user = mockUser();
    act(() => { useAppStore.getState().setCurrentUser(user); });

    const state = useAppStore.getState();
    expect(state.currentUser).toEqual(user);
    expect(state.isAuthenticated).toBe(true);
  });

  test('setCurrentUser with null clears auth', () => {
    setAuthenticatedUser();
    act(() => { useAppStore.getState().setCurrentUser(null); });

    expect(useAppStore.getState().isAuthenticated).toBe(false);
  });

  // === Friends State ===
  test('setFriends replaces friends list', () => {
    const friends = [mockFriendship(), mockFriendship({ id: '2' })];
    act(() => { useAppStore.getState().setFriends(friends); });
    expect(useAppStore.getState().friends).toHaveLength(2);
  });

  test('addFriend appends to list', () => {
    act(() => { useAppStore.getState().addFriend(mockFriendship()); });
    expect(useAppStore.getState().friends).toHaveLength(1);
  });

  test('removeFriend removes by id', () => {
    const friend = mockFriendship();
    act(() => {
      useAppStore.getState().addFriend(friend);
      useAppStore.getState().removeFriend(friend.id);
    });
    expect(useAppStore.getState().friends).toHaveLength(0);
  });

  // === Rooms State ===
  test('setActiveRooms and setMyRooms', () => {
    const rooms = [mockRoom()];
    act(() => {
      useAppStore.getState().setActiveRooms(rooms);
      useAppStore.getState().setMyRooms(rooms);
    });
    expect(useAppStore.getState().activeRooms).toEqual(rooms);
    expect(useAppStore.getState().myRooms).toEqual(rooms);
  });

  test('addMyRoom and removeMyRoom', () => {
    const room = mockRoom();
    act(() => { useAppStore.getState().addMyRoom(room); });
    expect(useAppStore.getState().myRooms).toHaveLength(1);

    act(() => { useAppStore.getState().removeMyRoom(room.id); });
    expect(useAppStore.getState().myRooms).toHaveLength(0);
  });

  test('updateMyRoom updates specific room', () => {
    const room = mockRoom();
    act(() => { useAppStore.getState().addMyRoom(room); });

    act(() => { useAppStore.getState().updateMyRoom(room.id, { name: 'Updated' }); });
    expect(useAppStore.getState().myRooms[0].name).toBe('Updated');
  });

  test('setCurrentRoom sets room and isInRoom', () => {
    const room = mockRoom();
    act(() => { useAppStore.getState().setCurrentRoom(room); });

    expect(useAppStore.getState().currentRoom).toEqual(room);
    expect(useAppStore.getState().isInRoom).toBe(true);
  });

  test('setCurrentRoom null clears isInRoom', () => {
    act(() => {
      useAppStore.getState().setCurrentRoom(mockRoom());
      useAppStore.getState().setCurrentRoom(null);
    });
    expect(useAppStore.getState().isInRoom).toBe(false);
  });

  test('setRoomParticipants', () => {
    const participants = [mockRoomParticipant()];
    act(() => { useAppStore.getState().setRoomParticipants(participants); });
    expect(useAppStore.getState().roomParticipants).toEqual(participants);
  });

  // === Room Invites ===
  test('setRoomInvites, addRoomInvite, removeRoomInvite', () => {
    const invite = mockRoomInvite();
    act(() => { useAppStore.getState().addRoomInvite(invite); });
    expect(useAppStore.getState().roomInvites).toHaveLength(1);

    act(() => { useAppStore.getState().removeRoomInvite(invite.id); });
    expect(useAppStore.getState().roomInvites).toHaveLength(0);
  });

  // === Mood State ===
  test('updateUserMood clears custom mood', () => {
    setAuthenticatedUser({ custom_mood_id: 'cm-1' });
    act(() => { useAppStore.getState().updateUserMood('good'); });

    const user = useAppStore.getState().currentUser;
    expect(user?.mood).toBe('good');
    expect(user?.custom_mood_id).toBeUndefined();
    expect(user?.custom_mood).toBeUndefined();
  });

  test('updateUserMood does nothing when no user', () => {
    act(() => { useAppStore.getState().updateUserMood('good'); });
    expect(useAppStore.getState().currentUser).toBeNull();
  });

  // === Custom Moods ===
  test('setCustomMoods, addCustomMood, updateCustomMood, deleteCustomMood', () => {
    const mood = mockCustomMood();
    act(() => { useAppStore.getState().addCustomMood(mood); });
    expect(useAppStore.getState().customMoods).toHaveLength(1);

    act(() => { useAppStore.getState().updateCustomMood(mood.id, { text: 'Updated' }); });
    expect(useAppStore.getState().customMoods[0].text).toBe('Updated');

    act(() => { useAppStore.getState().deleteCustomMood(mood.id); });
    expect(useAppStore.getState().customMoods).toHaveLength(0);
  });

  test('deleteCustomMood clears activeCustomMood if matching', () => {
    const mood = mockCustomMood();
    act(() => {
      useAppStore.getState().addCustomMood(mood);
      useAppStore.getState().setActiveCustomMood(mood);
    });
    expect(useAppStore.getState().activeCustomMood).toEqual(mood);

    act(() => { useAppStore.getState().deleteCustomMood(mood.id); });
    expect(useAppStore.getState().activeCustomMood).toBeNull();
  });

  test('setActiveCustomMood updates user custom_mood_id', () => {
    setAuthenticatedUser();
    const mood = mockCustomMood();
    act(() => { useAppStore.getState().setActiveCustomMood(mood); });

    expect(useAppStore.getState().activeCustomMood).toEqual(mood);
    expect(useAppStore.getState().currentUser?.custom_mood_id).toBe(mood.id);
  });

  // === Notifications ===
  test('setNotifications calculates unread count', () => {
    const n1 = mockNotification({ id: 'n1', is_read: false });
    const n2 = mockNotification({ id: 'n2', is_read: true });
    act(() => { useAppStore.getState().setNotifications([n1, n2]); });

    expect(useAppStore.getState().unreadNotificationCount).toBe(1);
  });

  test('addNotification prepends and caps at 200', () => {
    const notifications = Array.from({ length: 200 }, (_, i) =>
      mockNotification({ id: `n${i}`, is_read: true })
    );
    act(() => { useAppStore.getState().setNotifications(notifications); });

    const newNotif = mockNotification({ id: 'new', is_read: false });
    act(() => { useAppStore.getState().addNotification(newNotif); });

    expect(useAppStore.getState().notifications).toHaveLength(200);
    expect(useAppStore.getState().notifications[0].id).toBe('new');
    expect(useAppStore.getState().unreadNotificationCount).toBe(1);
  });

  test('markNotificationRead decrements count', () => {
    const n = mockNotification({ is_read: false });
    act(() => { useAppStore.getState().setNotifications([n]); });
    expect(useAppStore.getState().unreadNotificationCount).toBe(1);

    act(() => { useAppStore.getState().markNotificationRead(n.id); });
    expect(useAppStore.getState().unreadNotificationCount).toBe(0);
    expect(useAppStore.getState().notifications[0].is_read).toBe(true);
  });

  test('markNotificationRead is idempotent', () => {
    const n = mockNotification({ is_read: true });
    act(() => { useAppStore.getState().setNotifications([n]); });

    act(() => { useAppStore.getState().markNotificationRead(n.id); });
    expect(useAppStore.getState().unreadNotificationCount).toBe(0);
  });

  test('markAllNotificationsRead', () => {
    const n1 = mockNotification({ id: 'n1', is_read: false });
    const n2 = mockNotification({ id: 'n2', is_read: false });
    act(() => { useAppStore.getState().setNotifications([n1, n2]); });

    act(() => { useAppStore.getState().markAllNotificationsRead(); });
    expect(useAppStore.getState().unreadNotificationCount).toBe(0);
  });

  test('removeNotification decrements unread if unread', () => {
    const n = mockNotification({ is_read: false });
    act(() => { useAppStore.getState().setNotifications([n]); });

    act(() => { useAppStore.getState().removeNotification(n.id); });
    expect(useAppStore.getState().notifications).toHaveLength(0);
    expect(useAppStore.getState().unreadNotificationCount).toBe(0);
  });

  // === Theme ===
  test('setThemeMode', () => {
    act(() => { useAppStore.getState().setThemeMode('light'); });
    expect(useAppStore.getState().themeMode).toBe('light');
  });

  // === Network ===
  test('setIsOnline', () => {
    act(() => { useAppStore.getState().setIsOnline(false); });
    expect(useAppStore.getState().isOnline).toBe(false);
  });

  // === Low Power Mode ===
  test('setLowPowerMode', () => {
    act(() => { useAppStore.getState().setLowPowerMode(true); });
    expect(useAppStore.getState().lowPowerMode).toBe(true);
  });

  // === Audio State ===
  test('setAudioConnectionStatus and setAudioError', () => {
    act(() => {
      useAppStore.getState().setAudioConnectionStatus('connected');
      useAppStore.getState().setAudioError('mic failed');
    });
    expect(useAppStore.getState().audioConnectionStatus).toBe('connected');
    expect(useAppStore.getState().audioError).toBe('mic failed');
  });

  test('speaking participants: add, deduplicate, remove, clear', () => {
    act(() => { useAppStore.getState().addSpeakingParticipant('p1'); });
    expect(useAppStore.getState().speakingParticipants).toContain('p1');

    act(() => { useAppStore.getState().addSpeakingParticipant('p1'); });
    expect(useAppStore.getState().speakingParticipants).toHaveLength(1);

    act(() => { useAppStore.getState().removeSpeakingParticipant('p1'); });
    expect(useAppStore.getState().speakingParticipants).toHaveLength(0);

    act(() => {
      useAppStore.getState().addSpeakingParticipant('p1');
      useAppStore.getState().addSpeakingParticipant('p2');
      useAppStore.getState().clearSpeakingParticipants();
    });
    expect(useAppStore.getState().speakingParticipants).toHaveLength(0);
  });

  // === Default/Home Room ===
  test('setDefaultRoomId and setHomeRoomId', () => {
    act(() => {
      useAppStore.getState().setDefaultRoomId('r1');
      useAppStore.getState().setHomeRoomId('r2');
    });
    expect(useAppStore.getState().defaultRoomId).toBe('r1');
    expect(useAppStore.getState().homeRoomId).toBe('r2');
  });

  // === Session Timeout ===
  test('setLastActivity, setSessionTimeoutMinutes, showSessionWarning', () => {
    const before = Date.now();
    act(() => { useAppStore.getState().setLastActivity(); });
    expect(useAppStore.getState().lastActivityTimestamp).toBeGreaterThanOrEqual(before);
    expect(useAppStore.getState().sessionWarningShown).toBe(false);

    act(() => { useAppStore.getState().setSessionTimeoutMinutes(60); });
    expect(useAppStore.getState().sessionTimeoutMinutes).toBe(60);

    act(() => { useAppStore.getState().showSessionWarning(true); });
    expect(useAppStore.getState().sessionWarningShown).toBe(true);
  });

  // === Logout ===
  test('logout clears all user data but preserves theme', () => {
    act(() => {
      useAppStore.getState().setCurrentUser(mockUser());
      useAppStore.getState().setFriends([mockFriendship()]);
      useAppStore.getState().setMyRooms([mockRoom()]);
      useAppStore.getState().setNotifications([mockNotification()]);
      useAppStore.getState().setThemeMode('light');
      useAppStore.getState().logout();
    });

    const state = useAppStore.getState();
    expect(state.currentUser).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(state.friends).toEqual([]);
    expect(state.activeRooms).toEqual([]);
    expect(state.myRooms).toEqual([]);
    expect(state.notifications).toEqual([]);
    expect(state.unreadNotificationCount).toBe(0);
    expect(state.customMoods).toEqual([]);
    expect(state.audioConnectionStatus).toBe('disconnected');
    expect(state.themeMode).toBe('light'); // preserved
  });
});
