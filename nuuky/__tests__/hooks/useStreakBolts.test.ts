import { renderHook } from '@testing-library/react-native';
import { Animated } from 'react-native';
import { useStreakBolts } from '../../hooks/useStreakBolts';

jest.mock('../../stores/appStore', () => ({
  useAppStore: jest.fn((selector: any) => selector({ lowPowerMode: false })),
}));

const makeProps = (overrides?: any) => ({
  streaks: [],
  orbitUsers: [],
  orbitBaseAngles: [],
  orbitRadii: [],
  orbitAngleValueRef: { current: 0 },
  orbitAngle: new Animated.Value(0),
  boltTick: 0,
  isSpinning: false,
  boltPositionsRef: { current: [] },
  computeBoltPositionsRef: { current: null },
  ...overrides,
});

describe('useStreakBolts', () => {
  test('returns empty activeBolts with no streaks', () => {
    const { result } = renderHook(() => useStreakBolts(makeProps()));
    expect(result.current.activeBolts).toEqual([]);
    expect(result.current.streakMap.size).toBe(0);
  });

  test('builds streakMap from streaks', () => {
    const streaks = [
      { friend_id: 'f1', state: 'active', consecutive_days: 5 },
      { friend_id: 'f2', state: 'broken', consecutive_days: 0 },
    ];
    const { result } = renderHook(() => useStreakBolts(makeProps({ streaks })));
    expect(result.current.streakMap.get('f1')).toBe(streaks[0]);
    expect(result.current.streakMap.get('f2')).toBe(streaks[1]);
  });

  test('filters to active/fading streaks only', () => {
    const streaks = [
      { friend_id: 'f1', state: 'active', consecutive_days: 5 },
      { friend_id: 'f2', state: 'broken', consecutive_days: 0 },
      { friend_id: 'f3', state: 'fading', consecutive_days: 3 },
    ];
    const orbitUsers = [{ id: 'f1' }, { id: 'f2' }, { id: 'f3' }];
    const { result } = renderHook(() =>
      useStreakBolts(makeProps({ streaks, orbitUsers, orbitBaseAngles: [0, 0, 0], orbitRadii: [150, 150, 150] })),
    );
    expect(result.current.activeBolts).toHaveLength(2);
    expect(result.current.activeBolts[0].streak.friend_id).toBe('f1');
    expect(result.current.activeBolts[1].streak.friend_id).toBe('f3');
  });

  test('sorts by consecutive_days descending', () => {
    const streaks = [
      { friend_id: 'f1', state: 'active', consecutive_days: 2 },
      { friend_id: 'f2', state: 'active', consecutive_days: 10 },
    ];
    const orbitUsers = [{ id: 'f1' }, { id: 'f2' }];
    const { result } = renderHook(() =>
      useStreakBolts(makeProps({ streaks, orbitUsers, orbitBaseAngles: [0, 0], orbitRadii: [150, 150] })),
    );
    expect(result.current.activeBolts[0].streak.consecutive_days).toBe(10);
  });

  test('limits to maxBolts (7 normal)', () => {
    const streaks = Array.from({ length: 10 }, (_, i) => ({
      friend_id: `f${i}`,
      state: 'active',
      consecutive_days: i,
    }));
    const orbitUsers = streaks.map((s) => ({ id: s.friend_id }));
    const { result } = renderHook(() =>
      useStreakBolts(makeProps({
        streaks,
        orbitUsers,
        orbitBaseAngles: new Array(10).fill(0),
        orbitRadii: new Array(10).fill(150),
      })),
    );
    expect(result.current.activeBolts.length).toBeLessThanOrEqual(7);
  });

  test('filters out streaks without matching orbit user', () => {
    const streaks = [{ friend_id: 'f1', state: 'active', consecutive_days: 5 }];
    const orbitUsers: any[] = []; // no matching user
    const { result } = renderHook(() => useStreakBolts(makeProps({ streaks, orbitUsers })));
    expect(result.current.activeBolts).toHaveLength(0);
  });

  test('computes bolt positions', () => {
    const streaks = [{ friend_id: 'f1', state: 'active', consecutive_days: 5 }];
    const orbitUsers = [{ id: 'f1' }];
    const boltPositionsRef = { current: [] as any[] };
    renderHook(() =>
      useStreakBolts(makeProps({
        streaks,
        orbitUsers,
        orbitBaseAngles: [0],
        orbitRadii: [150],
        boltPositionsRef,
      })),
    );
    expect(boltPositionsRef.current.length).toBe(1);
    expect(boltPositionsRef.current[0]).toHaveProperty('x');
    expect(boltPositionsRef.current[0]).toHaveProperty('y');
  });
});
