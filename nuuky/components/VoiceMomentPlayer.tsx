import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { Image as ExpoImage } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { Audio } from "expo-av";
import { useTheme } from "../hooks/useTheme";
import { useVoiceMoment } from "../hooks/useVoiceMoment";
import { VoiceMoment, VoiceMomentReaction, User } from "../types";
import { StaticWaveform, BAR_UNIT, WAVEFORM_H, generateWaveformBars } from "./Waveform";

const REACTION_OPTIONS: { key: VoiceMomentReaction; emoji: string; label: string }[] = [
  { key: "heart", emoji: "\u2764\uFE0F", label: "Heart" },
  { key: "laugh", emoji: "\uD83D\uDE02", label: "Laugh" },
  { key: "wow", emoji: "\uD83D\uDE2E", label: "Wow" },
  { key: "applause", emoji: "\uD83D\uDC4F", label: "Applause" },
  { key: "aww", emoji: "\uD83E\uDD7A", label: "Aww" },
  { key: "party", emoji: "\uD83C\uDF89", label: "Party" },
];

interface VoiceMomentPlayerProps {
  visible: boolean;
  voiceMoment: VoiceMoment | null;
  onClose: () => void;
}

export function VoiceMomentPlayer({
  visible,
  voiceMoment,
  onClose,
}: VoiceMomentPlayerProps) {
  const insets = useSafeAreaInsets();
  const { theme, accent } = useTheme();
  const { markAsViewed, reactToVoiceMoment, getTimeRemaining } = useVoiceMoment();

  const [activeReaction, setActiveReaction] = useState<VoiceMomentReaction | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const [loading, setLoading] = useState(true);
  const [reacting, setReacting] = useState(false);

  const [waveformWidth, setWaveformWidth] = useState(0);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const modalScaleAnim = useRef(new Animated.Value(0.9)).current;
  const soundRef = useRef<Audio.Sound | null>(null);
  const progressInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const loadGeneration = useRef(0);

  // Per-reaction scale animations
  const reactionScales = useRef(
    REACTION_OPTIONS.reduce((acc, opt) => {
      acc[opt.key] = new Animated.Value(1);
      return acc;
    }, {} as Record<string, Animated.Value>)
  ).current;

  // Generate deterministic waveform bars from voice moment ID
  const barCount = waveformWidth > 0 ? Math.floor(waveformWidth / BAR_UNIT) : 0;
  const waveformBars = React.useMemo(
    () => generateWaveformBars(voiceMoment?.id || 'default', barCount),
    [voiceMoment?.id, barCount]
  );

  const handleWaveformLayout = useCallback(
    (e: { nativeEvent: { layout: { width: number } } }) => {
      setWaveformWidth(e.nativeEvent.layout.width);
    },
    []
  );

  // Load and auto-play audio
  useEffect(() => {
    if (visible && voiceMoment) {
      setLoading(true);
      setActiveReaction(voiceMoment.reaction || null);
      setPlaybackProgress(0);

      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(modalScaleAnim, {
          toValue: 1,
          tension: 200,
          friction: 20,
          useNativeDriver: true,
        }),
      ]).start();

      // Mark as viewed
      if (voiceMoment.id && !voiceMoment.viewed_at) {
        markAsViewed(voiceMoment.id);
      }

      // Load audio with generation guard
      const gen = ++loadGeneration.current;
      loadAudio(voiceMoment.audio_url, gen);
    } else {
      fadeAnim.setValue(0);
      modalScaleAnim.setValue(0.9);
      cleanupAudio();
    }

    return () => {
      loadGeneration.current++;
      cleanupAudio();
    };
  }, [visible, voiceMoment?.id]);

  const loadAudio = async (uri: string, gen: number) => {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
      });

      if (gen !== loadGeneration.current) return;

      const { sound } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: false, progressUpdateIntervalMillis: 50 },
        onPlaybackStatusUpdate
      );

      if (gen !== loadGeneration.current) {
        // Stale load - cleanup the orphaned sound
        sound.unloadAsync().catch(() => {});
        return;
      }

      soundRef.current = sound;
      setLoading(false);
    } catch (error) {
      if (gen !== loadGeneration.current) return;
      console.error("Failed to load audio:", error);
      setLoading(false);
    }
  };

  const onPlaybackStatusUpdate = useCallback((status: any) => {
    if (!status.isLoaded) return;

    if (status.isPlaying && status.durationMillis) {
      setPlaybackProgress(status.positionMillis / status.durationMillis);
    }

    if (status.didJustFinish) {
      setIsPlaying(false);
      setPlaybackProgress(1);
    }
  }, []);

  const cleanupAudio = async () => {
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
      progressInterval.current = null;
    }
    if (soundRef.current) {
      try {
        await soundRef.current.unloadAsync();
      } catch {}
      soundRef.current = null;
    }
    setIsPlaying(false);
    setPlaybackProgress(0);
  };

  const togglePlayback = useCallback(async () => {
    if (!soundRef.current) return;

    try {
      if (isPlaying) {
        await soundRef.current.pauseAsync();
        setIsPlaying(false);
      } else {
        const status = await soundRef.current.getStatusAsync();
        if (!status.isLoaded) return;

        const isAtEnd = status.durationMillis != null &&
          status.positionMillis >= status.durationMillis - 100;

        if (status.didJustFinish || isAtEnd) {
          setPlaybackProgress(0);
          await soundRef.current.replayAsync();
        } else {
          await soundRef.current.playAsync();
        }
        setIsPlaying(true);
      }
    } catch (error) {
      console.error("Playback toggle error:", error);
    }
  }, [isPlaying]);

  const handleClose = useCallback(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(modalScaleAnim, {
        toValue: 0.9,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      cleanupAudio();
      onClose();
    });
  }, [onClose]);

  const handleReact = useCallback(async (reaction: VoiceMomentReaction) => {
    if (!voiceMoment?.id || reacting) return;

    setReacting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const isToggleOff = activeReaction === reaction;
    const emojiScale = reactionScales[reaction];

    // Bounce up immediately for responsiveness
    Animated.spring(emojiScale, {
      toValue: 1.4,
      tension: 300,
      friction: 6,
      useNativeDriver: true,
    }).start();

    const success = await reactToVoiceMoment(voiceMoment.id, reaction);

    // Settle based on actual outcome
    Animated.spring(emojiScale, {
      toValue: success && !isToggleOff ? 1.08 : 1,
      tension: 180,
      friction: 10,
      useNativeDriver: true,
    }).start();

    if (success) {
      // Reset previously selected emoji scale
      if (activeReaction && activeReaction !== reaction) {
        Animated.spring(reactionScales[activeReaction], {
          toValue: 1,
          tension: 180,
          friction: 10,
          useNativeDriver: true,
        }).start();
      }
      setActiveReaction(isToggleOff ? null : reaction);
    }
    setReacting(false);
  }, [voiceMoment?.id, activeReaction, reacting, reactToVoiceMoment, reactionScales]);

  const timeRemaining = voiceMoment ? getTimeRemaining(voiceMoment.expires_at) : null;
  const timeRemainingText = timeRemaining
    ? timeRemaining.expired
      ? "Expired"
      : timeRemaining.hours > 0
      ? `${timeRemaining.hours}h ${timeRemaining.minutes}m left`
      : `${timeRemaining.minutes}m left`
    : "";

  const sender = voiceMoment?.sender as User | undefined;
  const senderName = sender?.display_name || "Someone";
  const senderAvatar = sender?.avatar_url;

  const durationText = voiceMoment
    ? `${Math.floor(voiceMoment.duration_ms / 1000)}s`
    : "";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <View style={styles.fullScreen}>
        {/* Backdrop */}
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: fadeAnim }]}>
          <BlurView intensity={50} tint="dark" style={StyleSheet.absoluteFill}>
            <TouchableOpacity
              style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.4)' }]}
              activeOpacity={1}
              onPress={handleClose}
            />
          </BlurView>
        </Animated.View>

        {/* Content */}
        <Animated.View
          style={[
            styles.fullScreenContent,
            {
              opacity: fadeAnim,
              transform: [{ scale: modalScaleAnim }],
            },
          ]}
        >
          {/* ScrollView - underneath header */}
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={[
              styles.contentContainer,
              {
                paddingTop: insets.top + 130,
                paddingBottom: insets.bottom + 24,
              },
            ]}
            showsVerticalScrollIndicator={false}
          >
            {/* Player Card */}
            <View style={styles.section}>
              <View
                style={[
                  styles.playerCard,
                  { backgroundColor: theme.colors.glass.background, borderColor: theme.colors.glass.border },
                ]}
              >
                {/* Sender row */}
                <View style={styles.senderRow}>
                  {senderAvatar ? (
                    <ExpoImage
                      source={{ uri: senderAvatar }}
                      style={[styles.senderAvatar, { borderColor: theme.colors.glass.border }]}
                      contentFit="cover"
                    />
                  ) : (
                    <View style={[styles.senderAvatar, styles.senderAvatarPlaceholder, { borderColor: theme.colors.glass.border, backgroundColor: theme.colors.glass.background }]}>
                      <Ionicons name="person" size={18} color={theme.colors.text.tertiary} />
                    </View>
                  )}
                  <View style={styles.senderText}>
                    <Text style={[styles.senderName, { color: theme.colors.text.primary }]}>
                      {senderName}
                    </Text>
                    <Text style={[styles.timeAgo, { color: theme.colors.text.tertiary }]}>
                      {timeRemainingText}
                    </Text>
                  </View>
                  <View style={[styles.durationBadge, { backgroundColor: accent.primary + '12', borderColor: accent.primary + '25' }]}>
                    <Ionicons name="mic" size={12} color={accent.primary} />
                    <Text style={[styles.durationText, { color: accent.primary }]}>
                      {durationText}
                    </Text>
                  </View>
                </View>

                {/* Audio area */}
                <View style={[styles.audioArea, { borderTopColor: theme.colors.glass.border }]}>
                  {loading ? (
                    <ActivityIndicator color={accent.primary} size="large" />
                  ) : (
                    <>
                      {/* Waveform */}
                      <View
                        style={styles.waveformContainer}
                        onLayout={handleWaveformLayout}
                      >
                        <StaticWaveform
                          data={waveformBars}
                          containerWidth={waveformWidth}
                          accentColor={accent.primary}
                          height={WAVEFORM_H}
                          progress={playbackProgress}
                        />
                      </View>

                      {/* Play/Pause button */}
                      <TouchableOpacity
                        style={[
                          styles.playButton,
                          { backgroundColor: isPlaying ? accent.primary + '20' : accent.primary },
                        ]}
                        onPress={togglePlayback}
                        activeOpacity={0.7}
                      >
                        <Ionicons
                          name={isPlaying ? "pause" : "play"}
                          size={28}
                          color={isPlaying ? accent.primary : accent.textOnPrimary}
                          style={isPlaying ? undefined : { marginLeft: 3 }}
                        />
                      </TouchableOpacity>

                    </>
                  )}
                </View>
              </View>
            </View>

            {/* Caption */}
            {voiceMoment?.caption && (
              <Text style={[styles.caption, { color: theme.colors.text.primary }]}>
                {voiceMoment.caption}
              </Text>
            )}

            {/* Reactions */}
            <View style={styles.reactionsSection}>
              <View style={styles.reactionsRow}>
                {REACTION_OPTIONS.map((option) => {
                  const isActive = activeReaction === option.key;
                  const isLocked = activeReaction != null;
                  return (
                    <TouchableOpacity
                      key={option.key}
                      style={[styles.reactionTouchTarget, isLocked && !isActive && { opacity: 0.3 }]}
                      onPress={() => handleReact(option.key)}
                      activeOpacity={0.6}
                      disabled={reacting || isLocked}
                    >
                      <Animated.Text
                        style={[
                          styles.reactionEmoji,
                          { transform: [{ scale: reactionScales[option.key] }] },
                        ]}
                      >
                        {option.emoji}
                      </Animated.Text>
                      <View
                        style={[
                          styles.reactionActiveDot,
                          {
                            backgroundColor: accent.primary,
                            opacity: isActive ? 1 : 0,
                            transform: [{ scale: isActive ? 1 : 0 }],
                          },
                        ]}
                      />
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </ScrollView>

          {/* Header with gradient fade - absolute positioned on top */}
          <LinearGradient
            colors={['rgba(0,0,0,0.95)', 'rgba(0,0,0,0.85)', 'rgba(0,0,0,0.5)', 'transparent']}
            locations={[0, 0.4, 0.7, 1]}
            style={[styles.headerOverlay, { paddingTop: insets.top + 8 }]}
            pointerEvents="box-none"
          >
            <View style={styles.header} pointerEvents="box-none">
              <TouchableOpacity
                style={[styles.closeButton, { backgroundColor: theme.colors.glass.background }]}
                onPress={handleClose}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={22} color={theme.colors.text.primary} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.headerTitle, { color: theme.colors.text.primary }]}>
              Voice Moment
            </Text>
          </LinearGradient>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fullScreen: {
    flex: 1,
  },
  fullScreenContent: {
    flex: 1,
  },

  // Header
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginBottom: 20,
  },

  // Scroll
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 24,
  },
  section: {
    marginBottom: 24,
  },

  // Player card
  playerCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },

  // Sender row
  senderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  senderAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
  },
  senderAvatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  senderText: {
    flex: 1,
  },
  senderName: {
    fontSize: 16,
    fontWeight: '600',
  },
  timeAgo: {
    fontSize: 12,
    marginTop: 2,
  },
  durationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 4,
    borderWidth: 1,
  },
  durationText: {
    fontSize: 12,
    fontWeight: '500',
  },

  // Audio area
  audioArea: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderTopWidth: 1,
  },

  // Waveform
  waveformContainer: {
    width: '100%',
    height: WAVEFORM_H,
    marginBottom: 16,
  },

  // Play button
  playButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },


  // Caption
  caption: {
    fontSize: 17,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 8,
  },

  // Reactions
  reactionsSection: {
    marginBottom: 24,
  },
  reactionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    paddingVertical: 8,
  },
  reactionTouchTarget: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    height: 58,
  },
  reactionEmoji: {
    fontSize: 30,
  },
  reactionActiveDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginTop: 6,
  },
});
