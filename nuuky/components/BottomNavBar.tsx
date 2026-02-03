import React, { useEffect, useRef, useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions, PanResponder } from "react-native";
import { Animated as RNAnimated, Easing } from "react-native";
import { Feather, Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

interface BottomNavBarProps {
  accent: { primary: string; soft: string; glow: string; gradient: [string, string]; textOnPrimary: string };
  theme: any;
  isMuted: boolean;
  isAudioConnecting: boolean;
  hasDefaultRoom: boolean;
  myActiveFlare: any;
  ringAnims: RNAnimated.Value[];
  buttonScaleAnim: RNAnimated.Value;
  buttonGlowAnim: RNAnimated.Value;
  onMicToggle: () => void;
  onFlarePress: () => void;
  onFriendsPress: () => void;
  onRoomsPress: () => void;
  onSettingsPress: () => void;
  onSwipeUpMic?: () => void;
  bottomInset: number;
}

const AnimatedIonicons = RNAnimated.createAnimatedComponent(Ionicons);

// Swipe threshold for triggering sound reactions picker
const SWIPE_UP_THRESHOLD = -30;

export const BottomNavBar = React.memo(function BottomNavBar({
  accent,
  theme,
  isMuted,
  isAudioConnecting,
  hasDefaultRoom,
  myActiveFlare,
  ringAnims,
  buttonScaleAnim,
  buttonGlowAnim,
  onMicToggle,
  onFlarePress,
  onFriendsPress,
  onRoomsPress,
  onSettingsPress,
  onSwipeUpMic,
  bottomInset,
}: BottomNavBarProps) {
  // Morph animation between mic states
  const iconMorph = useRef(new RNAnimated.Value(1)).current;
  const prevMuted = useRef(isMuted);

  useEffect(() => {
    if (prevMuted.current !== isMuted) {
      prevMuted.current = isMuted;
      iconMorph.setValue(0);
      RNAnimated.timing(iconMorph, {
        toValue: 1,
        duration: 200,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start();
    }
  }, [isMuted]);

  // PanResponder for detecting swipe-up gesture on mic button
  const micPanResponder = useMemo(() => {
    let startY = 0;
    let didSwipe = false;

    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only capture if vertical movement is significant
        return Math.abs(gestureState.dy) > 10;
      },
      onPanResponderGrant: (_, gestureState) => {
        startY = gestureState.y0;
        didSwipe = false;
      },
      onPanResponderMove: (_, gestureState) => {
        // Check for swipe up
        if (!didSwipe && gestureState.dy < SWIPE_UP_THRESHOLD) {
          didSwipe = true;
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          onSwipeUpMic?.();
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        // If no swipe detected and it was a tap, trigger mic toggle
        if (!didSwipe && Math.abs(gestureState.dy) < 10 && Math.abs(gestureState.dx) < 10) {
          onMicToggle();
        }
      },
    });
  }, [onMicToggle, onSwipeUpMic]);

  return (
    <View style={[styles.bottomNav, { paddingBottom: Math.max(bottomInset, 8) }]} pointerEvents="box-none">
      {/* Floating center button */}
      <View style={styles.floatingButtonWrapper} pointerEvents="box-none">
        {/* Animated rings - only visible when speaking */}
        {!isMuted &&
          ringAnims.map((ringAnim, index) => (
            <RNAnimated.View
              key={`ring-${index}`}
              pointerEvents="none"
              style={[
                styles.speakingRing,
                {
                  borderColor: accent.primary,
                  transform: [
                    {
                      scale: ringAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [1, 2.2 + index * 0.15],
                      }),
                    },
                  ],
                  opacity: ringAnim.interpolate({
                    inputRange: [0, 0.3, 1],
                    outputRange: [0.6, 0.4, 0],
                  }),
                },
              ]}
            />
          ))}
        <RNAnimated.View
          style={[
            styles.floatingButton,
            {
              transform: [{ scale: buttonScaleAnim }],
              backgroundColor: isMuted ? "transparent" : accent.primary,
              borderColor: accent.primary,
              shadowColor: accent.primary,
              shadowOpacity: isMuted
                ? 0.2
                : buttonGlowAnim.interpolate({
                    inputRange: [1, 1.6],
                    outputRange: [0.6, 0.9],
                  }),
              shadowRadius: isMuted
                ? 8
                : buttonGlowAnim.interpolate({
                    inputRange: [1, 1.6],
                    outputRange: [15, 30],
                  }),
            },
          ]}
          {...micPanResponder.panHandlers}
        >
          <View
            style={styles.floatingButtonInner}
            accessibilityLabel={isMuted ? "Unmute microphone. Swipe up for sound reactions" : "Mute microphone. Swipe up for sound reactions"}
            accessibilityRole="button"
          >
            <RNAnimated.View style={{ transform: [{ scale: iconMorph }], opacity: iconMorph }}>
              <Ionicons name={isMuted ? "mic-off" : "mic"} size={28} color={isMuted ? accent.primary : accent.textOnPrimary} />
            </RNAnimated.View>
          </View>
        </RNAnimated.View>
      </View>

      {/* Navigation bar with SVG shape */}
      <View style={styles.navBarWrapper}>
        <View style={[styles.navBarFill, { backgroundColor: theme.colors.nav.background }]} />
        <Image
          source={require("../assets/nav-bar-shape.png")}
          style={[styles.navBarShape, { tintColor: theme.colors.nav.background }]}
          resizeMode="stretch"
        />
        <View style={styles.navBarContent}>
          {/* Left icons */}
          <View style={styles.navSection}>
            <TouchableOpacity
              onPress={onFlarePress}
              activeOpacity={0.7}
              disabled={!!myActiveFlare}
              style={styles.navTab}
              accessibilityLabel="Send flare"
              accessibilityRole="button"
            >
              <Ionicons name="flame" size={26} color="#FF3B30" />
              <Text style={[styles.navLabel, { color: theme.colors.text.tertiary }]}>Flare</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onFriendsPress}
              activeOpacity={0.7}
              style={styles.navTab}
              accessibilityLabel="Friends"
              accessibilityRole="button"
            >
              <Feather name="users" size={24} color={theme.colors.text.secondary} />
              <Text style={[styles.navLabel, { color: theme.colors.text.tertiary }]}>Friends</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.centerGap} />

          {/* Right icons */}
          <View style={styles.navSection}>
            <TouchableOpacity
              onPress={onRoomsPress}
              activeOpacity={0.7}
              style={styles.navTab}
              accessibilityLabel="Rooms"
              accessibilityRole="button"
            >
              <Ionicons name="grid-outline" size={24} color={theme.colors.text.secondary} />
              <Text style={[styles.navLabel, { color: theme.colors.text.tertiary }]}>Rooms</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onSettingsPress}
              activeOpacity={0.7}
              style={styles.navTab}
              accessibilityLabel="Settings"
              accessibilityRole="button"
            >
              <Feather name="settings" size={24} color={theme.colors.text.tertiary} />
              <Text style={[styles.navLabel, { color: theme.colors.text.tertiary }]}>Settings</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  bottomNav: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  navBarWrapper: {
    width: "100%",
    height: 70,
    position: "relative",
  },
  navBarFill: {
    position: "absolute",
    top: 40,
    left: -16,
    right: -16,
    bottom: -100,
  },
  navBarShape: {
    position: "absolute",
    top: 0,
    left: -16,
    right: -16,
    bottom: 0,
    width: Dimensions.get("window").width,
    height: "100%",
  },
  navBarContent: {
    position: "absolute",
    top: 8,
    left: 0,
    right: 0,
    height: 60,
    flexDirection: "row",
    alignItems: "center",
  },
  navSection: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-evenly",
    height: "100%",
  },
  centerGap: {
    width: 72,
  },
  floatingButtonWrapper: {
    position: "absolute",
    top: -18,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 20,
  },
  floatingButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
    borderWidth: 2,
  },
  speakingRing: {
    position: "absolute",
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1.5,
  },
  floatingButtonInner: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 27,
  },
  navTab: {
    alignItems: "center",
    justifyContent: "center",
    width: 52,
    height: 52,
  },
  navLabel: {
    fontSize: 10,
    fontWeight: "500",
    letterSpacing: 0.1,
    marginTop: 2,
  },
});
