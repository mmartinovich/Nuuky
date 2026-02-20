import { logger } from '../lib/logger';
import { useEffect, useCallback, useRef, useState } from 'react';
import { Alert, Platform, PermissionsAndroid, AppState, AppStateStatus } from 'react-native';
import { useAppStore } from '../stores/appStore';
import {
  initializeLiveKit,
  setAudioEventCallbacks,
  connectToAudioRoom,
  disconnectFromAudioRoom,
  setLocalMicrophoneEnabled,
  isConnected,
  isMicrophoneEnabled,
  getCurrentRoom,
  sendRoomData,
} from '../lib/livekit';
import type { RemoteParticipant } from 'livekit-client';
import { AudioConnectionStatus } from '../types';

type DataReceivedCallback = (data: Uint8Array, participant: RemoteParticipant | undefined) => void;

export const useAudio = (
  roomId: string | null,
  onDataReceived?: DataReceivedCallback,
  otherParticipantCount?: number
) => {
  const currentUser = useAppStore((s) => s.currentUser);
  const audioConnectionStatus = useAppStore((s) => s.audioConnectionStatus);
  const setAudioConnectionStatus = useAppStore((s) => s.setAudioConnectionStatus);
  const setAudioError = useAppStore((s) => s.setAudioError);
  const addSpeakingParticipant = useAppStore((s) => s.addSpeakingParticipant);
  const removeSpeakingParticipant = useAppStore((s) => s.removeSpeakingParticipant);
  const clearSpeakingParticipants = useAppStore((s) => s.clearSpeakingParticipants);
  const speakingParticipants = useAppStore((s) => s.speakingParticipants);

  const isInitialized = useRef(false);
  const currentRoomId = useRef<string | null>(null);
  const [micEnabled, setMicEnabled] = useState(false);
  const isManualConnection = useRef(false); // Track if user manually connected (don't auto-disconnect)
  const backgroundDisconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wasMutedByBackground = useRef(false); // Track if we auto-muted on background

  // Initialize LiveKit on first use
  useEffect(() => {
    if (!isInitialized.current) {
      initializeLiveKit();
      isInitialized.current = true;
    }
  }, []);

  // iOS Audio Management - dynamically manages audio session for proper speaker routing
  // This ensures audio always routes to speaker and remote audio is audible
  useEffect(() => {
    if (Platform.OS !== 'ios') return;

    const room = getCurrentRoom();
    if (!room) return;

    // Import AudioSession for iOS configuration
    const { AudioSession } = require('@livekit/react-native');

    // Set up iOS-specific audio configuration for voice chat
    const configureIOSAudio = async () => {
      try {
        await AudioSession.setAppleAudioConfiguration({
          audioCategory: 'playAndRecord',
          audioCategoryOptions: ['defaultToSpeaker', 'allowBluetooth', 'allowBluetoothA2DP', 'duckOthers'],
          audioMode: 'voiceChat',
        });
      } catch (error) {
        logger.error('[useAudio] Failed to configure iOS audio:', error);
      }
    };

    configureIOSAudio();
  }, [audioConnectionStatus]); // Re-run when connection status changes

  // Disconnect from audio — defined before the useEffect that references it
  const handleDisconnect = useCallback(async (): Promise<void> => {
    await disconnectFromAudioRoom();
    currentRoomId.current = null;
    isManualConnection.current = false;
    setMicEnabled(false);
    clearSpeakingParticipants();
  }, [clearSpeakingParticipants]);

  // Store the data callback in a ref so we don't need to recreate callbacks when it changes
  const dataCallbackRef = useRef<DataReceivedCallback | undefined>(onDataReceived);
  useEffect(() => {
    dataCallbackRef.current = onDataReceived;
  }, [onDataReceived]);

  // Set up event callbacks with proper cleanup
  useEffect(() => {
    const callbacks = {
      onConnectionStatusChange: (status: string) => {
        setAudioConnectionStatus(status as AudioConnectionStatus);
      },
      onParticipantSpeaking: (participantId: string, isSpeaking: boolean) => {
        if (isSpeaking) {
          addSpeakingParticipant(participantId);
        } else {
          removeSpeakingParticipant(participantId);
        }
      },
      onError: (error: string) => {
        setAudioError(error);
        Alert.alert('Audio Error', error);
      },
      onDataReceived: (data: Uint8Array, participant: RemoteParticipant | undefined) => {
        dataCallbackRef.current?.(data, participant);
      },
    };

    setAudioEventCallbacks(callbacks);

    return () => {
      setAudioEventCallbacks(null);
    };
  }, [currentUser?.id, setAudioConnectionStatus, setAudioError, addSpeakingParticipant, removeSpeakingParticipant]);

  // Debounce timer for audio connections
  const connectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Disconnect only on actual component unmount — NOT on room switches.
  // Room switches are handled entirely by connectToAudioRoom which properly
  // awaits the old Room's disconnect before creating a new one.
  useEffect(() => {
    return () => {
      if (connectTimerRef.current) {
        clearTimeout(connectTimerRef.current);
        connectTimerRef.current = null;
      }
      if (currentRoomId.current) {
        disconnectFromAudioRoom();
        currentRoomId.current = null;
        clearSpeakingParticipants();
      }
    };
  }, []);

  // Background handling: auto-mute immediately, disconnect after grace period
  const BACKGROUND_DISCONNECT_DELAY = 10000; // 10 seconds grace period

  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'background') {
        // App going to background — auto-mute immediately for privacy
        if (isConnected() && micEnabled) {
          setLocalMicrophoneEnabled(false).catch(() => {});
          setMicEnabled(false);
          wasMutedByBackground.current = true;
          logger.log('[useAudio] Auto-muted on background');
        }

        // Start grace period timer to disconnect
        if (isConnected() && !backgroundDisconnectTimer.current) {
          backgroundDisconnectTimer.current = setTimeout(() => {
            backgroundDisconnectTimer.current = null;
            if (isConnected()) {
              logger.log('[useAudio] Disconnecting audio after background grace period');
              disconnectFromAudioRoom();
              currentRoomId.current = null;
              clearSpeakingParticipants();
              setMicEnabled(false);
            }
          }, BACKGROUND_DISCONNECT_DELAY);
        }
      } else if (nextAppState === 'active') {
        // App returning to foreground — cancel pending disconnect
        if (backgroundDisconnectTimer.current) {
          clearTimeout(backgroundDisconnectTimer.current);
          backgroundDisconnectTimer.current = null;
          logger.log('[useAudio] Cancelled background disconnect (quick return)');
        }

        // If we were disconnected by the background timer, auto-reconnect
        if (roomId && currentUser && !isConnected() && currentRoomId.current === null) {
          if (otherParticipantCount !== undefined && otherParticipantCount > 0) {
            currentRoomId.current = roomId;
            connectToAudioRoom(roomId, false).then((success) => {
              if (!success) {
                currentRoomId.current = null;
              }
              setMicEnabled(false);
              wasMutedByBackground.current = false;
            });
          }
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription.remove();
      if (backgroundDisconnectTimer.current) {
        clearTimeout(backgroundDisconnectTimer.current);
        backgroundDisconnectTimer.current = null;
      }
    };
  }, [roomId, currentUser?.id, otherParticipantCount, micEnabled, clearSpeakingParticipants]);

  // Handle room changes — disconnect old room, auto-connect to new one for listening (mic off).
  // Connection runs in the background so it doesn't block UI/navigation.
  // OPTIMIZATION: Only auto-connect when there are other participants in the room.
  // Manual connections (user initiated) are preserved even when alone.
  useEffect(() => {
    if (connectTimerRef.current) {
      clearTimeout(connectTimerRef.current);
      connectTimerRef.current = null;
    }

    if (roomId && currentRoomId.current && currentRoomId.current !== roomId) {
      // Switched to a different room — disconnect old one and reset manual flag
      disconnectFromAudioRoom();
      currentRoomId.current = null;
      isManualConnection.current = false;
      clearSpeakingParticipants();
    }

    if (roomId && currentUser && otherParticipantCount !== undefined && otherParticipantCount > 0) {
      // Others in room — auto-connect if not already connected
      if (!isConnected()) {
        currentRoomId.current = roomId;
        // Auto-connect for listening (mic off) in background
        connectToAudioRoom(roomId, false).then((success) => {
          if (!success) {
            currentRoomId.current = null;
          }
          setMicEnabled(false);
        });
      }
    } else if (roomId && currentUser && otherParticipantCount === 0 && isConnected() && !isManualConnection.current) {
      // Alone in the room AND it was an auto-connection — disconnect to save resources
      // Don't disconnect if user manually connected (e.g., to play music)
      // Note: otherParticipantCount === 0 means we confirmed no one else is here (not undefined/loading)
      disconnectFromAudioRoom();
      currentRoomId.current = null;
      clearSpeakingParticipants();
      setMicEnabled(false);
    } else if (!roomId && currentRoomId.current) {
      // Room cleared (e.g. left all rooms) — disconnect
      disconnectFromAudioRoom();
      currentRoomId.current = null;
      isManualConnection.current = false;
      clearSpeakingParticipants();
    }
  }, [roomId, currentUser?.id, otherParticipantCount]);

  // Request microphone permission — always check fresh (user may toggle in Settings)
  const requestMicrophonePermission = async (): Promise<boolean> => {
    if (Platform.OS === 'ios') {
      return true;
    }

    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          {
            title: 'Microphone Permission',
            message: 'Nooke needs access to your microphone for voice chat',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        logger.error('[useAudio] Permission error:', err);
        return false;
      }
    }

    return true;
  };

  // Connect to audio room for listening (mic off)
  // Connect to audio room for listening (mic off) - user-initiated = manual connection
  const handleConnect = useCallback(async (): Promise<boolean> => {
    if (!roomId || !currentUser) return false;
    if (isConnected()) return true;

    // Mark as manual connection so we don't auto-disconnect when alone
    isManualConnection.current = true;

    currentRoomId.current = roomId;
    const success = await connectToAudioRoom(roomId, false);

    if (!success) {
      currentRoomId.current = null;
      isManualConnection.current = false;
      return false;
    }

    setMicEnabled(false);
    return true;
  }, [roomId, currentUser]);

  // Connect to audio when unmuting (user-initiated = manual connection)
  const handleUnmute = useCallback(async (): Promise<boolean> => {
    if (!roomId || !currentUser) {
      logger.warn('[useAudio] Cannot unmute: no room or user');
      return false;
    }

    // Mark as manual connection so we don't auto-disconnect when alone
    isManualConnection.current = true;

    // OPTIMIZATION: Check if already connected FIRST (before permission check)
    if (isConnected()) {
      await setLocalMicrophoneEnabled(true);
      setMicEnabled(true);
      return true;
    }

    // Only request permission if not already connected
    const hasPermission = await requestMicrophonePermission();
    if (!hasPermission) {
      Alert.alert(
        'Microphone Permission Required',
        'Please enable microphone access in your device settings to use voice chat.'
      );
      isManualConnection.current = false;
      return false;
    }

    // Connect to audio room with mic enabled
    currentRoomId.current = roomId;
    const success = await connectToAudioRoom(roomId, true);

    if (!success) {
      currentRoomId.current = null;
      return false;
    }

    // After successful connection, mic should be enabled
    setMicEnabled(isMicrophoneEnabled());

    return true;
  }, [roomId, currentUser]);

  // Mute (but stay connected for now)
  const handleMute = useCallback(async (): Promise<void> => {
    if (isConnected()) {
      await setLocalMicrophoneEnabled(false);
      setMicEnabled(false);
    }
  }, []);

  // Check if a participant is speaking
  const isParticipantSpeaking = useCallback(
    (userId: string): boolean => {
      return speakingParticipants.includes(userId);
    },
    [speakingParticipants]
  );

  // Send data to all participants in the room
  const sendData = useCallback(async (data: Uint8Array): Promise<boolean> => {
    if (audioConnectionStatus !== 'connected') {
      logger.warn('[useAudio] Cannot send data: not connected');
      return false;
    }
    return sendRoomData(data);
  }, [audioConnectionStatus]);

  // Allow consumers to check and clear background mute flag
  const consumeBackgroundMute = useCallback((): boolean => {
    if (wasMutedByBackground.current) {
      wasMutedByBackground.current = false;
      return true;
    }
    return false;
  }, []);

  return {
    connectionStatus: audioConnectionStatus,
    isConnected: audioConnectionStatus === 'connected',
    isConnecting: audioConnectionStatus === 'connecting',
    isMicrophoneEnabled: micEnabled,
    speakingParticipants,
    isParticipantSpeaking,
    connect: handleConnect, // Connect without enabling mic
    disconnect: handleDisconnect,
    mute: handleMute,
    unmute: handleUnmute,
    sendData,
    consumeBackgroundMute,
  };
};
