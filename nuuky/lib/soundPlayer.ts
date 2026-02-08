import { logger } from './logger';
import { SoundReactionType } from '../types';

// Lazy import expo-av to avoid crash if native module isn't available
let Audio: typeof import('expo-av').Audio | null = null;

const loadAudio = async () => {
  if (Audio) return true;
  try {
    const expoAv = await import('expo-av');
    Audio = expoAv.Audio;
    return true;
  } catch (error) {
    logger.warn('[SoundPlayer] expo-av not available - native rebuild required');
    return false;
  }
};

// Sound file mappings - require()'d at build time
const SOUND_SOURCES: Record<SoundReactionType, any> = {
  laugh: require('../assets/sounds/reactions/laugh.wav'),
  wow: require('../assets/sounds/reactions/wow.mp3'),
  applause: require('../assets/sounds/reactions/clap.wav'),
  aww: require('../assets/sounds/reactions/aww.mp3'),
  party: require('../assets/sounds/reactions/party.mp3'),
};

// Sound metadata for UI display
export const SOUND_METADATA: Record<SoundReactionType, { icon: string; label: string; duration: number }> = {
  laugh: { icon: 'happy-outline', label: 'Laugh', duration: 1500 },
  wow: { icon: 'sparkles', label: 'Wow', duration: 1000 },
  applause: { icon: 'ribbon-outline', label: 'Applause', duration: 1500 },
  aww: { icon: 'heart', label: 'Aww', duration: 1500 },
  party: { icon: 'musical-notes', label: 'Party', duration: 1500 },
};

// All available sound types in order for the picker (arc from left to right)
export const SOUND_TYPES: SoundReactionType[] = ['laugh', 'wow', 'applause', 'aww', 'party'];

// Preloaded sound instances for instant playback
let preloadedSounds: Map<SoundReactionType, any> = new Map();
let isPreloaded = false;
let preloadPromise: Promise<void> | null = null;
let isAudioAvailable = false;

/**
 * Preload all reaction sounds into memory for instant playback.
 * Call this once at app startup.
 */
export const preloadSounds = async (): Promise<void> => {
  if (isPreloaded) return;
  // If already preloading, return the existing promise to avoid races
  if (preloadPromise) return preloadPromise;

  preloadPromise = _doPreload();
  try {
    await preloadPromise;
  } finally {
    preloadPromise = null;
  }
};

const _doPreload = async (): Promise<void> => {

  logger.log('[SoundPlayer] Preloading reaction sounds...');

  try {
    // Load the Audio module
    isAudioAvailable = await loadAudio();
    if (!isAudioAvailable || !Audio) {
      logger.warn('[SoundPlayer] Audio not available - rebuild native app with: npx expo run:ios');
      return;
    }

    // Configure audio mode for playback alongside voice chat
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true, // Keep recording enabled for LiveKit
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      shouldDuckAndroid: true,
    });

    const loadPromises = SOUND_TYPES.map(async (soundId) => {
      try {
        const source = SOUND_SOURCES[soundId];
        if (!source) {
          logger.warn(`[SoundPlayer] No source file for ${soundId} - skipping`);
          return;
        }
        const { sound } = await Audio.Sound.createAsync(
          source,
          { shouldPlay: false, volume: 1.0 }
        );
        preloadedSounds.set(soundId, sound);
        logger.log(`[SoundPlayer] Loaded: ${soundId}`);
      } catch (error) {
        logger.error(`[SoundPlayer] Failed to load ${soundId}:`, error);
      }
    });

    await Promise.all(loadPromises);
    isPreloaded = true;
    logger.log(`[SoundPlayer] Preloaded ${preloadedSounds.size}/${SOUND_TYPES.length} sounds`);
  } catch (error) {
    logger.error('[SoundPlayer] Preload failed:', error);
  }
};

/**
 * Play a reaction sound instantly.
 * Uses preloaded sounds for minimal latency.
 */
export const playSound = async (soundId: SoundReactionType): Promise<void> => {
  try {
    if (!isAudioAvailable || !Audio) {
      logger.warn(`[SoundPlayer] Audio not available - cannot play ${soundId}`);
      return;
    }

    const sound = preloadedSounds.get(soundId);

    if (!sound) {
      logger.warn(`[SoundPlayer] Sound not preloaded: ${soundId}, loading on demand...`);
      const source = SOUND_SOURCES[soundId];
      if (!source) {
        logger.warn(`[SoundPlayer] No source file for ${soundId} - cannot play`);
        return;
      }
      // Fallback: load and play on demand
      const { sound: newSound } = await Audio.Sound.createAsync(
        source,
        { shouldPlay: true, volume: 1.0 }
      );
      // Clean up after playback (with safety timeout to prevent leak)
      const safetyTimeout = setTimeout(() => { try { newSound.unloadAsync(); } catch {} }, 10000);
      newSound.setOnPlaybackStatusUpdate((status: any) => {
        if (status.isLoaded && status.didJustFinish) {
          clearTimeout(safetyTimeout);
          newSound.unloadAsync();
        }
      });
      return;
    }

    // Reset to beginning and play
    await sound.setPositionAsync(0);
    await sound.playAsync();

    logger.log(`[SoundPlayer] Playing: ${soundId}`);
  } catch (error) {
    logger.error(`[SoundPlayer] Playback error for ${soundId}:`, error);
  }
};

/**
 * Stop a currently playing sound.
 */
export const stopSound = async (soundId: SoundReactionType): Promise<void> => {
  if (!isAudioAvailable) return;

  try {
    const sound = preloadedSounds.get(soundId);
    if (sound) {
      await sound.stopAsync();
    }
  } catch (error) {
    logger.error(`[SoundPlayer] Stop error for ${soundId}:`, error);
  }
};

/**
 * Unload all sounds to free memory.
 * Call this on app termination or when cleaning up.
 */
export const unloadSounds = async (): Promise<void> => {
  if (!isAudioAvailable) return;

  logger.log('[SoundPlayer] Unloading all sounds...');

  for (const [soundId, sound] of preloadedSounds) {
    try {
      await sound.unloadAsync();
    } catch (error) {
      logger.error(`[SoundPlayer] Unload error for ${soundId}:`, error);
    }
  }

  preloadedSounds.clear();
  isPreloaded = false;
};

/**
 * Play a preview of a sound at lower volume (for long-press preview).
 * Does not broadcast to room.
 */
export const playPreview = async (soundId: SoundReactionType): Promise<void> => {
  try {
    if (!isAudioAvailable || !Audio) return;

    const sound = preloadedSounds.get(soundId);
    if (!sound) return;

    await sound.setVolumeAsync(0.4); // Lower volume for preview
    await sound.setPositionAsync(0);
    await sound.playAsync();
  } catch (error) {
    logger.error(`[SoundPlayer] Preview error for ${soundId}:`, error);
  }
};

/**
 * Stop preview and reset volume.
 */
export const stopPreview = async (soundId: SoundReactionType): Promise<void> => {
  try {
    if (!isAudioAvailable) return;

    const sound = preloadedSounds.get(soundId);
    if (sound) {
      await sound.stopAsync();
      await sound.setVolumeAsync(1.0); // Reset volume
    }
  } catch (error) {
    logger.error(`[SoundPlayer] Stop preview error for ${soundId}:`, error);
  }
};

/**
 * Check if sounds are preloaded and ready.
 */
export const areSoundsReady = (): boolean => isPreloaded && isAudioAvailable;
