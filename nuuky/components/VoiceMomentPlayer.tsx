import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  Dimensions,
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
import { spacing, radius, typography, colors } from "../lib/theme";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const REACTION_OPTIONS: { key: VoiceMomentReaction; emoji: string; label: string }[] = [
  { key: "heart", emoji: "\u2764\uFE0F", label: "Heart" },
  { key: "laugh", emoji: "\uD83D\uDE02", label: "Laugh" },
  { key: "wow", emoji: "\uD83D\uDE2E", label: "Wow" },
  { key: "applause", emoji: "\uD83D\uDC4F", label: "Applause" },
  { key: "aww", emoji: "\uD83E\uDD7A", label: "Aww" },
  { key: "party", emoji: "\uD83C\uDF89", label: "Party" },
];

const NUM_WAVEFORM_BARS = 24;

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
  const { theme } = useTheme();
  const { markAsViewed, reactToVoiceMoment, getTimeRemaining } = useVoiceMoment();

  const [activeReaction, setActiveReaction] = useState<VoiceMomentReaction | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const [loading, setLoading] = useState(true);
  const [reacting, setReacting] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0.4)).current;
  const soundRef = useRef<Audio.Sound | null>(null);
  const progressInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  // Waveform bar animations
  const waveformAnims = useRef(
    Array.from({ length: NUM_WAVEFORM_BARS }, () => new Animated.Value(0.3))
  ).current;

  const styles = useMemo(() => createStyles(theme), [theme]);

  // Waveform animation loop
  useEffect(() => {
    if (isPlaying) {
      const animations = waveformAnims.map((anim, i) =>
        Animated.loop(
          Animated.sequence([
            Animated.timing(anim, {
              toValue: 0.3 + Math.random() * 0.7,
              duration: 200 + Math.random() * 300,
              useNativeDriver: true,
              delay: i * 30,
            }),
            Animated.timing(anim, {
              toValue: 0.15 + Math.random() * 0.3,
              duration: 200 + Math.random() * 300,
              useNativeDriver: true,
            }),
          ])
        )
      );
      animations.forEach((a) => a.start());
      return () => animations.forEach((a) => a.stop());
    } else {
      waveformAnims.forEach((anim) => {
        Animated.timing(anim, {
          toValue: 0.3,
          duration: 300,
          useNativeDriver: true,
        }).start();
      });
    }
  }, [isPlaying]);

  // Glow animation for playing state
  useEffect(() => {
    if (isPlaying) {
      const glow = Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 0.8,
            duration: 1200,
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0.3,
            duration: 1200,
            useNativeDriver: true,
          }),
        ])
      );
      glow.start();

      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.06,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();

      return () => {
        glow.stop();
        pulse.stop();
      };
    } else {
      pulseAnim.setValue(1);
      glowAnim.setValue(0.4);
    }
  }, [isPlaying]);

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
        Animated.spring(scaleAnim, {
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

      // Load audio
      loadAudio(voiceMoment.audio_url);
    } else {
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.9);
      cleanupAudio();
    }

    return () => {
      cleanupAudio();
    };
  }, [visible, voiceMoment?.id]);

  const loadAudio = async (uri: string) => {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
      });

      const { sound } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: true },
        onPlaybackStatusUpdate
      );

      soundRef.current = sound;
      setLoading(false);
      setIsPlaying(true);
    } catch (error) {
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
        if (status.isLoaded && status.didJustFinish) {
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
      Animated.timing(scaleAnim, {
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

    const success = await reactToVoiceMoment(voiceMoment.id, reaction);
    if (success) {
      setActiveReaction(activeReaction === reaction ? null : reaction);
    }
    setReacting(false);
  }, [voiceMoment?.id, activeReaction, reacting, reactToVoiceMoment]);

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
      <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
        <BlurView intensity={90} style={StyleSheet.absoluteFill} tint="dark" />

        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={handleClose}
        />

        <Animated.View
          style={[
            styles.card,
            { transform: [{ scale: scaleAnim }] },
          ]}
        >
          {/* Glass border effect */}
          <LinearGradient
            colors={['rgba(0, 240, 255, 0.15)', 'rgba(181, 55, 242, 0.1)', 'rgba(0, 240, 255, 0.05)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.cardBorder}
          >
            <View style={styles.cardContent}>
              <LinearGradient
                colors={['#0a0a20', '#0d0d2b', '#0a0a20']}
                style={styles.cardInner}
              >
                {/* Sender info */}
                <View style={styles.senderInfo}>
                  {senderAvatar ? (
                    <View style={styles.avatarGlow}>
                      <ExpoImage
                        source={{ uri: senderAvatar }}
                        style={styles.senderAvatar}
                        contentFit="cover"
                      />
                    </View>
                  ) : (
                    <View style={styles.avatarGlow}>
                      <View style={[styles.senderAvatar, styles.senderAvatarPlaceholder]}>
                        <Ionicons name="person" size={16} color={theme.colors.text.tertiary} />
                      </View>
                    </View>
                  )}
                  <View style={styles.senderText}>
                    <Text style={styles.senderName}>{senderName}</Text>
                    <Text style={styles.timeAgo}>{timeRemainingText}</Text>
                  </View>
                  <View style={styles.durationBadge}>
                    <Ionicons name="mic" size={12} color={colors.neon.cyan} />
                    <Text style={styles.durationText}>{durationText}</Text>
                  </View>
                </View>

                {/* Audio visualization area */}
                <View style={styles.audioArea}>
                  {loading ? (
                    <ActivityIndicator color={colors.neon.cyan} size="large" />
                  ) : (
                    <>
                      {/* Waveform bars */}
                      <View style={styles.waveformContainer}>
                        {waveformAnims.map((anim, i) => {
                          const distFromCenter = Math.abs(i - NUM_WAVEFORM_BARS / 2) / (NUM_WAVEFORM_BARS / 2);
                          const maxHeight = 40 * (1 - distFromCenter * 0.6);
                          return (
                            <Animated.View
                              key={i}
                              style={[
                                styles.waveformBar,
                                {
                                  height: maxHeight,
                                  transform: [{ scaleY: anim }],
                                  opacity: playbackProgress > 0
                                    ? i / NUM_WAVEFORM_BARS <= playbackProgress ? 1 : 0.3
                                    : isPlaying ? 1 : 0.4,
                                },
                              ]}
                            />
                          );
                        })}
                      </View>

                      {/* Play/Pause button */}
                      <TouchableOpacity
                        style={styles.playButton}
                        onPress={togglePlayback}
                        activeOpacity={0.7}
                      >
                        <Animated.View style={[styles.playButtonGlow, { opacity: glowAnim }]} />
                        <Animated.View
                          style={[
                            styles.playButtonOuter,
                            { transform: [{ scale: pulseAnim }] },
                          ]}
                        >
                          <LinearGradient
                            colors={['rgba(0, 240, 255, 0.15)', 'rgba(181, 55, 242, 0.15)']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.playButtonInner}
                          >
                            <Ionicons
                              name={isPlaying ? "pause" : "play"}
                              size={32}
                              color="#FFFFFF"
                              style={isPlaying ? undefined : { marginLeft: 3 }}
                            />
                          </LinearGradient>
                        </Animated.View>
                      </TouchableOpacity>

                      {/* Progress bar */}
                      <View style={styles.progressBarContainer}>
                        <View style={styles.progressBarBg}>
                          <LinearGradient
                            colors={[colors.neon.cyan, colors.neon.purple]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={[
                              styles.progressBarFill,
                              { width: `${playbackProgress * 100}%` },
                            ]}
                          />
                        </View>
                        {/* Glow dot at progress position */}
                        {playbackProgress > 0 && playbackProgress < 1 && (
                          <View
                            style={[
                              styles.progressDot,
                              { left: `${playbackProgress * 100}%` },
                            ]}
                          />
                        )}
                      </View>
                    </>
                  )}
                </View>

                {/* Caption */}
                {voiceMoment?.caption && (
                  <Text style={styles.caption}>{voiceMoment.caption}</Text>
                )}

                {/* Reactions row */}
                <View style={styles.reactionsRow}>
                  {REACTION_OPTIONS.map((option) => {
                    const isActive = activeReaction === option.key;
                    return (
                      <TouchableOpacity
                        key={option.key}
                        style={[
                          styles.reactionButton,
                          isActive && styles.reactionButtonActive,
                        ]}
                        onPress={() => handleReact(option.key)}
                        activeOpacity={0.7}
                        disabled={reacting}
                      >
                        <Text style={[styles.reactionEmoji, isActive && styles.reactionEmojiActive]}>
                          {option.emoji}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Close button */}
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={handleClose}
                  activeOpacity={0.7}
                >
                  <Ionicons name="close" size={20} color="rgba(255,255,255,0.6)" />
                </TouchableOpacity>
              </LinearGradient>
            </View>
          </LinearGradient>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>["theme"]) =>
  StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    card: {
      width: SCREEN_WIDTH - 40,
      borderRadius: radius.xl,
      overflow: "hidden",
    },
    cardBorder: {
      borderRadius: radius.xl,
      padding: 1,
    },
    cardContent: {
      borderRadius: radius.xl - 1,
      overflow: "hidden",
    },
    cardInner: {
      paddingHorizontal: spacing.lg,
      paddingTop: 24,
      paddingBottom: 20,
    },

    // Sender
    senderInfo: {
      flexDirection: "row",
      alignItems: "center",
    },
    avatarGlow: {
      borderRadius: 22,
      shadowColor: colors.neon.cyan,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
    },
    senderAvatar: {
      width: 42,
      height: 42,
      borderRadius: 21,
      borderWidth: 2,
      borderColor: 'rgba(0, 240, 255, 0.3)',
    },
    senderAvatarPlaceholder: {
      backgroundColor: theme.colors.glass.background,
      justifyContent: "center",
      alignItems: "center",
    },
    senderText: {
      marginLeft: spacing.sm + 2,
      flex: 1,
    },
    senderName: {
      fontSize: typography.size.md,
      fontFamily: typography.displayBold,
      fontWeight: "700",
      color: "#FFFFFF",
    },
    timeAgo: {
      fontSize: typography.size.xs,
      fontFamily: typography.body,
      color: "rgba(255,255,255,0.5)",
      marginTop: 2,
    },
    durationBadge: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "rgba(0, 240, 255, 0.08)",
      borderRadius: 10,
      paddingHorizontal: 10,
      paddingVertical: 5,
      gap: 4,
      borderWidth: 1,
      borderColor: "rgba(0, 240, 255, 0.15)",
    },
    durationText: {
      fontSize: typography.size.xs,
      fontFamily: typography.body,
      color: "rgba(0, 240, 255, 0.8)",
    },

    // Audio area
    audioArea: {
      alignItems: "center",
      justifyContent: "center",
      paddingTop: spacing.xl,
      paddingBottom: spacing.lg,
    },

    // Waveform
    waveformContainer: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      height: 44,
      gap: 2.5,
      marginBottom: spacing.lg,
      width: "100%",
      paddingHorizontal: spacing.sm,
    },
    waveformBar: {
      flex: 1,
      borderRadius: 2,
      backgroundColor: colors.neon.cyan,
    },

    // Play button
    playButton: {
      marginBottom: spacing.xl,
      alignItems: "center",
      justifyContent: "center",
    },
    playButtonGlow: {
      position: "absolute",
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: colors.neon.cyan,
      shadowColor: colors.neon.cyan,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.5,
      shadowRadius: 24,
    },
    playButtonOuter: {
      width: 72,
      height: 72,
      borderRadius: 36,
      borderWidth: 2,
      borderColor: 'rgba(0, 240, 255, 0.4)',
      overflow: "hidden",
    },
    playButtonInner: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },

    // Progress bar
    progressBarContainer: {
      width: "100%",
      paddingHorizontal: spacing.xs,
      position: "relative",
    },
    progressBarBg: {
      height: 3,
      backgroundColor: "rgba(255,255,255,0.08)",
      borderRadius: 2,
      overflow: "hidden",
    },
    progressBarFill: {
      height: "100%",
      borderRadius: 2,
    },
    progressDot: {
      position: "absolute",
      top: -3,
      width: 9,
      height: 9,
      borderRadius: 5,
      backgroundColor: colors.neon.cyan,
      marginLeft: -4.5,
      shadowColor: colors.neon.cyan,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.8,
      shadowRadius: 6,
    },

    // Caption
    caption: {
      fontSize: typography.size.lg,
      fontFamily: typography.displayMedium,
      fontWeight: "500",
      color: "#FFFFFF",
      textAlign: "center",
      marginTop: spacing.lg,
      marginBottom: spacing.md,
    },

    // Reactions
    reactionsRow: {
      flexDirection: "row",
      justifyContent: "center",
      gap: 10,
      marginTop: spacing.sm,
      marginBottom: spacing.md,
    },
    reactionButton: {
      width: 46,
      height: 46,
      borderRadius: 23,
      backgroundColor: "rgba(255,255,255,0.06)",
      justifyContent: "center",
      alignItems: "center",
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.08)",
    },
    reactionButtonActive: {
      backgroundColor: "rgba(0, 240, 255, 0.12)",
      borderColor: "rgba(0, 240, 255, 0.4)",
      shadowColor: colors.neon.cyan,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.4,
      shadowRadius: 8,
    },
    reactionEmoji: {
      fontSize: 20,
    },
    reactionEmojiActive: {
      fontSize: 22,
    },

    // Close button
    closeButton: {
      alignSelf: "center",
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: "rgba(255,255,255,0.06)",
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.1)",
      justifyContent: "center",
      alignItems: "center",
    },
  });
