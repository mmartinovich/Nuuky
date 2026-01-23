import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Dimensions, TouchableOpacity, Animated, Easing, Image } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { getMoodImage } from "../lib/theme";

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
  showHint?: boolean;
}

export function CentralOrb({
  moodColor,
  glowColor,
  onPress,
  hasActiveFlare,
  mood = "neutral",
  showHint = false,
}: CentralOrbProps) {
  const breatheAnim = useRef(new Animated.Value(0)).current;
  const flareAnim = useRef(new Animated.Value(0)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const hintAnim = useRef(new Animated.Value(0)).current;
  const hintOpacity = useRef(new Animated.Value(showHint ? 1 : 0)).current;

  useEffect(() => {
    // Refined breathing animation - slower, more elegant (4s cycle)
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

    // Cleanup on unmount
    return () => {
      breatheAnimation.stop();
      bounceAnimation.stop();
      pulseAnimation.stop();
    };
  }, []);

  useEffect(() => {
    let flareAnimation: Animated.CompositeAnimation | null = null;
    
    if (hasActiveFlare) {
      flareAnimation = Animated.loop(
        Animated.timing(flareAnim, {
          toValue: 1,
          duration: 400,
          easing: Easing.ease,
          useNativeDriver: true,
        })
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

  // Enhanced outer glow - more prominent
  const outerGlowScale = breatheAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1.0, 1.3],
  });

  const outerGlowOpacity = breatheAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.5],
  });

  // Mid glow for depth
  const midGlowOpacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.2, 0.4],
  });

  // Inner orb scale - more noticeable breathing
  const innerOrbScale = breatheAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1.0, 1.06],
  });

  // Gentle bounce
  const bounceTranslate = bounceAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -4],
  });

  const flareScale = flareAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1.0, 1.5],
  });

  const flareOpacity = flareAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.8],
  });

  const moodImage = getMoodImage(mood);

  // Hint ring interpolations
  const hintRingScale = hintAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1.0, 1.3],
  });

  const hintRingOpacity = hintAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.8, 0.3],
  });

  return (
    <Animated.View
      style={[
        styles.container,
        { left: CENTER_X, top: CENTER_Y },
        {
          transform: [{ translateY: bounceTranslate }],
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
              opacity: Animated.multiply(hintOpacity, hintRingOpacity),
              transform: [{ scale: hintRingScale }],
              borderColor: glowColor,
            },
          ]}
          pointerEvents="none"
        />
      )}

      {/* Emergency Flare Effect */}
      {hasActiveFlare && (
        <Animated.View
          style={[
            styles.flareGlow,
            {
              transform: [{ scale: flareScale }],
              opacity: flareOpacity,
            },
          ]}
          pointerEvents="none"
        >
          <LinearGradient
            colors={["rgba(244, 112, 182, 0.4)", "rgba(236, 72, 153, 0.2)", "transparent"]}
            style={styles.flareCircle}
          />
        </Animated.View>
      )}

      {/* Outer Glow - Enhanced mood-colored glow */}
      <Animated.View
        style={[
          styles.glowLayer,
          styles.outerGlow,
          {
            transform: [{ scale: outerGlowScale }],
            opacity: outerGlowOpacity,
          },
        ]}
        pointerEvents="none"
      >
        <BlurView intensity={60} tint="dark" style={styles.blurCircle}>
          <LinearGradient colors={[`${glowColor}80`, `${moodColor}60`, "transparent"]} style={styles.glowCircle} />
        </BlurView>
      </Animated.View>

      {/* Mid Glow - Pulsing layer for depth */}
      <Animated.View
        style={[
          styles.glowLayer,
          styles.midGlow,
          {
            opacity: midGlowOpacity,
          },
        ]}
        pointerEvents="none"
      >
        <BlurView intensity={45} tint="dark" style={styles.blurCircle}>
          <LinearGradient colors={[`${moodColor}50`, `${glowColor}30`, "transparent"]} style={styles.glowCircle} />
        </BlurView>
      </Animated.View>

      {/* Frosted Glass Orb - Enhanced */}
      <TouchableOpacity activeOpacity={0.85} onPress={handlePress}>
        <Animated.View
          style={[
            styles.innerOrb,
            {
              transform: [{ scale: innerOrbScale }],
              shadowColor: moodColor,
            },
          ]}
        >
          {/* Glass background with stronger mood tint */}
          <BlurView intensity={70} tint="light" style={styles.glassBlur}>
            <LinearGradient
              colors={[`${moodColor}35`, `${glowColor}20`, `${moodColor}15`, "rgba(255, 255, 255, 0.08)"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.glassGradient}
            >
              {/* Enhanced white highlight - top-left shimmer */}
              <LinearGradient
                colors={["rgba(255, 255, 255, 0.4)", "rgba(255, 255, 255, 0.1)", "transparent"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.highlight}
              />

              {/* Mood creature image in center */}
              <Image source={moodImage} style={styles.moodImage} />
            </LinearGradient>
          </BlurView>

          {/* Enhanced glass border with mood color */}
          <View style={[styles.glassBorder, { borderColor: `${moodColor}50` }]} />
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
}

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
  },
  outerGlow: {
    width: ORB_SIZE * 1.6,
    height: ORB_SIZE * 1.6,
  },
  midGlow: {
    width: ORB_SIZE * 1.2,
    height: ORB_SIZE * 1.2,
  },
  blurCircle: {
    width: "100%",
    height: "100%",
    borderRadius: 9999,
    overflow: "hidden",
  },
  glowCircle: {
    width: "100%",
    height: "100%",
    borderRadius: 9999,
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
    resizeMode: 'contain',
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
  },
  flareCircle: {
    width: "100%",
    height: "100%",
    borderRadius: 9999,
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
