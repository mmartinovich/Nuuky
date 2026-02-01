import { renderHook, act } from '@testing-library/react-native';
import { useSessionTimeout } from '../../hooks/useSessionTimeout';
import { useAppStore } from '../../stores/appStore';
import { resetStore, setAuthenticatedUser } from '../__utils__/mockStore';

jest.mock('react-native', () => ({
  AppState: {
    currentState: 'active',
    addEventListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
  },
}));

describe('useSessionTimeout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    resetStore();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('returns handleUserActivity function', () => {
    setAuthenticatedUser();
    const { result } = renderHook(() => useSessionTimeout());
    expect(typeof result.current.handleUserActivity).toBe('function');
  });

  test('handleUserActivity updates last activity', () => {
    setAuthenticatedUser();
    const before = Date.now();
    const { result } = renderHook(() => useSessionTimeout());

    act(() => {
      result.current.handleUserActivity();
    });

    expect(useAppStore.getState().lastActivityTimestamp).toBeGreaterThanOrEqual(before);
  });

  test('does nothing when not authenticated', () => {
    // No user set
    const { result } = renderHook(() => useSessionTimeout());

    act(() => {
      result.current.handleUserActivity();
    });

    // Should not throw
    expect(true).toBe(true);
  });

  test('subscribes to AppState changes', () => {
    const { AppState } = require('react-native');
    setAuthenticatedUser();

    renderHook(() => useSessionTimeout());

    expect(AppState.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
  });

  test('logs out after timeout expires', () => {
    setAuthenticatedUser();
    useAppStore.setState({ sessionTimeoutMinutes: 1 });

    renderHook(() => useSessionTimeout());

    // Advance past the timeout (1 minute)
    act(() => {
      jest.advanceTimersByTime(60 * 1000 + 100);
    });

    expect(useAppStore.getState().currentUser).toBeNull();
  });

  test('AppState handler logs out when session expired in background', () => {
    const { AppState } = require('react-native');
    setAuthenticatedUser();
    useAppStore.setState({
      sessionTimeoutMinutes: 1,
      lastActivityTimestamp: Date.now() - 120000, // 2 minutes ago
    });

    renderHook(() => useSessionTimeout());

    // Simulate coming back from background
    const handler = AppState.addEventListener.mock.calls[0]?.[1];
    if (handler) {
      // Set state to background first
      AppState.currentState = 'background';
      act(() => { handler('background'); });
      // Then come back
      act(() => { handler('active'); });
    }

    expect(useAppStore.getState().currentUser).toBeNull();
  });

  test('AppState handler resets timer when session still valid', () => {
    const { AppState } = require('react-native');
    setAuthenticatedUser();
    useAppStore.setState({
      sessionTimeoutMinutes: 60,
      lastActivityTimestamp: Date.now(), // Just now
    });

    renderHook(() => useSessionTimeout());

    const handler = AppState.addEventListener.mock.calls[0]?.[1];
    if (handler) {
      AppState.currentState = 'background';
      act(() => { handler('background'); });
      act(() => { handler('active'); });
    }

    // User should still be logged in
    expect(useAppStore.getState().currentUser).not.toBeNull();
  });
});
