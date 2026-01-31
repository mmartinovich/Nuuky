import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions, Alert } from "react-native";
import { Animated as RNAnimated } from "react-native";
import { Feather, Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

interface BottomNavBarProps {
  accent: { primary: string; soft: string; glow: string; gradient: [string, string] };
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
  bottomInset: number;
}

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
  bottomInset,
}: BottomNavBarProps) {
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
            isAudioConnecting && { opacity: 0.7 },
          ]}
        >
          <TouchableOpacity
            onPress={onMicToggle}
            activeOpacity={0.85}
            style={styles.floatingButtonInner}
            disabled={isAudioConnecting}
            accessibilityLabel={isMuted ? "Unmute microphone" : "Mute microphone"}
            accessibilityRole="button"
          >
            {isAudioConnecting ? (
              <Ionicons name="hourglass" size={28} color={isMuted ? accent.primary : "#FFFFFF"} />
            ) : (
              <Ionicons name={isMuted ? "mic-off" : "mic"} size={28} color={isMuted ? accent.primary : "#FFFFFF"} />
            )}
          </TouchableOpacity>
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
