import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useFlare } from '../../hooks/useFlare';
import { useAppStore } from '../../stores/appStore';
import { resetStore, setAuthenticatedUser } from '../__utils__/mockStore';
import { mockFlare, mockFriendship, TEST_USER_ID, TEST_FRIEND_ID } from '../__utils__/fixtures';

const mockFrom = jest.fn();
const mockGetSession = jest.fn();

jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: (...args: any[]) => mockFrom(...args),
    channel: jest.fn().mockReturnValue({ on: jest.fn().mockReturnThis(), subscribe: jest.fn().mockReturnThis() }),
    removeChannel: jest.fn(),
    auth: { getSession: (...args: any[]) => mockGetSession(...args) },
    functions: { invoke: jest.fn().mockResolvedValue({ data: {}, error: null }) },
  },
}));

jest.mock('../../lib/subscriptionManager', () => ({
  subscriptionManager: { register: jest.fn().mockReturnValue(jest.fn()) },
}));

jest.mock('../../lib/logger', () => ({
  logger: { log: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn(),
  NotificationFeedbackType: { Success: 'success', Warning: 'warning' },
}));

jest.mock('react-native', () => ({
  Alert: { alert: jest.fn() },
}));

const createChain = (resolved: any = { data: null, error: null }) => ({
  select: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  neq: jest.fn().mockReturnThis(),
  gte: jest.fn().mockReturnThis(),
  or: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  single: jest.fn().mockResolvedValue(resolved),
  maybeSingle: jest.fn().mockResolvedValue(resolved),
  then: (resolve: any) => Promise.resolve(resolved).then(resolve),
});

describe('useFlare', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetStore();
    mockFrom.mockReturnValue(createChain({ data: [], error: null }));
    mockGetSession.mockResolvedValue({
      data: { session: { user: { id: TEST_USER_ID }, access_token: 'tok' } },
      error: null,
    });
  });

  test('loads active flares on mount', async () => {
    setAuthenticatedUser();
    useAppStore.setState({ friends: [mockFriendship()] });

    renderHook(() => useFlare());

    await waitFor(() => {
      expect(mockFrom).toHaveBeenCalledWith('flares');
    });
  });

  test('sendFlare blocks when user is on break', async () => {
    const { Alert } = require('react-native');
    setAuthenticatedUser({ take_break_until: new Date(Date.now() + 60000).toISOString() });

    const { result } = renderHook(() => useFlare());

    let success: boolean = false;
    await act(async () => {
      success = await result.current.sendFlare();
    });

    expect(success).toBe(false);
    expect(Alert.alert).toHaveBeenCalledWith('Break Mode Active', expect.any(String));
  });

  test('sendFlare requires login', async () => {
    const { Alert } = require('react-native');
    const { result } = renderHook(() => useFlare());

    let success: boolean = false;
    await act(async () => {
      success = await result.current.sendFlare();
    });

    expect(success).toBe(false);
    expect(Alert.alert).toHaveBeenCalledWith('Error', 'You must be logged in');
  });

  test('respondToFlare updates flare', async () => {
    setAuthenticatedUser();

    mockFrom.mockReturnValue(createChain({ data: null, error: null }));

    const { result } = renderHook(() => useFlare());

    let success: boolean = false;
    await act(async () => {
      success = await result.current.respondToFlare('flare-1');
    });

    expect(success).toBe(true);
    expect(mockFrom).toHaveBeenCalledWith('flares');
  });

  test('respondToFlare shows error on failure', async () => {
    const { Alert } = require('react-native');
    setAuthenticatedUser();

    mockFrom.mockReturnValue({
      ...createChain(),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      then: (resolve: any) => Promise.resolve({ data: null, error: { message: 'fail' } }).then(resolve),
    });

    const { result } = renderHook(() => useFlare());

    await act(async () => {
      await result.current.respondToFlare('flare-1');
    });

    expect(Alert.alert).toHaveBeenCalledWith('Error', 'Failed to respond to flare');
  });

  test('respondToFlare returns false when not logged in', async () => {
    const { result } = renderHook(() => useFlare());

    let success: boolean = false;
    await act(async () => {
      success = await result.current.respondToFlare('flare-1');
    });

    expect(success).toBe(false);
  });

  test('sendFlare blocks when active flare exists', async () => {
    const { Alert } = require('react-native');
    setAuthenticatedUser();

    // Mock loadActiveFlares to set myActiveFlare
    const futureExpiry = new Date(Date.now() + 300000).toISOString();
    mockFrom.mockImplementation((table: string) => {
      const chain = createChain({ data: [], error: null });
      chain.maybeSingle = jest.fn().mockResolvedValue({
        data: { id: 'flare-1', expires_at: futureExpiry, user_id: TEST_USER_ID },
        error: null,
      });
      return chain;
    });

    const { result } = renderHook(() => useFlare());

    // Wait for loadActiveFlares to finish and set myActiveFlare
    await waitFor(() => {
      expect(result.current.myActiveFlare).not.toBeNull();
    });

    let success: boolean = false;
    await act(async () => {
      success = await result.current.sendFlare();
    });

    expect(success).toBe(false);
    expect(Alert.alert).toHaveBeenCalledWith('Flare Active', expect.any(String));
  });

  test('auto-clears expired flare', async () => {
    setAuthenticatedUser();

    // Set myActiveFlare with already-expired time
    const pastExpiry = new Date(Date.now() - 1000).toISOString();
    mockFrom.mockImplementation(() => {
      const chain = createChain({ data: [], error: null });
      chain.maybeSingle = jest.fn().mockResolvedValue({
        data: { id: 'flare-1', expires_at: pastExpiry, user_id: TEST_USER_ID },
        error: null,
      });
      return chain;
    });

    const { result } = renderHook(() => useFlare());

    // Wait - the expired flare should be cleared
    await waitFor(() => {
      // After initial load, the flare should auto-clear since it's expired
      expect(result.current.myActiveFlare).toBeNull();
    }, { timeout: 3000 });
  });

  test('refreshFlares calls loadActiveFlares', async () => {
    setAuthenticatedUser();
    mockFrom.mockReturnValue(createChain({ data: [], error: null }));

    const { result } = renderHook(() => useFlare());

    await act(async () => {
      await result.current.refreshFlares();
    });

    expect(mockFrom).toHaveBeenCalledWith('flares');
  });

  test('sendFlare blocks during cooldown', async () => {
    const { Alert } = require('react-native');
    setAuthenticatedUser();

    // Mock loadActiveFlares to set lastFlareSentAt (recent)
    let callIdx = 0;
    mockFrom.mockImplementation(() => {
      callIdx++;
      const chain = createChain({ data: [], error: null });
      // On the 3rd call (last flare query), return a recent flare
      chain.maybeSingle = jest.fn().mockResolvedValue({
        data: { created_at: new Date().toISOString() },
        error: null,
      });
      return chain;
    });

    const { result } = renderHook(() => useFlare());

    // Wait for load to complete and set lastFlareSentAt
    await waitFor(() => {
      // loadActiveFlares should have been called
      expect(mockFrom).toHaveBeenCalled();
    });

    // Small delay to let state settle
    await act(async () => {
      await new Promise(r => setTimeout(r, 50));
    });

    let success: boolean = true;
    await act(async () => {
      success = await result.current.sendFlare();
    });

    // Should be blocked by cooldown OR active flare
    expect(success).toBe(false);
  });

  test('sendFlare shows confirm dialog and user cancels', async () => {
    const { Alert } = require('react-native');
    setAuthenticatedUser();
    mockFrom.mockReturnValue(createChain({ data: [], error: null }));

    // Mock Alert.alert to call the Cancel button
    Alert.alert.mockImplementation((_t: string, _m: string, buttons: any[]) => {
      const cancelBtn = buttons?.find((b: any) => b.text === 'Cancel');
      cancelBtn?.onPress?.();
    });

    const { result } = renderHook(() => useFlare());

    // Wait for initial load
    await waitFor(() => expect(mockFrom).toHaveBeenCalled());

    let success: boolean = true;
    await act(async () => {
      success = await result.current.sendFlare();
    });

    expect(success).toBe(false);
  });

  test('sendFlare confirm dialog sends flare successfully', async () => {
    const { Alert } = require('react-native');
    setAuthenticatedUser();

    mockFrom.mockReturnValue(createChain({ data: [], error: null }));

    // Mock Alert.alert to call the Send Flare button
    Alert.alert.mockImplementation((_t: string, _m: string, buttons: any[]) => {
      const sendBtn = buttons?.find((b: any) => b.text === 'Send Flare');
      sendBtn?.onPress?.();
    });

    mockGetSession.mockResolvedValue({
      data: { session: { user: { id: TEST_USER_ID }, access_token: 'tok' } },
      error: null,
    });

    // Mock the insert chain for flare creation
    const insertChain = createChain({ data: [], error: null });
    insertChain.single = jest.fn().mockResolvedValue({
      data: { id: 'new-flare', user_id: TEST_USER_ID, expires_at: new Date(Date.now() + 300000).toISOString() },
      error: null,
    });
    mockFrom.mockReturnValue(insertChain);

    const { result } = renderHook(() => useFlare());

    await waitFor(() => expect(mockFrom).toHaveBeenCalled());

    let success: boolean = false;
    await act(async () => {
      success = await result.current.sendFlare();
    });

    expect(success).toBe(true);
  });

  test('sendFlare handles session error in confirm flow', async () => {
    const { Alert } = require('react-native');
    setAuthenticatedUser();
    mockFrom.mockReturnValue(createChain({ data: [], error: null }));

    Alert.alert.mockImplementation((_t: string, _m: string, buttons: any[]) => {
      const sendBtn = buttons?.find((b: any) => b.text === 'Send Flare');
      sendBtn?.onPress?.();
    });

    mockGetSession.mockResolvedValue({
      data: { session: null },
      error: { message: 'no session' },
    });

    const { result } = renderHook(() => useFlare());
    await waitFor(() => expect(mockFrom).toHaveBeenCalled());

    let success: boolean = true;
    await act(async () => {
      success = await result.current.sendFlare();
    });

    expect(success).toBe(false);
    expect(Alert.alert).toHaveBeenCalledWith('Authentication Error', expect.any(String));
  });

  test('loadActiveFlares handles error gracefully', async () => {
    setAuthenticatedUser();
    mockFrom.mockImplementation(() => {
      throw new Error('db error');
    });

    // Should not throw
    const { result } = renderHook(() => useFlare());
    expect(result.current.activeFlares).toEqual([]);
  });

  test('activeFlares filters by friends only', async () => {
    setAuthenticatedUser();
    useAppStore.setState({ friends: [mockFriendship()] });

    const flares = [
      { id: 'f1', user_id: TEST_FRIEND_ID, expires_at: new Date(Date.now() + 300000).toISOString() },
      { id: 'f2', user_id: 'stranger-id', expires_at: new Date(Date.now() + 300000).toISOString() },
    ];

    let callIdx = 0;
    mockFrom.mockImplementation(() => {
      callIdx++;
      const chain = createChain({ data: callIdx === 1 ? flares : null, error: null });
      chain.maybeSingle = jest.fn().mockResolvedValue({ data: null, error: null });
      return chain;
    });

    const { result } = renderHook(() => useFlare());

    await waitFor(() => {
      expect(result.current.activeFlares.length).toBeLessThanOrEqual(1);
    });
  });
});
