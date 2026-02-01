import { renderHook, act } from '@testing-library/react-native';
import { useHeart } from '../../hooks/useHeart';
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
  NotificationFeedbackType: { Success: 'success' },
}));

jest.mock('react-native', () => ({
  Alert: { alert: jest.fn() },
}));

const createChain = (resolved: any = { data: null, error: null }) => ({
  insert: jest.fn().mockReturnThis(),
  then: (resolve: any) => Promise.resolve(resolved).then(resolve),
});

describe('useHeart', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetStore();
    mockGetSession.mockResolvedValue({
      data: { session: { user: { id: TEST_USER_ID } } },
      error: null,
    });
    mockFrom.mockReturnValue(createChain());
    mockFunctionsInvoke.mockResolvedValue({ data: {}, error: null });
  });

  test('sendHeart requires login', async () => {
    const { Alert } = require('react-native');
    const { result } = renderHook(() => useHeart());

    let success: boolean = false;
    await act(async () => {
      success = await result.current.sendHeart('friend-1', 'Friend');
    });

    expect(success).toBe(false);
    expect(Alert.alert).toHaveBeenCalledWith('Error', 'You must be logged in');
  });

  test('sendHeart succeeds and triggers haptic', async () => {
    const Haptics = require('expo-haptics');
    setAuthenticatedUser();

    const { result } = renderHook(() => useHeart());

    let success: boolean = false;
    await act(async () => {
      success = await result.current.sendHeart('friend-1', 'Friend');
    });

    expect(success).toBe(true);
    expect(Haptics.notificationAsync).toHaveBeenCalled();
  });

  test('sendHeart handles rate limit error', async () => {
    const { Alert } = require('react-native');
    setAuthenticatedUser();

    mockFrom.mockReturnValue(createChain({
      data: null,
      error: { message: 'Heart limit exceeded' },
    }));

    const { result } = renderHook(() => useHeart());

    let success: boolean = false;
    await act(async () => {
      success = await result.current.sendHeart('friend-1', 'Friend');
    });

    expect(success).toBe(false);
    expect(Alert.alert).toHaveBeenCalledWith('Limit Reached', expect.any(String));
  });

  test('sendHeart handles session error', async () => {
    const { Alert } = require('react-native');
    setAuthenticatedUser();
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null });

    const { result } = renderHook(() => useHeart());

    let success: boolean = false;
    await act(async () => {
      success = await result.current.sendHeart('friend-1', 'Friend');
    });

    expect(success).toBe(false);
    expect(Alert.alert).toHaveBeenCalledWith('Authentication Error', expect.any(String));
  });

  test('sendHeart handles generic insert error', async () => {
    setAuthenticatedUser();
    mockFrom.mockReturnValue(createChain({
      data: null,
      error: { message: 'some db error' },
    }));

    const { result } = renderHook(() => useHeart());
    let success = true;
    await act(async () => {
      success = await result.current.sendHeart('friend-1', 'Friend');
    });
    expect(success).toBe(false);
  });

  test('sendHeart handles notification error gracefully', async () => {
    setAuthenticatedUser();
    mockFunctionsInvoke.mockRejectedValue(new Error('notif fail'));

    const { result } = renderHook(() => useHeart());
    let success = false;
    await act(async () => {
      success = await result.current.sendHeart('friend-1', 'Friend');
    });
    // Should still succeed
    expect(success).toBe(true);
  });
});
