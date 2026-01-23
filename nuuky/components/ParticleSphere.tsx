import React, { useMemo, useEffect, useRef } from 'react';
import { View, StyleSheet, TouchableWithoutFeedback, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { colors } from '../lib/theme';

// Conditional Skia import - falls back if not available (e.g., in Expo Go)
let SkiaComponents: {
  Canvas: any;
  Circle: any;
  Group: any;
  Paint: any;
  BlurMask: any;
} | null = null;

try {
  const skia = require('@shopify/react-native-skia');
  SkiaComponents = {
    Canvas: skia.Canvas,
    Circle: skia.Circle,
    Group: skia.Group,
    Paint: skia.Paint,
    BlurMask: skia.BlurMask,
  };
} catch (e) {
  // Skia not available (e.g., in Expo Go) - will use fallback
  console.warn('react-native-skia not available, using fallback component');
}

interface Particle {
  x: number;
  y: number;
  z: number;
  baseSize: number;
}

interface ParticleSphereProps {
  size?: number;
  particleCount?: number;
}

// Vibrant gradient colors matching the sphere images
const SPHERE_GRADIENT_COLORS = [
  ['#EC4899', '#DB2777'], // Magenta/Pink
  ['#A855F7', '#9333EA'], // Purple
  ['#3B82F6', '#2563EB'], // Blue
  ['#06B6D4', '#0891B2'], // Cyan
];

// Interpolate between gradient colors for smooth transitions
function getGradientForIndex(index: number, progress: number): string[] {
  const currentGrad = SPHERE_GRADIENT_COLORS[index % SPHERE_GRADIENT_COLORS.length];
  const nextGrad = SPHERE_GRADIENT_COLORS[(index + 1) % SPHERE_GRADIENT_COLORS.length];
  
  // Simple interpolation - could be improved with proper color mixing
  if (progress < 0.5) {
    return currentGrad;
  }
  return nextGrad;
}

function interpolateColor(color1: string, color2: string, factor: number): string {
  // Simple hex interpolation (for better results, use a color library)
  const hex1 = color1.replace('#', '');
  const hex2 = color2.replace('#', '');
  const r1 = parseInt(hex1.substring(0, 2), 16);
  const g1 = parseInt(hex1.substring(2, 4), 16);
  const b1 = parseInt(hex1.substring(4, 6), 16);
  const r2 = parseInt(hex2.substring(0, 2), 16);
  const g2 = parseInt(hex2.substring(2, 4), 16);
  const b2 = parseInt(hex2.substring(4, 6), 16);
  
  const r = Math.round(r1 + (r2 - r1) * factor);
  const g = Math.round(g1 + (g2 - g1) * factor);
  const b = Math.round(b1 + (b2 - b1) * factor);
  
  return `#${[r, g, b].map(x => x.toString(16).padStart(2, '0')).join('')}`;
}

// Fibonacci sphere algorithm for even distribution
function generateFibonacciSphere(count: number): Particle[] {
  const particles: Particle[] = [];
  const goldenAngle = Math.PI * (3 - Math.sqrt(5)); // ~137.5 degrees

  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2; // y from 1 to -1
    const radius = Math.sqrt(1 - y * y); // radius at y

    const theta = goldenAngle * i;

    const x = Math.cos(theta) * radius;
    const z = Math.sin(theta) * radius;

    // Random base size variation
    const baseSize = 2 + Math.random() * 3; // 2-5px

    particles.push({ x, y, z, baseSize });
  }

  return particles;
}

