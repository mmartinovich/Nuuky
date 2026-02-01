import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useCustomMood } from '../../hooks/useCustomMood';
import { useAppStore } from '../../stores/appStore';
import { resetStore, setAuthenticatedUser } from '../__utils__/mockStore';
import { mockCustomMood, TEST_USER_ID } from '../__utils__/fixtures';

const mockFrom = jest.fn();

jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: (...args: any[]) => mockFrom(...args),
  },
}));

jest.mock('react-native', () => ({
  Alert: { alert: jest.fn() },
}));

const createChain = (resolved: any = { data: null, error: null }) => ({
  select: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  single: jest.fn().mockResolvedValue(resolved),
  then: (resolve: any) => Promise.resolve(resolved).then(resolve),
});

describe('useCustomMood', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetStore();
    mockFrom.mockReturnValue(createChain({ data: [], error: null }));
  });

  test('fetches custom moods on mount', async () => {
    const moods = [mockCustomMood()];
    mockFrom.mockReturnValue(createChain({ data: moods, error: null }));
    setAuthenticatedUser();

    renderHook(() => useCustomMood());

    await waitFor(() => {
      expect(useAppStore.getState().customMoods).toEqual(moods);
    });
  });

  test('createCustomMood requires login', async () => {
    const { Alert } = require('react-native');
    const { result } = renderHook(() => useCustomMood());

    let mood: any;
    await act(async () => {
      mood = await result.current.createCustomMood('🔥', 'Fire', '#FF0000');
    });

    expect(mood).toBeNull();
    expect(Alert.alert).toHaveBeenCalledWith('Error', 'You must be logged in');
  });

  test('createCustomMood validates emoji', async () => {
    const { Alert } = require('react-native');
    setAuthenticatedUser();

    const { result } = renderHook(() => useCustomMood());

    let mood: any;
    await act(async () => {
      mood = await result.current.createCustomMood('', 'No emoji', '#FF0000');
    });

    expect(mood).toBeNull();
    expect(Alert.alert).toHaveBeenCalledWith('Missing Emoji', expect.any(String));
  });

  test('createCustomMood validates text length', async () => {
    const { Alert } = require('react-native');
    setAuthenticatedUser();

    const { result } = renderHook(() => useCustomMood());

    let mood: any;
    await act(async () => {
      mood = await result.current.createCustomMood('🔥', 'A'.repeat(51), '#FF0000');
    });

    expect(mood).toBeNull();
    expect(Alert.alert).toHaveBeenCalledWith('Message Too Long', expect.any(String));
  });

  test('createCustomMood replaces existing mood (1 limit)', async () => {
    setAuthenticatedUser();
    const existing = mockCustomMood();
    useAppStore.setState({ customMoods: [existing] });

    const newMood = mockCustomMood({ id: 'cm-new' });
    mockFrom.mockImplementation((table: string) => {
      if (table === 'custom_moods') {
        const chain = createChain({ data: null, error: null });
        chain.insert = jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: newMood, error: null }),
          }),
        });
        return chain;
      }
      return createChain({ data: null, error: null });
    });

    const { result } = renderHook(() => useCustomMood());

    let mood: any;
    await act(async () => {
      mood = await result.current.createCustomMood('✨', 'Sparkle', '#FFD700');
    });

    expect(mockFrom).toHaveBeenCalledWith('custom_moods');
  });

  test('createCustomMood handles 1-mood limit error', async () => {
    const { Alert } = require('react-native');
    setAuthenticatedUser();

    mockFrom.mockReturnValue({
      ...createChain(),
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Maximum 1 custom mood' },
      }),
      then: (resolve: any) => Promise.resolve({ data: [], error: null }).then(resolve),
    });

    const { result } = renderHook(() => useCustomMood());

    let mood: any;
    await act(async () => {
      mood = await result.current.createCustomMood('🔥', 'Fire', '#FF0000');
    });

    expect(mood).toBeNull();
    expect(Alert.alert).toHaveBeenCalledWith('Mood Limit Reached', expect.any(String));
  });

  test('selectCustomMood updates user custom_mood_id', async () => {
    setAuthenticatedUser();
    const cm = mockCustomMood();
    useAppStore.setState({ customMoods: [cm] });

    mockFrom.mockReturnValue(createChain({ data: null, error: null }));

    const { result } = renderHook(() => useCustomMood());

    let success: boolean = false;
    await act(async () => {
      success = await result.current.selectCustomMood(cm.id);
    });

    expect(success).toBe(true);
    expect(useAppStore.getState().activeCustomMood).toEqual(cm);
  });

  test('selectCustomMood fails for nonexistent mood', async () => {
    const { Alert } = require('react-native');
    setAuthenticatedUser();

    const { result } = renderHook(() => useCustomMood());

    let success: boolean = false;
    await act(async () => {
      success = await result.current.selectCustomMood('nonexistent');
    });

    expect(success).toBe(false);
    expect(Alert.alert).toHaveBeenCalledWith('Error', 'Custom mood not found');
  });

  test('deleteCustomMood removes and clears active if current', async () => {
    setAuthenticatedUser({ custom_mood_id: 'custom-mood-1' });
    const cm = mockCustomMood();
    useAppStore.setState({ customMoods: [cm], activeCustomMood: cm });

    // The mock needs to return the custom mood for fetchCustomMoods on mount,
    // and then succeed for delete/update calls
    mockFrom.mockImplementation(() => {
      const self: any = {};
      self.select = jest.fn().mockReturnValue(self);
      self.insert = jest.fn().mockReturnValue(self);
      self.update = jest.fn().mockReturnValue(self);
      self.delete = jest.fn().mockReturnValue(self);
      self.eq = jest.fn().mockReturnValue(self);
      self.order = jest.fn().mockReturnValue(self);
      self.single = jest.fn().mockResolvedValue({ data: null, error: null });
      // fetchCustomMoods resolves the chain with data (the moods)
      // delete/update resolve with { data: null, error: null }
      self.then = (resolve: any) => {
        const currentMoods = useAppStore.getState().customMoods;
        return Promise.resolve({ data: currentMoods.length > 0 ? currentMoods : [], error: null }).then(resolve);
      };
      return self;
    });

    const { result } = renderHook(() => useCustomMood());

    let success: boolean = false;
    await act(async () => {
      success = await result.current.deleteCustomMood(cm.id);
    });

    expect(success).toBe(true);
    expect(useAppStore.getState().customMoods).toHaveLength(0);
    expect(useAppStore.getState().activeCustomMood).toBeNull();
  });

  test('fetchCustomMoods returns empty without user', async () => {
    const { result } = renderHook(() => useCustomMood());
    let moods: any;
    await act(async () => {
      moods = await result.current.fetchCustomMoods();
    });
    expect(moods).toEqual([]);
  });

  test('fetchCustomMoods handles error gracefully', async () => {
    setAuthenticatedUser();
    // Use a chain that rejects for the select flow
    const chain = createChain({ data: null, error: { message: 'fail' } });
    chain.then = (resolve: any) => Promise.resolve({ data: null, error: { message: 'fail' } }).then(resolve);
    mockFrom.mockReturnValue(chain);

    const { result } = renderHook(() => useCustomMood());
    await act(async () => { await new Promise(r => setTimeout(r, 10)); });
    // Should not crash, moods stay empty
    expect(result.current.customMoods).toEqual([]);
  });

  test('createCustomMood validates empty text', async () => {
    const { Alert } = require('react-native');
    setAuthenticatedUser();

    const { result } = renderHook(() => useCustomMood());
    let mood: any;
    await act(async () => {
      mood = await result.current.createCustomMood('🔥', '', '#FF0000');
    });
    expect(mood).toBeNull();
    expect(Alert.alert).toHaveBeenCalledWith('Missing Message', expect.any(String));
  });

  test('createCustomMood handles generic error', async () => {
    const { Alert } = require('react-native');
    setAuthenticatedUser();

    mockFrom.mockReturnValue({
      ...createChain({ data: [], error: null }),
      insert: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: null,
            error: { message: 'some other error' },
          }),
        }),
      }),
    });

    const { result } = renderHook(() => useCustomMood());
    let mood: any;
    await act(async () => {
      mood = await result.current.createCustomMood('🔥', 'Fire', '#FF0000');
    });
    expect(mood).toBeNull();
    expect(Alert.alert).toHaveBeenCalledWith('Error', 'Failed to save custom mood. Try again.');
  });

  test('selectCustomMood requires login', async () => {
    const { Alert } = require('react-native');
    const { result } = renderHook(() => useCustomMood());
    let success = true;
    await act(async () => {
      success = await result.current.selectCustomMood('cm-1');
    });
    expect(success).toBe(false);
    expect(Alert.alert).toHaveBeenCalledWith('Error', 'You must be logged in');
  });

  test('selectCustomMood handles db error', async () => {
    const { Alert } = require('react-native');
    setAuthenticatedUser();
    const cm = mockCustomMood();
    useAppStore.setState({ customMoods: [cm] });

    mockFrom.mockReturnValue(createChain({ data: null, error: { message: 'fail' } }));

    const { result } = renderHook(() => useCustomMood());
    let success = true;
    await act(async () => {
      success = await result.current.selectCustomMood(cm.id);
    });
    expect(success).toBe(false);
    expect(Alert.alert).toHaveBeenCalledWith('Error', 'Failed to set custom mood');
  });

  test('deleteCustomMood requires login', async () => {
    const { Alert } = require('react-native');
    const { result } = renderHook(() => useCustomMood());
    let success = true;
    await act(async () => {
      success = await result.current.deleteCustomMood('cm-1');
    });
    expect(success).toBe(false);
    expect(Alert.alert).toHaveBeenCalledWith('Error', 'You must be logged in');
  });

  test('deleteCustomMood handles db error', async () => {
    const { Alert } = require('react-native');
    setAuthenticatedUser();

    mockFrom.mockReturnValue(createChain({ data: null, error: { message: 'fail' } }));

    const { result } = renderHook(() => useCustomMood());
    let success = true;
    await act(async () => {
      success = await result.current.deleteCustomMood('cm-1');
    });
    expect(success).toBe(false);
    expect(Alert.alert).toHaveBeenCalledWith('Error', 'Failed to delete custom mood');
  });

  test('createCustomMood succeeds and sets active', async () => {
    setAuthenticatedUser();
    const newMood = mockCustomMood({ id: 'cm-new' });

    mockFrom.mockImplementation(() => {
      const chain = createChain({ data: [], error: null });
      chain.insert = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: newMood, error: null }),
        }),
      });
      return chain;
    });

    const { result } = renderHook(() => useCustomMood());
    let mood: any;
    await act(async () => {
      mood = await result.current.createCustomMood('✨', 'Sparkle', '#FFD700');
    });
    expect(mood).toEqual(newMood);
    expect(useAppStore.getState().activeCustomMood).toEqual(newMood);
  });
});
