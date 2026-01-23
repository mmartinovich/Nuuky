import { registerGlobals } from '@livekit/react-native-webrtc';
import { AudioSession } from '@livekit/react-native';
import {
  Room,
  RoomEvent,
  RemoteParticipant,
  Track,
  ConnectionState,
  LocalParticipant,
  Participant,
} from 'livekit-client';
import { supabase } from './supabase';
import Constants from 'expo-constants';
import { LiveKitTokenResponse } from '../types';

// Initialize LiveKit WebRTC globals - call this once at app startup
let globalsRegistered = false;
export const initializeLiveKit = () => {
  if (!globalsRegistered) {
    // Register WebRTC globals first
    registerGlobals();

    // Polyfill navigator.userAgent for browser detection
    if (typeof navigator !== 'undefined' && !navigator.userAgent) {
      // @ts-ignore - Adding polyfill for React Native
      navigator.userAgent = 'ReactNative';
    }

    globalsRegistered = true;
    console.log('[LiveKit] WebRTC globals registered');
  }
};

// Singleton room instance
let currentRoom: Room | null = null;
let silenceTimer: ReturnType<typeof setTimeout> | null = null;

// Configurable silence timeout (default: 30 seconds)
export let SILENCE_TIMEOUT_MS = 30000;

// Function to update timeout at runtime
export const setSilenceTimeout = (milliseconds: number) => {
  SILENCE_TIMEOUT_MS = milliseconds;
  console.log('[LiveKit] Silence timeout updated to', milliseconds / 1000, 'seconds');
};

// Presets for easy configuration
export const SilenceTimeoutPresets = {
  AGGRESSIVE: 30000,   // 30s - current, lowest cost
  BALANCED: 120000,    // 2 min - good balance
  RELAXED: 300000,     // 5 min - near-instant reconnect
  NEVER: Infinity,     // Never disconnect - Discord-style
} as const;

// Token caching (1-hour TTL)
let cachedToken: LiveKitTokenResponse | null = null;
let tokenExpiryTime: number = 0;
let cachedRoomId: string | null = null;
const TOKEN_CACHE_TTL = 3600000; // 1 hour in milliseconds

// Helper to invalidate token cache
export const invalidateTokenCache = () => {
  cachedToken = null;
  tokenExpiryTime = 0;
  cachedRoomId = null;
  console.log('[LiveKit] Token cache invalidated');
};

// Event callbacks
type AudioEventCallbacks = {
  onConnectionStatusChange: (status: string) => void;
  onParticipantSpeaking: (participantId: string, isSpeaking: boolean) => void;
  onError: (error: string) => void;
  onAllMuted: () => void;
};

let eventCallbacks: AudioEventCallbacks | null = null;

export const setAudioEventCallbacks = (callbacks: AudioEventCallbacks) => {
  eventCallbacks = callbacks;
};

// Get LiveKit URL from config
const getLiveKitUrl = (): string => {
  return Constants.expoConfig?.extra?.livekitUrl || '';
};

