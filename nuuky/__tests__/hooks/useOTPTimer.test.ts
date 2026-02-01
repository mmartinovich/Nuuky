import { renderHook, act } from '@testing-library/react-native';
import { useOTPTimer } from '../../hooks/useOTPTimer';

describe('useOTPTimer', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('initial state', () => {
    const { result } = renderHook(() => useOTPTimer());
    expect(result.current.secondsRemaining).toBe(0);
    expect(result.current.isActive).toBe(false);
    expect(result.current.canResend).toBe(true);
    expect(result.current.formattedTime).toBe('0:00');
  });

  test('startTimer sets seconds and activates', () => {
    const { result } = renderHook(() => useOTPTimer(30));

    act(() => {
      result.current.startTimer();
    });

    expect(result.current.secondsRemaining).toBe(30);
    expect(result.current.isActive).toBe(true);
    expect(result.current.canResend).toBe(false);
  });

  test('timer counts down', () => {
    const { result } = renderHook(() => useOTPTimer(5));

    act(() => {
      result.current.startTimer();
    });

    act(() => {
      jest.advanceTimersByTime(3000);
    });

    expect(result.current.secondsRemaining).toBe(2);
  });

  test('timer deactivates at 0', () => {
    const { result } = renderHook(() => useOTPTimer(2));

    act(() => {
      result.current.startTimer();
    });

    act(() => {
      jest.advanceTimersByTime(2000);
    });

    expect(result.current.secondsRemaining).toBe(0);
    expect(result.current.isActive).toBe(false);
    expect(result.current.canResend).toBe(true);
  });

  test('resetTimer stops and clears', () => {
    const { result } = renderHook(() => useOTPTimer(60));

    act(() => {
      result.current.startTimer();
    });

    act(() => {
      result.current.resetTimer();
    });

    expect(result.current.secondsRemaining).toBe(0);
    expect(result.current.isActive).toBe(false);
  });

  test('formattedTime shows MM:SS', () => {
    const { result } = renderHook(() => useOTPTimer(125));

    act(() => {
      result.current.startTimer();
    });

    expect(result.current.formattedTime).toBe('2:05');
  });

  test('defaults to 60 seconds', () => {
    const { result } = renderHook(() => useOTPTimer());

    act(() => {
      result.current.startTimer();
    });

    expect(result.current.secondsRemaining).toBe(60);
    expect(result.current.formattedTime).toBe('1:00');
  });
});
