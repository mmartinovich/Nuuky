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
} from '../lib/livekit';
import { AudioConnectionStatus } from '../types';

// Permission cache (module-level to persist across hook instances)
let permissionGranted: boolean | null = null;

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

  console.log('[useAudio] Hook initialized/re-rendered', {
    roomId,
    hasCurrentUser: !!currentUser,
    currentUserId: currentUser?.id,
    micEnabled,
  });

  // Initialize LiveKit on first use
  useEffect(() => {
    if (!isInitialized.current) {
      initializeLiveKit();
      isInitialized.current = true;
    }
  }, []);

  // Set up event callbacks
  useEffect(() => {
    setAudioEventCallbacks({
      onConnectionStatusChange: (status: string) => {
        setAudioConnectionStatus(status as AudioConnectionStatus);
      },
      onParticipantSpeaking: (participantId: string, isSpeaking: boolean) => {
        console.log(`[useAudio] 📣 Participant speaking callback: ${participantId} - ${isSpeaking ? 'SPEAKING' : 'STOPPED'}`);
        console.log(`[useAudio] Current user ID: ${currentUser?.id}`);
        console.log(`[useAudio] IDs match: ${participantId === currentUser?.id}`);
        if (isSpeaking) {
          addSpeakingParticipant(participantId);
          console.log('[useAudio] Added to speaking participants');
        } else {
          removeSpeakingParticipant(participantId);
          console.log('[useAudio] Removed from speaking participants');
        }
      },
      onError: (error: string) => {
        setAudioError(error);
        Alert.alert('Audio Error', error);
      },
      onAllMuted: () => {
        // Disconnect after 30 seconds of silence
        console.log('[useAudio] All muted callback - disconnecting');
        handleDisconnect();
      },
    });
  }, [currentUser?.id]);

  // Clean up on room change or unmount
  useEffect(() => {
    return () => {
      if (currentRoomId.current) {
        console.log('[useAudio] Cleaning up audio for room:', currentRoomId.current);
        disconnectFromAudioRoom();
        currentRoomId.current = null;
        clearSpeakingParticipants();
      }
    };
  }, [roomId]);

  // Request microphone permission
  const requestMicrophonePermission = async (): Promise<boolean> => {
    // Return cached result if available
    if (permissionGranted !== null) {
      console.log('[useAudio] Using cached permission:', permissionGranted);
      return permissionGranted;
    }

    if (Platform.OS === 'ios') {
      // iOS handles permissions via Info.plist and runtime prompts
      // The LiveKit SDK will trigger the permission prompt automatically
      permissionGranted = true;
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
        permissionGranted = granted === PermissionsAndroid.RESULTS.GRANTED;
        return permissionGranted;
      } catch (err) {
        console.error('[useAudio] Permission error:', err);
        permissionGranted = false;
        return false;
      }
    }

    permissionGranted = true;
    return true;
  };

  // Connect to audio when unmuting
  const handleUnmute = useCallback(async (): Promise<boolean> => {
    console.log('[useAudio] handleUnmute called', {
      roomId,
      hasCurrentUser: !!currentUser,
      currentUserId: currentUser?.id,
    });

    if (!roomId || !currentUser) {
      console.warn('[useAudio] Cannot unmute: no room or user', { roomId, currentUser: !!currentUser });
      return false;
    }

    // OPTIMIZATION: Check if already connected FIRST (before permission check)
    if (isConnected()) {
      console.log('[useAudio] Already connected, enabling mic immediately');
      await setLocalMicrophoneEnabled(true);
      setMicEnabled(true);
      console.log('[useAudio] Mic state after enabling:', isMicrophoneEnabled());
      return true;
    }

    // Only request permission if not already connected
    console.log('[useAudio] Requesting microphone permission...');
    const hasPermission = await requestMicrophonePermission();
    console.log('[useAudio] Permission result:', hasPermission);
    if (!hasPermission) {
      Alert.alert(
        'Microphone Permission Required',
        'Please enable microphone access in your device settings to use voice chat.'
      );
      return false;
    }

    // Connect to audio room
    console.log('[useAudio] Connecting to audio room:', roomId);
    currentRoomId.current = roomId;
    const success = await connectToAudioRoom(roomId);
    console.log('[useAudio] Connection result:', success);

    if (!success) {
      currentRoomId.current = null;
      return false;
    }

    // After successful connection, mic should be enabled
    setMicEnabled(isMicrophoneEnabled());
    console.log('[useAudio] Mic state after connection:', isMicrophoneEnabled());

    return true;
  }, [roomId, currentUser]);

  // Mute (but stay connected for now)
  const handleMute = useCallback(async (): Promise<void> => {
    if (isConnected()) {
      console.log('[useAudio] Muting microphone');
      await setLocalMicrophoneEnabled(false);
      setMicEnabled(false);
      console.log('[useAudio] Mic state after muting:', isMicrophoneEnabled());
    }
  }, []);

  // Disconnect from audio
  const handleDisconnect = useCallback(async (): Promise<void> => {
    console.log('[useAudio] Disconnecting from audio');
    await disconnectFromAudioRoom();
    currentRoomId.current = null;
    setMicEnabled(false);
    clearSpeakingParticipants();
  }, [clearSpeakingParticipants]);

  // Check if a participant is speaking
  const isParticipantSpeaking = useCallback(
    (userId: string): boolean => {
      return speakingParticipants.has(userId);
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
