import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Animated,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { CameraView, CameraType, useCameraPermissions } from "expo-camera";
import { Image as ExpoImage } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { useTheme } from "../../hooks/useTheme";
import { usePhotoNudge } from "../../hooks/usePhotoNudge";
import { spacing, radius, typography, interactionStates } from "../../lib/theme";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const MAX_CAPTION_LENGTH = 50;

export default function PhotoNudgeCameraScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const params = useLocalSearchParams<{
    friendId: string;
    friendName: string;
    friendAvatarUrl: string;
  }>();

  const [permission, requestPermission] = useCameraPermissions();
  const [cameraReady, setCameraReady] = useState(false);
  const [facing, setFacing] = useState<CameraType>("front");
  const [capturedUri, setCapturedUri] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [sending, setSending] = useState(false);

  const cameraRef = useRef<CameraView>(null);
  const flashAnim = useRef(new Animated.Value(0)).current;

  const { sendPhotoNudge, loading } = usePhotoNudge();

  const styles = createStyles(theme);

  // Request permission on mount if not granted
  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, [permission]);

  // Delay camera mount to avoid native crash on New Architecture
  useEffect(() => {
    if (permission?.granted && !capturedUri) {
      const timer = setTimeout(() => setCameraReady(true), 100);
      return () => clearTimeout(timer);
    }
  }, [permission?.granted, capturedUri]);

  const toggleCameraFacing = useCallback(() => {
    setFacing((current) => (current === "back" ? "front" : "back"));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const takePicture = useCallback(async () => {
    if (!cameraRef.current) return;

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // Flash animation
      Animated.sequence([
        Animated.timing(flashAnim, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(flashAnim, {
          toValue: 0,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();

      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.7,
        skipProcessing: false,
      });

      if (photo?.uri) {
        setCapturedUri(photo.uri);
        setCameraReady(false);
      }
    } catch (error) {
      console.error("Failed to take picture:", error);
    }
  }, []);

  const retakePicture = useCallback(() => {
    setCapturedUri(null);
    setCaption("");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const handleSend = useCallback(async () => {
    if (!capturedUri || !params.friendId || sending) return;

    setSending(true);
    try {
      const success = await sendPhotoNudge({
        receiverId: params.friendId,
        receiverName: params.friendName,
        imageUri: capturedUri,
        caption: caption.trim() || undefined,
      });

      if (success) {
        router.back();
      }
    } finally {
      setSending(false);
    }
  }, [capturedUri, params.friendId, params.friendName, caption, sendPhotoNudge, router]);

  const handleCancel = useCallback(() => {
    router.back();
  }, [router]);

  // Permission request screen
  if (!permission?.granted) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <StatusBar barStyle="light-content" />
        <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleCancel}
            activeOpacity={interactionStates.pressed}
          >
            <Ionicons name="close" size={28} color={theme.colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Photo Nudge</Text>
          <View style={styles.placeholderButton} />
        </View>
        <Ionicons name="camera-outline" size={64} color={theme.colors.text.tertiary} />
        <Text style={[styles.instruction, { marginTop: spacing.lg }]}>
          Camera access needed
        </Text>
        <Text style={[styles.subInstruction, { marginBottom: spacing.lg }]}>
          Allow camera access to send photo nudges
        </Text>
        <TouchableOpacity
          style={styles.permissionButton}
          onPress={requestPermission}
          activeOpacity={0.8}
        >
          <Text style={styles.permissionButtonText}>Allow Camera</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Preview mode (after taking picture)
  if (capturedUri) {
    return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <StatusBar barStyle="light-content" />

        {/* Preview Image */}
        <ExpoImage
          source={{ uri: capturedUri }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
        />

        {/* Gradient overlay at top */}
        <LinearGradient
          colors={["rgba(0,0,0,0.6)", "transparent"]}
          style={styles.topGradient}
        />

        {/* Header with friend info */}
        <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleCancel}
            activeOpacity={interactionStates.pressed}
          >
            <Ionicons name="close" size={28} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.friendInfo}>
            {params.friendAvatarUrl ? (
              <ExpoImage
                source={{ uri: params.friendAvatarUrl }}
                style={styles.friendAvatar}
                contentFit="cover"
              />
            ) : (
              <View style={[styles.friendAvatar, styles.friendAvatarPlaceholder]}>
                <Ionicons name="person" size={16} color={theme.colors.text.tertiary} />
              </View>
            )}
            <Text style={styles.friendName} numberOfLines={1}>
              To: {params.friendName}
            </Text>
          </View>

          <View style={styles.placeholderButton} />
        </View>

        {/* Bottom gradient */}
        <LinearGradient
          colors={["transparent", "rgba(0,0,0,0.8)"]}
          style={styles.bottomGradient}
        >
          {/* Caption input */}
          <View style={styles.captionContainer}>
            <TextInput
              style={styles.captionInput}
              placeholder="Add a caption..."
              placeholderTextColor="rgba(255,255,255,0.5)"
              value={caption}
              onChangeText={(text) => setCaption(text.slice(0, MAX_CAPTION_LENGTH))}
              maxLength={MAX_CAPTION_LENGTH}
              multiline={false}
              returnKeyType="done"
            />
            <Text style={styles.captionCount}>
              {caption.length}/{MAX_CAPTION_LENGTH}
            </Text>
          </View>

          {/* Action buttons */}
          <View style={[styles.previewActions, { paddingBottom: insets.bottom + spacing.md }]}>
            <TouchableOpacity
              style={styles.retakeButton}
              onPress={retakePicture}
              activeOpacity={0.7}
            >
              <Ionicons name="refresh" size={24} color="#FFFFFF" />
              <Text style={styles.retakeButtonText}>Retake</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.sendButton, (sending || loading) && styles.sendButtonDisabled]}
              onPress={handleSend}
              activeOpacity={0.8}
              disabled={sending || loading}
            >
              {sending || loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Ionicons name="send" size={20} color="#FFFFFF" />
                  <Text style={styles.sendButtonText}>Send</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </KeyboardAvoidingView>
    );
  }

  // Camera mode
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Camera */}
      {cameraReady && (
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing={facing}
          mirror={facing === "front"}
          flash="off"
        />
      )}

      {/* Flash overlay */}
      <Animated.View
        style={[styles.flashOverlay, { opacity: flashAnim }]}
        pointerEvents="none"
      />

      {/* Gradient overlay at top */}
      <LinearGradient
        colors={["rgba(0,0,0,0.5)", "transparent"]}
        style={styles.topGradient}
      />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleCancel}
          activeOpacity={interactionStates.pressed}
        >
          <Ionicons name="close" size={28} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={styles.friendInfo}>
          {params.friendAvatarUrl ? (
            <ExpoImage
              source={{ uri: params.friendAvatarUrl }}
              style={styles.friendAvatar}
              contentFit="cover"
            />
          ) : (
            <View style={[styles.friendAvatar, styles.friendAvatarPlaceholder]}>
              <Ionicons name="person" size={16} color={theme.colors.text.tertiary} />
            </View>
          )}
          <Text style={styles.friendName} numberOfLines={1}>
            To: {params.friendName}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.flipButton}
          onPress={toggleCameraFacing}
          activeOpacity={0.7}
        >
          <Ionicons name="camera-reverse" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Bottom gradient with capture button */}
      <LinearGradient
        colors={["transparent", "rgba(0,0,0,0.6)"]}
        style={styles.bottomGradient}
      >
        <View style={[styles.captureContainer, { paddingBottom: insets.bottom + spacing.lg }]}>
          {/* Capture button */}
          <TouchableOpacity
            style={styles.captureButton}
            onPress={takePicture}
            activeOpacity={0.8}
          >
            <View style={styles.captureButtonInner} />
          </TouchableOpacity>
        </View>

        <Text style={styles.hintText}>Tap to capture</Text>
      </LinearGradient>
    </View>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>["theme"]) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: "#000000",
    },
    topGradient: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      height: 150,
    },
    bottomGradient: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      paddingTop: spacing["3xl"],
    },
    flashOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "#FFFFFF",
    },
    header: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: spacing.screenPadding || 24,
      paddingBottom: spacing.md,
      zIndex: 10,
    },
    backButton: {
      width: 44,
      height: 44,
      justifyContent: "center",
      alignItems: "center",
      marginLeft: -8,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: "700",
      color: theme.colors.text.primary,
      letterSpacing: -0.3,
    },
    placeholderButton: {
      width: 44,
    },
    flipButton: {
      width: 44,
      height: 44,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: "rgba(255,255,255,0.15)",
      borderRadius: 22,
    },
    friendInfo: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "rgba(0,0,0,0.3)",
      borderRadius: radius.full,
      paddingVertical: 6,
      paddingHorizontal: 12,
      paddingRight: 16,
    },
    friendAvatar: {
      width: 28,
      height: 28,
      borderRadius: 14,
      marginRight: 8,
    },
    friendAvatarPlaceholder: {
      backgroundColor: theme.colors.glass.background,
      justifyContent: "center",
      alignItems: "center",
    },
    friendName: {
      fontSize: typography.size.sm,
      fontWeight: "600",
      color: "#FFFFFF",
      maxWidth: 120,
    },
    captureContainer: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: spacing.xl,
    },
    captureButton: {
      width: 80,
      height: 80,
      borderRadius: 40,
      borderWidth: 4,
      borderColor: "#FFFFFF",
      justifyContent: "center",
      alignItems: "center",
      padding: 4,
    },
    captureButtonInner: {
      width: "100%",
      height: "100%",
      borderRadius: 36,
      backgroundColor: "#FFFFFF",
    },
    hintText: {
      fontSize: typography.size.sm,
      color: "rgba(255,255,255,0.6)",
      textAlign: "center",
      marginBottom: spacing.lg,
    },
    instruction: {
      fontSize: typography.size.lg,
      fontWeight: "600",
      color: theme.colors.text.primary,
      textAlign: "center",
      marginBottom: spacing.xs,
    },
    subInstruction: {
      fontSize: typography.size.sm,
      color: theme.colors.text.secondary,
      textAlign: "center",
    },
    permissionButton: {
      backgroundColor: theme.colors.text.primary,
      paddingVertical: 14,
      paddingHorizontal: 32,
      borderRadius: radius.lg,
    },
    permissionButtonText: {
      color: theme.colors.bg.primary,
      fontSize: typography.size.md,
      fontWeight: "600",
    },
    captionContainer: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "rgba(255,255,255,0.15)",
      borderRadius: radius.lg,
      marginHorizontal: spacing.xl,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      marginBottom: spacing.lg,
    },
    captionInput: {
      flex: 1,
      fontSize: typography.size.md,
      color: "#FFFFFF",
      paddingVertical: 0,
    },
    captionCount: {
      fontSize: typography.size.xs,
      color: "rgba(255,255,255,0.5)",
      marginLeft: spacing.sm,
    },
    previewActions: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: spacing.xl,
      gap: spacing.md,
    },
    retakeButton: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "rgba(255,255,255,0.2)",
      paddingVertical: 14,
      paddingHorizontal: 24,
      borderRadius: radius.lg,
      gap: spacing.xs,
    },
    retakeButtonText: {
      fontSize: typography.size.md,
      fontWeight: "600",
      color: "#FFFFFF",
    },
    sendButton: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#A855F7",
      paddingVertical: 14,
      paddingHorizontal: 24,
      borderRadius: radius.lg,
      gap: spacing.xs,
    },
    sendButtonDisabled: {
      opacity: 0.6,
    },
    sendButtonText: {
      fontSize: typography.size.md,
      fontWeight: "600",
      color: "#FFFFFF",
    },
  });