export default function ParticleSphere({
  size = 280,
  particleCount = 180
}: ParticleSphereProps) {
  // Generate particles once
  const particles = useMemo(() => generateFibonacciSphere(particleCount), [particleCount]);

  // Animation values using standard Animated API
  const rotationY = useRef(new Animated.Value(0)).current;
  const burstScale = useRef(new Animated.Value(1)).current;
  const colorIndexAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const [rotationValue, setRotationValue] = React.useState(0);
  const [colorProgress, setColorProgress] = React.useState(0);
  const [burstValue, setBurstValue] = React.useState(1);
  const [pulseValue, setPulseValue] = React.useState(1);

  // Listen to animation values
  useEffect(() => {
    const rotId = rotationY.addListener(({ value }) => setRotationValue(value));
    const burstId = burstScale.addListener(({ value }) => setBurstValue(value));
    const pulseId = pulseAnim.addListener(({ value }) => setPulseValue(value));
    const colorId = colorIndexAnim.addListener(({ value }) => {
      // Normalize to 0-1 for smooth color transitions
      setColorProgress((value % 4) / 4);
    });

    return () => {
      rotationY.removeListener(rotId);
      burstScale.removeListener(burstId);
      pulseAnim.removeListener(pulseId);
      colorIndexAnim.removeListener(colorId);
    };
  }, []);

  // Auto-rotate animation
  useEffect(() => {
    // Rotation: 0 to 2π over 20 seconds, looping
    const rotationAnimation = Animated.loop(
      Animated.timing(rotationY, {
        toValue: Math.PI * 2,
        duration: 20000,
        useNativeDriver: true,
      })
    );
    rotationAnimation.start();

    // Color cycling: 0 to 4 over 24 seconds (6s per color)
    const colorAnimation = Animated.loop(
      Animated.timing(colorIndexAnim, {
        toValue: 4,
        duration: 24000,
        useNativeDriver: true,
      })
    );
    colorAnimation.start();

    // Subtle pulsing animation for breathing effect
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 3000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: true,
        }),
      ])
    );
    pulseAnimation.start();

    // Cleanup on unmount
    return () => {
      rotationAnimation.stop();
      colorAnimation.stop();
      pulseAnimation.stop();
    };
  }, []);

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Burst animation
    Animated.sequence([
      Animated.spring(burstScale, {
        toValue: 1.3,
        friction: 4,
        tension: 100,
        useNativeDriver: true,
      }),
      Animated.timing(burstScale, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const centerX = size / 2;
  const centerY = size / 2;
  const sphereRadius = size * 0.4;
  
  // Get current gradient colors based on animation progress
  const colorIndex = Math.floor(colorProgress * SPHERE_GRADIENT_COLORS.length);
  const gradientProgress = (colorProgress * SPHERE_GRADIENT_COLORS.length) % 1;
  const currentGradient = getGradientForIndex(colorIndex, gradientProgress);

  // Fallback component for when Skia is not available (Expo Go)
  if (!SkiaComponents) {
    return (
      <TouchableWithoutFeedback onPress={handlePress}>
        <View style={[styles.container, { width: size, height: size }]}>
          <Animated.View
            style={[
              styles.fallbackContainer,
              {
                width: size,
                height: size,
                transform: [
                  { scale: burstScale },
                ],
              },
            ]}
          >
            {/* Render all particles for full effect */}
            {particles.map((particle, index) => {
              const cosY = Math.cos(rotationValue);
              const sinY = Math.sin(rotationValue);
              const rotatedX = particle.x * cosY - particle.z * sinY;
              const rotatedY = particle.y;
              const rotatedZ = particle.x * sinY + particle.z * cosY;
              const screenX = centerX + rotatedX * sphereRadius * burstValue;
              const screenY = centerY + rotatedY * sphereRadius * burstValue;
              
              // Enhanced depth effects with pulsing
              const depthFactor = (rotatedZ + 1) / 2; // 0 to 1
              const baseParticleSize = particle.baseSize * (1.0 + depthFactor * 1.5);
              const particleSize = baseParticleSize * burstValue * pulseValue;
              const particleOpacity = 0.6 + depthFactor * 0.35;
              
              // Color varies based on position and depth for gradient effect
              const angle = Math.atan2(rotatedY, rotatedX);
              const normalizedAngle = (angle + Math.PI) / (2 * Math.PI);
              const colorMix = (normalizedAngle + depthFactor * 0.3) % 1;
              
              // Create gradient color based on position
              const particleColor = interpolateColor(
                currentGradient[0],
                currentGradient[1],
                colorMix
              );

              return (
                <View
                  key={index}
                  style={[
                    styles.fallbackParticle,
                    {
                      left: screenX,
                      top: screenY,
                      width: particleSize * 3,
                      height: particleSize * 3,
                      transform: [{ translateX: -particleSize * 1.5 }, { translateY: -particleSize * 1.5 }],
                    },
                  ]}
                >
                  <LinearGradient
                    colors={[
                      particleColor,
                      interpolateColor(particleColor, '#FFFFFF', 0.3),
                      particleColor,
                    ]}
                    style={[
                      styles.gradientParticle,
                      {
                        width: particleSize * 3,
                        height: particleSize * 3,
                        borderRadius: particleSize * 1.5,
                        opacity: particleOpacity,
                      },
                    ]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  />
                  {/* Glow effect layer - outer glow */}
                  <View
                    style={[
                      styles.glowLayer,
                      {
                        width: particleSize * 5,
                        height: particleSize * 5,
                        borderRadius: particleSize * 2.5,
                        backgroundColor: particleColor,
                        opacity: particleOpacity * 0.4,
                        transform: [{ translateX: -particleSize * 1 }, { translateY: -particleSize * 1 }],
                      },
                    ]}
                  />
                  {/* Inner glow layer for more depth */}
                  <View
                    style={[
                      styles.glowLayer,
                      {
                        width: particleSize * 3.5,
                        height: particleSize * 3.5,
                        borderRadius: particleSize * 1.75,
                        backgroundColor: interpolateColor(particleColor, '#FFFFFF', 0.5),
                        opacity: particleOpacity * 0.5,
                        transform: [{ translateX: -particleSize * 0.25 }, { translateY: -particleSize * 0.25 }],
                      },
                    ]}
                  />
                </View>
              );
            })}
          </Animated.View>
        </View>
      </TouchableWithoutFeedback>
    );
  }

  // Skia version (requires development build)
  const { Canvas, Circle, Group, Paint, BlurMask } = SkiaComponents;
  return (
    <TouchableWithoutFeedback onPress={handlePress}>
      <View style={[styles.container, { width: size, height: size }]}>
        <Canvas style={{ width: size, height: size }}>
          <Group>
            {particles.map((particle, index) => {
              // Rotate particle around Y-axis
              const cosY = Math.cos(rotationValue);
              const sinY = Math.sin(rotationValue);

              const rotatedX = particle.x * cosY - particle.z * sinY;
              const rotatedY = particle.y;
              const rotatedZ = particle.x * sinY + particle.z * cosY;

              // Project 3D to 2D
              const screenX = centerX + rotatedX * sphereRadius * burstValue;
              const screenY = centerY + rotatedY * sphereRadius * burstValue;

              // Z-depth effects (particles closer to camera are larger and more opaque)
              const depthFactor = (rotatedZ + 1) / 2; // 0 to 1
              const particleSize = particle.baseSize * (0.8 + depthFactor * 1.2);
              const particleOpacity = 0.5 + depthFactor * 0.4;
              
              // Color varies based on position for gradient effect
              const angle = Math.atan2(rotatedY, rotatedX);
              const normalizedAngle = (angle + Math.PI) / (2 * Math.PI);
              const colorMix = (normalizedAngle + depthFactor * 0.3) % 1;
              const particleColor = interpolateColor(
                currentGradient[0],
                currentGradient[1],
                colorMix
              );

              return (
                <Circle
                  key={index}
                  cx={screenX}
                  cy={screenY}
                  r={particleSize}
                  opacity={particleOpacity}
                >
                  <Paint color={particleColor}>
                    <BlurMask blur={particleSize * 2} style="solid" />
                  </Paint>
                </Circle>
              );
            })}
          </Group>
        </Canvas>
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  fallbackContainer: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fallbackParticle: {
    position: 'absolute',
  },
  gradientParticle: {
    position: 'absolute',
  },
  glowLayer: {
    position: 'absolute',
  },
});
