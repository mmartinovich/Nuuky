import { useState, useCallback, useEffect, useRef } from 'react';
import * as Haptics from 'expo-haptics';
import { logger } from '../lib/logger';
import { playSound, preloadSounds, SOUND_METADATA } from '../lib/soundPlayer';
import { sendRoomData, isConnected, getLocalParticipantId } from '../lib/livekit';
import { SoundReactionType, SoundReactionPayload } from '../types';
import type { RemoteParticipant } from 'livekit-client';

// Cooldown between sending reactions (milliseconds)
const COOLDOWN_MS = 8000;

// Toast display duration (milliseconds)
const TOAST_DURATION_MS = 3000;

export interface ReceivedReaction {
  id: string;
  soundId: SoundReactionType;
  senderId: string;
  senderName: string;
  senderAvatarUrl?: string;
  timestamp: number;
}

interface UseSoundReactionsProps {
  currentUserId: string | null;
  currentUserName: string;
  currentUserAvatarUrl?: string;
  isGhostMode: boolean;
  isAudioConnected: boolean;
}

export const useSoundReactions = ({
  currentUserId,
  currentUserName,
  currentUserAvatarUrl,
  isGhostMode,
  isAudioConnected,
}: UseSoundReactionsProps) => {
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const [receivedReactions, setReceivedReactions] = useState<ReceivedReaction[]>([]);
  const [isSoundsReady, setIsSoundsReady] = useState(false);
  const [lastSentSound, setLastSentSound] = useState<SoundReactionType | null>(null);

  const cooldownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastSendTimeRef = useRef(0);
  const reactionIdCounterRef = useRef(0);

  // Preload sounds on mount
  useEffect(() => {
    preloadSounds().then(() => {
      setIsSoundsReady(true);
    });
  }, []);

  // Cooldown timer effect
  useEffect(() => {
    if (cooldownRemaining > 0) {
      cooldownTimerRef.current = setInterval(() => {
        setCooldownRemaining((prev) => {
          const newValue = prev - 100;
          if (newValue <= 0) {
            if (cooldownTimerRef.current) {
              clearInterval(cooldownTimerRef.current);
              cooldownTimerRef.current = null;
            }
            setLastSentSound(null); // Clear when cooldown ends
            return 0;
          }
          return newValue;
        });
      }, 100);

      return () => {
        if (cooldownTimerRef.current) {
          clearInterval(cooldownTimerRef.current);
          cooldownTimerRef.current = null;
        }
      };
    }
  }, [cooldownRemaining > 0]); // eslint-disable-line react-hooks/exhaustive-deps -- intentionally boolean: start/stop interval on transition

  // Auto-dismiss received reactions after TOAST_DURATION_MS
  useEffect(() => {
    if (receivedReactions.length === 0) return;

    const timeouts = receivedReactions.map((reaction) => {
      const elapsed = Date.now() - reaction.timestamp;
      const remaining = Math.max(0, TOAST_DURATION_MS - elapsed);

      return setTimeout(() => {
        setReceivedReactions((prev) => prev.filter((r) => r.id !== reaction.id));
      }, remaining);
    });

    return () => {
      timeouts.forEach(clearTimeout);
    };
  }, [receivedReactions]);

  // Send a sound reaction to the room
  const sendReaction = useCallback(
    async (soundId: SoundReactionType): Promise<{ success: boolean; error?: string }> => {
      // Ghost mode check
      if (isGhostMode) {
        return { success: false, error: 'Exit ghost mode to send reactions' };
      }

      // Connection check
      if (!isAudioConnected || !isConnected()) {
        return { success: false, error: 'Not connected to a room' };
      }

      // Cooldown check
      const now = Date.now();
      const timeSinceLastSend = now - lastSendTimeRef.current;
      if (timeSinceLastSend < COOLDOWN_MS) {
        return { success: false, error: 'Wait for cooldown' };
      }

      if (!currentUserId) {
        return { success: false, error: 'Not logged in' };
      }

      try {
        // Build the payload
        const payload: SoundReactionPayload = {
          type: 'sound_reaction',
          soundId,
          senderId: currentUserId,
          senderName: currentUserName,
          senderAvatarUrl: currentUserAvatarUrl,
          timestamp: now,
        };

        // Encode as JSON and send via data channel
        const encoder = new TextEncoder();
        const data = encoder.encode(JSON.stringify(payload));
        const success = await sendRoomData(data);

        if (success) {
          // Start cooldown and track which sound was sent
          lastSendTimeRef.current = now;
          setCooldownRemaining(COOLDOWN_MS);
          setLastSentSound(soundId);

          // Heavy haptic feedback on send
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

          // Play the sound locally too (sender hears it)
          playSound(soundId);

          logger.log(`[SoundReactions] Sent reaction: ${soundId}`);
          return { success: true };
        } else {
          return { success: false, error: 'Failed to send' };
        }
      } catch (error) {
        logger.error('[SoundReactions] Send error:', error);
        return { success: false, error: 'Send failed' };
      }
    },
    [isGhostMode, isAudioConnected, currentUserId, currentUserName, currentUserAvatarUrl]
  );

  // Handle incoming data from LiveKit
  const handleDataReceived = useCallback(
    (data: Uint8Array, participant: RemoteParticipant | undefined) => {
      try {
        const decoder = new TextDecoder();
        const json = decoder.decode(data);
        const payload = JSON.parse(json);

        // Check if it's a sound reaction
        if (payload.type !== 'sound_reaction') {
          return;
        }

        const reactionPayload = payload as SoundReactionPayload;

        // Don't process our own reactions (we already played locally)
        if (reactionPayload.senderId === currentUserId) {
          return;
        }

        logger.log(`[SoundReactions] Received: ${reactionPayload.soundId} from ${reactionPayload.senderName}`);

        // Light haptic feedback on receive
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        // Play the sound
        playSound(reactionPayload.soundId);

        // Add to received reactions for toast display
        const reaction: ReceivedReaction = {
          id: `reaction-${reactionIdCounterRef.current++}`,
          soundId: reactionPayload.soundId,
          senderId: reactionPayload.senderId,
          senderName: reactionPayload.senderName,
          senderAvatarUrl: reactionPayload.senderAvatarUrl,
          timestamp: Date.now(),
        };

        setReceivedReactions((prev) => [...prev, reaction]);
      } catch (error) {
        // Not a JSON message or not a sound reaction - ignore
      }
    },
    [currentUserId]
  );

  // Dismiss a specific reaction toast
  const dismissReaction = useCallback((reactionId: string) => {
    setReceivedReactions((prev) => prev.filter((r) => r.id !== reactionId));
  }, []);

  // Check if sending is allowed (for UI state)
  const canSend = !isGhostMode && isAudioConnected && cooldownRemaining === 0;

  // Cooldown progress (0 to 1)
  const cooldownProgress = cooldownRemaining > 0 ? cooldownRemaining / COOLDOWN_MS : 0;

  return {
    sendReaction,
    handleDataReceived,
    canSend,
    cooldownRemaining,
    cooldownProgress,
    lastSentSound,
    receivedReactions,
    dismissReaction,
    isSoundsReady,
    isGhostModeBlocked: isGhostMode,
  };
};
