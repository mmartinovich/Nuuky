import { logger } from './logger';
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
  }
};

// Singleton room instance
let currentRoom: Room | null = null;
let silenceTimer: ReturnType<typeof setTimeout> | null = null;

// Generation counter — incremented on every connect/disconnect call.
// Stale operations check this and bail if a newer operation has started.
let connectionGeneration = 0;

// Configurable silence timeout (default: 30 seconds)
export let SILENCE_TIMEOUT_MS = 30000;

// Function to update timeout at runtime
export const setSilenceTimeout = (milliseconds: number) => {
  SILENCE_TIMEOUT_MS = milliseconds;
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
      return cachedToken;
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) {
      logger.error('[LiveKit] No active session found');
      throw new Error('No active session');
    }

    // Explicitly pass the authorization header
    const { data, error } = await supabase.functions.invoke('livekit-token', {
      body: { roomId },
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    if (error) {
      logger.error('[LiveKit] Token request error:', error);
      throw error;
    }

    // Cache the token
    cachedToken = data;
    cachedRoomId = roomId;
    tokenExpiryTime = now + TOKEN_CACHE_TTL;

    return data;
  } catch (error) {
    logger.error('[LiveKit] Failed to get token:', error);
    eventCallbacks?.onError('Failed to get audio token');
    return null;
  }
};

// Connect to LiveKit room
export const connectToAudioRoom = async (roomId: string, enableMic: boolean = true): Promise<boolean> => {
  const myGeneration = ++connectionGeneration;

  try {
    // Lazily initialize WebRTC globals on first connection
    initializeLiveKit();

    // IMPORTANT: properly await old room disconnect to prevent orphaned PeerConnections.
    // Fire-and-forget disconnect leaks WebRTC resources that accumulate per room switch.
    if (currentRoom) {
      try { await currentRoom.disconnect(); } catch {}
      currentRoom = null;
    }

    // Bail if stale after awaiting disconnect
    if (connectionGeneration !== myGeneration) return false;

    eventCallbacks?.onConnectionStatusChange('connecting');

    // Configure audio to use speaker output for louder playback
    AudioSession.configureAudio({
      ios: { defaultOutput: 'speaker' },
      android: {
        audioTypeOptions: {
          focusMode: 'gain',
          audioMode: 'inCommunication',
        }
      },
    });

    // OPTIMIZATION: Run audio session and token request in parallel
    const [, tokenData] = await Promise.all([
      AudioSession.startAudioSession(),
      requestLiveKitToken(roomId),
    ]);

    // Bail if a newer connect/disconnect started while we were awaiting
    if (connectionGeneration !== myGeneration) return false;

    if (!tokenData) {
      eventCallbacks?.onConnectionStatusChange('error');
      return false;
    }

    currentRoom = new Room({
      adaptiveStream: true,
      dynacast: true,
      audioCaptureDefaults: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
      autoSubscribe: true,
    });
    setupRoomEventListeners(currentRoom);

    await currentRoom.connect(tokenData.serverUrl, tokenData.token);

    // Bail if stale — a newer switch happened during WebRTC handshake.
    // The newer connectToAudioRoom call will see this room as currentRoom
    // and properly await its disconnect — so just bail, don't disconnect here.
    if (connectionGeneration !== myGeneration) {
      return false;
    }

    eventCallbacks?.onConnectionStatusChange('connected');
    await currentRoom.localParticipant.setMicrophoneEnabled(enableMic);
    resetSilenceTimer();

    return true;
  } catch (error) {
    logger.error('[LiveKit] Failed to connect:', error);
    if (connectionGeneration === myGeneration) {
      eventCallbacks?.onConnectionStatusChange('error');
      eventCallbacks?.onError('Failed to connect to audio');
    }
    return false;
  }
};

// Disconnect from LiveKit room
export const disconnectFromAudioRoom = async (): Promise<void> => {
  ++connectionGeneration; // invalidate any in-flight connect
  clearSilenceTimer();

  if (currentRoom) {
    try { await currentRoom.disconnect(); } catch {}
    currentRoom = null;
  }

  await AudioSession.stopAudioSession();
  eventCallbacks?.onConnectionStatusChange('disconnected');
};

// Toggle local microphone
export const setLocalMicrophoneEnabled = async (
  enabled: boolean
): Promise<void> => {
  if (!currentRoom?.localParticipant) {
    logger.warn('[LiveKit] No local participant to toggle mic');
    return;
  }

  await currentRoom.localParticipant.setMicrophoneEnabled(enabled);

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
      // Notify about all current speakers
      const speakerIds = new Set(speakers.map((s) => s.identity));

      // Update speaking state for all remote participants
      room.remoteParticipants.forEach((participant) => {
        const isSpeaking = speakerIds.has(participant.identity);
        eventCallbacks?.onParticipantSpeaking(
          participant.identity,
          isSpeaking
        );
      });

      // Check local participant speaking
      if (room.localParticipant) {
        const localSpeaking = speakerIds.has(room.localParticipant.identity);
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

  room.on(RoomEvent.ParticipantConnected, (_participant: RemoteParticipant) => {
    // Participant connected
  });

  room.on(
    RoomEvent.ParticipantDisconnected,
    (participant: RemoteParticipant) => {
      eventCallbacks?.onParticipantSpeaking(participant.identity, false);
    }
  );

  // Handle track subscribed - ensures remote audio is properly played
  room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
    if (track.kind === Track.Kind.Audio) {
      logger.log(`[LiveKit] Audio track subscribed from ${participant.identity}`);
      // Audio tracks should play automatically, but we log for debugging
      // If issues persist, we may need to explicitly call track.attach() here
    }
  });

  room.on(RoomEvent.TrackMuted, (publication, _participant) => {
    if (publication.kind === Track.Kind.Audio) {
      checkAllMuted();
    }
  });

  room.on(RoomEvent.TrackUnmuted, (publication, _participant) => {
    if (publication.kind === Track.Kind.Audio) {
      resetSilenceTimer();
    }
  });

  room.on(RoomEvent.Disconnected, () => {
    eventCallbacks?.onConnectionStatusChange('disconnected');
  });
};

// Silence timer management
const resetSilenceTimer = () => {
  clearSilenceTimer();

  silenceTimer = setTimeout(() => {
    if (!isAnyoneUnmuted()) {
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
