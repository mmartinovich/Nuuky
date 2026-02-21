import { logger } from './logger';
import { PresetMood } from '../types';

// Lazy import expo-av to avoid crash if native module isn't available
let Audio: typeof import('expo-av').Audio | null = null;

const loadAudio = async () => {
  if (Audio) return true;
  try {
    const expoAv = await import('expo-av');
    Audio = expoAv.Audio;
    return true;
  } catch (error) {
    logger.warn('[LofiPlayer] expo-av not available - native rebuild required');
    return false;
  }
};

// Lo-fi track type based on mood
export type LofiTrack = 'good' | 'neutral' | 'not_great' | 'sos';

// Map PresetMood to LofiTrack
export const moodToTrack: Record<PresetMood, LofiTrack> = {
  good: 'good',
  neutral: 'neutral',
  not_great: 'not_great',
  reach_out: 'sos',
};

// Track metadata for UI display
export const LOFI_TRACK_METADATA: Record<LofiTrack, { label: string; description: string; moodColor: string }> = {
  good: { label: 'Upbeat Chill', description: 'Happy, positive vibes', moodColor: '#4ADE80' },
  neutral: { label: 'Mellow Beats', description: 'Relaxed lo-fi hip hop', moodColor: '#22D3D8' },
  not_great: { label: 'Soft Melancholy', description: 'Gentle piano & rain', moodColor: '#A78BFA' },
  sos: { label: 'Calm Comfort', description: 'Peaceful ambient sounds', moodColor: '#F472B6' },
};

// Sound file mappings - require()'d at build time
// Audio files should be placed in assets/sounds/lofi/ with names: good.mp3, neutral.mp3, not_great.mp3, sos.mp3
//
// IMPORTANT: You must add the following lo-fi music files to enable this feature:
// - assets/sounds/lofi/happy.mp3     - Upbeat, happy lo-fi (for "good" mood)
// - assets/sounds/lofi/neutral.mp3   - Chill, relaxed beats (for "neutral" mood)
// - assets/sounds/lofi/not_great.mp3 - Melancholic, soft piano (for "not_great" mood)
// - assets/sounds/lofi/sos.mp3       - Gentle, comforting ambient (for "reach_out" mood)
//
// Recommended sources (royalty-free):
// - Pixabay Music (pixabay.com/music) - Free, no attribution required
// - Free Music Archive (freemusicarchive.org) - Check CC0 license
// - Uppbeat (uppbeat.io) - Free tier with attribution

// We use a function to defer the require() call so the app doesn't crash if files are missing
const getLofiSource = (track: LofiTrack): any | null => {
  try {
    switch (track) {
      case 'good':
        return require('../assets/sounds/lofi/happy.mp3');
      case 'neutral':
        return require('../assets/sounds/lofi/mellow_beats.mp3');
      case 'not_great':
        return require('../assets/sounds/lofi/soft_melancholy.mp3');
      case 'sos':
        return require('../assets/sounds/lofi/calm_comfort.mp3');
      default:
        return null;
    }
  } catch (error) {
    logger.warn(`[LofiPlayer] Audio file not found for track: ${track}`);
    return null;
  }
};

// Player state
let currentSound: any = null;
let currentTrack: LofiTrack | null = null;
let isAudioAvailable = false;
let isPlaying = false;
let targetVolume = 0.7; // Default volume (70%)
let fadeGeneration = 0; // Generation counter to prevent concurrent fade races

const FADE_DURATION = 500; // ms
const FADE_STEPS = 20;
const FADE_INTERVAL = FADE_DURATION / FADE_STEPS;

/**
 * Initialize the lofi player audio mode.
 * Call this once at app startup.
 */
export const initLofiPlayer = async (): Promise<boolean> => {
  try {
    isAudioAvailable = await loadAudio();
    if (!isAudioAvailable || !Audio) {
      logger.warn('[LofiPlayer] Audio not available');
      return false;
    }

    // Configure audio mode for playback alongside voice chat
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true, // Keep recording enabled for LiveKit
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      shouldDuckAndroid: true,
    });

    logger.log('[LofiPlayer] Initialized');
    return true;
  } catch (error) {
    logger.error('[LofiPlayer] Init failed:', error);
    return false;
  }
};

/**
 * Fade volume from current to target over duration.
 */
const fadeVolume = async (
  sound: any,
  from: number,
  to: number,
  onComplete?: () => void
): Promise<void> => {
  if (!sound) return;

  const myGeneration = ++fadeGeneration;
  const step = (to - from) / FADE_STEPS;
  let current = from;

  for (let i = 0; i < FADE_STEPS; i++) {
    if (fadeGeneration !== myGeneration) break; // Newer fade started, bail
    current += step;
    try {
      await sound.setVolumeAsync(Math.max(0, Math.min(1, current)));
    } catch {
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, FADE_INTERVAL));
  }

  if (fadeGeneration === myGeneration) {
    await onComplete?.();
  }
};

/**
 * Play a lo-fi track with optional fade-in.
 */
