import React, { useRef, useMemo, ReactNode } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  PanResponder,
  Animated as RNAnimated,
  Easing,
} from 'react-native';
import { CentralOrb } from './CentralOrb';
import { FriendParticle } from './FriendParticle';
import { User } from '../types';
import { getMoodColor } from '../lib/theme';

const { width, height } = Dimensions.get('window');
const CENTER_X = width / 2;
const CENTER_Y = height / 2;

interface OrbitViewProps {
  participants: User[];
  currentUser: User;
  onParticipantPress?: (user: User) => void;
  onCentralOrbPress?: () => void;
  headerContent?: ReactNode;
  footerContent?: ReactNode;
}

export const OrbitView: React.FC<OrbitViewProps> = ({
  participants,
  currentUser,
  onParticipantPress,
  onCentralOrbPress,
  headerContent,
  footerContent,
}) => {
  // Orbit animation state
  const orbitAngle = useRef(new RNAnimated.Value(0)).current;
  const orbitAngleValueRef = useRef(0);
  const lastAngleRef = useRef<number | null>(null);
  const orbitVelocity = useRef(0);
  const lastTimeRef = useRef<number>(Date.now());
  const decayAnimationRef = useRef<RNAnimated.CompositeAnimation | null>(null);

  // Pan gesture handler for drag-to-spin rotation
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (evt, gestureState) => {
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
        orbitVelocity.current = 0;
        const touchX = event.nativeEvent.pageX;
        const touchY = event.nativeEvent.pageY;
        lastAngleRef.current = Math.atan2(touchY - height / 2, touchX - width / 2);
      },
      onPanResponderMove: (event) => {
        if (lastAngleRef.current === null) return;
        const touchX = event.nativeEvent.pageX;
        const touchY = event.nativeEvent.pageY;
        const currentAngle = Math.atan2(touchY - height / 2, touchX - width / 2);
        let deltaAngle = currentAngle - lastAngleRef.current;
        if (deltaAngle > Math.PI) deltaAngle -= 2 * Math.PI;
        else if (deltaAngle < -Math.PI) deltaAngle += 2 * Math.PI;

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
            useNativeDriver: true, // Run on native thread for smooth animation
            easing: Easing.out(Easing.cubic),
          });
          const listenerId = orbitAngle.addListener(({ value }) => {
            orbitAngleValueRef.current = value;
          });
          decayAnimationRef.current.start(() => {
            orbitAngle.removeListener(listenerId);
            orbitVelocity.current = 0;
            decayAnimationRef.current = null;
          });
        }
        lastAngleRef.current = null;
      },
    })
  ).current;

  // Calculate positions for participants
  const calculateParticipantPositions = (count: number) => {
    if (count === 0) return [];

    const positions: Array<{ x: number; y: number }> = [];
    const PARTICLE_SIZE = 60;
    const ORBITAL_MARGIN = 20;
    const minDistance = PARTICLE_SIZE + ORBITAL_MARGIN;

    const safeZoneTop = 200;
    const safeZoneBottom = height - 150;
    const safeZoneLeft = 50;
    const safeZoneRight = width - 50;

    const maxRadiusX = Math.min(CENTER_X - safeZoneLeft, safeZoneRight - CENTER_X);
    const maxRadiusY = Math.min(CENTER_Y - safeZoneTop, safeZoneBottom - CENTER_Y);
    const maxRadius = Math.min(maxRadiusX, maxRadiusY) - PARTICLE_SIZE / 2;

    let baseRadius = 140;
    const radiusStep = 40;
    const maxLayers = 3;

    for (let i = 0; i < count; i++) {
      const baseAngle = (i / count) * 2 * Math.PI;
      let placed = false;
      let layer = 0;

      while (!placed && layer < maxLayers) {
        const currentRadius = baseRadius + layer * radiusStep;

        const angleVariations = [
          baseAngle,
          baseAngle - 0.1,
          baseAngle + 0.1,
          baseAngle - 0.2,
          baseAngle + 0.2,
        ];

        for (const angle of angleVariations) {
          const x = CENTER_X + Math.cos(angle) * currentRadius;
          const y = CENTER_Y + Math.sin(angle) * currentRadius;

          if (
            y >= safeZoneTop &&
            y <= safeZoneBottom &&
            x >= safeZoneLeft &&
            x <= safeZoneRight &&
            currentRadius <= maxRadius
          ) {
            let tooClose = false;
            for (const pos of positions) {
              const distance = Math.sqrt(Math.pow(x - pos.x, 2) + Math.pow(y - pos.y, 2));
              if (distance < minDistance) {
                tooClose = true;
                break;
              }
            }

            if (!tooClose) {
              positions.push({ x, y });
              placed = true;
              break;
            }
          }
        }

        layer++;
      }

      if (!placed) {
        const fallbackRadius = Math.max(baseRadius, 120);
        const x = CENTER_X + Math.cos(baseAngle) * fallbackRadius;
        const y = CENTER_Y + Math.sin(baseAngle) * fallbackRadius;
        positions.push({ x, y });
      }
    }

    return positions;
  };

  const participantIds = useMemo(() => participants.map((p) => p.id).join(','), [participants]);
  const participantPositions = useMemo(
    () => calculateParticipantPositions(participants.length),
    [participants.length, participantIds]
  );

  const participantBaseAngles = useMemo(() => {
    return participantPositions.map((pos) => {
      const deltaX = pos.x - CENTER_X;
      const deltaY = pos.y - CENTER_Y;
      return Math.atan2(deltaY, deltaX);
    });
  }, [participantPositions]);

  const participantRadii = useMemo(() => {
    return participantPositions.map((pos) => {
      const deltaX = pos.x - CENTER_X;
      const deltaY = pos.y - CENTER_Y;
      return Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    });
  }, [participantPositions]);

  const userMoodColors = getMoodColor(currentUser?.mood || 'neutral');

  return (
    <View style={styles.container}>
      {/* Header */}
      {headerContent && <View style={styles.header}>{headerContent}</View>}

      {/* Orbit Container */}
      <View style={styles.orbitContainer}>
        {/* Gesture handler for drag-to-spin */}
        <View style={StyleSheet.absoluteFill} {...panResponder.panHandlers} pointerEvents="auto" />

        {/* Central Orb - Current User */}
        <CentralOrb
          moodColor={userMoodColors.base}
          glowColor={userMoodColors.glow}
          onPress={onCentralOrbPress}
          mood={currentUser?.mood}
          hasActiveFlare={false}
          showHint={false}
        />

        {/* Participant Particles */}
        {participants.map((participant, index) => (
          <FriendParticle
            key={participant.id}
            friend={participant}
            index={index}
            total={participants.length}
            onPress={() => onParticipantPress?.(participant)}
            hasActiveFlare={false}
            position={participantPositions[index] || { x: CENTER_X, y: CENTER_Y }}
            baseAngle={participantBaseAngles[index] || 0}
            radius={participantRadii[index] || 150}
            orbitAngle={orbitAngle}
          />
        ))}
      </View>

      {/* Footer */}
      {footerContent && <View style={styles.footer}>{footerContent}</View>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  orbitContainer: {
    flex: 1,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
});
