// Mood types
export type PresetMood = "good" | "neutral" | "not_great" | "reach_out";

export interface CustomMood {
  id: string;
  user_id: string;
  emoji: string;
  text: string;
  color: string;
  created_at: string;
  last_used_at: string;
}

export interface MoodSelfie {
  id: string;
  user_id: string;
  image_url: string;
  expires_at: string;
  created_at: string;
}

// User types
export interface User {
  id: string;
  phone?: string; // Optional (legacy field for existing data)
  email?: string; // Required for OAuth users
  username: string; // Unique handle for discovery (lowercase, alphanumeric + underscores)
  display_name: string;
  avatar_url?: string;
  mood: PresetMood;
  custom_mood_id?: string;
  custom_mood?: CustomMood; // Joined custom mood data
  is_online: boolean;
  last_seen_at: string;
  ghost_mode_until?: string;
  take_break_until?: string;
  fcm_token?: string;
  auth_provider?: "google" | "apple" | "email"; // OAuth provider
  default_room_id?: string;
  home_room_id?: string; // Permanently pinned "My Nuuky" room from first login
  profile_completed?: boolean; // Whether user has completed onboarding
  mood_selfie_id?: string; // Reference to active mood selfie
  mood_selfie?: MoodSelfie; // Joined mood selfie data
  created_at: string;
}

// User search result (for username search)
export interface UserSearchResult {
  id: string;
  username: string;
  display_name: string;
  avatar_url?: string;
  is_online: boolean;
  last_seen_at?: string;
  mood: PresetMood;
}

// Friendship types
export interface Friendship {
  id: string;
  user_id: string;
  friend_id: string;
  status: "pending" | "accepted" | "declined";
  visibility: "full" | "limited" | "minimal" | "hidden";
  created_at: string;
  last_interaction_at: string;
  friend?: User;
}

// Room types
export interface Room {
  id: string;
  creator_id: string;
  name?: string;
  is_active: boolean;
  is_private: boolean;
  audio_active: boolean;
  created_at: string;
  closed_at?: string;
  participants?: RoomParticipant[];
  creator?: {
    id: string;
    display_name: string;
    avatar_url?: string;
  };
}

export interface RoomParticipant {
  id: string;
  room_id: string;
  user_id: string;
  is_muted: boolean;
  joined_at: string;
  user?: User;
}

export interface RoomInvite {
  id: string;
  room_id: string;
  sender_id: string;
  receiver_id: string;
  room?: Room;
  sender?: User;
  status: "pending" | "accepted" | "declined";
  created_at: string;
  expires_at: string;
  responded_at?: string;
}

// Shareable room invite link (token-based, no specific receiver)
export interface RoomInviteLink {
  id: string;
  token: string;
  room_id: string;
  room?: Room;
  created_by: string;
  creator?: User;
  max_uses: number | null;
  use_count: number;
  expires_at: string | null;
  created_at: string;
}

// Flare types
export interface Flare {
  id: string;
  user_id: string;
  expires_at: string;
  responded_by?: string;
  created_at: string;
  user?: User;
}

// Nudge types
export interface Nudge {
  id: string;
  sender_id: string;
  receiver_id: string;
  created_at: string;
}

// Photo Nudge types (ephemeral photos with 24h expiration)
export interface PhotoNudge {
  id: string;
  sender_id: string;
  receiver_id: string;
  image_url: string;
  caption?: string;
  expires_at: string;
  viewed_at?: string;
  reaction?: 'heart';
  created_at: string;
  sender?: User;
}

// Anchor types
export interface Anchor {
  id: string;
  user_id: string;
  anchor_id: string;
  created_at: string;
}

// Report types
export interface Report {
  id: string;
  reporter_id: string;
  reported_id: string;
  report_type: string;
  details?: string;
  status: "pending" | "reviewed" | "resolved";
  created_at: string;
}

// Auth types
export interface AuthResponse {
  user: User;
  token: string;
}

// Contact types for phone contact syncing
export interface PhoneContact {
  id: string;
  name: string;
  phoneNumbers: string[];
}

export interface ContactMatch {
  onNuuky: PhoneContact[];
  notOnNuuky: PhoneContact[];
}

// Matched contact with user data
export interface MatchedContact extends PhoneContact {
  userId?: string;
  displayName?: string;
  avatarUrl?: string;
}

// Streak types
export type StreakState = 'active' | 'fading' | 'broken';

export interface Streak {
  id: string;
  user1_id: string;
  user2_id: string;
  consecutive_days: number;
  user1_last_interaction: string | null;
  user2_last_interaction: string | null;
  last_streak_at: string | null;
  created_at: string;
  /** Derived client-side */
  friend_id: string;
  state: StreakState;
}

// Audio types
export type AudioConnectionStatus = "disconnected" | "connecting" | "connected" | "reconnecting" | "error";

export interface ParticipantAudioState {
  participantId: string;
  isSpeaking: boolean;
  audioLevel: number;
  isMuted: boolean;
  hasAudioTrack: boolean;
}

export interface LiveKitTokenResponse {
  token: string;
  roomName: string;
  serverUrl: string;
}

// Notification types
export type NotificationType = "nudge" | "flare" | "friend_request" | "friend_accepted" | "room_invite" | "call_me" | "photo_nudge" | "photo_like" | "streak_fading";

export interface NotificationData {
  sender_id?: string;
  sender_name?: string;
  sender_avatar_url?: string;
  friend_id?: string;
  friend_name?: string;
  friend_avatar_url?: string;
  friendship_id?: string;
  room_id?: string;
  room_name?: string;
  invite_id?: string;
  photo_nudge_id?: string;
}

export interface AppNotification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  data: NotificationData;
  is_read: boolean;
  created_at: string;
  source_id?: string;
  source_type?: string;
}

// User preferences types
export interface UserPreferences {
  id: string;
  user_id: string;
  nudges_enabled: boolean;
  flares_enabled: boolean;
  room_invites_enabled: boolean;
  created_at: string;
  updated_at: string;
}

// Sound reaction types
export type SoundReactionType = 'laugh' | 'wow' | 'applause' | 'aww' | 'party';

export interface SoundReactionPayload {
  type: 'sound_reaction';
  soundId: SoundReactionType;
  senderId: string;
  senderName: string;
  senderAvatarUrl?: string;
  timestamp: number;
}
