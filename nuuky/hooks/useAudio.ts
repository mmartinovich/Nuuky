import { logger } from '../lib/logger';
import { useEffect, useCallback, useRef, useState } from 'react';
import { Alert, Platform, PermissionsAndroid } from 'react-native';
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
} from '../lib/livekit';
import { AudioConnectionStatus } from '../types';

export const useAudio = (roomId: string | null) => {
  const {
    currentUser,
    audioConnectionStatus,
    setAudioConnectionStatus,
    setAudioError,
    addSpeakingParticipant,
    removeSpeakingParticipant,
    clearSpeakingParticipants,
    speakingParticipants,
  } = useAppStore();

  const isInitialized = useRef(false);
  const currentRoomId = useRef<string | null>(null);
  const [micEnabled, setMicEnabled] = useState(false);

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
          audioCategoryOptions: ['defaultToSpeaker', 'allowBluetooth', 'allowBluetoothA2DP'],
          audioMode: 'videoChat',
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
    setMicEnabled(false);
    clearSpeakingParticipants();
  }, [clearSpeakingParticipants]);

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
      onAllMuted: () => {
        handleDisconnect();
      },
    };

    setAudioEventCallbacks(callbacks);

    return () => {
      setAudioEventCallbacks(null);
    };
  }, [currentUser?.id, handleDisconnect, setAudioConnectionStatus, setAudioError, addSpeakingParticipant, removeSpeakingParticipant]);

  // Clean up on room change or unmount
  useEffect(() => {
    return () => {
      if (currentRoomId.current) {
        disconnectFromAudioRoom();
        currentRoomId.current = null;
        clearSpeakingParticipants();
      }
    };
  }, [roomId]);

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
  const handleConnect = useCallback(async (): Promise<boolean> => {
    if (!roomId || !currentUser) return false;
    if (isConnected()) return true;

    currentRoomId.current = roomId;
    const success = await connectToAudioRoom(roomId, false);

    if (!success) {
      currentRoomId.current = null;
      return false;
    }

    setMicEnabled(false);
    return true;
  }, [roomId, currentUser]);

  // Auto-connect for listening when room changes
  useEffect(() => {
    if (roomId && currentUser) {
      handleConnect();
    }
  }, [roomId, currentUser?.id]);

  // Connect to audio when unmuting
  const handleUnmute = useCallback(async (): Promise<boolean> => {
    if (!roomId || !currentUser) {
      logger.warn('[useAudio] Cannot unmute: no room or user');
      return false;
    }

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

  return {
    connectionStatus: audioConnectionStatus,
    isConnected: audioConnectionStatus === 'connected',
    isConnecting: audioConnectionStatus === 'connecting',
    isMicrophoneEnabled: micEnabled,
    speakingParticipants,
    isParticipantSpeaking,
    connect: handleUnmute,
    disconnect: handleDisconnect,
    mute: handleMute,
    unmute: handleUnmute,
  };
};
