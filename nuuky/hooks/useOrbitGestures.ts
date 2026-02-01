import { useRef, useState, useEffect } from "react";
import { Animated as RNAnimated, PanResponder, Easing, Dimensions } from "react-native";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

export function useOrbitGestures() {
  const orbitAngle = useRef(new RNAnimated.Value(0)).current;
  const orbitAngleValueRef = useRef(0);
  const orbitVelocity = useRef(0);
  const lastAngleRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(Date.now());
  const decayAnimationRef = useRef<RNAnimated.CompositeAnimation | null>(null);
  const decayListenerRef = useRef<string | null>(null);
  const isSpinningRef = useRef(false);
  const [isSpinning, setIsSpinning] = useState(false);
  // Cleanup animation listeners on unmount
  useEffect(() => {
    return () => {
      if (decayAnimationRef.current) {
        decayAnimationRef.current.stop();
        decayAnimationRef.current = null;
      }
      if (decayListenerRef.current) {
        orbitAngle.removeListener(decayListenerRef.current);
        decayListenerRef.current = null;
      }
    };
  }, []);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_evt, gestureState) => {
        return Math.abs(gestureState.dx) > 15 || Math.abs(gestureState.dy) > 15;
      },
      onPanResponderTerminationRequest: () => true,
      onShouldBlockNativeResponder: () => false,
      onPanResponderGrant: (event) => {
        lastTimeRef.current = Date.now();
        if (decayAnimationRef.current) {
          decayAnimationRef.current.stop();
          decayAnimationRef.current = null;
        }
        if (decayListenerRef.current) {
          orbitAngle.removeListener(decayListenerRef.current);
          decayListenerRef.current = null;
        }
        orbitVelocity.current = 0;
        isSpinningRef.current = true;
        setIsSpinning(true);
        const touchX = event.nativeEvent.pageX;
        const touchY = event.nativeEvent.pageY;
        lastAngleRef.current = Math.atan2(touchY - SCREEN_HEIGHT / 2, touchX - SCREEN_WIDTH / 2);
      },
      onPanResponderMove: (event) => {
        if (lastAngleRef.current === null) return;
        const touchX = event.nativeEvent.pageX;
        const touchY = event.nativeEvent.pageY;
        const currentAngle = Math.atan2(touchY - SCREEN_HEIGHT / 2, touchX - SCREEN_WIDTH / 2);
        let deltaAngle = currentAngle - lastAngleRef.current;
        if (deltaAngle > Math.PI) deltaAngle -= 2 * Math.PI;
        else if (deltaAngle < -Math.PI) deltaAngle += 2 * Math.PI;

        if (Math.abs(deltaAngle) < 0.001) return;

        const newValue = orbitAngleValueRef.current + deltaAngle;
        orbitAngleValueRef.current = newValue;
        orbitAngle.setValue(newValue);

        const currentTime = Date.now();
        const deltaTime = currentTime - lastTimeRef.current;
        if (deltaTime > 0) {
          orbitVelocity.current = (deltaAngle / deltaTime) * 1000;
        }
        lastTimeRef.current = currentTime;
        lastAngleRef.current = currentAngle;
      },
      onPanResponderRelease: () => {
        const velocity = orbitVelocity.current;
        if (Math.abs(velocity) > 0.1) {
          const targetValue = orbitAngleValueRef.current + velocity * 1.5;
          decayAnimationRef.current = RNAnimated.timing(orbitAngle, {
            toValue: targetValue,
            duration: Math.min(Math.abs(velocity) * 800, 2000),
            useNativeDriver: false,
            easing: Easing.out(Easing.cubic),
          });
          const listenerId = orbitAngle.addListener(({ value }) => {
            orbitAngleValueRef.current = value;
          });
          decayListenerRef.current = listenerId;
          decayAnimationRef.current.start(() => {
            orbitAngle.removeListener(listenerId);
            decayListenerRef.current = null;
            orbitVelocity.current = 0;
            decayAnimationRef.current = null;
            isSpinningRef.current = false;
            setIsSpinning(false);
          });
        } else {
          isSpinningRef.current = false;
          setIsSpinning(false);
        }
        lastAngleRef.current = null;
      },
    }),
  ).current;

  return {
    panResponder,
    orbitAngle,
    orbitAngleValueRef,
    isSpinning,
  };
}
