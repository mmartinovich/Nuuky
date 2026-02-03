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
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useTheme } from "../hooks/useTheme";
import { usePhotoNudge } from "../hooks/usePhotoNudge";
import { PhotoNudge, User } from "../types";
import { spacing, radius, typography } from "../lib/theme";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

interface PhotoNudgeViewerProps {
  visible: boolean;
  photoNudge: PhotoNudge | null;
  onClose: () => void;
}

export function PhotoNudgeViewer({
  visible,
  photoNudge,
  onClose,
}: PhotoNudgeViewerProps) {
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const { markAsViewed, reactWithHeart, getTimeRemaining } = usePhotoNudge();

  const [isReacted, setIsReacted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reacting, setReacting] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const heartScale = useRef(new Animated.Value(1)).current;

  const styles = createStyles(theme);

  // Animation on open
  useEffect(() => {
    if (visible) {
      setLoading(true);
      setIsReacted(photoNudge?.reaction === "heart");
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

      // Mark as viewed when opened
      if (photoNudge?.id && !photoNudge.viewed_at) {
        markAsViewed(photoNudge.id);
      }
    } else {
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.9);
    }
  }, [visible, photoNudge?.id]);

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
      onClose();
    });
  }, [onClose]);

  const handleReact = useCallback(async () => {
    if (!photoNudge?.id || reacting) return;

    setReacting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Animate heart
    Animated.sequence([
      Animated.timing(heartScale, {
        toValue: 1.4,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.spring(heartScale, {
        toValue: 1,
        tension: 200,
        friction: 10,
        useNativeDriver: true,
      }),
    ]).start();

    const success = await reactWithHeart(photoNudge.id);
    if (success) {
      setIsReacted(!isReacted);
    }
    setReacting(false);
  }, [photoNudge?.id, isReacted, reacting, reactWithHeart]);

  const timeRemaining = photoNudge ? getTimeRemaining(photoNudge.expires_at) : null;

  // Format time remaining text
  const timeRemainingText = timeRemaining
    ? timeRemaining.expired
      ? "Expired"
      : timeRemaining.hours > 0
      ? `${timeRemaining.hours}h ${timeRemaining.minutes}m left`
      : `${timeRemaining.minutes}m left`
    : "";

  // Get sender info
  const sender = photoNudge?.sender as User | undefined;
  const senderName = sender?.display_name || "Someone";
  const senderAvatar = sender?.avatar_url;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
        {/* Background blur */}
        <BlurView intensity={80} style={StyleSheet.absoluteFill} tint="dark" />

        {/* Dismiss on background tap */}
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={handleClose}
        />

        {/* Photo card */}
        <Animated.View
          style={[
            styles.photoCard,
            {
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Photo */}
          {photoNudge && (
            <ExpoImage
              source={{ uri: photoNudge.image_url }}
              style={styles.photo}
              contentFit="cover"
              onLoadEnd={() => setLoading(false)}
            />
          )}

          {/* Loading indicator */}
          {(loading || !photoNudge) && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color="#FFFFFF" size="large" />
            </View>
          )}

          {/* Top gradient with sender info */}
          {photoNudge && (
            <LinearGradient
              colors={["rgba(0,0,0,0.6)", "transparent"]}
              style={[styles.topGradient, { paddingTop: 20 }]}
            >
              <View style={styles.senderInfo}>
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
              </View>
            </LinearGradient>
          )}

          {/* Bottom gradient with caption and reaction */}
          {photoNudge && (
            <LinearGradient
              colors={["transparent", "rgba(0,0,0,0.7)"]}
              style={styles.bottomGradient}
            >
              {/* Caption */}
              {photoNudge.caption && (
                <Text style={styles.caption}>{photoNudge.caption}</Text>
              )}

              {/* Actions */}
              <View style={[styles.actions, { paddingBottom: 20 }]}>
                {/* Heart reaction button */}
                <TouchableOpacity
                  style={[styles.reactionButton, isReacted && styles.reactionButtonActive]}
                  onPress={handleReact}
                  activeOpacity={0.7}
                  disabled={reacting}
                >
                  <Animated.View style={{ transform: [{ scale: heartScale }] }}>
                    <Ionicons
                      name={isReacted ? "heart" : "heart-outline"}
                      size={28}
                      color={isReacted ? "#EF4444" : "#FFFFFF"}
                    />
                  </Animated.View>
                </TouchableOpacity>

                {/* Close button */}
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={handleClose}
                  activeOpacity={0.7}
                >
                  <Ionicons name="close" size={24} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </LinearGradient>
          )}
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
    photoCard: {
      width: SCREEN_WIDTH - 32,
      height: SCREEN_HEIGHT * 0.7,
      borderRadius: radius.xl,
      overflow: "hidden",
      backgroundColor: "#000000",
    },
    photo: {
      width: "100%",
      height: "100%",
    },
    loadingContainer: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: "rgba(0,0,0,0.3)",
    },
    topGradient: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.xl,
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
    bottomGradient: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      paddingHorizontal: spacing.md,
      paddingTop: spacing["3xl"],
    },
    caption: {
      fontSize: typography.size.lg,
      fontWeight: "500",
      color: "#FFFFFF",
      marginBottom: spacing.md,
      textShadowColor: "rgba(0,0,0,0.5)",
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 4,
    },
    actions: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingTop: spacing.md,
    },
    reactionButton: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: "rgba(255,255,255,0.2)",
      justifyContent: "center",
      alignItems: "center",
    },
    reactionButtonActive: {
      backgroundColor: "rgba(239,68,68,0.2)",
    },
    closeButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: "rgba(255,255,255,0.2)",
      justifyContent: "center",
      alignItems: "center",
    },
  });
