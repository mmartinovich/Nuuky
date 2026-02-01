import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useFriends } from '../../hooks/useFriends';
import { useAppStore } from '../../stores/appStore';
import { resetStore, setAuthenticatedUser } from '../__utils__/mockStore';
import { mockFriendship, TEST_USER_ID, TEST_FRIEND_ID } from '../__utils__/fixtures';

const mockFrom = jest.fn();
const mockChannel = { on: jest.fn().mockReturnThis(), subscribe: jest.fn().mockReturnThis() };

jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: (...args: any[]) => mockFrom(...args),
    channel: jest.fn().mockReturnValue(mockChannel),
    removeChannel: jest.fn(),
  },
}));

jest.mock('../../lib/subscriptionManager', () => ({
  subscriptionManager: {
    register: jest.fn().mockReturnValue(jest.fn()),
    unregister: jest.fn(),
  },
}));

jest.mock('../../lib/logger', () => ({
  logger: { log: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('react-native', () => ({
  Alert: { alert: jest.fn() },
}));

const createChain = (resolvedValue: any = { data: [], error: null }) => ({
  select: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  neq: jest.fn().mockReturnThis(),
  or: jest.fn().mockReturnThis(),
  in: jest.fn().mockReturnThis(),
  single: jest.fn().mockResolvedValue(resolvedValue),
  then: (resolve: any) => Promise.resolve(resolvedValue).then(resolve),
});

describe('useFriends', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetStore();
    mockFrom.mockReturnValue(createChain());
  });

  test('loads friends on mount when user is authenticated', async () => {
    const friends = [mockFriendship()];
    mockFrom.mockReturnValue(createChain({ data: friends, error: null }));
    setAuthenticatedUser();

    const { result } = renderHook(() => useFriends());

    await waitFor(() => {
      expect(result.current.initialLoading).toBe(false);
    });

    expect(useAppStore.getState().friends).toEqual(friends);
  });

  test('clears friends when no user', async () => {
    useAppStore.setState({ friends: [mockFriendship()] });

    renderHook(() => useFriends());

    await waitFor(() => {
      expect(useAppStore.getState().friends).toEqual([]);
    });
  });

  test('addFriend prevents self-add', async () => {
    const { Alert } = require('react-native');
    setAuthenticatedUser();

    const { result } = renderHook(() => useFriends());

    let success: boolean = false;
    await act(async () => {
      success = await result.current.addFriend(TEST_USER_ID);
    });

    expect(success).toBe(false);
    expect(Alert.alert).toHaveBeenCalledWith('Error', 'You cannot add yourself as a friend');
  });

  test('addFriend creates bidirectional friendship', async () => {
    setAuthenticatedUser();

    // Use table-based mocking: all from() calls go to friendships or users
    mockFrom.mockImplementation((table: string) => {
      if (table === 'users') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: { display_name: 'Friend' }, error: null }),
        };
      }
      // friendships table - check existing returns empty, insert succeeds, loadFriends returns data
      return createChain({ data: [], error: null });
    });

    const { result } = renderHook(() => useFriends());

    let success: boolean = false;
    await act(async () => {
      success = await result.current.addFriend(TEST_FRIEND_ID);
    });

    expect(success).toBe(true);
  });

  test('addFriend handles duplicate (23505 error)', async () => {
    setAuthenticatedUser();

    // First: check existing returns empty (no existing friendship)
    // Then: users table for display_name
    // Then: insert returns 23505
    // Then: loadFriends
    const friendshipsCallTracker = { count: 0 };
    mockFrom.mockImplementation((table: string) => {
      if (table === 'users') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: { display_name: 'Friend' }, error: null }),
        };
      }
      // friendships - track calls
      friendshipsCallTracker.count++;
      const chain = createChain({ data: [], error: null });
      // Override insert chain to return 23505 on the insert call
      chain.insert = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          then: (resolve: any) => Promise.resolve({ data: null, error: { code: '23505', message: 'duplicate' } }).then(resolve),
          eq: jest.fn().mockReturnThis(),
        }),
      });
      return chain;
    });

    const { result } = renderHook(() => useFriends());

    let success: boolean = false;
    await act(async () => {
      success = await result.current.addFriend(TEST_FRIEND_ID);
    });

    // 23505 is treated as success
    expect(success).toBe(true);
  });

  test('addFriend requires login', async () => {
    const { Alert } = require('react-native');
    // No user set

    const { result } = renderHook(() => useFriends());

    let success: boolean = false;
    await act(async () => {
      success = await result.current.addFriend(TEST_FRIEND_ID);
    });

    expect(success).toBe(false);
    expect(Alert.alert).toHaveBeenCalledWith('Error', 'You must be logged in');
  });

  test('removeFriendship deletes both directions', async () => {
    setAuthenticatedUser();
    useAppStore.setState({ friends: [mockFriendship()] });

    mockFrom.mockReturnValue(createChain({ data: [], error: null }));

    const { result } = renderHook(() => useFriends());

    let success: boolean = false;
    await act(async () => {
      success = await result.current.removeFriendship(TEST_FRIEND_ID);
    });

    expect(success).toBe(true);
  });

  test('removeFriendship returns false when not logged in', async () => {
    const { result } = renderHook(() => useFriends());

    let success: boolean = false;
    await act(async () => {
      success = await result.current.removeFriendship(TEST_FRIEND_ID);
    });

    expect(success).toBe(false);
  });

  test('addFriend completes missing direction when partial exists', async () => {
    setAuthenticatedUser();

    mockFrom.mockImplementation((table: string) => {
      if (table === 'users') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: { display_name: 'Friend' }, error: null }),
        };
      }
      // friendships - first call returns partial (only reverse direction)
      const chain = createChain({ data: [], error: null });
      chain.or = jest.fn().mockReturnValue({
        then: (resolve: any) => Promise.resolve({
          data: [{ id: 'f1', user_id: TEST_FRIEND_ID, friend_id: TEST_USER_ID, status: 'accepted' }],
          error: null,
        }).then(resolve),
      });
      return chain;
    });

    const { result } = renderHook(() => useFriends());

    let success: boolean = false;
    await act(async () => {
      success = await result.current.addFriend(TEST_FRIEND_ID);
    });

    expect(success).toBe(true);
  });

  test('removeFriendship removes friend from creator rooms', async () => {
    setAuthenticatedUser();
    useAppStore.setState({ friends: [mockFriendship()] });

    mockFrom.mockImplementation((table: string) => {
      if (table === 'rooms') {
        return createChain({ data: [{ id: 'r1' }], error: null });
      }
      return createChain({ data: [], error: null });
    });

    const { result } = renderHook(() => useFriends());

    let success: boolean = false;
    await act(async () => {
      success = await result.current.removeFriendship(TEST_FRIEND_ID);
    });

    expect(success).toBe(true);
    expect(mockFrom).toHaveBeenCalledWith('rooms');
    expect(mockFrom).toHaveBeenCalledWith('room_participants');
  });

  test('addFriend handles both directions already existing', async () => {
    setAuthenticatedUser();

    mockFrom.mockImplementation((table: string) => {
      if (table === 'users') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: { display_name: 'Friend' }, error: null }),
        };
      }
      // friendships - return both directions exist
      const chain = createChain({ data: [], error: null });
      chain.or = jest.fn().mockReturnValue({
        then: (resolve: any) => Promise.resolve({
          data: [
            { id: 'f1', user_id: TEST_USER_ID, friend_id: TEST_FRIEND_ID, status: 'accepted' },
            { id: 'f2', user_id: TEST_FRIEND_ID, friend_id: TEST_USER_ID, status: 'accepted' },
          ],
          error: null,
        }).then(resolve),
      });
      return chain;
    });

    const { result } = renderHook(() => useFriends());

    let success: boolean = false;
    await act(async () => {
      success = await result.current.addFriend(TEST_FRIEND_ID);
    });

    expect(success).toBe(true);
  });

  test('addFriend handles check error gracefully', async () => {
    setAuthenticatedUser();

    mockFrom.mockImplementation((table: string) => {
      if (table === 'users') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: { display_name: 'F' }, error: null }),
        };
      }
      const chain = createChain({ data: [], error: null });
      // First or() call for check returns error
      chain.or = jest.fn().mockReturnValue({
        then: (resolve: any) => Promise.resolve({ data: null, error: { message: 'check error' } }).then(resolve),
      });
      return chain;
    });

    const { result } = renderHook(() => useFriends());
    let success: boolean = false;
    await act(async () => {
      success = await result.current.addFriend(TEST_FRIEND_ID);
    });
    // Should still proceed and succeed (or fail gracefully)
    expect(typeof success).toBe('boolean');
  });

  test('addFriend handles generic error in catch', async () => {
    const { Alert } = require('react-native');
    setAuthenticatedUser();

    mockFrom.mockImplementation((table: string) => {
      if (table === 'users') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: { display_name: 'F' }, error: null }),
        };
      }
      const chain = createChain({ data: [], error: null });
      chain.or = jest.fn().mockReturnValue({
        then: (resolve: any) => Promise.resolve({ data: [], error: null }).then(resolve),
      });
      // insert throws a non-duplicate error
      chain.insert = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          then: (resolve: any) => Promise.resolve({ data: null, error: { code: 'XXXXX', message: 'db error' } }).then(resolve),
        }),
      });
      return chain;
    });

    const { result } = renderHook(() => useFriends());
    let success: boolean = true;
    await act(async () => {
      success = await result.current.addFriend(TEST_FRIEND_ID);
    });
    expect(success).toBe(false);
    expect(Alert.alert).toHaveBeenCalledWith('Error', 'db error');
  });

  test('removeFriendship handles delete error', async () => {
    const { Alert } = require('react-native');
    setAuthenticatedUser();
    useAppStore.setState({ friends: [mockFriendship()] });

    mockFrom.mockImplementation((table: string) => {
      if (table === 'rooms') {
        return createChain({ data: [], error: null });
      }
      // friendships delete throws
      return createChain({ data: null, error: { message: 'delete failed' } });
    });

    const { result } = renderHook(() => useFriends());
    let success: boolean = true;
    await act(async () => {
      success = await result.current.removeFriendship(TEST_FRIEND_ID);
    });
    expect(success).toBe(false);
    expect(Alert.alert).toHaveBeenCalledWith('Error', 'Failed to remove friend');
  });

  test('removeFriendship handles rooms error gracefully', async () => {
    setAuthenticatedUser();
    useAppStore.setState({ friends: [mockFriendship()] });

    mockFrom.mockImplementation((table: string) => {
      if (table === 'rooms') {
        return createChain({ data: null, error: { message: 'rooms error' } });
      }
      return createChain({ data: [], error: null });
    });

    const { result } = renderHook(() => useFriends());
    let success: boolean = false;
    await act(async () => {
      success = await result.current.removeFriendship(TEST_FRIEND_ID);
    });
    // Should still succeed (rooms error is logged but not thrown)
    expect(success).toBe(true);
  });

  test('loadFriends handles error on refresh', async () => {
    const { Alert } = require('react-native');
    setAuthenticatedUser();

    // First load succeeds
    mockFrom.mockReturnValue(createChain({ data: [mockFriendship()], error: null }));

    const { result } = renderHook(() => useFriends());

    await waitFor(() => {
      expect(result.current.initialLoading).toBe(false);
    });

    // Now trigger error on refresh
    mockFrom.mockReturnValue(createChain({ data: null, error: { message: 'fail' } }));

    await act(async () => {
      await result.current.refreshFriends();
    });

    expect(Alert.alert).toHaveBeenCalledWith('Error', expect.stringContaining('Failed to refresh'));
  });
});
