// Mood types
export type PresetMood = 'good' | 'neutral' | 'not_great' | 'reach_out';

export interface CustomMood {
  id: string;
  user_id: string;
  emoji: string;
  text: string;
  color: string;
  created_at: string;
  last_used_at: string;
}

// User types
export interface User {
  id: string;
  phone?: string;           // Optional (legacy field for existing data)
  email?: string;            // Required for OAuth users
  display_name: string;
  avatar_url?: string;
  mood: PresetMood;
  custom_mood_id?: string;
  custom_mood?: CustomMood;  // Joined custom mood data
  is_online: boolean;
  last_seen_at: string;
  ghost_mode_until?: string;
  take_break_until?: string;
  fcm_token?: string;
  auth_provider?: 'google' | 'apple' | 'email';  // OAuth provider
  default_room_id?: string;
  profile_completed?: boolean;  // Whether user has completed onboarding
  created_at: string;
}

// Friendship types
export interface Friendship {
  id: string;
  user_id: string;
  friend_id: string;
  status: 'pending' | 'accepted' | 'declined';
  visibility: 'full' | 'limited' | 'minimal' | 'hidden';
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
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
  expires_at: string;
  responded_at?: string;
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

// Block types
export interface Block {
  id: string;
  blocker_id: string;
  blocked_id: string;
  block_type: 'mute' | 'soft' | 'hard';
  created_at: string;
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
  status: 'pending' | 'reviewed' | 'resolved';
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

// Audio types
export type AudioConnectionStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'error';

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
