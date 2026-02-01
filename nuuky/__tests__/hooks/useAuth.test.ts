import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useAuth } from '../../hooks/useAuth';
import { useAppStore } from '../../stores/appStore';
import { resetStore, setAuthenticatedUser } from '../__utils__/mockStore';
import { mockUser, TEST_USER_ID } from '../__utils__/fixtures';

// Mock supabase
const mockGetSession = jest.fn();
const mockGetUser = jest.fn();
const mockSignOut = jest.fn();
const mockSignInWithOtp = jest.fn();
const mockVerifyOtp = jest.fn();
const mockOnAuthStateChange = jest.fn();
const mockFromSelect = jest.fn();
const mockFromInsert = jest.fn();
const mockFromUpdate = jest.fn();
const mockFunctionsInvoke = jest.fn();

jest.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: (...args: any[]) => mockGetSession(...args),
      getUser: (...args: any[]) => mockGetUser(...args),
      signOut: (...args: any[]) => mockSignOut(...args),
      signInWithOtp: (...args: any[]) => mockSignInWithOtp(...args),
      verifyOtp: (...args: any[]) => mockVerifyOtp(...args),
      onAuthStateChange: (...args: any[]) => mockOnAuthStateChange(...args),
    },
    from: jest.fn().mockImplementation(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: mockUser(), error: null }),
    })),
    functions: {
      invoke: (...args: any[]) => mockFunctionsInvoke(...args),
    },
  },
}));

jest.mock('../../lib/logger', () => ({
  logger: { log: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('../../lib/notifications', () => ({
  registerForPushNotificationsAsync: jest.fn().mockResolvedValue('mock-token'),
  savePushTokenToUser: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('react-native', () => ({
  Alert: { alert: jest.fn() },
}));

describe('useAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetStore();

    mockOnAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: jest.fn() } },
    });
    mockGetSession.mockResolvedValue({
      data: { session: null },
      error: null,
    });
  });

  test('starts with loading true', () => {
    const { result } = renderHook(() => useAuth());
    // loading starts true until session check completes
    expect(result.current.loading).toBe(true);
  });

  test('session restore fetches profile and sets user', async () => {
    const user = mockUser();
    mockGetSession.mockResolvedValue({
      data: { session: { user: { id: TEST_USER_ID } } },
      error: null,
    });
    mockGetUser.mockResolvedValue({
      data: { user: { id: TEST_USER_ID, email: 'test@example.com', user_metadata: {}, app_metadata: {} } },
      error: null,
    });

    const { supabase } = require('../../lib/supabase');
    supabase.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: user, error: null }),
    });

    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.user).toBeTruthy();
    expect(result.current.isAuthenticated).toBe(true);
  });

  test('session restore shows alert on error', async () => {
    const { Alert } = require('react-native');
    mockGetSession.mockRejectedValue(new Error('Network error'));

    renderHook(() => useAuth());

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Session Error',
        expect.any(String)
      );
    });
  });

  test('onAuthStateChange SIGNED_OUT calls logout', async () => {
    let authCallback: any;
    mockOnAuthStateChange.mockImplementation((cb) => {
      authCallback = cb;
      return { data: { subscription: { unsubscribe: jest.fn() } } };
    });

    setAuthenticatedUser();
    renderHook(() => useAuth());

    await act(async () => {
      authCallback('SIGNED_OUT', null);
    });

    expect(useAppStore.getState().currentUser).toBeNull();
  });

  test('sendEmailOTP calls supabase signInWithOtp', async () => {
    mockSignInWithOtp.mockResolvedValue({ data: {}, error: null });

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.sendEmailOTP('test@example.com');
    });

    expect(mockSignInWithOtp).toHaveBeenCalledWith({
      email: 'test@example.com',
      options: { shouldCreateUser: true, emailRedirectTo: undefined },
    });
  });

  test('sendEmailOTP throws on error', async () => {
    const err = new Error('Rate limited');
    mockSignInWithOtp.mockResolvedValue({ data: null, error: err });

    const { result } = renderHook(() => useAuth());

    await expect(result.current.sendEmailOTP('test@example.com')).rejects.toThrow('Rate limited');
  });

  test('verifyEmailOTP calls supabase verifyOtp', async () => {
    mockVerifyOtp.mockResolvedValue({ data: { session: {}, user: {} }, error: null });

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.verifyEmailOTP('test@example.com', '123456');
    });

    expect(mockVerifyOtp).toHaveBeenCalledWith({
      email: 'test@example.com',
      token: '123456',
      type: 'email',
    });
  });

  test('signOut updates online status and calls auth signOut', async () => {
    setAuthenticatedUser();
    mockSignOut.mockResolvedValue({ error: null });

    const { supabase } = require('../../lib/supabase');
    supabase.from.mockReturnValue({
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      then: (resolve: any) => Promise.resolve({ data: null, error: null }).then(resolve),
    });

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signOut();
    });

    expect(mockSignOut).toHaveBeenCalled();
    expect(useAppStore.getState().currentUser).toBeNull();
  });

  test('deleteAccount calls edge function and logs out', async () => {
    setAuthenticatedUser();
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'test-token' } },
      error: null,
    });
    mockFunctionsInvoke.mockResolvedValue({ data: {}, error: null });

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.deleteAccount();
    });

    expect(mockFunctionsInvoke).toHaveBeenCalledWith('delete-account', {
      headers: { Authorization: 'Bearer test-token' },
    });
    expect(useAppStore.getState().currentUser).toBeNull();
  });

  test('deleteAccount throws when no session', async () => {
    setAuthenticatedUser();
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null });

    const { result } = renderHook(() => useAuth());

    await expect(result.current.deleteAccount()).rejects.toThrow('No active session');
  });

  test('fetchUserProfile creates profile on PGRST116 error', async () => {
    setAuthenticatedUser();
    mockGetUser.mockResolvedValue({
      data: { user: { id: TEST_USER_ID, email: 'test@example.com', user_metadata: { full_name: 'Test' }, app_metadata: { provider: 'google' } } },
      error: null,
    });

    const newUser = mockUser();
    const { supabase } = require('../../lib/supabase');

    let callCount = 0;
    supabase.from.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // First call: select user - returns PGRST116
        return {
          select: jest.fn().mockReturnThis(),
          update: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
        };
      }
      // Subsequent calls: insert or update
      return {
        select: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: newUser, error: null }),
      };
    });

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.fetchUserProfile(TEST_USER_ID);
    });

    expect(useAppStore.getState().currentUser).toBeTruthy();
  });
});
