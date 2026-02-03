import { useCallback, useEffect, useRef, useState } from 'react';
import { useAppStore, useCurrentUser } from '../stores/appStore';
import { PresetMood } from '../types';
import {
  initLofiPlayer,
  playLofi,
  stopLofi,
  pauseLofi,
  resumeLofi,
  setLofiVolume,
  getLofiState,
  isLofiAvailable,
  moodToTrack,
  LofiTrack,
} from '../lib/lofiMusicPlayer';
import { logger } from '../lib/logger';

interface UseLofiMusicReturn {
  // State
  isPlaying: boolean;
  currentTrack: LofiTrack | null;
  selectedTrack: LofiTrack | null; // null = mood-based
  currentMood: PresetMood;
  isAlone: boolean;
  autoPlayEnabled: boolean;
  volume: number;
  isAvailable: boolean;

  // Actions
  play: () => Promise<void>;
  pause: () => Promise<void>;
  stop: () => Promise<void>;
  toggleAutoPlay: () => void;
  setVolume: (volume: number) => Promise<void>;
  selectTrack: (track: LofiTrack | null) => void; // null = use mood default
}

export const useLofiMusic = (otherParticipantCount?: number): UseLofiMusicReturn => {
  const currentUser = useCurrentUser();

  // Lofi state from store
  const lofiAutoPlay = useAppStore((s) => s.lofiAutoPlay);
  const lofiVolume = useAppStore((s) => s.lofiVolume);
  const lofiSelectedTrack = useAppStore((s) => s.lofiSelectedTrack);
  const setLofiAutoPlay = useAppStore((s) => s.setLofiAutoPlay);
  const setLofiVolumeStore = useAppStore((s) => s.setLofiVolume);
  const setLofiSelectedTrackStore = useAppStore((s) => s.setLofiSelectedTrack);

  // Local state for playback
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<LofiTrack | null>(null);
  const [isAvailable, setIsAvailable] = useState(false);

  // Track initialization
  const isInitialized = useRef(false);
  const isManualPlay = useRef(false); // Track if user manually started playback

  // Get current mood
  const currentMood: PresetMood = currentUser?.mood || 'neutral';

  // Get selected track (cast from string to LofiTrack)
  const selectedTrack = lofiSelectedTrack as LofiTrack | null;

  // Get effective track: selected track or mood-based default
  const getEffectiveTrack = useCallback((): LofiTrack => {
    if (selectedTrack) return selectedTrack;
    return moodToTrack[currentMood];
  }, [selectedTrack, currentMood]);

  // Check if user is alone in the room (use passed count, default to not alone until we know)
  const isAlone = otherParticipantCount !== undefined ? otherParticipantCount === 0 : false;

  // Initialize player on mount
  useEffect(() => {
    const init = async () => {
      if (isInitialized.current) return;
      isInitialized.current = true;

      const available = await initLofiPlayer();
      setIsAvailable(available);
      logger.log(`[useLofiMusic] Initialized, available: ${available}`);
    };

    init();

    // Cleanup on unmount
    return () => {
      stopLofi(false);
    };
  }, []);

  // Sync playback state with player
  useEffect(() => {
    const state = getLofiState();
    setIsPlaying(state.isPlaying);
    setCurrentTrack(state.currentTrack);
  }, []);

  // Auto-play/stop based on alone status (only for auto-started playback)
  useEffect(() => {
    if (!isAvailable || !lofiAutoPlay) return;

    const targetTrack = getEffectiveTrack();
    let autoPlayTimer: ReturnType<typeof setTimeout> | null = null;

    if (isAlone && !isPlaying) {
      // Start playing when alone (auto-play) with 5 second delay
      logger.log('[useLofiMusic] Will auto-play in 5 seconds (alone in room)');
      autoPlayTimer = setTimeout(() => {
        isManualPlay.current = false; // Mark as auto-started
        playLofi(targetTrack, true).then((success) => {
          if (success) {
            setIsPlaying(true);
            setCurrentTrack(targetTrack);
            logger.log('[useLofiMusic] Auto-play started');
          }
        });
      }, 5000);
    } else if (!isAlone && isPlaying && !isManualPlay.current) {
      // Stop when someone joins, but ONLY if it was auto-started
      // Don't stop manually started music
      logger.log('[useLofiMusic] Auto-stopping (friend joined)');
      pauseLofi(true).then(() => {
        setIsPlaying(false);
      });
    }

    // Cleanup: cancel timer if conditions change before 5 seconds
    return () => {
      if (autoPlayTimer) {
        clearTimeout(autoPlayTimer);
      }
    };
  }, [isAlone, isAvailable, lofiAutoPlay, getEffectiveTrack, isPlaying]);

  // Update track when mood changes (only if using mood-based default)
  useEffect(() => {
    if (!isPlaying || selectedTrack) return; // Skip if not playing or using manual selection

    const targetTrack = moodToTrack[currentMood];
    if (currentTrack !== targetTrack) {
      logger.log(`[useLofiMusic] Mood changed, switching track to ${targetTrack}`);
      playLofi(targetTrack, true).then((success) => {
        if (success) {
          setCurrentTrack(targetTrack);
        }
      });
    }
  }, [currentMood, isPlaying, currentTrack, selectedTrack]);

  // Sync volume with store
  useEffect(() => {
    if (isAvailable) {
      setLofiVolume(lofiVolume);
    }
  }, [lofiVolume, isAvailable]);

  // Play action (user-initiated = manual play)
  const play = useCallback(async () => {
    // Mark as manual play so auto-stop doesn't interrupt
    isManualPlay.current = true;

    // Try to initialize if not available yet
    let available = isAvailable;
    if (!available) {
      logger.log('[useLofiMusic] Not initialized, attempting init...');
      available = await initLofiPlayer();
      setIsAvailable(available);
    }

    if (!available) {
      logger.warn('[useLofiMusic] Cannot play - audio not available');
      isManualPlay.current = false;
      return;
    }

    const targetTrack = getEffectiveTrack();
    logger.log(`[useLofiMusic] Playing track: ${targetTrack} (manual)`);
    const success = await playLofi(targetTrack, true);
    logger.log(`[useLofiMusic] Play result: ${success}`);
    if (success) {
      setIsPlaying(true);
      setCurrentTrack(targetTrack);
    } else {
      isManualPlay.current = false;
    }
  }, [isAvailable, getEffectiveTrack]);

  // Pause action
  const pause = useCallback(async () => {
    isManualPlay.current = false; // Reset manual flag
    await pauseLofi(true);
    setIsPlaying(false);
  }, []);

  // Stop action
  const stop = useCallback(async () => {
    isManualPlay.current = false; // Reset manual flag
    await stopLofi(true);
    setIsPlaying(false);
    setCurrentTrack(null);
  }, []);

  // Toggle auto-play
  const toggleAutoPlay = useCallback(() => {
    setLofiAutoPlay(!lofiAutoPlay);
  }, [lofiAutoPlay, setLofiAutoPlay]);

  // Set volume
  const setVolume = useCallback(
    async (volume: number) => {
      setLofiVolumeStore(volume);
      await setLofiVolume(volume);
    },
    [setLofiVolumeStore]
  );

  // Select track (null = use mood default)
  const selectTrack = useCallback(
    (track: LofiTrack | null) => {
      setLofiSelectedTrackStore(track);

      // If currently playing, switch to the new track
      if (isPlaying && isAvailable) {
        const targetTrack = track || moodToTrack[currentMood];
        playLofi(targetTrack, true).then((success) => {
          if (success) {
            setCurrentTrack(targetTrack);
          }
        });
      }
    },
    [setLofiSelectedTrackStore, isPlaying, isAvailable, currentMood]
  );

  return {
    isPlaying,
    currentTrack,
    selectedTrack,
    currentMood,
    isAlone,
    autoPlayEnabled: lofiAutoPlay,
    volume: lofiVolume,
    isAvailable,
    play,
    pause,
    stop,
    toggleAutoPlay,
    setVolume,
    selectTrack,
  };
};
