import { renderHook, act } from '@testing-library/react-native';
import { useMood } from '../../hooks/useMood';
import { useAppStore } from '../../stores/appStore';
import { resetStore, setAuthenticatedUser } from '../__utils__/mockStore';
import { TEST_USER_ID } from '../__utils__/fixtures';

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
  Alert: { alert: jest.fn() },
}));

const createChain = (resolved: any = { data: null, error: null }) => ({
  update: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  then: (resolve: any) => Promise.resolve(resolved).then(resolve),
});

describe('useMood', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetStore();
    mockFrom.mockReturnValue(createChain());
  });

  test('returns current mood from user', () => {
    setAuthenticatedUser({ mood: 'good' });
    const { result } = renderHook(() => useMood());
    expect(result.current.currentMood).toBe('good');
  });

  test('returns neutral when no user', () => {
    const { result } = renderHook(() => useMood());
    expect(result.current.currentMood).toBe('neutral');
  });

  test('changeMood requires login', async () => {
    const { Alert } = require('react-native');
    const { result } = renderHook(() => useMood());

    let success: boolean = false;
    await act(async () => {
      success = await result.current.changeMood('good');
    });

    expect(success).toBe(false);
    expect(Alert.alert).toHaveBeenCalledWith('Error', 'You must be logged in');
  });

  test('changeMood updates mood and clears custom mood', async () => {
    setAuthenticatedUser({ mood: 'neutral', custom_mood_id: 'cm-1' });

    const { result } = renderHook(() => useMood());

    let success: boolean = false;
    await act(async () => {
      success = await result.current.changeMood('good');
    });

    expect(success).toBe(true);
    const state = useAppStore.getState();
    expect(state.currentUser?.mood).toBe('good');
    expect(state.currentUser?.custom_mood_id).toBeUndefined();
    expect(state.activeCustomMood).toBeNull();
  });

  test('changeMood calls supabase with custom_mood_id: null', async () => {
    setAuthenticatedUser();

    const { result } = renderHook(() => useMood());

    await act(async () => {
      await result.current.changeMood('reach_out');
    });

    expect(mockFrom).toHaveBeenCalledWith('users');
  });

  test('changeMood shows error on failure', async () => {
    const { Alert } = require('react-native');
    setAuthenticatedUser();

    mockFrom.mockReturnValue(createChain({ data: null, error: { message: 'fail' } }));

    const { result } = renderHook(() => useMood());

    let success: boolean = false;
    await act(async () => {
      success = await result.current.changeMood('good');
    });

    expect(success).toBe(false);
    expect(Alert.alert).toHaveBeenCalledWith('Error', 'Failed to update mood');
  });
});
