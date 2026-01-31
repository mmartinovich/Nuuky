import { useRef, useEffect } from "react";
import { Animated as RNAnimated, Easing } from "react-native";

interface UseSpeakingAnimationsProps {
  isCurrentUserSpeaking: boolean;
  isMuted: boolean;
}

export function useSpeakingAnimations({ isCurrentUserSpeaking, isMuted }: UseSpeakingAnimationsProps) {
  const buttonScaleAnim = useRef(new RNAnimated.Value(1)).current;
  const buttonGlowAnim = useRef(new RNAnimated.Value(1)).current;
  const ring1Anim = useRef(new RNAnimated.Value(0)).current;
  const ring2Anim = useRef(new RNAnimated.Value(0)).current;
  const ring3Anim = useRef(new RNAnimated.Value(0)).current;
  const ring4Anim = useRef(new RNAnimated.Value(0)).current;
  const ringAnims = [ring1Anim, ring2Anim, ring3Anim, ring4Anim];

  // Audio-reactive button pulsing
  useEffect(() => {
    if (!isMuted && isCurrentUserSpeaking) {
      const pulseAnimation = RNAnimated.loop(
        RNAnimated.sequence([
          RNAnimated.parallel([
            RNAnimated.timing(buttonScaleAnim, {
              toValue: 1.12,
              duration: 800,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: false,
            }),
            RNAnimated.timing(buttonGlowAnim, {
              toValue: 1.6,
              duration: 800,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: false,
            }),
          ]),
          RNAnimated.parallel([
            RNAnimated.timing(buttonScaleAnim, {
              toValue: 1,
              duration: 800,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: false,
            }),
            RNAnimated.timing(buttonGlowAnim, {
              toValue: 1,
              duration: 800,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: false,
            }),
          ]),
        ]),
      );
      pulseAnimation.start();
      return () => pulseAnimation.stop();
    } else {
      buttonScaleAnim.setValue(1);
      buttonGlowAnim.setValue(1);
    }
  }, [isMuted, isCurrentUserSpeaking]);

  // Animated rings
  useEffect(() => {
    if (!isMuted && isCurrentUserSpeaking) {
      const createRingAnimation = (ringAnim: RNAnimated.Value, delay: number) => {
        return RNAnimated.loop(
          RNAnimated.sequence([
            RNAnimated.delay(delay),
            RNAnimated.timing(ringAnim, {
              toValue: 1,
              duration: 1200,
              easing: Easing.out(Easing.ease),
              useNativeDriver: false,
            }),
            RNAnimated.timing(ringAnim, {
              toValue: 0,
              duration: 0,
              useNativeDriver: false,
            }),
          ])
        );
      };

      const animations = [
        createRingAnimation(ring1Anim, 0),
        createRingAnimation(ring2Anim, 300),
        createRingAnimation(ring3Anim, 600),
        createRingAnimation(ring4Anim, 900),
      ];

      animations.forEach((a) => a.start());
      return () => animations.forEach((a) => a.stop());
    } else {
      ring1Anim.setValue(0);
      ring2Anim.setValue(0);
      ring3Anim.setValue(0);
      ring4Anim.setValue(0);
    }
  }, [isMuted, isCurrentUserSpeaking]);

  return { buttonScaleAnim, buttonGlowAnim, ringAnims };
}
