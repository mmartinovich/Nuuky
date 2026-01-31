import { useEffect, useMemo, useRef } from "react";
import { Animated as RNAnimated, Dimensions } from "react-native";
import { useAppStore } from "../stores/appStore";

const { width, height } = Dimensions.get("window");
const CENTER_X = width / 2;
const CENTER_Y = height / 2 - 20;

interface UseStreakBoltsProps {
  streaks: any[];
  orbitUsers: any[];
  orbitBaseAngles: number[];
  orbitRadii: number[];
  orbitAngleValueRef: React.MutableRefObject<number>;
  orbitAngle: RNAnimated.Value;
  boltTick: number;
  setBoltTick: React.Dispatch<React.SetStateAction<number>>;
  isSpinning: boolean;
  boltPositionsRef: React.MutableRefObject<Array<{ x: number; y: number }>>;
  computeBoltPositionsRef: React.MutableRefObject<(() => void) | null>;
}

export function useStreakBolts({
  streaks,
  orbitUsers,
  orbitBaseAngles,
  orbitRadii,
  orbitAngleValueRef,
  orbitAngle,
  boltTick,
  setBoltTick,
  isSpinning,
  boltPositionsRef,
  computeBoltPositionsRef,
}: UseStreakBoltsProps) {
  // Build streak lookup map by friend_id
  const streakMap = useMemo(() => {
    const map = new Map<string, (typeof streaks)[0]>();
    for (const s of streaks) {
      map.set(s.friend_id, s);
    }
    return map;
  }, [streaks]);

  // Compute which bolts to render (max 7, sorted by consecutive_days desc)
  const lowPowerMode = useAppStore((s) => s.lowPowerMode);
  const maxBolts = lowPowerMode ? 3 : 7;
  const activeBolts = useMemo(() => {
    return streaks
      .filter((s) => s.state === "active" || s.state === "fading")
      .sort((a, b) => b.consecutive_days - a.consecutive_days)
      .slice(0, maxBolts)
      .map((s) => {
        const friendIdx = orbitUsers.findIndex((u) => u.id === s.friend_id);
        return { streak: s, friendIndex: friendIdx };
      })
      .filter((b) => b.friendIndex >= 0);
  }, [streaks, orbitUsers, maxBolts]);

  // Sync bolt positions when orbit changes
  useEffect(() => {
    if (activeBolts.length === 0) {
      boltPositionsRef.current = [];
      return;
    }

    const computePositions = () => {
      const currentAngle = orbitAngleValueRef.current;
      return activeBolts.map(({ friendIndex }) => {
        const base = orbitBaseAngles[friendIndex] || 0;
        const r = orbitRadii[friendIndex] || 150;
        const angle = base + currentAngle;
        return {
          x: CENTER_X + Math.cos(angle) * r,
          y: CENTER_Y + Math.sin(angle) * r,
        };
      });
    };

    computeBoltPositionsRef.current = () => {
      boltPositionsRef.current = computePositions();
    };

    boltPositionsRef.current = computePositions();
    setBoltTick((t) => t + 1);

    const listenerId = orbitAngle.addListener(() => {
      boltPositionsRef.current = computePositions();
    });

    const id = setInterval(() => {
      boltPositionsRef.current = computePositions();
    }, 500);

    return () => {
      orbitAngle.removeListener(listenerId);
      clearInterval(id);
    };
  }, [activeBolts, orbitBaseAngles, orbitRadii, isSpinning]);

  return { activeBolts, streakMap };
}
