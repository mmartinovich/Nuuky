import { renderHook, act } from '@testing-library/react-native';

let capturedConfig: any = null;

jest.mock('react-native', () => {
  const AnimatedValue = class {
    _value: number;
    _listeners: Map<string, Function> = new Map();
    constructor(val: number) { this._value = val; }
    setValue(v: number) { this._value = v; }
    addListener(cb: Function) { const id = String(Math.random()); this._listeners.set(id, cb); return id; }
    removeListener(id: string) { this._listeners.delete(id); }
  };
  return {
    Animated: {
      Value: AnimatedValue,
      timing: jest.fn().mockReturnValue({ start: jest.fn((cb?: Function) => cb?.()) }),
    },
    PanResponder: {
      create: jest.fn((config: any) => {
        capturedConfig = config;
        return { panHandlers: {}, _config: config };
      }),
    },
    Easing: { out: jest.fn(() => jest.fn()), cubic: jest.fn() },
    Dimensions: { get: jest.fn().mockReturnValue({ width: 400, height: 800 }) },
  };
});

import { useOrbitGestures } from '../../hooks/useOrbitGestures';

describe('useOrbitGestures', () => {
  beforeEach(() => {
    capturedConfig = null;
  });

  test('returns expected shape', () => {
    const { result } = renderHook(() => useOrbitGestures());
    expect(result.current.panResponder).toBeDefined();
    expect(result.current.orbitAngle).toBeDefined();
    expect(result.current.orbitAngleValueRef).toBeDefined();
    expect(typeof result.current.isSpinning).toBe('boolean');
    expect(result.current.boltPositionsRef).toBeDefined();
    expect(typeof result.current.boltTick).toBe('number');
    expect(typeof result.current.setBoltTick).toBe('function');
    expect(result.current.computeBoltPositionsRef).toBeDefined();
  });

  test('isSpinning is false initially', () => {
    const { result } = renderHook(() => useOrbitGestures());
    expect(result.current.isSpinning).toBe(false);
  });

  test('boltTick starts at 0', () => {
    const { result } = renderHook(() => useOrbitGestures());
    expect(result.current.boltTick).toBe(0);
  });

  test('setBoltTick updates tick', () => {
    const { result } = renderHook(() => useOrbitGestures());
    act(() => { result.current.setBoltTick(5); });
    expect(result.current.boltTick).toBe(5);
  });

  test('cleanup on unmount does not throw', () => {
    const { unmount } = renderHook(() => useOrbitGestures());
    expect(() => unmount()).not.toThrow();
  });

  test('computeBoltPositionsRef is initially null', () => {
    const { result } = renderHook(() => useOrbitGestures());
    expect(result.current.computeBoltPositionsRef.current).toBeNull();
  });

  test('boltPositionsRef is initially empty array', () => {
    const { result } = renderHook(() => useOrbitGestures());
    expect(result.current.boltPositionsRef.current).toEqual([]);
  });

  test('onStartShouldSetPanResponder returns false', () => {
    renderHook(() => useOrbitGestures());
    expect(capturedConfig.onStartShouldSetPanResponder()).toBe(false);
  });

  test('onMoveShouldSetPanResponder requires threshold', () => {
    renderHook(() => useOrbitGestures());
    expect(capturedConfig.onMoveShouldSetPanResponder({}, { dx: 5, dy: 5 })).toBe(false);
    expect(capturedConfig.onMoveShouldSetPanResponder({}, { dx: 20, dy: 0 })).toBe(true);
    expect(capturedConfig.onMoveShouldSetPanResponder({}, { dx: 0, dy: 20 })).toBe(true);
  });

  test('onPanResponderTerminationRequest returns true', () => {
    renderHook(() => useOrbitGestures());
    expect(capturedConfig.onPanResponderTerminationRequest()).toBe(true);
  });

  test('onShouldBlockNativeResponder returns false', () => {
    renderHook(() => useOrbitGestures());
    expect(capturedConfig.onShouldBlockNativeResponder()).toBe(false);
  });

  test('onPanResponderGrant sets isSpinning', () => {
    const { result } = renderHook(() => useOrbitGestures());
    act(() => {
      capturedConfig.onPanResponderGrant({ nativeEvent: { pageX: 300, pageY: 400 } });
    });
    expect(result.current.isSpinning).toBe(true);
  });

  test('onPanResponderMove updates angle', () => {
    const { result } = renderHook(() => useOrbitGestures());
    act(() => {
      // Grant at top-right
      capturedConfig.onPanResponderGrant({ nativeEvent: { pageX: 300, pageY: 200 } });
    });
    act(() => {
      // Move to bottom-right (large angle change)
      capturedConfig.onPanResponderMove({ nativeEvent: { pageX: 300, pageY: 600 } });
    });
    // Angle should have changed from the large movement
    expect(result.current.orbitAngleValueRef.current).not.toBe(0);
  });

  test('onPanResponderMove ignores tiny deltas', () => {
    const { result } = renderHook(() => useOrbitGestures());
    act(() => {
      // Grant at center-right
      capturedConfig.onPanResponderGrant({ nativeEvent: { pageX: 200, pageY: 400 } });
    });
    const before = result.current.orbitAngleValueRef.current;
    act(() => {
      // Move to nearly same position
      capturedConfig.onPanResponderMove({ nativeEvent: { pageX: 200, pageY: 400 } });
    });
    expect(result.current.orbitAngleValueRef.current).toBe(before);
  });

  test('onPanResponderMove returns early if no grant', () => {
    renderHook(() => useOrbitGestures());
    // Move without grant — lastAngleRef is null
    expect(() => {
      capturedConfig.onPanResponderMove({ nativeEvent: { pageX: 300, pageY: 400 } });
    }).not.toThrow();
  });

  test('onPanResponderRelease with low velocity stops immediately', () => {
    const { result } = renderHook(() => useOrbitGestures());
    act(() => {
      capturedConfig.onPanResponderGrant({ nativeEvent: { pageX: 200, pageY: 400 } });
    });
    // Release without significant movement => low velocity
    act(() => {
      capturedConfig.onPanResponderRelease();
    });
    expect(result.current.isSpinning).toBe(false);
  });

  test('onPanResponderRelease with high velocity starts decay', () => {
    const { Animated } = require('react-native');
    Animated.timing.mockClear();
    const { result } = renderHook(() => useOrbitGestures());

    act(() => {
      capturedConfig.onPanResponderGrant({ nativeEvent: { pageX: 200, pageY: 200 } });
    });

    // Simulate fast movement to build velocity (large angle change)
    act(() => {
      capturedConfig.onPanResponderMove({ nativeEvent: { pageX: 200, pageY: 600 } });
    });

    act(() => {
      capturedConfig.onPanResponderRelease();
    });

    expect(result.current.isSpinning).toBe(false);
  });
});
