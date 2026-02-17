import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { Image as ExpoImage } from "expo-image";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { Audio } from "expo-av";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
} from "react-native-reanimated";
import { useTheme } from "../../hooks/useTheme";
import { useVoiceMoment } from "../../hooks/useVoiceMoment";
import { spacing, typography, interactionStates } from "../../lib/theme";

const MAX_CAPTION_LENGTH = 50;
const MAX_DURATION_S = 30;

type RecorderState = "idle" | "recording" | "preview" | "sending";

export default function VoiceMomentRecorderScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme, accent } = useTheme();
  const params = useLocalSearchParams<{
    friendId: string;
    friendName: string;
    friendAvatarUrl: string;
  }>();

  const [state, setState] = useState<RecorderState>("idle");
  const [caption, setCaption] = useState("");
  const [recordedUri, setRecordedUri] = useState<string | null>(null);
  const [recordedDurationMs, setRecordedDurationMs] = useState(0);

  // Preview playback
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const previewSoundRef = useRef<Audio.Sound | null>(null);

  const {
    isRecording,
    recordingDurationMs,
    meteringLevel,
    startRecording,
    stopRecording,
    cancelRecording,
    sendVoiceMoment,
    loading,
  } = useVoiceMoment();

  // Reanimated pulse
  const pulseScale = useSharedValue(1);

  useEffect(() => {
    if (isRecording) {
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.15, { duration: 600, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 600, easing: Easing.inOut(Easing.ease) })
        ),
        -1
      );
    } else {
      pulseScale.value = withTiming(1, { duration: 200 });
    }
  }, [isRecording]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  // Clean up preview sound on unmount
  useEffect(() => {
    return () => {
      if (previewSoundRef.current) {
        previewSoundRef.current.unloadAsync().catch(() => {});
      }
    };
  }, []);

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const handleRecord = useCallback(async () => {
    if (state === "idle") {
      const success = await startRecording();
      if (success) {
        setState("recording");
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    } else if (state === "recording") {
      const result = await stopRecording();
      if (result) {
        setRecordedUri(result.uri);
        setRecordedDurationMs(result.durationMs);
        setState("preview");
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } else {
        setState("idle");
      }
    }
  }, [state, startRecording, stopRecording]);

  const handleRetake = useCallback(async () => {
    if (previewSoundRef.current) {
      await previewSoundRef.current.unloadAsync().catch(() => {});
      previewSoundRef.current = null;
      setIsPreviewPlaying(false);
    }
    setRecordedUri(null);
    setRecordedDurationMs(0);
    setCaption("");
    setState("idle");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const handlePreviewToggle = useCallback(async () => {
    if (!recordedUri) return;

    if (isPreviewPlaying && previewSoundRef.current) {
      await previewSoundRef.current.pauseAsync();
      setIsPreviewPlaying(false);
      return;
    }

    try {
      if (previewSoundRef.current) {
        const status = await previewSoundRef.current.getStatusAsync();
        if (status.isLoaded && status.didJustFinish) {
          await previewSoundRef.current.replayAsync();
        } else {
          await previewSoundRef.current.playAsync();
        }
      } else {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
        });
        const { sound } = await Audio.Sound.createAsync(
          { uri: recordedUri },
          { shouldPlay: true },
          (status: any) => {
            if (status.isLoaded && status.didJustFinish) {
              setIsPreviewPlaying(false);
            }
          }
        );
        previewSoundRef.current = sound;
      }
      setIsPreviewPlaying(true);
    } catch (error) {
      console.error("Preview playback error:", error);
    }
  }, [recordedUri, isPreviewPlaying]);

  const handleSend = useCallback(async () => {
    if (!recordedUri || !params.friendId || state === "sending") return;

    setState("sending");
    try {
      const success = await sendVoiceMoment({
        receiverId: params.friendId,
        receiverName: params.friendName,
        audioUri: recordedUri,
        durationMs: recordedDurationMs,
        caption: caption.trim() || undefined,
      });

      if (success) {
        router.back();
      } else {
        setState("preview");
      }
    } catch {
      setState("preview");
    }
  }, [recordedUri, params.friendId, params.friendName, caption, recordedDurationMs, sendVoiceMoment, router, state]);

  const handleCancel = useCallback(async () => {
    if (isRecording) {
      await cancelRecording();
    }
    if (previewSoundRef.current) {
      await previewSoundRef.current.unloadAsync().catch(() => {});
    }
    router.back();
  }, [isRecording, cancelRecording, router]);

  // Metering visualization: normalize -160..0 dB to 0..1
  const normalizedLevel = Math.max(0, Math.min(1, (meteringLevel + 160) / 160));
  const ringSize = 140 + normalizedLevel * 40;

  const isPreview = state === "preview" || state === "sending";

  return (
    <KeyboardAvoidingView
      style={styles.fullScreen}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <StatusBar barStyle="light-content" />

      {/* Blur backdrop */}
      <BlurView intensity={50} tint="dark" style={StyleSheet.absoluteFill}>
        <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.5)" }]} />
      </BlurView>

      {/* Header gradient overlay */}
      <LinearGradient
        colors={["rgba(0,0,0,0.95)", "rgba(0,0,0,0.85)", "rgba(0,0,0,0.5)", "transparent"]}
        locations={[0, 0.4, 0.7, 1]}
        style={[styles.headerOverlay, { paddingTop: insets.top + 8 }]}
        pointerEvents="box-none"
      >
        <View style={styles.headerRow} pointerEvents="box-none">
          <TouchableOpacity
            style={[styles.closeButton, { backgroundColor: theme.colors.glass.background }]}
            onPress={handleCancel}
            activeOpacity={interactionStates.pressed}
          >
            <Ionicons name="close" size={22} color={theme.colors.text.primary} />
          </TouchableOpacity>
        </View>

        <Text style={[styles.headerTitle, { color: theme.colors.text.primary }]}>
          Voice Moment
        </Text>

        {/* Friend pill */}
        <View style={[styles.friendPill, { backgroundColor: theme.colors.glass.background, borderColor: theme.colors.glass.border }]}>
          {params.friendAvatarUrl ? (
            <ExpoImage
              source={{ uri: params.friendAvatarUrl }}
              style={styles.friendAvatar}
              contentFit="cover"
            />
          ) : (
            <View style={[styles.friendAvatar, styles.friendAvatarPlaceholder, { backgroundColor: theme.colors.glass.border }]}>
              <Ionicons name="person" size={14} color={theme.colors.text.tertiary} />
            </View>
          )}
          <Text style={[styles.friendName, { color: theme.colors.text.secondary }]} numberOfLines={1}>
            For {params.friendName}
          </Text>
        </View>
      </LinearGradient>

      {/* Main content */}
      <View style={[styles.content, { paddingTop: insets.top + 160 }]}>
        {/* Recording card */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text.tertiary }]}>
            {isPreview ? "PREVIEW" : isRecording ? "RECORDING" : "RECORD"}
          </Text>

          <View style={[styles.glassCard, { backgroundColor: theme.colors.glass.background, borderColor: theme.colors.glass.border }]}>
            {/* Record / Preview area */}
            <View style={styles.recordArea}>
              {isPreview ? (
                // Preview playback button
                <TouchableOpacity
                  style={[styles.playButton, { backgroundColor: accent.primary + "20" }]}
                  onPress={handlePreviewToggle}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={isPreviewPlaying ? "pause" : "play"}
                    size={32}
                    color={accent.primary}
                    style={isPreviewPlaying ? undefined : { marginLeft: 4 }}
                  />
                </TouchableOpacity>
              ) : (
                // Record button with metering ring
                <View style={styles.recordButtonWrapper}>
                  {isRecording && (
                    <View
                      style={[
                        styles.meteringRing,
                        {
                          width: ringSize,
                          height: ringSize,
                          borderRadius: ringSize / 2,
                          backgroundColor: accent.primary,
                          opacity: 0.15 + normalizedLevel * 0.2,
                        },
                      ]}
                    />
                  )}
                  <TouchableOpacity
                    style={[
                      styles.recordButton,
                      {
                        borderColor: theme.colors.glass.border,
                      },
                    ]}
                    onPress={handleRecord}
                    activeOpacity={0.8}
                  >
                    <Animated.View
                      style={[
                        styles.recordButtonInner,
                        {
                          backgroundColor: isRecording ? "#EF4444" : accent.primary,
                        },
                        isRecording ? pulseStyle : undefined,
                      ]}
                    >
                      <Ionicons
                        name={isRecording ? "stop" : "mic"}
                        size={isRecording ? 28 : 36}
                        color="#FFFFFF"
                      />
                    </Animated.View>
                  </TouchableOpacity>
                </View>
              )}

              {/* Timer / Duration */}
              <View style={styles.timerRow}>
                {isPreview ? (
                  <Text style={[styles.durationText, { color: theme.colors.text.primary }]}>
                    {formatTime(recordedDurationMs)}
                  </Text>
                ) : (
                  <>
                    <Text
                      style={[
                        styles.timerText,
                        { color: isRecording ? theme.colors.text.primary : theme.colors.text.tertiary },
                      ]}
                    >
                      {formatTime(recordingDurationMs)}
                    </Text>
                    <Text style={[styles.timerSeparator, { color: theme.colors.text.tertiary }]}>
                      /
                    </Text>
                    <Text style={[styles.timerText, { color: theme.colors.text.tertiary }]}>
                      {formatTime(MAX_DURATION_S * 1000)}
                    </Text>
                  </>
                )}
              </View>

              <Text style={[styles.hintText, { color: theme.colors.text.tertiary }]}>
                {isPreview
                  ? "Tap to preview your recording"
                  : isRecording
                    ? "Tap to stop"
                    : "Tap to record (max 30s)"}
              </Text>
            </View>
          </View>
        </View>

        {/* Caption (preview only) */}
        {isPreview && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text.tertiary }]}>
              CAPTION
            </Text>
            <View style={[styles.glassCard, styles.captionCard, { backgroundColor: theme.colors.glass.background, borderColor: theme.colors.glass.border }]}>
              <TextInput
                style={[styles.captionInput, { color: theme.colors.text.primary }]}
                placeholder="Add a caption..."
                placeholderTextColor={theme.colors.text.tertiary}
                value={caption}
                onChangeText={(text) => setCaption(text.slice(0, MAX_CAPTION_LENGTH))}
                maxLength={MAX_CAPTION_LENGTH}
                multiline={false}
                returnKeyType="done"
              />
              <Text style={[styles.captionCount, { color: theme.colors.text.tertiary }]}>
                {caption.length}/{MAX_CAPTION_LENGTH}
              </Text>
            </View>
          </View>
        )}

        {/* Action buttons (preview only) */}
        {isPreview && (
          <View style={[styles.actionRow, { paddingBottom: insets.bottom + spacing.lg }]}>
            <TouchableOpacity
              style={[styles.retakeButton, { backgroundColor: theme.colors.glass.background, borderColor: theme.colors.glass.border }]}
              onPress={handleRetake}
              activeOpacity={0.7}
            >
              <Ionicons name="refresh" size={20} color={theme.colors.text.primary} />
              <Text style={[styles.retakeText, { color: theme.colors.text.primary }]}>Retake</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.sendButton, { backgroundColor: accent.primary }, state === "sending" && styles.sendButtonDisabled]}
              onPress={handleSend}
              activeOpacity={0.8}
              disabled={state === "sending"}
            >
              {state === "sending" ? (
                <ActivityIndicator color={accent.textOnPrimary} size="small" />
              ) : (
                <>
                  <Ionicons name="send" size={18} color={accent.textOnPrimary} />
                  <Text style={[styles.sendText, { color: accent.textOnPrimary }]}>Send</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  fullScreen: {
    flex: 1,
    backgroundColor: "#000",
  },
  headerOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingBottom: 20,
    zIndex: 10,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: "700",
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  friendPill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    borderRadius: 20,
    borderWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 12,
    paddingRight: 16,
    gap: 8,
  },
  friendAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  friendAvatarPlaceholder: {
    justifyContent: "center",
    alignItems: "center",
  },
  friendName: {
    fontSize: 14,
    fontWeight: "500",
    maxWidth: 180,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  glassCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  recordArea: {
    alignItems: "center",
    paddingVertical: 32,
    paddingHorizontal: 16,
  },
  recordButtonWrapper: {
    justifyContent: "center",
    alignItems: "center",
    width: 180,
    height: 180,
  },
  meteringRing: {
    position: "absolute",
  },
  recordButton: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 3,
    justifyContent: "center",
    alignItems: "center",
    padding: 4,
  },
  recordButtonInner: {
    width: "100%",
    height: "100%",
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  playButton: {
    width: 88,
    height: 88,
    borderRadius: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  timerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 20,
  },
  timerText: {
    fontSize: 24,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },
  timerSeparator: {
    fontSize: 24,
    marginHorizontal: 4,
  },
  durationText: {
    fontSize: 24,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },
  hintText: {
    fontSize: 13,
    marginTop: 8,
  },
  captionCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  captionInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
  },
  captionCount: {
    fontSize: 11,
    marginLeft: 8,
  },
  actionRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: "auto",
    paddingHorizontal: 0,
  },
  retakeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1,
    gap: 6,
  },
  retakeText: {
    fontSize: 15,
    fontWeight: "600",
  },
  sendButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 16,
    gap: 6,
  },
  sendButtonDisabled: {
    opacity: 0.6,
  },
  sendText: {
    fontSize: 15,
    fontWeight: "600",
  },
});
