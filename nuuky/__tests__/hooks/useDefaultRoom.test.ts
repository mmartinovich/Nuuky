import { renderHook, act } from '@testing-library/react-native';
import { useDefaultRoom } from '../../hooks/useDefaultRoom';
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

describe('useDefaultRoom', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetStore();
    mockFrom.mockReturnValue(createChain());
    mockGetItem.mockResolvedValue(null);
    mockSetItem.mockResolvedValue(undefined);
    mockRemoveItem.mockResolvedValue(undefined);
  });

  test('returns expected API', () => {
    const { result } = renderHook(() => useDefaultRoom());
    expect(result.current).toHaveProperty('defaultRoom');
    expect(result.current).toHaveProperty('setAsDefaultRoom');
    expect(result.current).toHaveProperty('clearDefaultRoom');
    expect(result.current).toHaveProperty('isDefaultRoom');
  });

  test('isDefaultRoom returns true for matching id', () => {
    useAppStore.setState({ defaultRoomId: 'room1' });
    setAuthenticatedUser();
    const { result } = renderHook(() => useDefaultRoom());
    expect(result.current.isDefaultRoom('room1')).toBe(true);
    expect(result.current.isDefaultRoom('room2')).toBe(false);
  });

  test('setAsDefaultRoom returns false without user', () => {
    const { result } = renderHook(() => useDefaultRoom());
    expect(result.current.setAsDefaultRoom('room1')).toBe(false);
  });

  test('setAsDefaultRoom sets room and persists', () => {
    setAuthenticatedUser();
    mockFrom.mockReturnValue(createChain({ data: null, error: null }));
    const { result } = renderHook(() => useDefaultRoom());

    const success = result.current.setAsDefaultRoom('room1');
    expect(success).toBe(true);
    expect(useAppStore.getState().defaultRoomId).toBe('room1');
    expect(mockSetItem).toHaveBeenCalledWith('nooke_default_room_id', 'room1');
  });

  test('clearDefaultRoom returns false without user', async () => {
    const { result } = renderHook(() => useDefaultRoom());
    let success = false;
    await act(async () => {
      success = await result.current.clearDefaultRoom();
    });
    expect(success).toBe(false);
  });

  test('clearDefaultRoom clears room', async () => {
    setAuthenticatedUser();
    useAppStore.setState({ defaultRoomId: 'room1' });
    mockFrom.mockReturnValue(createChain({ data: null, error: null }));

    const { result } = renderHook(() => useDefaultRoom());

    let success = false;
    await act(async () => {
      success = await result.current.clearDefaultRoom();
    });

    expect(success).toBe(true);
    expect(useAppStore.getState().defaultRoomId).toBeNull();
    expect(mockRemoveItem).toHaveBeenCalledWith('nooke_default_room_id');
  });

  test('defaultRoom resolves from myRooms', () => {
    const room = { id: 'room1', name: 'Test Room' };
    useAppStore.setState({ defaultRoomId: 'room1', myRooms: [room as any] });
    setAuthenticatedUser();

    const { result } = renderHook(() => useDefaultRoom());
    expect(result.current.defaultRoom).toEqual(room);
  });

  test('defaultRoom is null when not in myRooms', () => {
    useAppStore.setState({ defaultRoomId: 'room1', myRooms: [] });
    const { result } = renderHook(() => useDefaultRoom());
    expect(result.current.defaultRoom).toBeNull();
  });
});
