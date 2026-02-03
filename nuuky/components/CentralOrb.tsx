import React, { useEffect, useRef, useMemo, memo } from "react";
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, Animated, Easing, Image } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import Svg, { Defs, RadialGradient, Stop, Circle } from "react-native-svg";
import * as Haptics from "expo-haptics";
import { getMoodImage } from "../lib/theme";
import { CustomMood, MoodSelfie } from "../types";
import { useTheme } from "../hooks/useTheme";
import { useLowPowerMode } from "../stores/appStore";

const { width, height } = Dimensions.get("window");
const ORB_SIZE = 180;
const CENTER_X = width / 2 - ORB_SIZE / 2;
const CENTER_Y = height / 2 - ORB_SIZE / 2 - 20;

interface CentralOrbProps {
  moodColor: string;
  glowColor: string;
  onPress?: () => void;
  hasActiveFlare: boolean;
  mood?: "good" | "neutral" | "not_great" | "reach_out";
  customMood?: CustomMood | null;
  moodSelfie?: MoodSelfie | null;
  isCustomMoodActive?: boolean;
  showHint?: boolean;
  statusText?: string;
}

function CentralOrbComponent({
  moodColor,
  glowColor,
  onPress,
  hasActiveFlare,
  mood = "neutral",
  customMood,
  moodSelfie,
  isCustomMoodActive = false,
  showHint = false,
  statusText,
}: CentralOrbProps) {
  const { theme, isDark } = useTheme();
  const lowPowerMode = useLowPowerMode();
  const breatheAnim = useRef(new Animated.Value(0)).current;
  const flareAnim = useRef(new Animated.Value(0)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const ambientAnim = useRef(new Animated.Value(0)).current;
  const ringAnim1 = useRef(new Animated.Value(0)).current;
  const ringAnim2 = useRef(new Animated.Value(0.6)).current;
  const hintAnim = useRef(new Animated.Value(0)).current;
  const hintOpacity = useRef(new Animated.Value(showHint ? 1 : 0)).current;

  useEffect(() => {
    // In low power mode, only run the essential breathe animation
    const breatheAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(breatheAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.bezier(0.4, 0, 0.2, 1),
          useNativeDriver: true,
        }),
        Animated.timing(breatheAnim, {
          toValue: 0,
          duration: 2000,
          easing: Easing.bezier(0.4, 0, 0.2, 1),
          useNativeDriver: true,
        }),
      ])
    );
    breatheAnimation.start();

    if (lowPowerMode) {
      // Reset secondary anims to static values
      bounceAnim.setValue(0);
      pulseAnim.setValue(0.5);
      ambientAnim.setValue(0.5);
      ringAnim1.setValue(0);
      ringAnim2.setValue(0);
      return () => { breatheAnimation.stop(); };
    }

    // Gentle bounce animation
    const bounceAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(bounceAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.bezier(0.25, 0.46, 0.45, 0.94),
          useNativeDriver: true,
        }),
        Animated.timing(bounceAnim, {
          toValue: 0,
          duration: 2000,
          easing: Easing.bezier(0.25, 0.46, 0.45, 0.94),
          useNativeDriver: true,
        }),
      ])
    );
    bounceAnimation.start();

    // Pulse animation for depth
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 1500,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );
    pulseAnimation.start();

    // Ambient glow - slower, async cycle (6s)
    const ambientAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(ambientAnim, {
          toValue: 1,
          duration: 3000,
          easing: Easing.bezier(0.3, 0, 0.7, 1),
          useNativeDriver: true,
        }),
        Animated.timing(ambientAnim, {
          toValue: 0,
          duration: 3000,
          easing: Easing.bezier(0.3, 0, 0.7, 1),
          useNativeDriver: true,
        }),
      ])
    );
    ambientAnimation.start();

    // Ring 1 - 8s cycle
    const ring1Animation = Animated.loop(
      Animated.sequence([
        Animated.timing(ringAnim1, {
          toValue: 1,
          duration: 4000,
          easing: Easing.bezier(0.4, 0, 0.2, 1),
          useNativeDriver: true,
        }),
        Animated.timing(ringAnim1, {
          toValue: 0,
          duration: 4000,
          easing: Easing.bezier(0.4, 0, 0.2, 1),
          useNativeDriver: true,
        }),
      ])
    );
    ring1Animation.start();

    // Ring 2 - 6s cycle (different speed)
    const ring2Animation = Animated.loop(
      Animated.sequence([
        Animated.timing(ringAnim2, {
          toValue: 1,
          duration: 3000,
          easing: Easing.bezier(0.3, 0, 0.6, 1),
          useNativeDriver: true,
        }),
        Animated.timing(ringAnim2, {
          toValue: 0,
          duration: 3000,
          easing: Easing.bezier(0.3, 0, 0.6, 1),
          useNativeDriver: true,
        }),
      ])
    );
    ring2Animation.start();

    // Cleanup on unmount
    return () => {
      breatheAnimation.stop();
      bounceAnimation.stop();
      pulseAnimation.stop();
      ambientAnimation.stop();
      ring1Animation.stop();
      ring2Animation.stop();
    };
  }, [lowPowerMode]);

  useEffect(() => {
    let flareAnimation: Animated.CompositeAnimation | null = null;

    if (hasActiveFlare) {
      flareAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(flareAnim, {
            toValue: 1,
            duration: 1200,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(flareAnim, {
            toValue: 0,
            duration: 1200,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      flareAnimation.start();
    } else {
      flareAnim.setValue(0);
    }

    // Cleanup on unmount
    return () => {
      flareAnimation?.stop();
    };
  }, [hasActiveFlare]);

  // Hint ring animation - pulses outward
  useEffect(() => {
    let hintAnimation: Animated.CompositeAnimation | null = null;
    let fadeAnimation: Animated.CompositeAnimation | null = null;

    if (showHint) {
      // Start pulsing animation
      hintAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(hintAnim, {
            toValue: 1,
            duration: 1500,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(hintAnim, {
            toValue: 0,
            duration: 1500,
            easing: Easing.in(Easing.quad),
            useNativeDriver: true,
          }),
        ])
      );
      hintAnimation.start();

      // Ensure opacity is visible
      hintOpacity.setValue(1);
    } else {
      // Fade out hint ring
      fadeAnimation = Animated.timing(hintOpacity, {
        toValue: 0,
        duration: 500,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      });
      fadeAnimation.start(() => {
        hintAnim.setValue(0);
      });
    }

    // Cleanup on unmount
    return () => {
      hintAnimation?.stop();
      fadeAnimation?.stop();
    };
  }, [showHint]);

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress?.();
  };

  // Memoize all interpolations to prevent recreation on every render
  const interpolations = useMemo(
    () => ({
      // Enhanced outer glow - more prominent
      outerGlowScale: breatheAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [1.0, 1.3],
      }),
      outerGlowOpacity: breatheAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0.5, 0.8],
      }),
      // Ambient deep glow - large, slow, async
      ambientScale: ambientAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [1.0, 1.15],
      }),
      ambientOpacity: ambientAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0.25, 0.45],
      }),
      // Hard ring 1 - 8s cycle
      hardRingScale: ringAnim1.interpolate({
        inputRange: [0, 1],
        outputRange: [0.05, 1.1],
      }),
      hardRingOpacity: ringAnim1.interpolate({
        inputRange: [0, 0.15, 0.5, 0.85, 1],
        outputRange: [0.006, 0.25, 0.01, 0.25, 0.006],
      }),
      // Hard ring 2 - 6s cycle, starts offset
      hardRing2Scale: ringAnim2.interpolate({
        inputRange: [0, 1],
        outputRange: [0.05, 1.15],
      }),
      hardRing2Opacity: ringAnim2.interpolate({
        inputRange: [0, 0.15, 0.5, 0.85, 1],
        outputRange: [0.006, 0.25, 0.01, 0.25, 0.006],
      }),
      // Mid glow for depth
      midGlowOpacity: pulseAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0.4, 0.7],
      }),
      // Inner orb scale - more noticeable breathing
      innerOrbScale: breatheAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [1.0, 1.06],
      }),
      // Gentle bounce
      bounceTranslate: bounceAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, -4],
      }),
      // Flare animations
      flareScale: flareAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [1.0, 1.5],
      }),
      flareOpacity: flareAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 0.8],
      }),
      // Hint ring interpolations
      hintRingScale: hintAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [1.0, 1.3],
      }),
      hintRingOpacity: hintAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0.8, 0.3],
      }),
    }),
    [breatheAnim, pulseAnim, bounceAnim, flareAnim, hintAnim, ambientAnim, ringAnim1, ringAnim2]
  );

  const moodImage = getMoodImage(mood);

  // Check if mood selfie should be shown (active, not expired, AND custom mood is selected)
  const showSelfie = useMemo(() => {
    if (!moodSelfie || !isCustomMoodActive) return false;
    return new Date(moodSelfie.expires_at) > new Date();
  }, [moodSelfie, isCustomMoodActive]);

  return (
    <Animated.View
      style={[
        styles.container,
        { left: CENTER_X, top: CENTER_Y },
        {
          transform: [{ translateY: interpolations.bounceTranslate }],
        },
      ]}
      pointerEvents="box-none"
    >
      {/* Hint Ring - Pulsing ring to indicate interactivity */}
      {showHint && (
        <Animated.View
          style={[
            styles.hintRing,
            {
              opacity: Animated.multiply(hintOpacity, interpolations.hintRingOpacity),
              transform: [{ scale: interpolations.hintRingScale }],
              borderColor: glowColor,
            },
          ]}
          pointerEvents="none"
        />
      )}

      {/* Emergency Flare Effect - soft radial glow */}
      {hasActiveFlare && (
        <Animated.View
          style={[
            styles.flareGlow,
            {
              transform: [{ scale: interpolations.flareScale }],
              opacity: interpolations.flareOpacity,
            },
          ]}
          pointerEvents="none"
        >
          {/* Outer soft layer */}
          <View style={[styles.flareCircle, { backgroundColor: "rgba(239, 68, 68, 0.06)" }]} />
          {/* Mid layer */}
          <View
            style={[styles.flareRing, { width: "75%", height: "75%", backgroundColor: "rgba(239, 68, 68, 0.10)" }]}
          />
          {/* Inner layer */}
          <View
            style={[styles.flareRing, { width: "50%", height: "50%", backgroundColor: "rgba(239, 68, 68, 0.15)" }]}
          />
          {/* Core glow */}
          <View
            style={[styles.flareRing, { width: "30%", height: "30%", backgroundColor: "rgba(239, 68, 68, 0.20)" }]}
          />
        </Animated.View>
      )}

      {/* Ambient Deep Glow - wide, subtle layer for depth */}
      <Animated.View
        style={[
          styles.glowLayer,
          {
            width: ORB_SIZE * 2.8,
            height: ORB_SIZE * 2.8,
            transform: [{ scale: interpolations.ambientScale }],
            opacity: interpolations.ambientOpacity,
          },
        ]}
        pointerEvents="none"
      >
        <Svg width="100%" height="100%" viewBox={`0 0 ${ORB_SIZE * 2.8} ${ORB_SIZE * 2.8}`}>
          <Defs>
            <RadialGradient id="ambientGlow" cx="50%" cy="50%" rx="50%" ry="50%">
              <Stop offset="0%" stopColor={moodColor} stopOpacity="0.35" />
              <Stop offset="20%" stopColor={glowColor} stopOpacity="0.25" />
              <Stop offset="45%" stopColor={moodColor} stopOpacity="0.12" />
              <Stop offset="70%" stopColor={glowColor} stopOpacity="0.05" />
              <Stop offset="100%" stopColor={glowColor} stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Circle cx={ORB_SIZE * 1.4} cy={ORB_SIZE * 1.4} r={ORB_SIZE * 1.4} fill="url(#ambientGlow)" />
        </Svg>
      </Animated.View>

      {/* Hard Ring - crisp accent ring */}
      <Animated.View
        style={[
          styles.glowLayer,
          {
            width: ORB_SIZE * 2.2,
            height: ORB_SIZE * 2.2,
            transform: [{ scale: interpolations.hardRingScale }],
            opacity: interpolations.hardRingOpacity,
          },
        ]}
        pointerEvents="none"
      >
        <View
          style={{
            width: '100%',
            height: '100%',
            borderRadius: 9999,
            borderWidth: 1.5,
            borderColor: glowColor,
          }}
        />
      </Animated.View>

      {/* Hard Ring 2 - second crisp ring on breathe cycle */}
      <Animated.View
        style={[
          styles.glowLayer,
          {
            width: ORB_SIZE * 2.2,
            height: ORB_SIZE * 2.2,
            transform: [{ scale: interpolations.hardRing2Scale }],
            opacity: interpolations.hardRing2Opacity,
          },
        ]}
        pointerEvents="none"
      >
        <View
          style={{
            width: '100%',
            height: '100%',
            borderRadius: 9999,
            borderWidth: 1,
            borderColor: moodColor,
          }}
        />
      </Animated.View>

      {/* Outer Glow - SVG radial gradient for soft fading edge */}
      <Animated.View
        style={[
          styles.glowLayer,
          {
            width: ORB_SIZE * 2,
            height: ORB_SIZE * 2,
            transform: [{ scale: interpolations.outerGlowScale }],
            opacity: interpolations.outerGlowOpacity,
          },
        ]}
        pointerEvents="none"
      >
        <Svg width="100%" height="100%" viewBox={`0 0 ${ORB_SIZE * 2} ${ORB_SIZE * 2}`}>
          <Defs>
            <RadialGradient id="outerGlow" cx="50%" cy="50%" rx="50%" ry="50%">
              <Stop offset="0%" stopColor={glowColor} stopOpacity="0.9" />
              <Stop offset="25%" stopColor={moodColor} stopOpacity="0.6" />
              <Stop offset="50%" stopColor={moodColor} stopOpacity="0.3" />
              <Stop offset="75%" stopColor={glowColor} stopOpacity="0.1" />
              <Stop offset="100%" stopColor={glowColor} stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Circle cx={ORB_SIZE} cy={ORB_SIZE} r={ORB_SIZE} fill="url(#outerGlow)" />
        </Svg>
      </Animated.View>

      {/* Mid Glow - SVG radial gradient for depth */}
      <Animated.View
        style={[
          styles.glowLayer,
          {
            width: ORB_SIZE * 1.4,
            height: ORB_SIZE * 1.4,
            opacity: interpolations.midGlowOpacity,
          },
        ]}
        pointerEvents="none"
      >
        <Svg width="100%" height="100%" viewBox={`0 0 ${ORB_SIZE * 1.4} ${ORB_SIZE * 1.4}`}>
          <Defs>
            <RadialGradient id="midGlow" cx="50%" cy="50%" rx="50%" ry="50%">
              <Stop offset="0%" stopColor={moodColor} stopOpacity="0.7" />
              <Stop offset="35%" stopColor={glowColor} stopOpacity="0.4" />
              <Stop offset="70%" stopColor={moodColor} stopOpacity="0.12" />
              <Stop offset="100%" stopColor={moodColor} stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Circle cx={ORB_SIZE * 0.7} cy={ORB_SIZE * 0.7} r={ORB_SIZE * 0.7} fill="url(#midGlow)" />
        </Svg>
      </Animated.View>

      {/* Status badge above orb */}
      {statusText ? (
        <View
          style={[styles.speechBubble, { borderColor: `${moodColor}80`, shadowColor: moodColor }]}
          pointerEvents="none"
        >
          <Text style={styles.innerStatusText} numberOfLines={1}>
            {statusText}
          </Text>
          <View style={styles.speechTail} />
        </View>
      ) : null}

      {/* Frosted Glass Orb - Enhanced */}
      <TouchableOpacity activeOpacity={0.85} onPress={handlePress}>
        <Animated.View
          style={[
            styles.innerOrb,
            {
              transform: [{ scale: interpolations.innerOrbScale }],
              shadowColor: moodColor,
            },
          ]}
        >
          {/* Glass background with stronger mood tint */}
          <BlurView intensity={70} tint="light" style={styles.glassBlur}>
            <LinearGradient
              colors={[`${moodColor}35`, `${glowColor}20`, `${moodColor}15`, theme.colors.glass.background]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.glassGradient}
            >
              {/* Enhanced white highlight - top-left shimmer */}
              <LinearGradient
                colors={
                  isDark
                    ? ["rgba(255, 255, 255, 0.4)", "rgba(255, 255, 255, 0.1)", "transparent"]
                    : ["rgba(0, 0, 0, 0.08)", "rgba(0, 0, 0, 0.03)", "transparent"]
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.highlight}
              />

              {/* Priority: selfie (only with custom mood) > customMood > presetMood */}
              {showSelfie && moodSelfie ? (
                <Image source={{ uri: moodSelfie.image_url }} style={styles.selfieImage} />
              ) : customMood ? (
                <Text style={styles.customMoodEmoji}>{customMood.emoji}</Text>
              ) : (
                <Image source={moodImage} style={styles.moodImage} />
              )}
            </LinearGradient>
          </BlurView>

          {/* Enhanced glass border with mood color */}
          <View style={[styles.glassBorder, { borderColor: `${moodColor}50` }]} />
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// Memoize component to prevent unnecessary re-renders
export const CentralOrb = memo(CentralOrbComponent, (prevProps, nextProps) => {
  return (
    prevProps.mood === nextProps.mood &&
    prevProps.hasActiveFlare === nextProps.hasActiveFlare &&
    prevProps.showHint === nextProps.showHint &&
    prevProps.customMood?.id === nextProps.customMood?.id &&
    prevProps.moodSelfie?.id === nextProps.moodSelfie?.id &&
    prevProps.moodSelfie?.expires_at === nextProps.moodSelfie?.expires_at &&
    prevProps.isCustomMoodActive === nextProps.isCustomMoodActive &&
    prevProps.statusText === nextProps.statusText
  );
});

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    width: ORB_SIZE,
    height: ORB_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  glowLayer: {
    position: "absolute",
    borderRadius: 9999,
    alignItems: "center",
    justifyContent: "center",
  },
  innerOrb: {
    width: ORB_SIZE,
    height: ORB_SIZE,
    borderRadius: 9999,
    overflow: "hidden",
    elevation: 25,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
  },
  glassBlur: {
    width: "100%",
    height: "100%",
    borderRadius: 9999,
    overflow: "hidden",
  },
  glassGradient: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  highlight: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "60%",
    height: "60%",
    borderRadius: 9999,
  },
  moodImage: {
    width: 150,
    height: 150,
    resizeMode: "contain",
    zIndex: 10,
  },
  selfieImage: {
    width: ORB_SIZE,
    height: ORB_SIZE,
    borderRadius: ORB_SIZE / 2,
    resizeMode: "cover",
    zIndex: 10,
  },
  customMoodEmoji: {
    fontSize: 80,
    textAlign: "center",
    zIndex: 10,
  },
  glassBorder: {
    position: "absolute",
    width: "100%",
    height: "100%",
    borderRadius: 9999,
    borderWidth: 2,
  },
  flareGlow: {
    position: "absolute",
    width: ORB_SIZE * 2.5,
    height: ORB_SIZE * 2.5,
    alignItems: "center",
    justifyContent: "center",
  },
  flareRing: {
    position: "absolute",
    borderRadius: 9999,
  },
  flareCircle: {
    width: "100%",
    height: "100%",
    borderRadius: 9999,
  },
  speechBubble: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    backgroundColor: "rgba(15, 25, 45, 0.65)",
    borderWidth: 1.2,
    borderColor: "rgba(255,255,255,0.3)",
    shadowColor: "#000",
    shadowOpacity: 0.6,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
    zIndex: 200,
    marginBottom: -30,
    alignItems: "center",
  },
  speechTail: {
    position: "absolute",
    bottom: -6,
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 6,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: "rgba(15, 25, 45, 0.65)",
  },
  innerStatusText: {
    fontSize: 12,
    fontWeight: "700",
    color: "rgba(255,255,255,0.95)",
    letterSpacing: 0.3,
    textAlign: "center",
    maxWidth: 130,
  },
  hintRing: {
    position: "absolute",
    width: ORB_SIZE * 1.4,
    height: ORB_SIZE * 1.4,
    borderRadius: 9999,
    borderWidth: 2,
    borderStyle: "solid",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 5,
  },
});
