import { renderHook, act } from '@testing-library/react-native';
import { useNudge } from '../../hooks/useNudge';
import { useAppStore } from '../../stores/appStore';
import { resetStore, setAuthenticatedUser } from '../__utils__/mockStore';
import { TEST_USER_ID } from '../__utils__/fixtures';

const mockFrom = jest.fn();
const mockGetSession = jest.fn();
const mockFunctionsInvoke = jest.fn();

jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: (...args: any[]) => mockFrom(...args),
    auth: { getSession: (...args: any[]) => mockGetSession(...args) },
    functions: { invoke: (...args: any[]) => mockFunctionsInvoke(...args) },
  },
}));

jest.mock('../../lib/logger', () => ({
  logger: { log: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn(),
  impactAsync: jest.fn(),
  NotificationFeedbackType: { Success: 'success' },
  ImpactFeedbackStyle: { Medium: 'medium' },
}));

jest.mock('react-native', () => ({
  Alert: { alert: jest.fn() },
}));

const createChain = (resolved: any = { data: null, error: null }) => ({
  insert: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  then: (resolve: any) => Promise.resolve(resolved).then(resolve),
});

describe('useNudge', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetStore();
    mockGetSession.mockResolvedValue({
      data: { session: { user: { id: TEST_USER_ID }, access_token: 'tok' } },
      error: null,
    });
    mockFrom.mockReturnValue(createChain());
    mockFunctionsInvoke.mockResolvedValue({ data: {}, error: null });
  });

  test('sendNudge requires login', async () => {
    const { Alert } = require('react-native');
    const { result } = renderHook(() => useNudge());

    let success: boolean = false;
    await act(async () => {
      success = await result.current.sendNudge('friend-1', 'Friend');
    });

    expect(success).toBe(false);
    expect(Alert.alert).toHaveBeenCalledWith('Error', 'You must be logged in');
  });

  test('sendNudge blocks when user is on break', async () => {
    const { Alert } = require('react-native');
    setAuthenticatedUser({ take_break_until: new Date(Date.now() + 60000).toISOString() });

    const { result } = renderHook(() => useNudge());

    let success: boolean = false;
    await act(async () => {
      success = await result.current.sendNudge('friend-1', 'Friend');
    });

    expect(success).toBe(false);
    expect(Alert.alert).toHaveBeenCalledWith('Break Mode Active', expect.any(String));
  });

  test('sendNudge succeeds and triggers haptic', async () => {
    const Haptics = require('expo-haptics');
    setAuthenticatedUser();

    const { result } = renderHook(() => useNudge());

    let success: boolean = false;
    await act(async () => {
      success = await result.current.sendNudge('friend-1', 'Friend');
    });

    expect(success).toBe(true);
    expect(Haptics.notificationAsync).toHaveBeenCalled();
  });

  test('sendNudge handles rate limit error', async () => {
    const { Alert } = require('react-native');
    setAuthenticatedUser();

    mockFrom.mockReturnValue(createChain({
      data: null,
      error: { message: 'Nudge limit exceeded', code: 'P0001' },
    }));

    const { result } = renderHook(() => useNudge());

    let success: boolean = false;
    await act(async () => {
      success = await result.current.sendNudge('friend-1', 'Friend');
    });

    expect(success).toBe(false);
    expect(Alert.alert).toHaveBeenCalledWith('Limit Reached', expect.any(String));
  });

  test('sendNudge handles session error', async () => {
    const { Alert } = require('react-native');
    setAuthenticatedUser();
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null });

    const { result } = renderHook(() => useNudge());

    let success: boolean = false;
    await act(async () => {
      success = await result.current.sendNudge('friend-1', 'Friend');
    });

    expect(success).toBe(false);
    expect(Alert.alert).toHaveBeenCalledWith('Authentication Error', expect.any(String));
  });

  test('receiveNudge plays haptic', async () => {
    const Haptics = require('expo-haptics');
    const { result } = renderHook(() => useNudge());

    await act(async () => {
      await result.current.receiveNudge();
    });

    expect(Haptics.impactAsync).toHaveBeenCalledWith('medium');
  });

  test('sendNudge handles generic insert error', async () => {
    const { Alert } = require('react-native');
    setAuthenticatedUser();

    mockFrom.mockReturnValue(createChain({
      data: null,
      error: { message: 'some db error', code: 'XXXXX' },
    }));

    const { result } = renderHook(() => useNudge());
    let success = true;
    await act(async () => {
      success = await result.current.sendNudge('friend-1', 'Friend');
    });

    expect(success).toBe(false);
    expect(Alert.alert).toHaveBeenCalledWith('Error', 'Failed to send nudge');
  });

  test('sendNudge handles notification error gracefully', async () => {
    setAuthenticatedUser();
    mockFunctionsInvoke.mockRejectedValue(new Error('notif fail'));

    const { result } = renderHook(() => useNudge());
    let success = false;
    await act(async () => {
      success = await result.current.sendNudge('friend-1', 'Friend');
    });

    // Should still succeed even if notification fails
    expect(success).toBe(true);
  });
});
