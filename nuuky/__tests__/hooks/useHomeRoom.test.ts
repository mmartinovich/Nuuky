import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useHomeRoom } from '../../hooks/useHomeRoom';
import { useAppStore } from '../../stores/appStore';
import { resetStore, setAuthenticatedUser } from '../__utils__/mockStore';

const mockFrom = jest.fn();
const mockGetItem = jest.fn();
const mockSetItem = jest.fn();
const mockRemoveItem = jest.fn();

jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: (...args: any[]) => mockFrom(...args),
  },
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: (...args: any[]) => mockGetItem(...args),
    setItem: (...args: any[]) => mockSetItem(...args),
    removeItem: (...args: any[]) => mockRemoveItem(...args),
  },
}));

jest.mock('../../lib/logger', () => ({
  logger: { error: jest.fn() },
}));

const createChain = (resolved: any = { data: null, error: null }) => {
  const self: any = {};
  self.select = jest.fn().mockReturnValue(self);
  self.update = jest.fn().mockReturnValue(self);
  self.eq = jest.fn().mockReturnValue(self);
  self.single = jest.fn().mockResolvedValue(resolved);
  self.then = (resolve: any) => Promise.resolve(resolved).then(resolve);
  return self;
};

describe('useHomeRoom', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetStore();
    mockFrom.mockReturnValue(createChain());
    mockGetItem.mockResolvedValue(null);
    mockSetItem.mockResolvedValue(undefined);
    mockRemoveItem.mockResolvedValue(undefined);
  });

  test('returns expected API', () => {
    const { result } = renderHook(() => useHomeRoom());
    expect(result.current).toHaveProperty('homeRoom');
    expect(result.current).toHaveProperty('setAsHomeRoom');
    expect(result.current).toHaveProperty('clearHomeRoom');
    expect(result.current).toHaveProperty('isHomeRoom');
  });

  test('isHomeRoom checks against store', () => {
    useAppStore.setState({ homeRoomId: 'room1' });
    setAuthenticatedUser();
    const { result } = renderHook(() => useHomeRoom());
    expect(result.current.isHomeRoom('room1')).toBe(true);
    expect(result.current.isHomeRoom('other')).toBe(false);
  });

  test('setAsHomeRoom returns false without user', async () => {
    const { result } = renderHook(() => useHomeRoom());
    let success = false;
    await act(async () => {
      success = await result.current.setAsHomeRoom('room1');
    });
    expect(success).toBe(false);
  });

  test('setAsHomeRoom succeeds with user', async () => {
    setAuthenticatedUser();
    mockFrom.mockReturnValue(createChain({ data: null, error: null }));

    const { result } = renderHook(() => useHomeRoom());

    let success = false;
    await act(async () => {
      success = await result.current.setAsHomeRoom('room1');
    });

    expect(success).toBe(true);
    expect(useAppStore.getState().homeRoomId).toBe('room1');
    expect(mockSetItem).toHaveBeenCalledWith('nooke_home_room_id', 'room1');
  });

  test('clearHomeRoom succeeds', async () => {
    setAuthenticatedUser();
    useAppStore.setState({ homeRoomId: 'room1' });
    mockFrom.mockReturnValue(createChain({ data: null, error: null }));

    const { result } = renderHook(() => useHomeRoom());

    let success = false;
    await act(async () => {
      success = await result.current.clearHomeRoom();
    });

    expect(success).toBe(true);
    expect(useAppStore.getState().homeRoomId).toBeNull();
  });

  test('homeRoom resolves from myRooms', () => {
    const room = { id: 'room1', name: 'Home' };
    useAppStore.setState({ homeRoomId: 'room1', myRooms: [room as any] });
    setAuthenticatedUser();

    const { result } = renderHook(() => useHomeRoom());
    expect(result.current.homeRoom).toEqual(room);
  });

  test('homeRoom returns null when no rooms', () => {
    useAppStore.setState({ homeRoomId: 'room1', myRooms: [] });
    const { result } = renderHook(() => useHomeRoom());
    expect(result.current.homeRoom).toBeNull();
  });

  test('clearHomeRoom returns false without user', async () => {
    const { result } = renderHook(() => useHomeRoom());
    let success = false;
    await act(async () => {
      success = await result.current.clearHomeRoom();
    });
    expect(success).toBe(false);
  });

  test('setAsHomeRoom handles supabase error with rollback', async () => {
    setAuthenticatedUser();
    mockFrom.mockReturnValue(createChain({ data: null, error: { message: 'fail' } }));

    const { result } = renderHook(() => useHomeRoom());

    let success = false;
    await act(async () => {
      success = await result.current.setAsHomeRoom('room1');
    });

    expect(success).toBe(false);
  });

  test('initializeHomeRoom loads from AsyncStorage and syncs', async () => {
    setAuthenticatedUser();
    mockGetItem.mockResolvedValue('cached-room');
    mockFrom.mockReturnValue(createChain({
      data: { home_room_id: 'server-room', default_room_id: null },
      error: null,
    }));

    renderHook(() => useHomeRoom());

    await waitFor(() => {
      expect(useAppStore.getState().homeRoomId).toBe('server-room');
    });
    expect(mockSetItem).toHaveBeenCalledWith('nooke_home_room_id', 'server-room');
  });

  test('initializeHomeRoom migrates from default_room_id', async () => {
    setAuthenticatedUser();
    mockGetItem.mockResolvedValue(null);
    mockFrom.mockReturnValue(createChain({
      data: { home_room_id: null, default_room_id: 'default-room' },
      error: null,
    }));

    renderHook(() => useHomeRoom());

    await waitFor(() => {
      expect(useAppStore.getState().homeRoomId).toBe('default-room');
    });
  });
});
