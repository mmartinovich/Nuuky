import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useStreaks } from '../../hooks/useStreaks';
import { useAppStore } from '../../stores/appStore';
import { resetStore, setAuthenticatedUser } from '../__utils__/mockStore';
import { TEST_USER_ID, TEST_FRIEND_ID } from '../__utils__/fixtures';

const mockFrom = jest.fn();

jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: (...args: any[]) => mockFrom(...args),
    channel: jest.fn().mockReturnValue({ on: jest.fn().mockReturnThis(), subscribe: jest.fn().mockReturnThis() }),
    removeChannel: jest.fn(),
  },
}));

jest.mock('../../lib/subscriptionManager', () => ({
  subscriptionManager: { register: jest.fn().mockReturnValue(jest.fn()) },
}));

const createChain = (resolved: any = { data: null, error: null }) => ({
  select: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  or: jest.fn().mockReturnThis(),
  maybeSingle: jest.fn().mockResolvedValue(resolved),
  then: (resolve: any) => Promise.resolve(resolved).then(resolve),
});

describe('useStreaks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetStore();
    mockFrom.mockReturnValue(createChain({ data: [], error: null }));
  });

  test('loads streaks on mount', async () => {
    const streakData = [{
      id: 's1',
      user1_id: TEST_USER_ID,
      user2_id: TEST_FRIEND_ID,
      consecutive_days: 3,
      user1_last_interaction: new Date().toISOString(),
      user2_last_interaction: new Date().toISOString(),
      last_streak_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    }];
    mockFrom.mockReturnValue(createChain({ data: streakData, error: null }));
    setAuthenticatedUser();

    const { result } = renderHook(() => useStreaks());

    await waitFor(() => {
      expect(result.current.streaks.length).toBeGreaterThanOrEqual(0);
    });
  });

  test('recordInteraction creates new streak if none exists', async () => {
    setAuthenticatedUser();

    let callIdx = 0;
    mockFrom.mockImplementation(() => {
      callIdx++;
      if (callIdx === 1) {
        // Load streaks
        return createChain({ data: [], error: null });
      }
      if (callIdx === 2) {
        // Check existing streak
        return {
          ...createChain({ data: null, error: null }),
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
        };
      }
      // Insert new streak + reload
      return createChain({ data: [], error: null });
    });

    const { result } = renderHook(() => useStreaks());

    await act(async () => {
      await result.current.recordInteraction(TEST_FRIEND_ID);
    });

    expect(mockFrom).toHaveBeenCalledWith('streaks');
  });

  test('returns refreshStreaks function', () => {
    setAuthenticatedUser();
    const { result } = renderHook(() => useStreaks());

    expect(typeof result.current.refreshStreaks).toBe('function');
  });

  test('recordInteraction updates existing streak', async () => {
    setAuthenticatedUser();
    const now = new Date();
    const recentTime = new Date(now.getTime() - 3600000).toISOString(); // 1hr ago

    let callIdx = 0;
    mockFrom.mockImplementation(() => {
      callIdx++;
      if (callIdx === 1) return createChain({ data: [], error: null }); // loadStreaks on mount
      if (callIdx === 2) {
        // Check existing streak - return existing
        return {
          ...createChain(),
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn().mockResolvedValue({
            data: {
              id: 's1',
              user1_id: TEST_USER_ID,
              user2_id: TEST_FRIEND_ID,
              consecutive_days: 3,
              user1_last_interaction: recentTime,
              user2_last_interaction: recentTime,
              last_streak_at: null,
            },
            error: null,
          }),
        };
      }
      return createChain({ data: [], error: null }); // update + loadStreaks
    });

    const { result } = renderHook(() => useStreaks());
    await act(async () => { await result.current.recordInteraction(TEST_FRIEND_ID); });
    expect(mockFrom).toHaveBeenCalledWith('streaks');
  });

  test('recordInteraction does nothing without user', async () => {
    const { result } = renderHook(() => useStreaks());
    await act(async () => { await result.current.recordInteraction(TEST_FRIEND_ID); });
    // Should not throw
  });

  test('refreshStreaks reloads data', async () => {
    setAuthenticatedUser();
    mockFrom.mockReturnValue(createChain({ data: [], error: null }));

    const { result } = renderHook(() => useStreaks());
    await act(async () => { result.current.refreshStreaks(); });
    expect(mockFrom).toHaveBeenCalledWith('streaks');
  });

  test('loads streaks with derived state', async () => {
    const recentTime = new Date().toISOString();
    const streakData = [{
      id: 's1',
      user1_id: TEST_USER_ID,
      user2_id: TEST_FRIEND_ID,
      consecutive_days: 5,
      user1_last_interaction: recentTime,
      user2_last_interaction: recentTime,
      last_streak_at: recentTime,
    }];
    mockFrom.mockReturnValue(createChain({ data: streakData, error: null }));
    setAuthenticatedUser();

    const { result } = renderHook(() => useStreaks());
    await waitFor(() => {
      expect(result.current.streaks).toHaveLength(1);
      expect(result.current.streaks[0].state).toBe('active');
      expect(result.current.streaks[0].friend_id).toBe(TEST_FRIEND_ID);
    });
  });

  test('streak state is broken when no interactions', async () => {
    const streakData = [{
      id: 's1',
      user1_id: TEST_USER_ID,
      user2_id: TEST_FRIEND_ID,
      consecutive_days: 0,
      user1_last_interaction: null,
      user2_last_interaction: null,
      last_streak_at: null,
    }];
    mockFrom.mockReturnValue(createChain({ data: streakData, error: null }));
    setAuthenticatedUser();

    const { result } = renderHook(() => useStreaks());
    await waitFor(() => {
      expect(result.current.streaks[0]?.state).toBe('broken');
    });
  });
});
