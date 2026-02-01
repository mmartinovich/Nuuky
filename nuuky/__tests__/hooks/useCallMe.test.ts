import { renderHook, act } from '@testing-library/react-native';
import { useCallMe } from '../../hooks/useCallMe';
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

describe('useCallMe', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetStore();
    mockGetSession.mockResolvedValue({
      data: { session: { user: { id: TEST_USER_ID } } },
      error: null,
    });
    mockFrom.mockReturnValue(createChain());
    mockFunctionsInvoke.mockResolvedValue({ data: { sent: true }, error: null });
  });

  test('sendCallMe requires login', async () => {
    const { Alert } = require('react-native');
    const { result } = renderHook(() => useCallMe());

    let success: boolean = false;
    await act(async () => {
      success = await result.current.sendCallMe('friend-1', 'Friend');
    });

    expect(success).toBe(false);
    expect(Alert.alert).toHaveBeenCalledWith('Error', 'You must be logged in');
  });

  test('sendCallMe blocks when on break', async () => {
    const { Alert } = require('react-native');
    setAuthenticatedUser({ take_break_until: new Date(Date.now() + 60000).toISOString() });

    const { result } = renderHook(() => useCallMe());

    let success: boolean = false;
    await act(async () => {
      success = await result.current.sendCallMe('friend-1', 'Friend');
    });

    expect(success).toBe(false);
    expect(Alert.alert).toHaveBeenCalledWith('Break Mode Active', expect.any(String));
  });

  test('sendCallMe succeeds', async () => {
    const Haptics = require('expo-haptics');
    setAuthenticatedUser();

    const { result } = renderHook(() => useCallMe());

    let success: boolean = false;
    await act(async () => {
      success = await result.current.sendCallMe('friend-1', 'Friend');
    });

    expect(success).toBe(true);
    expect(Haptics.notificationAsync).toHaveBeenCalled();
  });

  test('sendCallMe handles rate limit', async () => {
    const { Alert } = require('react-native');
    setAuthenticatedUser();

    mockFrom.mockReturnValue(createChain({
      data: null,
      error: { message: 'Call-me limit exceeded' },
    }));

    const { result } = renderHook(() => useCallMe());

    let success: boolean = false;
    await act(async () => {
      success = await result.current.sendCallMe('friend-1', 'Friend');
    });

    expect(success).toBe(false);
    expect(Alert.alert).toHaveBeenCalledWith('Limit Reached', expect.any(String));
  });

  test('sendCallMe passes roomId when provided', async () => {
    setAuthenticatedUser();

    const { result } = renderHook(() => useCallMe());

    await act(async () => {
      await result.current.sendCallMe('friend-1', 'Friend', 'room-1');
    });

    expect(mockFunctionsInvoke).toHaveBeenCalledWith('send-call-me-notification', {
      body: { receiver_id: 'friend-1', sender_id: TEST_USER_ID, room_id: 'room-1' },
    });
  });

  test('sendCallMe handles session error', async () => {
    const { Alert } = require('react-native');
    setAuthenticatedUser();
    mockGetSession.mockResolvedValue({ data: { session: null }, error: { message: 'no session' } });

    const { result } = renderHook(() => useCallMe());
    let success = true;
    await act(async () => { success = await result.current.sendCallMe('f1', 'Friend'); });
    expect(success).toBe(false);
    expect(Alert.alert).toHaveBeenCalledWith('Authentication Error', expect.any(String));
  });

  test('sendCallMe handles generic insert error', async () => {
    const { Alert } = require('react-native');
    setAuthenticatedUser();
    mockFrom.mockReturnValue(createChain({ data: null, error: { message: 'db error' } }));

    const { result } = renderHook(() => useCallMe());
    let success = true;
    await act(async () => { success = await result.current.sendCallMe('f1', 'Friend'); });
    expect(success).toBe(false);
    expect(Alert.alert).toHaveBeenCalledWith('Error', expect.any(String));
  });

  test('sendCallMe handles edge function error with sent=false', async () => {
    const { Alert } = require('react-native');
    setAuthenticatedUser();
    mockFunctionsInvoke.mockResolvedValue({ data: { sent: false }, error: { message: 'edge error' } });

    const { result } = renderHook(() => useCallMe());
    let success = true;
    await act(async () => { success = await result.current.sendCallMe('f1', 'Friend'); });
    expect(success).toBe(false);
  });

  test('sendCallMe succeeds with edge function warning', async () => {
    setAuthenticatedUser();
    // Error returned but sent is not false (default undefined = success)
    mockFunctionsInvoke.mockResolvedValue({ data: {}, error: { message: 'warn' } });

    const { result } = renderHook(() => useCallMe());
    let success = false;
    await act(async () => { success = await result.current.sendCallMe('f1', 'Friend'); });
    expect(success).toBe(true);
  });
});
