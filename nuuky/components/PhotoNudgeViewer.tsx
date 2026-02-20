import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
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
  const { theme, accent } = useTheme();
  const { markAsViewed, reactWithHeart, getTimeRemaining } = usePhotoNudge();

  const [isReacted, setIsReacted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reacting, setReacting] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const heartScale = useRef(new Animated.Value(1)).current;

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
  const timeRemainingText = timeRemaining
    ? timeRemaining.expired
      ? "Expired"
      : timeRemaining.hours > 0
      ? `${timeRemaining.hours}h ${timeRemaining.minutes}m left`
      : `${timeRemaining.minutes}m left`
    : "";

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
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Borderless photo with overlays */}
          <View style={[styles.photoWrapper, { marginTop: insets.top + 110, marginBottom: insets.bottom + 24 }]}>
            <View style={styles.photoCard}>
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
                  <ActivityIndicator color={accent.primary} size="large" />
                </View>
              )}

              {/* Top gradient - sender info */}
              {photoNudge && (
                <LinearGradient
                  colors={['rgba(0,0,0,0.6)', 'transparent']}
                  style={styles.topGradient}
                >
                  <View style={styles.senderRow}>
                    {senderAvatar ? (
                      <ExpoImage
                        source={{ uri: senderAvatar }}
                        style={styles.senderAvatar}
                        contentFit="cover"
                      />
                    ) : (
                      <View style={[styles.senderAvatar, styles.senderAvatarPlaceholder]}>
                        <Ionicons name="person" size={16} color="rgba(255,255,255,0.7)" />
                      </View>
                    )}
                    <View style={styles.senderText}>
                      <Text style={styles.senderName}>{senderName}</Text>
                      <Text style={styles.timeAgo}>{timeRemainingText}</Text>
                    </View>
                  </View>
                </LinearGradient>
              )}

              {/* Bottom gradient - caption + reaction */}
              {photoNudge && (
                <LinearGradient
                  colors={['transparent', 'rgba(0,0,0,0.7)']}
                  style={styles.bottomGradient}
                >
                  {photoNudge.caption && (
                    <Text style={styles.caption}>{photoNudge.caption}</Text>
                  )}

                  <View style={styles.actions}>
                    <TouchableOpacity
                      style={[
                        styles.heartButton,
                        isReacted && styles.heartButtonActive,
                      ]}
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
                  </View>
                </LinearGradient>
              )}
            </View>
          </View>

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
              Photo Moment
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
  },

  // Photo
  photoWrapper: {
    flex: 1,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  photoCard: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },

  // Top gradient overlay
  topGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  senderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  senderAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  senderAvatarPlaceholder: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  senderText: {
    flex: 1,
  },
  senderName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  timeAgo: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },

  // Bottom gradient overlay
  bottomGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 20,
  },
  caption: {
    fontSize: 17,
    fontWeight: '500',
    color: '#FFFFFF',
    marginBottom: 14,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heartButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heartButtonActive: {
    backgroundColor: 'rgba(239,68,68,0.25)',
  },
});
