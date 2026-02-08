import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useFirstTimeRoom } from '../../hooks/useFirstTimeRoom';

const mockCreateRoom = jest.fn();
const mockLoadMyRooms = jest.fn();
const mockSetAsDefaultRoom = jest.fn();
const mockSetAsHomeRoom = jest.fn();
const mockEq = jest.fn();

jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({ select: jest.fn().mockReturnValue({ eq: mockEq }) })),
  },
}));

jest.mock('../../stores/appStore', () => {
  const store = {
    currentUser: { id: 'u1' },
    myRooms: [],
  };
  const useAppStore = jest.fn((selector?: any) => selector ? selector(store) : store);
  useAppStore.getState = jest.fn(() => store);
  return { useAppStore };
});

jest.mock('../../lib/logger', () => ({ logger: { error: jest.fn() } }));

jest.mock('../../hooks/useRoom', () => ({
  useRoom: () => ({
    myRooms: [],
    loadMyRooms: mockLoadMyRooms,
    createRoom: mockCreateRoom,
  }),
}));

jest.mock('../../hooks/useDefaultRoom', () => ({
  useDefaultRoom: () => ({ setAsDefaultRoom: mockSetAsDefaultRoom }),
}));

jest.mock('../../hooks/useHomeRoom', () => ({
  useHomeRoom: () => ({ setAsHomeRoom: mockSetAsHomeRoom }),
}));

beforeEach(() => jest.clearAllMocks());

describe('useFirstTimeRoom', () => {
  test('creates default room for first time user', async () => {
    mockEq.mockResolvedValue({ data: [], error: null });
    mockCreateRoom.mockResolvedValue({ id: 'room1' });

    const { result } = renderHook(() => useFirstTimeRoom());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockCreateRoom).toHaveBeenCalledWith('My Nūūky');
    expect(mockSetAsDefaultRoom).toHaveBeenCalledWith('room1');
    expect(mockSetAsHomeRoom).toHaveBeenCalledWith('room1');
  });

  test('skips room creation if user has rooms', async () => {
    mockEq.mockResolvedValue({ data: [{ room_id: 'existing' }], error: null });

    const { result } = renderHook(() => useFirstTimeRoom());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockCreateRoom).not.toHaveBeenCalled();
  });

  test('handles supabase error', async () => {
    mockEq.mockResolvedValue({ data: null, error: { message: 'fail' } });
    const { logger } = require('../../lib/logger');

    const { result } = renderHook(() => useFirstTimeRoom());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(logger.error).toHaveBeenCalled();
  });

  test('resetFirstTimeStatus works', async () => {
    mockEq.mockResolvedValue({ data: [], error: null });
    mockCreateRoom.mockResolvedValue({ id: 'room1' });

    const { result } = renderHook(() => useFirstTimeRoom());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => { result.current.resetFirstTimeStatus(); });
    expect(result.current.isFirstTime).toBe(false);
    expect(result.current.defaultRoomCreated).toBe(false);
  });
});
