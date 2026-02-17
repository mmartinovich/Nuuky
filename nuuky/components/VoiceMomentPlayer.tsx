import React, { useEffect, useRef, useState, useCallback } from "react";
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
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { Audio } from "expo-av";
import { useTheme } from "../hooks/useTheme";
import { useVoiceMoment } from "../hooks/useVoiceMoment";
import { VoiceMoment, VoiceMomentReaction, User } from "../types";
import { spacing, radius, typography } from "../lib/theme";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

const REACTION_OPTIONS: { key: VoiceMomentReaction; emoji: string; label: string }[] = [
  { key: "heart", emoji: "❤️", label: "Heart" },
  { key: "laugh", emoji: "😂", label: "Laugh" },
  { key: "wow", emoji: "😮", label: "Wow" },
  { key: "applause", emoji: "👏", label: "Applause" },
  { key: "aww", emoji: "🥺", label: "Aww" },
  { key: "party", emoji: "🎉", label: "Party" },
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
  const soundRef = useRef<Audio.Sound | null>(null);
  const progressInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  const styles = createStyles(theme);

  // Pulse animation for playing state
  useEffect(() => {
    if (isPlaying) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.08,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
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
        <BlurView intensity={80} style={StyleSheet.absoluteFill} tint="dark" />

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
          {/* Top gradient with sender info */}
          <LinearGradient
            colors={["rgba(0,0,0,0.8)", "rgba(20,20,40,0.95)"]}
            style={styles.cardInner}
          >
            {/* Sender info */}
            <View style={[styles.senderInfo, { marginTop: 20 }]}>
              {senderAvatar ? (
                <ExpoImage
                  source={{ uri: senderAvatar }}
                  style={styles.senderAvatar}
                  contentFit="cover"
                />
              ) : (
                <View style={[styles.senderAvatar, styles.senderAvatarPlaceholder]}>
                  <Ionicons name="person" size={16} color={theme.colors.text.tertiary} />
                </View>
              )}
              <View style={styles.senderText}>
                <Text style={styles.senderName}>{senderName}</Text>
                <Text style={styles.timeAgo}>{timeRemainingText}</Text>
              </View>
              <View style={styles.durationBadge}>
                <Ionicons name="mic" size={12} color="rgba(255,255,255,0.6)" />
                <Text style={styles.durationText}>{durationText}</Text>
              </View>
            </View>

            {/* Audio visualization area */}
            <View style={styles.audioArea}>
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="large" />
              ) : (
                <TouchableOpacity
                  style={styles.playButton}
                  onPress={togglePlayback}
                  activeOpacity={0.7}
                >
                  <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                    <View style={styles.playButtonInner}>
                      <Ionicons
                        name={isPlaying ? "pause" : "play"}
                        size={40}
                        color="#FFFFFF"
                        style={isPlaying ? undefined : { marginLeft: 4 }}
                      />
                    </View>
                  </Animated.View>
                </TouchableOpacity>
              )}

              {/* Progress bar */}
              <View style={styles.progressBarContainer}>
                <View style={styles.progressBarBg}>
                  <View
                    style={[
                      styles.progressBarFill,
                      { width: `${playbackProgress * 100}%` },
                    ]}
                  />
                </View>
              </View>
            </View>

            {/* Caption */}
            {voiceMoment?.caption && (
              <Text style={styles.caption}>{voiceMoment.caption}</Text>
            )}

            {/* Reactions row */}
            <View style={styles.reactionsRow}>
              {REACTION_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.key}
                  style={[
                    styles.reactionButton,
                    activeReaction === option.key && styles.reactionButtonActive,
                  ]}
                  onPress={() => handleReact(option.key)}
                  activeOpacity={0.7}
                  disabled={reacting}
                >
                  <Text style={styles.reactionEmoji}>{option.emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Close button */}
            <TouchableOpacity
              style={[styles.closeButton, { marginBottom: 20 }]}
              onPress={handleClose}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>
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
      backgroundColor: "rgba(0,0,0,0.5)",
    },
    card: {
      width: SCREEN_WIDTH - 48,
      borderRadius: radius.xl,
      overflow: "hidden",
      backgroundColor: "#000000",
    },
    cardInner: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
    },
    senderInfo: {
      flexDirection: "row",
      alignItems: "center",
    },
    senderAvatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      borderWidth: 2,
      borderColor: "rgba(255,255,255,0.3)",
    },
    senderAvatarPlaceholder: {
      backgroundColor: theme.colors.glass.background,
      justifyContent: "center",
      alignItems: "center",
    },
    senderText: {
      marginLeft: spacing.sm,
      flex: 1,
    },
    senderName: {
      fontSize: typography.size.md,
      fontWeight: "700",
      color: "#FFFFFF",
    },
    timeAgo: {
      fontSize: typography.size.xs,
      color: "rgba(255,255,255,0.7)",
      marginTop: 2,
    },
    durationBadge: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "rgba(255,255,255,0.1)",
      borderRadius: 12,
      paddingHorizontal: 8,
      paddingVertical: 4,
      gap: 4,
    },
    durationText: {
      fontSize: typography.size.xs,
      color: "rgba(255,255,255,0.6)",
    },
    audioArea: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: spacing["3xl"],
    },
    playButton: {
      marginBottom: spacing.xl,
    },
    playButtonInner: {
      width: 88,
      height: 88,
      borderRadius: 44,
      backgroundColor: "rgba(249,115,22,0.3)",
      borderWidth: 3,
      borderColor: "#F97316",
      justifyContent: "center",
      alignItems: "center",
    },
    progressBarContainer: {
      width: "100%",
      paddingHorizontal: spacing.md,
    },
    progressBarBg: {
      height: 4,
      backgroundColor: "rgba(255,255,255,0.15)",
      borderRadius: 2,
      overflow: "hidden",
    },
    progressBarFill: {
      height: "100%",
      backgroundColor: "#F97316",
      borderRadius: 2,
    },
    caption: {
      fontSize: typography.size.lg,
      fontWeight: "500",
      color: "#FFFFFF",
      textAlign: "center",
      marginBottom: spacing.lg,
      textShadowColor: "rgba(0,0,0,0.5)",
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 4,
    },
    reactionsRow: {
      flexDirection: "row",
      justifyContent: "center",
      gap: 8,
      marginBottom: spacing.lg,
    },
    reactionButton: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: "rgba(255,255,255,0.1)",
      justifyContent: "center",
      alignItems: "center",
    },
    reactionButtonActive: {
      backgroundColor: "rgba(249,115,22,0.3)",
      borderWidth: 2,
      borderColor: "#F97316",
    },
    reactionEmoji: {
      fontSize: 22,
    },
    closeButton: {
      alignSelf: "center",
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: "rgba(255,255,255,0.2)",
      justifyContent: "center",
      alignItems: "center",
    },
  });
