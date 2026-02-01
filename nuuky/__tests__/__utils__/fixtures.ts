import { User, Friendship, Room, RoomParticipant, RoomInvite, CustomMood, AppNotification, Flare, Nudge, Streak } from '../../types';

export const TEST_USER_ID = 'user-123';
export const TEST_FRIEND_ID = 'user-456';
export const TEST_ROOM_ID = 'room-789';

export const mockUser = (overrides: Partial<User> = {}): User => ({
  id: TEST_USER_ID,
  email: 'test@example.com',
  username: 'testuser',
  display_name: 'Test User',
  mood: 'neutral',
  is_online: true,
  last_seen_at: new Date().toISOString(),
  created_at: new Date().toISOString(),
  ...overrides,
});

export const mockFriendUser = (overrides: Partial<User> = {}): User => ({
  id: TEST_FRIEND_ID,
  email: 'friend@example.com',
  username: 'frienduser',
  display_name: 'Friend User',
  mood: 'good',
  is_online: true,
  last_seen_at: new Date().toISOString(),
  created_at: new Date().toISOString(),
  ...overrides,
});

export const mockFriendship = (overrides: Partial<Friendship> = {}): Friendship => ({
  id: 'friendship-1',
  user_id: TEST_USER_ID,
  friend_id: TEST_FRIEND_ID,
  status: 'accepted',
  visibility: 'full',
  created_at: new Date().toISOString(),
  last_interaction_at: new Date().toISOString(),
  friend: mockFriendUser(),
  ...overrides,
});

export const mockRoom = (overrides: Partial<Room> = {}): Room => ({
  id: TEST_ROOM_ID,
  creator_id: TEST_USER_ID,
  name: 'Test Room',
  is_active: true,
  is_private: true,
  audio_active: false,
  created_at: new Date().toISOString(),
  ...overrides,
});

export const mockRoomParticipant = (overrides: Partial<RoomParticipant> = {}): RoomParticipant => ({
  id: 'participant-1',
  room_id: TEST_ROOM_ID,
  user_id: TEST_USER_ID,
  is_muted: false,
  joined_at: new Date().toISOString(),
  ...overrides,
});

export const mockRoomInvite = (overrides: Partial<RoomInvite> = {}): RoomInvite => ({
  id: 'invite-1',
  room_id: TEST_ROOM_ID,
  sender_id: TEST_USER_ID,
  receiver_id: TEST_FRIEND_ID,
  status: 'pending',
  created_at: new Date().toISOString(),
  expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  ...overrides,
});

export const mockCustomMood = (overrides: Partial<CustomMood> = {}): CustomMood => ({
  id: 'custom-mood-1',
  user_id: TEST_USER_ID,
  emoji: '🔥',
  text: 'On fire',
  color: '#FF6B35',
  created_at: new Date().toISOString(),
  last_used_at: new Date().toISOString(),
  ...overrides,
});

export const mockNotification = (overrides: Partial<AppNotification> = {}): AppNotification => ({
  id: 'notif-1',
  user_id: TEST_USER_ID,
  type: 'nudge',
  title: 'New Nudge',
  body: 'Friend User nudged you',
  data: { sender_id: TEST_FRIEND_ID, sender_name: 'Friend User' },
  is_read: false,
  created_at: new Date().toISOString(),
  ...overrides,
});

export const mockFlare = (overrides: Partial<Flare> = {}): Flare => ({
  id: 'flare-1',
  user_id: TEST_FRIEND_ID,
  expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
  created_at: new Date().toISOString(),
  ...overrides,
});

export const mockStreak = (overrides: Partial<Streak> = {}): Streak => ({
  id: 'streak-1',
  user1_id: TEST_USER_ID,
  user2_id: TEST_FRIEND_ID,
  consecutive_days: 5,
  user1_last_interaction: new Date().toISOString(),
  user2_last_interaction: new Date().toISOString(),
  last_streak_at: new Date().toISOString(),
  created_at: new Date().toISOString(),
  friend_id: TEST_FRIEND_ID,
  state: 'active',
  ...overrides,
});