// Request token from Edge Function
export const requestLiveKitToken = async (
  roomId: string
): Promise<LiveKitTokenResponse | null> => {
  try {
    const now = Date.now();

    // Return cached token if valid and for same room
    if (cachedToken &&
        cachedRoomId === roomId &&
        now < tokenExpiryTime) {
      console.log('[LiveKit] Using cached token (expires in',
        Math.round((tokenExpiryTime - now) / 1000), 'seconds)');
      return cachedToken;
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) {
      console.error('[LiveKit] No active session found');
      throw new Error('No active session');
    }

    console.log('[LiveKit] Requesting new token for room:', roomId);
    console.log('[LiveKit] Session user:', session.user?.id);

    // Explicitly pass the authorization header
    const { data, error } = await supabase.functions.invoke('livekit-token', {
      body: { roomId },
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    if (error) {
      console.error('[LiveKit] Token request error:', error);
      throw error;
    }

    // Cache the token
    cachedToken = data;
    cachedRoomId = roomId;
    tokenExpiryTime = now + TOKEN_CACHE_TTL;

    console.log('[LiveKit] Token received and cached for 1 hour');
    return data;
  } catch (error) {
    console.error('[LiveKit] Failed to get token:', error);
    eventCallbacks?.onError('Failed to get audio token');
    return null;
  }
};

// Connect to LiveKit room
export const connectToAudioRoom = async (roomId: string): Promise<boolean> => {
  try {
    eventCallbacks?.onConnectionStatusChange('connecting');

    // OPTIMIZATION: Run audio session and token request in parallel
    console.log('[LiveKit] Starting audio session and requesting token in parallel');
    const [, tokenData] = await Promise.all([
      AudioSession.startAudioSession(),
      requestLiveKitToken(roomId),
    ]);

    console.log('[LiveKit] Audio session started and token received');

    if (!tokenData) {
      eventCallbacks?.onConnectionStatusChange('error');
      return false;
    }

    // OPTIMIZATION: Reuse room instance if exists, create new one if not
    if (!currentRoom) {
      console.log('[LiveKit] Creating new Room instance');
      currentRoom = new Room({
        adaptiveStream: true,
        dynacast: true,
        audioCaptureDefaults: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // Set up event listeners only once
      setupRoomEventListeners(currentRoom);
    } else {
      console.log('[LiveKit] Reusing existing Room instance');
    }

    // Connect
    console.log('[LiveKit] Connecting to room:', tokenData.roomName);
    await currentRoom.connect(tokenData.serverUrl, tokenData.token);

    console.log('[LiveKit] Connected successfully');
    eventCallbacks?.onConnectionStatusChange('connected');

    // Enable microphone (unmuted state)
    await currentRoom.localParticipant.setMicrophoneEnabled(true);
    console.log('[LiveKit] Microphone enabled');
    console.log('[LiveKit] Local participant identity:', currentRoom.localParticipant.identity);
    console.log('[LiveKit] Local participant audio tracks:',
      Array.from(currentRoom.localParticipant.audioTrackPublications.values()).map(pub => ({
        trackSid: pub.trackSid,
        isMuted: pub.isMuted,
        trackName: pub.trackName,
        kind: pub.kind
      }))
    );

    // Start silence timer
    resetSilenceTimer();

    return true;
  } catch (error) {
    console.error('[LiveKit] Failed to connect:', error);
    eventCallbacks?.onConnectionStatusChange('error');
    eventCallbacks?.onError('Failed to connect to audio');
    return false;
  }
};

// Disconnect from LiveKit room
export const disconnectFromAudioRoom = async (): Promise<void> => {
  console.log('[LiveKit] Disconnecting from audio room');
  clearSilenceTimer();

  if (currentRoom) {
    await currentRoom.disconnect();
    // OPTIMIZATION: Don't null the room - reuse it on reconnect
    // currentRoom = null;
  }

  await AudioSession.stopAudioSession();
  eventCallbacks?.onConnectionStatusChange('disconnected');
  console.log('[LiveKit] Disconnected (room instance preserved for reuse)');
};

// Toggle local microphone
export const setLocalMicrophoneEnabled = async (
  enabled: boolean
): Promise<void> => {
  if (!currentRoom?.localParticipant) {
    console.warn('[LiveKit] No local participant to toggle mic');
    return;
  }

  console.log('[LiveKit] Setting microphone enabled:', enabled);
  console.log('[LiveKit] Current mic state BEFORE:', currentRoom.localParticipant.isMicrophoneEnabled);

  await currentRoom.localParticipant.setMicrophoneEnabled(enabled);

  console.log('[LiveKit] Current mic state AFTER:', currentRoom.localParticipant.isMicrophoneEnabled);
  console.log('[LiveKit] Microphone tracks:',
    Array.from(currentRoom.localParticipant.audioTrackPublications.values()).map(pub => ({
      trackSid: pub.trackSid,
      isMuted: pub.isMuted,
      trackName: pub.trackName
    }))
  );

  if (enabled) {
    // Reset silence timer when unmuting
    resetSilenceTimer();
  } else {
    // Check if everyone is now muted
    checkAllMuted();
  }
};

// Check if anyone is unmuted
export const isAnyoneUnmuted = (): boolean => {
  if (!currentRoom) return false;

  // Check local participant
  if (currentRoom.localParticipant.isMicrophoneEnabled) {
    return true;
  }

  // Check remote participants
  for (const participant of currentRoom.remoteParticipants.values()) {
    if (participant.isMicrophoneEnabled) {
      return true;
    }
  }

  return false;
};

// Set up room event listeners
const setupRoomEventListeners = (room: Room) => {
  room.on(RoomEvent.ConnectionStateChanged, (state: ConnectionState) => {
    console.log('[LiveKit] Connection state changed:', state);
    const statusMap: Record<ConnectionState, string> = {
      [ConnectionState.Disconnected]: 'disconnected',
      [ConnectionState.Connecting]: 'connecting',
      [ConnectionState.Connected]: 'connected',
      [ConnectionState.Reconnecting]: 'reconnecting',
      [ConnectionState.SignalReconnecting]: 'reconnecting',
    };
    eventCallbacks?.onConnectionStatusChange(
      statusMap[state] || 'disconnected'
    );
  });

  room.on(
    RoomEvent.ActiveSpeakersChanged,
    (speakers: Participant[]) => {
      console.log('[LiveKit] 🎤 ActiveSpeakersChanged event fired!');
      console.log('[LiveKit] Number of active speakers:', speakers.length);
      console.log('[LiveKit] Speaker identities:', speakers.map(s => s.identity));
      console.log('[LiveKit] Local participant identity:', room.localParticipant?.identity);

      // Notify about all current speakers
      const speakerIds = new Set(speakers.map((s) => s.identity));

      // Update speaking state for all remote participants
      room.remoteParticipants.forEach((participant) => {
        const isSpeaking = speakerIds.has(participant.identity);
        console.log(`[LiveKit] Remote participant ${participant.identity} speaking:`, isSpeaking);
        eventCallbacks?.onParticipantSpeaking(
          participant.identity,
          isSpeaking
        );
      });

      // Check local participant speaking
      if (room.localParticipant) {
        const localSpeaking = speakerIds.has(room.localParticipant.identity);
        console.log(`[LiveKit] 🎙️ Local participant ${room.localParticipant.identity} speaking:`, localSpeaking);
        eventCallbacks?.onParticipantSpeaking(
          room.localParticipant.identity,
          localSpeaking
        );
      }

      // Reset silence timer if anyone is speaking
      if (speakers.length > 0) {
        resetSilenceTimer();
      }
    }
  );

  room.on(RoomEvent.ParticipantConnected, (participant: RemoteParticipant) => {
    console.log('[LiveKit] Participant connected:', participant.identity);
  });

  room.on(
    RoomEvent.ParticipantDisconnected,
    (participant: RemoteParticipant) => {
      console.log('[LiveKit] Participant disconnected:', participant.identity);
      eventCallbacks?.onParticipantSpeaking(participant.identity, false);
    }
  );

  room.on(RoomEvent.TrackMuted, (publication, participant) => {
    if (publication.kind === Track.Kind.Audio) {
      console.log('[LiveKit] Track muted:', participant.identity);
      checkAllMuted();
    }
  });

  room.on(RoomEvent.TrackUnmuted, (publication, participant) => {
    if (publication.kind === Track.Kind.Audio) {
      console.log('[LiveKit] Track unmuted:', participant.identity);
      resetSilenceTimer();
    }
  });

  room.on(RoomEvent.Disconnected, () => {
    console.log('[LiveKit] Room disconnected');
    eventCallbacks?.onConnectionStatusChange('disconnected');
  });
};

// Silence timer management
const resetSilenceTimer = () => {
  clearSilenceTimer();

  silenceTimer = setTimeout(() => {
    console.log('[LiveKit] Silence timer expired, checking if all muted');
    if (!isAnyoneUnmuted()) {
      console.log('[LiveKit] All muted for 30s, triggering disconnect');
      eventCallbacks?.onAllMuted();
    }
  }, SILENCE_TIMEOUT_MS);
};

const clearSilenceTimer = () => {
  if (silenceTimer) {
    clearTimeout(silenceTimer);
    silenceTimer = null;
  }
};

const checkAllMuted = () => {
  if (!isAnyoneUnmuted()) {
    console.log('[LiveKit] All participants muted, starting silence timer');
    resetSilenceTimer();
  }
};

// Get current room (for debugging/status)
export const getCurrentRoom = (): Room | null => currentRoom;

// Check if connected
export const isConnected = (): boolean => {
  return currentRoom?.state === ConnectionState.Connected;
};

// Get current microphone state
export const isMicrophoneEnabled = (): boolean => {
  return currentRoom?.localParticipant?.isMicrophoneEnabled || false;
};
