import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import { Streak } from '../types';
import { useTheme } from '../hooks/useTheme';

interface StreakBadgeProps {
  streak: Streak;
}

export type BoltTier = 'teal' | 'gold' | 'fire';

export function BoltIcon({ size = 11, tier = 'teal' }: { size?: number; tier?: BoltTier }) {
  const gradId = `bolt-fill-${tier}`;
  const colors = {
    teal: { top: '#00f0ff', bottom: '#00b8d4', stroke: '#0097a7' },
    gold: { top: '#FFE566', bottom: '#FFB800', stroke: '#FFA000' },
    fire: { top: '#FF6B35', bottom: '#E01B1B', stroke: '#B71515' },
  };
  const c = colors[tier];

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Defs>
        <LinearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={c.top} />
          <Stop offset="1" stopColor={c.bottom} />
        </LinearGradient>
      </Defs>
      <Path
        d="M13 2L4.5 13.5H11.5L10.5 22L19.5 10.5H12.5L13 2Z"
        fill={`url(#${gradId})`}
        stroke={c.stroke}
        strokeWidth={0.8}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function StreakBadgeComponent({ streak }: StreakBadgeProps) {
  const { theme } = useTheme();

  if (streak.state === 'broken' || streak.consecutive_days < 1) return null;

  const days = streak.consecutive_days;
  const isFire = days >= 15;
  const isHot = days >= 7;
  const isLarge = days >= 100;
  const tier: BoltTier = isFire ? 'fire' : isHot ? 'gold' : 'teal';

  return (
    <View style={styles.container}>
      <View style={[
        styles.pill,
        { backgroundColor: 'rgba(15, 25, 45, 0.9)' },
        isHot && !isFire && styles.pillHot,
        isFire && styles.pillFire
      ]}>
        <BoltIcon size={isLarge ? 10 : 12} tier={tier} />
        <Text style={[styles.count, { color: '#ffffff' }, isLarge && styles.countSmall]}>
          {days}
        </Text>
      </View>
    </View>
  );
}

export const StreakBadge = memo(StreakBadgeComponent);

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: -10,
    right: -10,
    zIndex: 200,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    borderRadius: 12,
    paddingLeft: 5,
    paddingRight: 7,
    paddingVertical: 3,
    borderWidth: 1.2,
    borderColor: 'rgba(0, 220, 240, 0.5)',
    shadowColor: '#00e0ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
    elevation: 8,
  },
  pillHot: {
    borderColor: 'rgba(255, 184, 0, 0.6)',
    shadowColor: '#FFB800',
    shadowOpacity: 0.5,
  },
  pillFire: {
    borderColor: 'rgba(224, 27, 27, 0.7)',
    shadowColor: '#FF3B30',
    shadowOpacity: 0.7,
    shadowRadius: 10,
  },
  count: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.3,
  },
  countSmall: {
    fontSize: 10,
  },
});
