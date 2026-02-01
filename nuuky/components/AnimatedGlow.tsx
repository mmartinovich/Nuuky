import React, { useEffect, useRef } from "react";
import { Animated, Dimensions, Easing } from "react-native";
import Svg, { Defs, RadialGradient, Stop, Rect } from "react-native-svg";
import { useTheme } from "../hooks/useTheme";
import { useLowPowerMode } from "../stores/appStore";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

const SVG_WIDTH = SCREEN_WIDTH * 2;
const SWEEP_RANGE = SCREEN_WIDTH * 0.25;
const DURATION = 14000;

export default function AnimatedGlow() {
  const { isDark } = useTheme();
  const lowPowerMode = useLowPowerMode();
  const translateX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Skip animation in low power mode
    if (lowPowerMode) {
      translateX.setValue(0);
      return;
    }

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(translateX, {
          toValue: SWEEP_RANGE,
          duration: DURATION / 2,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(translateX, {
          toValue: -SWEEP_RANGE,
          duration: DURATION,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(translateX, {
          toValue: 0,
          duration: DURATION / 2,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [translateX, lowPowerMode]);

  if (!isDark || lowPowerMode) {
    return null;
  }

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: "absolute",
        top: 0,
        left: -(SVG_WIDTH - SCREEN_WIDTH) / 2,
        width: SVG_WIDTH,
        height: SCREEN_HEIGHT,
        overflow: "visible",
        transform: [{ translateX }],
      }}
    >
      <Svg
        width={SVG_WIDTH}
        height={SCREEN_HEIGHT}
        style={{ overflow: "visible" }}
      >
        <Defs>
          <RadialGradient
            id="glow"
            cx="50%"
            cy="5%"
            rx="45%"
            ry="50%"
            fx="50%"
            fy="5%"
          >
            <Stop offset="0%" stopColor="#1F4080" stopOpacity="0.75" />
            <Stop offset="10%" stopColor="#1C3A75" stopOpacity="0.6" />
            <Stop offset="22%" stopColor="#19346A" stopOpacity="0.45" />
            <Stop offset="35%" stopColor="#162E5E" stopOpacity="0.3" />
            <Stop offset="50%" stopColor="#132852" stopOpacity="0.17" />
            <Stop offset="65%" stopColor="#0F1E3E" stopOpacity="0.07" />
            <Stop offset="80%" stopColor="#0D1A35" stopOpacity="0.02" />
            <Stop offset="100%" stopColor="#0B0E1A" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect
          x="0"
          y="0"
          width={SVG_WIDTH}
          height={SCREEN_HEIGHT}
          fill="url(#glow)"
        />
      </Svg>
    </Animated.View>
  );
}