export const playLofi = async (track: LofiTrack, fadeIn = true): Promise<boolean> => {
  logger.log(`[LofiPlayer] playLofi called with track: ${track}`);

  try {
    if (!isAudioAvailable || !Audio) {
      logger.warn('[LofiPlayer] Audio not available, attempting init...');
      isAudioAvailable = await loadAudio();
      if (!isAudioAvailable || !Audio) {
        logger.error('[LofiPlayer] Failed to init audio');
        return false;
      }
    }

    // If same track is already playing, do nothing
    if (currentTrack === track && isPlaying) {
      logger.log(`[LofiPlayer] Track ${track} already playing`);
      return true;
    }

    // Stop current track if different (use fadeOut=false to avoid async race)
    if (currentSound && currentTrack !== track) {
      await stopLofi(false);
    }

    // Load new track if needed
    if (!currentSound || currentTrack !== track) {
      logger.log(`[LofiPlayer] Loading track: ${track}`);
      const source = getLofiSource(track);
      if (!source) {
        logger.error(`[LofiPlayer] No audio file for track: ${track}`);
        return false;
      }
      logger.log(`[LofiPlayer] Got source, creating sound...`);

      try {
        const { sound } = await Audio.Sound.createAsync(source, {
          shouldPlay: false,
          isLooping: true,
          volume: fadeIn ? 0 : targetVolume,
        });

        currentSound = sound;
        currentTrack = track;
        logger.log(`[LofiPlayer] Loaded track successfully: ${track}`);
      } catch (loadError) {
        logger.error(`[LofiPlayer] Failed to load track: ${track}`, loadError);
        currentSound = null;
        currentTrack = null;
        isPlaying = false;
        return false;
      }
    }

    // Start playback
    logger.log(`[LofiPlayer] Starting playback...`);
    try {
      await currentSound.playAsync();
      isPlaying = true;
      logger.log(`[LofiPlayer] Playback started successfully`);
    } catch (playError) {
      logger.error(`[LofiPlayer] playAsync failed:`, playError);
      return false;
    }

    // Fade in (catch errors to avoid unhandled rejection)
    if (fadeIn) {
      logger.log(`[LofiPlayer] Starting fade in to volume ${targetVolume}`);
      fadeVolume(currentSound, 0, targetVolume).catch(err =>
        logger.error('[LofiPlayer] Fade-in error:', err)
      );
    }

    logger.log(`[LofiPlayer] Playing: ${track}`);
    return true;
  } catch (error) {
    logger.error('[LofiPlayer] Play failed:', error);
    return false;
  }
};

/**
 * Stop the current track with optional fade-out.
 */
export const stopLofi = async (fadeOut = true): Promise<void> => {
  if (!currentSound) return;

  try {
    if (fadeOut && isPlaying) {
      await fadeVolume(currentSound, targetVolume, 0, async () => {
        try {
          await currentSound?.stopAsync();
          await currentSound?.unloadAsync();
        } catch {}
        currentSound = null;
        currentTrack = null;
        isPlaying = false;
      });
    } else {
      await currentSound.stopAsync();
      await currentSound.unloadAsync();
      currentSound = null;
      currentTrack = null;
      isPlaying = false;
    }

    logger.log('[LofiPlayer] Stopped');
  } catch (error) {
    logger.error('[LofiPlayer] Stop failed:', error);
    currentSound = null;
    currentTrack = null;
    isPlaying = false;
  }
};

/**
 * Pause the current track (keeps it loaded).
 */
export const pauseLofi = async (fadeOut = true): Promise<void> => {
  if (!currentSound || !isPlaying) return;

  try {
    if (fadeOut) {
      await fadeVolume(currentSound, targetVolume, 0, async () => {
        try {
          await currentSound?.pauseAsync();
        } catch {}
        isPlaying = false;
      });
    } else {
      await currentSound.pauseAsync();
      isPlaying = false;
    }

    logger.log('[LofiPlayer] Paused');
  } catch (error) {
    logger.error('[LofiPlayer] Pause failed:', error);
  }
};

/**
 * Resume the current track with optional fade-in.
 */
export const resumeLofi = async (fadeIn = true): Promise<boolean> => {
  if (!currentSound) return false;

  try {
    if (fadeIn) {
      await currentSound.setVolumeAsync(0);
    }

    await currentSound.playAsync();
    isPlaying = true;

    if (fadeIn) {
      fadeVolume(currentSound, 0, targetVolume).catch(err =>
        logger.error('[LofiPlayer] Resume fade-in error:', err)
      );
    }

    logger.log('[LofiPlayer] Resumed');
    return true;
  } catch (error) {
    logger.error('[LofiPlayer] Resume failed:', error);
    return false;
  }
};

/**
 * Set the playback volume (0-1).
 */
export const setLofiVolume = async (volume: number): Promise<void> => {
  targetVolume = Math.max(0, Math.min(1, volume));

  if (currentSound && isPlaying) {
    try {
      await currentSound.setVolumeAsync(targetVolume);
    } catch (error) {
      logger.error('[LofiPlayer] Set volume failed:', error);
    }
  }
};

/**
 * Get the current playback state.
 */
export const getLofiState = (): {
  isPlaying: boolean;
  currentTrack: LofiTrack | null;
  volume: number;
} => ({
  isPlaying,
  currentTrack,
  volume: targetVolume,
});

/**
 * Check if lofi player is available.
 */
export const isLofiAvailable = (): boolean => isAudioAvailable;
