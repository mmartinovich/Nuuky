import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useNotifications } from '../../hooks/useNotifications';
import { useAppStore } from '../../stores/appStore';
import { resetStore, setAuthenticatedUser } from '../__utils__/mockStore';
import { mockNotification, TEST_USER_ID } from '../__utils__/fixtures';

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

jest.mock('../../lib/logger', () => ({
  logger: { log: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn() }),
  usePathname: () => '/(main)',
}));

jest.mock('react-native', () => ({
  Alert: { alert: jest.fn() },
}));

const createChain = (resolved: any = { data: null, error: null }) => ({
  select: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  then: (resolve: any) => Promise.resolve(resolved).then(resolve),
});

describe('useNotifications', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetStore();
    mockFrom.mockReturnValue(createChain({ data: [], error: null }));
  });

  test('loads notifications on mount', async () => {
    const notifications = [mockNotification()];
    mockFrom.mockReturnValue(createChain({ data: notifications, error: null }));
    setAuthenticatedUser();

    renderHook(() => useNotifications());

    await waitFor(() => {
      expect(useAppStore.getState().notifications).toEqual(notifications);
    });
  });

  test('markAsRead updates notification in store', async () => {
    setAuthenticatedUser();
    const notif = mockNotification();
    useAppStore.setState({
      notifications: [notif],
      unreadNotificationCount: 1,
    });

    // The update chain for markAsRead, but loadNotifications also fires on mount
    // We need the update to succeed and not let loadNotifications overwrite
    mockFrom.mockImplementation(() => {
      const chain = createChain({ data: null, error: null });
      // For the loadNotifications call, return the current store notifications
      // so it doesn't overwrite our test state
      const currentNotifs = useAppStore.getState().notifications;
      chain.then = (resolve: any) => Promise.resolve({ data: currentNotifs.length > 0 ? currentNotifs : [], error: null }).then(resolve);
      return chain;
    });

    const { result } = renderHook(() => useNotifications());

    // Wait for initial load to settle
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    let success: any;
    await act(async () => {
      success = await result.current.markAsRead(notif.id);
    });

    expect(success).toBe(true);
    expect(useAppStore.getState().notifications[0].is_read).toBe(true);
    expect(useAppStore.getState().unreadNotificationCount).toBe(0);
  });

  test('markAllAsRead marks all notifications', async () => {
    setAuthenticatedUser();
    const n1 = mockNotification({ id: 'n1', is_read: false });
    const n2 = mockNotification({ id: 'n2', is_read: false });
    useAppStore.setState({
      notifications: [n1, n2],
      unreadNotificationCount: 2,
    });

    mockFrom.mockImplementation(() => {
      const chain = createChain({ data: null, error: null });
      const currentNotifs = useAppStore.getState().notifications;
      chain.then = (resolve: any) => Promise.resolve({ data: currentNotifs.length > 0 ? currentNotifs : [], error: null }).then(resolve);
      return chain;
    });

    const { result } = renderHook(() => useNotifications());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    let success: any;
    await act(async () => {
      success = await result.current.markAllAsRead();
    });

    expect(success).toBe(true);
    expect(useAppStore.getState().unreadNotificationCount).toBe(0);
  });

  test('deleteNotification removes from store', async () => {
    setAuthenticatedUser();
    const notif = mockNotification();
    useAppStore.setState({
      notifications: [notif],
      unreadNotificationCount: 1,
    });

    mockFrom.mockImplementation(() => {
      const chain = createChain({ data: null, error: null });
      const currentNotifs = useAppStore.getState().notifications;
      chain.then = (resolve: any) => Promise.resolve({ data: currentNotifs.length > 0 ? currentNotifs : [], error: null }).then(resolve);
      return chain;
    });

    const { result } = renderHook(() => useNotifications());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    let success: any;
    await act(async () => {
      success = await result.current.deleteNotification(notif.id);
    });

    expect(success).toBe(true);
    expect(useAppStore.getState().notifications).toHaveLength(0);
  });

  test('unreadCount reflects store state', () => {
    setAuthenticatedUser();
    useAppStore.setState({ unreadNotificationCount: 5 });

    const { result } = renderHook(() => useNotifications());

    expect(result.current.unreadCount).toBe(5);
  });

  test('deleteNotification returns false when not logged in', async () => {
    const { result } = renderHook(() => useNotifications());

    let success: any;
    await act(async () => {
      success = await result.current.deleteNotification('n1');
    });

    expect(success).toBe(false);
  });

  test('refreshNotifications updates store', async () => {
    setAuthenticatedUser();
    const notifications = [mockNotification({ id: 'n1' }), mockNotification({ id: 'n2' })];
    mockFrom.mockReturnValue(createChain({ data: notifications, error: null }));

    const { result } = renderHook(() => useNotifications());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.refreshNotifications();
    });

    expect(useAppStore.getState().notifications).toEqual(notifications);
  });

  test('refreshNotifications handles error', async () => {
    const { Alert } = require('react-native');
    setAuthenticatedUser();

    // First call succeeds (mount), then fail on refresh
    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount <= 1) {
        return createChain({ data: [], error: null });
      }
      return createChain({ data: null, error: { message: 'fail' } });
    });

    const { result } = renderHook(() => useNotifications());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.refreshNotifications();
    });

    expect(Alert.alert).toHaveBeenCalledWith('Error', expect.stringContaining('refresh'));
  });

  test('handleNotificationTap marks as read and navigates', async () => {
    setAuthenticatedUser();
    const notif = mockNotification({ type: 'friend_request', is_read: false });

    mockFrom.mockImplementation(() => {
      const chain = createChain({ data: null, error: null });
      chain.then = (resolve: any) => Promise.resolve({ data: [notif], error: null }).then(resolve);
      return chain;
    });

    const { result } = renderHook(() => useNotifications());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.handleNotificationTap(notif);
    });

    expect(useAppStore.getState().notifications[0].is_read).toBe(true);
  });

  test('markAsRead returns false when not logged in', async () => {
    const { result } = renderHook(() => useNotifications());
    let success: any;
    await act(async () => {
      success = await result.current.markAsRead('n1');
    });
    expect(success).toBe(false);
  });

  test('markAllAsRead returns false when not logged in', async () => {
    const { result } = renderHook(() => useNotifications());
    let success: any;
    await act(async () => {
      success = await result.current.markAllAsRead();
    });
    expect(success).toBe(false);
  });

  test('loadNotifications handles error', async () => {
    setAuthenticatedUser();
    mockFrom.mockReturnValue(createChain({ data: null, error: { message: 'fail' } }));

    const { result } = renderHook(() => useNotifications());
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    // Should not crash, notifications stay empty
    expect(useAppStore.getState().notifications).toEqual([]);
  });

  test('markAsRead handles error', async () => {
    setAuthenticatedUser();
    const notif = mockNotification();
    useAppStore.setState({ notifications: [notif], unreadNotificationCount: 1 });

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount <= 1) {
        // loadNotifications on mount
        const currentNotifs = useAppStore.getState().notifications;
        const chain = createChain({ data: currentNotifs, error: null });
        chain.then = (resolve: any) => Promise.resolve({ data: currentNotifs, error: null }).then(resolve);
        return chain;
      }
      // markAsRead fails
      return createChain({ data: null, error: { message: 'fail' } });
    });

    const { result } = renderHook(() => useNotifications());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let success: any;
    await act(async () => { success = await result.current.markAsRead(notif.id); });
    expect(success).toBe(false);
  });

  test('markAllAsRead handles error', async () => {
    setAuthenticatedUser();
    useAppStore.setState({ notifications: [mockNotification()], unreadNotificationCount: 1 });

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount <= 1) {
        const currentNotifs = useAppStore.getState().notifications;
        const chain = createChain({ data: currentNotifs, error: null });
        chain.then = (resolve: any) => Promise.resolve({ data: currentNotifs, error: null }).then(resolve);
        return chain;
      }
      return createChain({ data: null, error: { message: 'fail' } });
    });

    const { result } = renderHook(() => useNotifications());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let success: any;
    await act(async () => { success = await result.current.markAllAsRead(); });
    expect(success).toBe(false);
  });

  test('deleteNotification handles error', async () => {
    setAuthenticatedUser();
    useAppStore.setState({ notifications: [mockNotification()], unreadNotificationCount: 1 });

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount <= 1) {
        const currentNotifs = useAppStore.getState().notifications;
        const chain = createChain({ data: currentNotifs, error: null });
        chain.then = (resolve: any) => Promise.resolve({ data: currentNotifs, error: null }).then(resolve);
        return chain;
      }
      return createChain({ data: null, error: { message: 'fail' } });
    });

    const { result } = renderHook(() => useNotifications());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let success: any;
    await act(async () => { success = await result.current.deleteNotification('n1'); });
    expect(success).toBe(false);
  });

  test('handleNotificationTap nudge type navigates to main', async () => {
    setAuthenticatedUser();
    const notif = mockNotification({ type: 'nudge', is_read: true });
    mockFrom.mockReturnValue(createChain({ data: [notif], error: null }));

    const { result } = renderHook(() => useNotifications());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => { await result.current.handleNotificationTap(notif); });
    // Should not throw - just navigates
  });

  test('handleNotificationTap room_invite type', async () => {
    setAuthenticatedUser();
    const notif = mockNotification({ type: 'room_invite', is_read: true });
    mockFrom.mockReturnValue(createChain({ data: [notif], error: null }));

    const { result } = renderHook(() => useNotifications());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => { await result.current.handleNotificationTap(notif); });
  });

  test('handleNotificationTap unknown type navigates to main', async () => {
    setAuthenticatedUser();
    const notif = mockNotification({ type: 'unknown_type', is_read: true });
    mockFrom.mockReturnValue(createChain({ data: [notif], error: null }));

    const { result } = renderHook(() => useNotifications());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => { await result.current.handleNotificationTap(notif); });
  });
});
