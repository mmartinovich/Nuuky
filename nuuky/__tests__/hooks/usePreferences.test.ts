import { renderHook, act } from '@testing-library/react-native';
import { usePreferences } from '../../hooks/usePreferences';
import { useAppStore } from '../../stores/appStore';
import { resetStore, setAuthenticatedUser } from '../__utils__/mockStore';

const mockFrom = jest.fn();

jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: (...args: any[]) => mockFrom(...args),
  },
}));

jest.mock('react-native', () => ({
  Alert: { alert: jest.fn() },
}));

jest.mock('../../lib/logger', () => ({
  logger: { error: jest.fn() },
}));

const createChain = (resolved: any = { data: null, error: null }) => {
  const self: any = {};
  self.select = jest.fn().mockReturnValue(self);
  self.insert = jest.fn().mockReturnValue(self);
  self.update = jest.fn().mockReturnValue(self);
  self.eq = jest.fn().mockReturnValue(self);
  self.single = jest.fn().mockResolvedValue(resolved);
  self.then = (resolve: any) => Promise.resolve(resolved).then(resolve);
  return self;
};

const mockPrefs = {
  id: 'pref1',
  user_id: 'user1',
  nudges_enabled: true,
  flares_enabled: true,
  room_invites_enabled: true,
  created_at: '2024-01-01',
  updated_at: '2024-01-01',
};

describe('usePreferences', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetStore();
    mockFrom.mockReturnValue(createChain({ data: mockPrefs, error: null }));
  });

  test('returns defaults without user', () => {
    const { result } = renderHook(() => usePreferences());
    expect(result.current.nudgesEnabled).toBe(true);
    expect(result.current.flaresEnabled).toBe(true);
    expect(result.current.roomInvitesEnabled).toBe(true);
  });

  test('loads preferences on mount with user', async () => {
    setAuthenticatedUser();
    const { result } = renderHook(() => usePreferences());

    // Wait for mount effect
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(result.current.preferences).toEqual(mockPrefs);
  });

  test('toggleNudges returns false without preferences', async () => {
    const { result } = renderHook(() => usePreferences());

    let success = false;
    await act(async () => {
      success = await result.current.toggleNudges();
    });

    expect(success).toBe(false);
  });

  test('toggleNudges works after prefs loaded', async () => {
    setAuthenticatedUser();
    mockFrom.mockReturnValue(createChain({ data: mockPrefs, error: null }));

    const { result } = renderHook(() => usePreferences());

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    // Now toggle
    mockFrom.mockReturnValue(createChain({ data: null, error: null }));
    let success = false;
    await act(async () => {
      success = await result.current.toggleNudges();
    });

    expect(success).toBe(true);
    expect(result.current.nudgesEnabled).toBe(false);
  });

  test('creates default prefs when not found (PGRST116)', async () => {
    setAuthenticatedUser();
    const newPrefs = { ...mockPrefs };

    // First call: single() returns PGRST116 error
    // Second call: insert returns new prefs
    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return createChain({ data: null, error: { code: 'PGRST116', message: 'not found' } });
      }
      return createChain({ data: newPrefs, error: null });
    });

    const { result } = renderHook(() => usePreferences());

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(result.current.preferences).toEqual(newPrefs);
  });

  test('handles load error with fallback defaults', async () => {
    setAuthenticatedUser();
    mockFrom.mockReturnValue(createChain({ data: null, error: { code: 'OTHER', message: 'fail' } }));

    const { result } = renderHook(() => usePreferences());

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    // Should fall back to default prefs
    expect(result.current.preferences).not.toBeNull();
    expect(result.current.nudgesEnabled).toBe(true);
  });

  test('updatePreference reverts on error', async () => {
    const { Alert } = require('react-native');
    setAuthenticatedUser();
    mockFrom.mockReturnValue(createChain({ data: mockPrefs, error: null }));

    const { result } = renderHook(() => usePreferences());
    await act(async () => { await new Promise((r) => setTimeout(r, 0)); });

    // Make update fail
    mockFrom.mockReturnValue(createChain({ data: null, error: { message: 'update failed' } }));
    let success = true;
    await act(async () => {
      success = await result.current.toggleNudges();
    });

    expect(success).toBe(false);
    expect(Alert.alert).toHaveBeenCalledWith('Error', expect.any(String));
    expect(result.current.nudgesEnabled).toBe(true); // reverted
  });

  test('toggleFlares returns false without prefs', async () => {
    const { result } = renderHook(() => usePreferences());
    let success = true;
    await act(async () => { success = await result.current.toggleFlares(); });
    expect(success).toBe(false);
  });

  test('toggleRoomInvites returns false without prefs', async () => {
    const { result } = renderHook(() => usePreferences());
    let success = true;
    await act(async () => { success = await result.current.toggleRoomInvites(); });
    expect(success).toBe(false);
  });

  test('toggleFlares works with loaded prefs', async () => {
    setAuthenticatedUser();
    mockFrom.mockReturnValue(createChain({ data: mockPrefs, error: null }));
    const { result } = renderHook(() => usePreferences());
    await act(async () => { await new Promise((r) => setTimeout(r, 0)); });

    mockFrom.mockReturnValue(createChain({ data: null, error: null }));
    let success = false;
    await act(async () => { success = await result.current.toggleFlares(); });
    expect(success).toBe(true);
    expect(result.current.flaresEnabled).toBe(false);
  });

  test('toggleRoomInvites works with loaded prefs', async () => {
    setAuthenticatedUser();
    mockFrom.mockReturnValue(createChain({ data: mockPrefs, error: null }));
    const { result } = renderHook(() => usePreferences());
    await act(async () => { await new Promise((r) => setTimeout(r, 0)); });

    mockFrom.mockReturnValue(createChain({ data: null, error: null }));
    let success = false;
    await act(async () => { success = await result.current.toggleRoomInvites(); });
    expect(success).toBe(true);
    expect(result.current.roomInvitesEnabled).toBe(false);
  });

  test('refreshPreferences reloads data', async () => {
    setAuthenticatedUser();
    mockFrom.mockReturnValue(createChain({ data: mockPrefs, error: null }));
    const { result } = renderHook(() => usePreferences());
    await act(async () => { await new Promise((r) => setTimeout(r, 0)); });

    await act(async () => { await result.current.refreshPreferences(); });
    expect(mockFrom).toHaveBeenCalledWith('user_preferences');
  });
});
