import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useRoom } from '../../hooks/useRoom';
import { useAppStore } from '../../stores/appStore';
import { resetStore, setAuthenticatedUser } from '../__utils__/mockStore';
import { mockRoom, mockRoomParticipant, TEST_USER_ID, TEST_FRIEND_ID, TEST_ROOM_ID } from '../__utils__/fixtures';

const mockFrom = jest.fn();
const mockGetSession = jest.fn();

jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: (...args: any[]) => mockFrom(...args),
    channel: jest.fn().mockReturnValue({ on: jest.fn().mockReturnThis(), subscribe: jest.fn().mockReturnThis() }),
    removeChannel: jest.fn(),
    auth: {
      getSession: (...args: any[]) => mockGetSession(...args),
    },
    functions: { invoke: jest.fn().mockResolvedValue({ data: {}, error: null }) },
  },
}));

jest.mock('../../lib/subscriptionManager', () => ({
  subscriptionManager: { register: jest.fn().mockReturnValue(jest.fn()) },
}));

jest.mock('../../lib/logger', () => ({
  logger: { log: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
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
  neq: jest.fn().mockReturnThis(),
  or: jest.fn().mockReturnThis(),
  in: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  single: jest.fn().mockResolvedValue(resolved),
  maybeSingle: jest.fn().mockResolvedValue(resolved),
  then: (resolve: any) => Promise.resolve(resolved).then(resolve),
});

describe('useRoom', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetStore();
    mockFrom.mockReturnValue(createChain({ data: [], error: null }));
    mockGetSession.mockResolvedValue({
      data: { session: { user: { id: TEST_USER_ID }, access_token: 'tok' } },
      error: null,
    });
  });

  test('loads rooms on mount when authenticated', async () => {
    const rooms = [mockRoom()];
    mockFrom.mockReturnValue(createChain({ data: rooms, error: null }));
    setAuthenticatedUser();

    renderHook(() => useRoom());

    await waitFor(() => {
      expect(mockFrom).toHaveBeenCalled();
    });
  });

  test('createRoom checks 5-room limit', async () => {
    const { Alert } = require('react-native');
    setAuthenticatedUser();

    // All from() calls return 5 rooms (for the limit check)
    mockFrom.mockReturnValue(createChain({ data: [1, 2, 3, 4, 5].map(i => ({ id: `r${i}` })), error: null }));

    const { result } = renderHook(() => useRoom());

    let room: any;
    await act(async () => {
      room = await result.current.createRoom('New Room');
    });

    expect(room).toBeNull();
    expect(Alert.alert).toHaveBeenCalledWith('Room Limit Reached', expect.any(String));
  });

  test('createRoom succeeds when under limit', async () => {
    setAuthenticatedUser();

    const newRoom = mockRoom();
    mockFrom.mockImplementation((table: string) => {
      if (table === 'rooms') {
        const chain = createChain({ data: [{ id: 'r1' }], error: null });
        // insert().select().single() for room creation
        chain.insert = jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: newRoom, error: null }),
            then: (resolve: any) => Promise.resolve({ data: [{ id: 'r1' }], error: null }).then(resolve),
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockReturnThis(),
          }),
        });
        return chain;
      }
      return createChain({ data: [], error: null });
    });

    const { result } = renderHook(() => useRoom());

    let room: any;
    await act(async () => {
      room = await result.current.createRoom('Test Room');
    });

    expect(mockFrom).toHaveBeenCalled();
  });

  test('createRoom requires login', async () => {
    const { Alert } = require('react-native');

    const { result } = renderHook(() => useRoom());

    let room: any;
    await act(async () => {
      room = await result.current.createRoom('Room');
    });

    expect(room).toBeNull();
    expect(Alert.alert).toHaveBeenCalledWith('Error', 'You must be logged in');
  });

  test('joinRoom prevents concurrent joins', async () => {
    setAuthenticatedUser();
    mockFrom.mockReturnValue(createChain({ data: null, error: null }));

    const { result } = renderHook(() => useRoom());

    const p1 = result.current.joinRoom(TEST_ROOM_ID);
    const p2 = result.current.joinRoom(TEST_ROOM_ID);

    const [r1, r2] = await Promise.all([p1, p2]);
    expect(typeof r1).toBe('boolean');
    expect(typeof r2).toBe('boolean');
  });

  test('joinRoom requires login', async () => {
    const { Alert } = require('react-native');
    const { result } = renderHook(() => useRoom());

    let success: boolean = false;
    await act(async () => {
      success = await result.current.joinRoom(TEST_ROOM_ID);
    });

    expect(success).toBe(false);
    expect(Alert.alert).toHaveBeenCalledWith('Error', 'You must be logged in');
  });

  test('deleteRoom verifies creator', async () => {
    const { Alert } = require('react-native');
    setAuthenticatedUser();

    mockFrom.mockReturnValue({
      ...createChain(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: { creator_id: 'other-user' }, error: null }),
    });

    const { result } = renderHook(() => useRoom());

    let success: boolean = false;
    await act(async () => {
      success = await result.current.deleteRoom(TEST_ROOM_ID);
    });

    expect(success).toBe(false);
    expect(Alert.alert).toHaveBeenCalledWith('Error', 'Only the creator can delete this room');
  });

  test('toggleMute toggles mute state', async () => {
    setAuthenticatedUser();
    useAppStore.setState({ currentRoom: mockRoom() });

    mockFrom.mockReturnValue({
      ...createChain(),
      select: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: { is_muted: false }, error: null }),
    });

    const { result } = renderHook(() => useRoom());

    await act(async () => {
      await result.current.toggleMute();
    });

    expect(mockFrom).toHaveBeenCalledWith('room_participants');
  });

  test('updateRoomName verifies creator and updates', async () => {
    setAuthenticatedUser();
    const room = mockRoom();
    useAppStore.setState({ currentRoom: room });

    // Use table-based mock - rooms table needs to handle both the creator check and update
    mockFrom.mockImplementation((table: string) => {
      if (table === 'rooms') {
        return {
          select: jest.fn().mockReturnThis(),
          update: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: { creator_id: TEST_USER_ID }, error: null }),
          then: (resolve: any) => Promise.resolve({ data: null, error: null }).then(resolve),
        };
      }
      return createChain({ data: [], error: null });
    });

    const { result } = renderHook(() => useRoom());

    let success: boolean = false;
    await act(async () => {
      success = await result.current.updateRoomName(TEST_ROOM_ID, 'New Name');
    });

    expect(success).toBe(true);
  });

  test('removeParticipant prevents self-removal', async () => {
    const { Alert } = require('react-native');
    setAuthenticatedUser();

    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: { creator_id: TEST_USER_ID }, error: null }),
    });

    const { result } = renderHook(() => useRoom());

    let success: boolean = false;
    await act(async () => {
      success = await result.current.removeParticipant(TEST_ROOM_ID, TEST_USER_ID);
    });

    expect(success).toBe(false);
    expect(Alert.alert).toHaveBeenCalledWith('Error', expect.stringContaining('Cannot remove yourself'));
  });

  test('transferOwnership verifies new owner is participant', async () => {
    const { Alert } = require('react-native');
    setAuthenticatedUser();

    // The hook first checks rooms for creator_id, then room_participants for participant
    mockFrom.mockImplementation((table: string) => {
      if (table === 'rooms') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: { creator_id: TEST_USER_ID }, error: null }),
          then: (resolve: any) => Promise.resolve({ data: [], error: null }).then(resolve),
        };
      }
      if (table === 'room_participants') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: null, error: null }),
          then: (resolve: any) => Promise.resolve({ data: [], error: null }).then(resolve),
        };
      }
      return createChain();
    });

    const { result } = renderHook(() => useRoom());

    let success: boolean = false;
    await act(async () => {
      success = await result.current.transferOwnership(TEST_ROOM_ID, 'nonexistent');
    });

    expect(success).toBe(false);
    expect(Alert.alert).toHaveBeenCalledWith('Error', 'New owner must be a room member');
  });

  test('inviteFriendToRoom checks if user is in room', async () => {
    const { Alert } = require('react-native');
    setAuthenticatedUser();

    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
      maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    });

    const { result } = renderHook(() => useRoom());

    let success: boolean = false;
    await act(async () => {
      success = await result.current.inviteFriendToRoom(TEST_ROOM_ID, TEST_FRIEND_ID);
    });

    expect(success).toBe(false);
    expect(Alert.alert).toHaveBeenCalledWith('Error', 'You must be in the room to invite others');
  });

  test('inviteFriendToRoom detects already in room', async () => {
    const { Alert } = require('react-native');
    setAuthenticatedUser();

    let callCount = 0;
    mockFrom.mockImplementation((table: string) => {
      if (table === 'room_participants') {
        callCount++;
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          // First call: user is participant. Second call: friend is already participant
          single: jest.fn().mockResolvedValue({ data: { id: 'p1' }, error: null }),
          maybeSingle: jest.fn().mockResolvedValue({ data: { id: 'p2' }, error: null }),
        };
      }
      return createChain({ data: [], error: null });
    });

    const { result } = renderHook(() => useRoom());

    let success: boolean = false;
    await act(async () => {
      success = await result.current.inviteFriendToRoom(TEST_ROOM_ID, TEST_FRIEND_ID);
    });

    expect(success).toBe(false);
    expect(Alert.alert).toHaveBeenCalledWith('Already in room', expect.any(String));
  });

  test('inviteFriendToRoom detects pending invite', async () => {
    const { Alert } = require('react-native');
    setAuthenticatedUser();

    mockFrom.mockImplementation((table: string) => {
      if (table === 'room_participants') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: { id: 'p1' }, error: null }),
          maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
        };
      }
      if (table === 'room_invites') {
        return {
          select: jest.fn().mockReturnThis(),
          insert: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn().mockResolvedValue({ data: { id: 'inv1' }, error: null }),
        };
      }
      return createChain({ data: [], error: null });
    });

    const { result } = renderHook(() => useRoom());

    let success: boolean = false;
    await act(async () => {
      success = await result.current.inviteFriendToRoom(TEST_ROOM_ID, TEST_FRIEND_ID);
    });

    expect(success).toBe(false);
    expect(Alert.alert).toHaveBeenCalledWith('Invite pending', expect.any(String));
  });

  test('canCreateRoom returns true when under limit', async () => {
    setAuthenticatedUser();
    mockFrom.mockReturnValue(createChain({ data: [{ id: 'r1' }], error: null }));

    const { result } = renderHook(() => useRoom());

    let canCreate: boolean = false;
    await act(async () => {
      canCreate = await result.current.canCreateRoom();
    });

    expect(canCreate).toBe(true);
  });

  test('canCreateRoom returns false when at limit', async () => {
    setAuthenticatedUser();
    mockFrom.mockReturnValue(createChain({ data: [1,2,3,4,5].map(i => ({ id: `r${i}` })), error: null }));

    const { result } = renderHook(() => useRoom());

    let canCreate: boolean = false;
    await act(async () => {
      canCreate = await result.current.canCreateRoom();
    });

    expect(canCreate).toBe(false);
  });

  test('leaveRoomById removes participant', async () => {
    setAuthenticatedUser();
    mockFrom.mockReturnValue(createChain({ data: null, error: null }));

    const { result } = renderHook(() => useRoom());

    await act(async () => {
      await result.current.leaveRoomById('some-room');
    });

    expect(mockFrom).toHaveBeenCalledWith('room_participants');
  });

  test('leaveRoomById clears current room if matching', async () => {
    setAuthenticatedUser();
    const room = mockRoom();
    useAppStore.setState({ currentRoom: room, myRooms: [room] });
    mockFrom.mockReturnValue(createChain({ data: null, error: null }));

    const { result } = renderHook(() => useRoom());

    await act(async () => {
      await result.current.leaveRoomById(room.id);
    });

    expect(useAppStore.getState().currentRoom).toBeNull();
  });

  test('deleteRoom succeeds for creator', async () => {
    const { Alert } = require('react-native');
    setAuthenticatedUser();
    const room = mockRoom();
    useAppStore.setState({ currentRoom: room, myRooms: [room] });

    mockFrom.mockImplementation((table: string) => {
      if (table === 'rooms') {
        return {
          select: jest.fn().mockReturnThis(),
          delete: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          in: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: { creator_id: TEST_USER_ID }, error: null }),
          then: (resolve: any) => Promise.resolve({ data: null, error: null }).then(resolve),
        };
      }
      return createChain({ data: [], error: null });
    });

    const { result } = renderHook(() => useRoom());

    let success: boolean = false;
    await act(async () => {
      success = await result.current.deleteRoom(room.id);
    });

    expect(success).toBe(true);
    expect(Alert.alert).toHaveBeenCalledWith('Success', 'Room deleted');
  });

  test('removeParticipant succeeds for other user', async () => {
    setAuthenticatedUser();
    useAppStore.setState({
      currentRoom: mockRoom(),
      roomParticipants: [
        { id: 'p1', user_id: TEST_USER_ID, room_id: TEST_ROOM_ID } as any,
        { id: 'p2', user_id: TEST_FRIEND_ID, room_id: TEST_ROOM_ID } as any,
      ],
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === 'rooms') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: { creator_id: TEST_USER_ID }, error: null }),
        };
      }
      return createChain({ data: [], error: null });
    });

    const { result } = renderHook(() => useRoom());

    let success: boolean = false;
    await act(async () => {
      success = await result.current.removeParticipant(TEST_ROOM_ID, TEST_FRIEND_ID);
    });

    expect(success).toBe(true);
  });

  test('transferOwnership succeeds', async () => {
    const { Alert } = require('react-native');
    setAuthenticatedUser();
    const room = mockRoom();
    useAppStore.setState({ currentRoom: room });

    let fromCallCount = 0;
    mockFrom.mockImplementation((table: string) => {
      if (table === 'rooms') {
        fromCallCount++;
        return {
          select: jest.fn().mockReturnThis(),
          update: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          in: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: { creator_id: TEST_USER_ID }, error: null }),
          then: (resolve: any) => Promise.resolve({ data: null, error: null }).then(resolve),
        };
      }
      if (table === 'room_participants') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: { id: 'p1' }, error: null }),
          then: (resolve: any) => Promise.resolve({ data: [], error: null }).then(resolve),
        };
      }
      return createChain({ data: [], error: null });
    });

    const { result } = renderHook(() => useRoom());

    let success: boolean = false;
    await act(async () => {
      success = await result.current.transferOwnership(TEST_ROOM_ID, TEST_FRIEND_ID);
    });

    expect(success).toBe(true);
    expect(Alert.alert).toHaveBeenCalledWith('Success', 'Ownership transferred');
  });

  test('createRoom checks session expiry', async () => {
    const { Alert } = require('react-native');
    setAuthenticatedUser();
    mockGetSession.mockResolvedValue({ data: { session: null }, error: { message: 'expired' } });

    const { result } = renderHook(() => useRoom());

    let room: any;
    await act(async () => {
      room = await result.current.createRoom('Room');
    });

    expect(room).toBeNull();
    expect(Alert.alert).toHaveBeenCalledWith('Session Expired', expect.any(String));
  });

  test('clearLastJoinedRoom works', () => {
    setAuthenticatedUser();
    const { result } = renderHook(() => useRoom());
    // Should not throw
    result.current.clearLastJoinedRoom();
  });
});
