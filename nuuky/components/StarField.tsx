import React, { useEffect, useMemo, useRef } from 'react';
import { View, StyleSheet, Dimensions, Animated, Easing } from 'react-native';

const { width, height } = Dimensions.get('window');
const STAR_COUNT = 50;

interface Star {
  id: number;
  x: number;
  y: number;
  size: number;
  opacity: number;
  duration: number;
  delay: number;
}

export function StarField() {
  // Generate random stars
  const stars = useMemo(() => {
    return Array.from({ length: STAR_COUNT }, (_, i) => ({
      id: i,
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 1.5 + 0.5,
      opacity: Math.random() * 0.3 + 0.1,
      duration: Math.random() * 4000 + 3000,
      delay: Math.random() * 2000,
    })) as Star[];
  }, []);

  return (
    <View style={styles.container} pointerEvents="none">
      {stars.map((star) => (
        <StarParticle key={star.id} star={star} />
      ))}
    </View>
  );
}

interface StarParticleProps {
  star: Star;
}

function StarParticle({ star }: StarParticleProps) {
  const twinkleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let twinkleAnimation: Animated.CompositeAnimation | null = null;
    
    // Start twinkling after delay
    const timeout = setTimeout(() => {
      twinkleAnimation = Animated.loop(
        Animated.timing(twinkleAnim, {
          toValue: 1,
          duration: 4000,
          easing: Easing.ease,
          useNativeDriver: true,
        })
      );
      twinkleAnimation.start();
    }, star.delay);

    // Cleanup on unmount
    return () => {
      clearTimeout(timeout);
      twinkleAnimation?.stop();
    };
  }, []);

  const opacity = twinkleAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [star.opacity * 0.6, star.opacity, star.opacity * 0.6],
  });

  const scale = twinkleAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.8, 1, 0.8],
  });

  return (
    <Animated.View
      style={[
        styles.star,
        {
          left: star.x,
          top: star.y,
          width: star.size,
          height: star.size,
          opacity,
          transform: [{ scale }],
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
  },
  star: {
    position: 'absolute',
    backgroundColor: '#ffffff',
    borderRadius: 9999,
    shadowColor: '#ffffff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 1,
    elevation: 1,
  },
});
