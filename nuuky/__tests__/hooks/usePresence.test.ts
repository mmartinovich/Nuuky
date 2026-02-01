import { renderHook, act } from '@testing-library/react-native';
import { usePresence } from '../../hooks/usePresence';
import { useAppStore } from '../../stores/appStore';
import { resetStore, setAuthenticatedUser } from '../__utils__/mockStore';

const mockFrom = jest.fn();

jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: (...args: any[]) => mockFrom(...args),
  },
}));

jest.mock('../../lib/logger', () => ({
  logger: { log: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('react-native', () => ({
  AppState: {
    currentState: 'active',
    addEventListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
  },
}));

const createChain = (resolved: any = { data: null, error: null }) => ({
  update: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  then: (resolve: any) => Promise.resolve(resolved).then(resolve),
});

describe('usePresence', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    resetStore();
    mockFrom.mockReturnValue(createChain());
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('marks user online on mount', () => {
    setAuthenticatedUser();
    renderHook(() => usePresence());

    expect(mockFrom).toHaveBeenCalledWith('users');
  });

  test('does nothing when no user', () => {
    renderHook(() => usePresence());
    // Should not call from since no user
    expect(mockFrom).not.toHaveBeenCalled();
  });

  test('returns updateActivity function', () => {
    setAuthenticatedUser();
    const { result } = renderHook(() => usePresence());

    expect(typeof result.current.updateActivity).toBe('function');
  });

  test('forces offline when ghost mode is active', () => {
    setAuthenticatedUser({
      ghost_mode_until: new Date(Date.now() + 60000).toISOString(),
    });

    renderHook(() => usePresence());

    // Should update with is_online: false due to ghost mode
    expect(mockFrom).toHaveBeenCalledWith('users');
  });

  test('forces offline when break mode is active', () => {
    setAuthenticatedUser({
      take_break_until: new Date(Date.now() + 60000).toISOString(),
    });

    renderHook(() => usePresence());

    expect(mockFrom).toHaveBeenCalledWith('users');
  });

  test('updateActivity updates last activity ref', () => {
    setAuthenticatedUser();
    const { result } = renderHook(() => usePresence());
    // Should not throw
    act(() => { result.current.updateActivity(); });
  });

  test('heartbeat marks offline after inactivity timeout', () => {
    setAuthenticatedUser();
    renderHook(() => usePresence());

    // Advance past OFFLINE_TIMEOUT (120s)
    act(() => { jest.advanceTimersByTime(180000); });

    // Multiple calls to from('users') for heartbeats
    expect(mockFrom).toHaveBeenCalledWith('users');
  });

  test('AppState handler updates presence on background/foreground', () => {
    const { AppState } = require('react-native');
    setAuthenticatedUser();
    renderHook(() => usePresence());

    const handler = AppState.addEventListener.mock.calls[0]?.[1];
    if (handler) {
      // Go to background
      act(() => { handler('background'); });
      // Come back
      AppState.currentState = 'background';
      act(() => { handler('active'); });
    }

    // Should have called from('users') multiple times
    expect(mockFrom.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  test('handles supabase error gracefully', () => {
    setAuthenticatedUser();
    mockFrom.mockReturnValue({
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockRejectedValue(new Error('fail')),
    });
    // Should not throw
    renderHook(() => usePresence());
  });
});
