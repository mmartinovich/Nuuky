import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useRoomInvites } from '../../hooks/useRoomInvites';
import { useAppStore } from '../../stores/appStore';
import { resetStore, setAuthenticatedUser } from '../__utils__/mockStore';
import { mockRoomInvite, mockRoom, TEST_USER_ID, TEST_FRIEND_ID, TEST_ROOM_ID } from '../__utils__/fixtures';

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

jest.mock('react-native', () => ({
  Alert: { alert: jest.fn() },
}));

const createChain = (resolved: any = { data: null, error: null }) => ({
  select: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  gt: jest.fn().mockReturnThis(),
  in: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  single: jest.fn().mockResolvedValue(resolved),
  maybeSingle: jest.fn().mockResolvedValue(resolved),
  then: (resolve: any) => Promise.resolve(resolved).then(resolve),
});

describe('useRoomInvites', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetStore();
    mockFrom.mockReturnValue(createChain({ data: [], error: null }));
    mockGetSession.mockResolvedValue({
      data: { session: { user: { id: TEST_USER_ID }, access_token: 'tok' } },
      error: null,
    });
  });

  test('loads invites on mount', async () => {
    const invites = [mockRoomInvite()];
    mockFrom.mockReturnValue(createChain({ data: invites, error: null }));
    setAuthenticatedUser();

    renderHook(() => useRoomInvites());

    await waitFor(() => {
      expect(useAppStore.getState().roomInvites).toEqual(invites);
    });
  });

  test('acceptInvite joins room and removes invite from store', async () => {
    setAuthenticatedUser();
    const invite = mockRoomInvite();
    useAppStore.setState({ roomInvites: [invite] });

    // Use table-based mocking
    mockFrom.mockImplementation((table: string) => {
      if (table === 'room_invites') {
        const chain = createChain({ data: null, error: null });
        // For the initial select().eq().single() to get invite details
        chain.single = jest.fn().mockResolvedValue({
          data: { ...invite, room: mockRoom() },
          error: null,
        });
        return chain;
      }
      if (table === 'room_participants') {
        // For count check and insert
        return createChain({ data: [], error: null });
      }
      return createChain({ data: [], error: null });
    });

    const { result } = renderHook(() => useRoomInvites());

    let success: boolean = false;
    await act(async () => {
      success = await result.current.acceptInvite(invite.id);
    });

    expect(success).toBe(true);
    expect(useAppStore.getState().roomInvites).toHaveLength(0);
  });

  test('declineInvite updates status and removes from store', async () => {
    setAuthenticatedUser();
    const invite = mockRoomInvite();
    useAppStore.setState({ roomInvites: [invite] });

    mockFrom.mockReturnValue(createChain({ data: null, error: null }));

    const { result } = renderHook(() => useRoomInvites());

    let success: boolean = false;
    await act(async () => {
      success = await result.current.declineInvite(invite.id);
    });

    expect(success).toBe(true);
    expect(useAppStore.getState().roomInvites).toHaveLength(0);
  });

  test('declineInvite returns false when not logged in', async () => {
    const { result } = renderHook(() => useRoomInvites());

    let success: boolean = false;
    await act(async () => {
      success = await result.current.declineInvite('invite-1');
    });

    expect(success).toBe(false);
  });

  test('sendInvite checks for existing invite', async () => {
    const { Alert } = require('react-native');
    setAuthenticatedUser();

    mockFrom.mockReturnValue({
      ...createChain(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gt: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: { id: 'existing' }, error: null }),
      then: (resolve: any) => Promise.resolve({ data: [], error: null }).then(resolve),
    });

    const { result } = renderHook(() => useRoomInvites());

    let success: boolean = false;
    await act(async () => {
      success = await result.current.sendInvite(TEST_ROOM_ID, TEST_FRIEND_ID);
    });

    expect(success).toBe(false);
    expect(Alert.alert).toHaveBeenCalledWith('Already Invited', expect.any(String));
  });

  test('sendInvite requires session', async () => {
    const { Alert } = require('react-native');
    setAuthenticatedUser();
    mockGetSession.mockResolvedValue({ data: { session: null }, error: { message: 'expired' } });

    const { result } = renderHook(() => useRoomInvites());

    let success: boolean = false;
    await act(async () => {
      success = await result.current.sendInvite(TEST_ROOM_ID, TEST_FRIEND_ID);
    });

    expect(success).toBe(false);
    expect(Alert.alert).toHaveBeenCalledWith('Authentication Error', expect.any(String));
  });

  test('cancelInvite succeeds', async () => {
    setAuthenticatedUser();
    mockFrom.mockReturnValue(createChain({ data: null, error: null }));

    const { result } = renderHook(() => useRoomInvites());

    let success: boolean = false;
    await act(async () => {
      success = await result.current.cancelInvite('invite-1');
    });

    expect(success).toBe(true);
  });

  test('cancelInvite returns false when not logged in', async () => {
    const { result } = renderHook(() => useRoomInvites());

    let success: boolean = false;
    await act(async () => {
      success = await result.current.cancelInvite('invite-1');
    });

    expect(success).toBe(false);
  });

  test('getPendingInvitesForRoom returns invites', async () => {
    setAuthenticatedUser();
    const invites = [mockRoomInvite()];
    mockFrom.mockReturnValue(createChain({ data: invites, error: null }));

    const { result } = renderHook(() => useRoomInvites());

    let data: any[];
    await act(async () => {
      data = await result.current.getPendingInvitesForRoom(TEST_ROOM_ID);
    });

    expect(data!).toEqual(invites);
  });

  test('getPendingInvitesForRoom returns empty when not logged in', async () => {
    const { result } = renderHook(() => useRoomInvites());

    let data: any[];
    await act(async () => {
      data = await result.current.getPendingInvitesForRoom(TEST_ROOM_ID);
    });

    expect(data!).toEqual([]);
  });

  test('acceptInvite returns false when not logged in', async () => {
    const { result } = renderHook(() => useRoomInvites());

    let success: boolean = false;
    await act(async () => {
      success = await result.current.acceptInvite('invite-1');
    });

    expect(success).toBe(false);
  });

  test('acceptInvite blocks when room is full', async () => {
    const { Alert } = require('react-native');
    setAuthenticatedUser();
    const invite = mockRoomInvite();

    mockFrom.mockImplementation((table: string) => {
      if (table === 'room_invites') {
        return {
          ...createChain(),
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          gt: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: { ...invite, room: mockRoom() }, error: null }),
          then: (resolve: any) => Promise.resolve({ data: [], error: null }).then(resolve),
        };
      }
      if (table === 'room_participants') {
        // Return 10 participants
        const tenParticipants = Array.from({ length: 10 }, (_, i) => ({ id: `p${i}`, user_id: `u${i}` }));
        return createChain({ data: tenParticipants, error: null });
      }
      return createChain({ data: [], error: null });
    });

    const { result } = renderHook(() => useRoomInvites());

    let success: boolean = false;
    await act(async () => {
      success = await result.current.acceptInvite(invite.id);
    });

    expect(success).toBe(false);
    expect(Alert.alert).toHaveBeenCalledWith('Room Full', expect.any(String));
  });

  test('sendBulkInvites sends to new friends only', async () => {
    const { Alert } = require('react-native');
    setAuthenticatedUser();

    mockFrom.mockImplementation((table: string) => {
      if (table === 'room_invites') {
        const chain = createChain({ data: [], error: null });
        // For existing check: return one existing invite
        chain.in = jest.fn().mockReturnValue({
          then: (resolve: any) => Promise.resolve({ data: [{ receiver_id: 'f1' }], error: null }).then(resolve),
        });
        return chain;
      }
      return createChain({ data: [], error: null });
    });

    const { result } = renderHook(() => useRoomInvites());

    let success: boolean = false;
    await act(async () => {
      success = await result.current.sendBulkInvites(TEST_ROOM_ID, ['f1', 'f2']);
    });

    expect(success).toBe(true);
    expect(Alert.alert).toHaveBeenCalledWith('Success', expect.stringContaining('1'));
  });

  test('sendBulkInvites returns false when all already invited', async () => {
    const { Alert } = require('react-native');
    setAuthenticatedUser();

    mockFrom.mockImplementation((table: string) => {
      if (table === 'room_invites') {
        const chain = createChain({ data: [], error: null });
        chain.in = jest.fn().mockReturnValue({
          then: (resolve: any) => Promise.resolve({ data: [{ receiver_id: 'f1' }, { receiver_id: 'f2' }], error: null }).then(resolve),
        });
        return chain;
      }
      return createChain({ data: [], error: null });
    });

    const { result } = renderHook(() => useRoomInvites());

    let success: boolean = false;
    await act(async () => {
      success = await result.current.sendBulkInvites(TEST_ROOM_ID, ['f1', 'f2']);
    });

    expect(success).toBe(false);
    expect(Alert.alert).toHaveBeenCalledWith('Already Invited', expect.any(String));
  });

  test('sendBulkInvites requires session', async () => {
    const { Alert } = require('react-native');
    setAuthenticatedUser();
    mockGetSession.mockResolvedValue({ data: { session: null }, error: { message: 'expired' } });

    const { result } = renderHook(() => useRoomInvites());

    let success: boolean = false;
    await act(async () => {
      success = await result.current.sendBulkInvites(TEST_ROOM_ID, ['f1']);
    });

    expect(success).toBe(false);
    expect(Alert.alert).toHaveBeenCalledWith('Authentication Error', expect.any(String));
  });
});
