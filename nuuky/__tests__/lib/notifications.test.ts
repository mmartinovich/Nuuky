const mockSetNotificationChannelAsync = jest.fn();
const mockGetPermissionsAsync = jest.fn();
const mockRequestPermissionsAsync = jest.fn();
const mockGetExpoPushTokenAsync = jest.fn();
const mockAddNotificationReceivedListener = jest.fn();
const mockAddNotificationResponseReceivedListener = jest.fn();
const mockScheduleNotificationAsync = jest.fn();
const mockSetNotificationHandler = jest.fn();

jest.mock('expo-notifications', () => ({
  setNotificationHandler: mockSetNotificationHandler,
  setNotificationChannelAsync: mockSetNotificationChannelAsync,
  getPermissionsAsync: mockGetPermissionsAsync,
  requestPermissionsAsync: mockRequestPermissionsAsync,
  getExpoPushTokenAsync: mockGetExpoPushTokenAsync,
  addNotificationReceivedListener: mockAddNotificationReceivedListener,
  addNotificationResponseReceivedListener: mockAddNotificationResponseReceivedListener,
  scheduleNotificationAsync: mockScheduleNotificationAsync,
  AndroidImportance: { MAX: 4 },
}));

jest.mock('expo-device', () => ({ isDevice: true }));

jest.mock('react-native', () => ({ Platform: { OS: 'android' } }));

const mockUpdate = jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: null }) });
jest.mock('../../lib/supabase', () => ({
  supabase: { from: jest.fn(() => ({ update: mockUpdate })) },
}));

// Must require after mocks
let notifications: typeof import('../../lib/notifications');
let capturedNotificationHandler: any = null;

beforeAll(() => {
  notifications = require('../../lib/notifications');
  // Capture the handler before clearAllMocks wipes it
  capturedNotificationHandler = mockSetNotificationHandler.mock.calls[0]?.[0];
});

beforeEach(() => jest.clearAllMocks());

describe('notifications', () => {
  describe('registerForPushNotificationsAsync', () => {
    test('returns token when granted', async () => {
      mockGetPermissionsAsync.mockResolvedValue({ status: 'granted' });
      mockGetExpoPushTokenAsync.mockResolvedValue({ data: 'ExponentPushToken[xxx]' });

      const token = await notifications.registerForPushNotificationsAsync();
      expect(token).toBe('ExponentPushToken[xxx]');
    });

    test('requests permission if not granted', async () => {
      mockGetPermissionsAsync.mockResolvedValue({ status: 'undetermined' });
      mockRequestPermissionsAsync.mockResolvedValue({ status: 'granted' });
      mockGetExpoPushTokenAsync.mockResolvedValue({ data: 'token123' });

      const token = await notifications.registerForPushNotificationsAsync();
      expect(mockRequestPermissionsAsync).toHaveBeenCalled();
      expect(token).toBe('token123');
    });

    test('returns undefined if permission denied', async () => {
      mockGetPermissionsAsync.mockResolvedValue({ status: 'denied' });
      mockRequestPermissionsAsync.mockResolvedValue({ status: 'denied' });

      const token = await notifications.registerForPushNotificationsAsync();
      expect(token).toBeUndefined();
    });
  });

  describe('savePushTokenToUser', () => {
    test('updates user with token', async () => {
      const mockEq = jest.fn().mockResolvedValue({ error: null });
      mockUpdate.mockReturnValue({ eq: mockEq });

      await notifications.savePushTokenToUser('user1', 'tok');
      expect(mockUpdate).toHaveBeenCalledWith({ fcm_token: 'tok' });
      expect(mockEq).toHaveBeenCalledWith('id', 'user1');
    });
  });

  describe('sendPushNotification', () => {
    test('sends fetch to expo API', async () => {
      global.fetch = jest.fn().mockResolvedValue({});
      await notifications.sendPushNotification('token', 'Hello', 'World', { foo: 1 });
      expect(global.fetch).toHaveBeenCalledWith(
        'https://exp.host/--/api/v2/push/send',
        expect.objectContaining({ method: 'POST' }),
      );
    });
  });

  describe('setupNotificationListeners', () => {
    test('returns cleanup function', () => {
      const remove1 = jest.fn();
      const remove2 = jest.fn();
      mockAddNotificationReceivedListener.mockReturnValue({ remove: remove1 });
      mockAddNotificationResponseReceivedListener.mockReturnValue({ remove: remove2 });

      const cleanup = notifications.setupNotificationListeners(jest.fn(), jest.fn());
      cleanup();
      expect(remove1).toHaveBeenCalled();
      expect(remove2).toHaveBeenCalled();
    });
  });

  describe('scheduleLocalNotification', () => {
    test('schedules with trigger', async () => {
      await notifications.scheduleLocalNotification('Test', 'Body', {}, 5);
      expect(mockScheduleNotificationAsync).toHaveBeenCalledWith(
        expect.objectContaining({ trigger: { seconds: 5 } }),
      );
    });

    test('schedules immediately with null trigger', async () => {
      await notifications.scheduleLocalNotification('Test', 'Body');
      expect(mockScheduleNotificationAsync).toHaveBeenCalledWith(
        expect.objectContaining({ trigger: null }),
      );
    });
  });

  describe('handleSilentNotification', () => {
    test('does nothing without _silent', () => {
      const cb = jest.fn();
      notifications.handleSilentNotification({}, { onSyncNotifications: cb });
      expect(cb).not.toHaveBeenCalled();
    });

    test('routes to correct callback', () => {
      const cb = jest.fn();
      notifications.handleSilentNotification(
        { _silent: true, sync_type: 'sync_friends' },
        { onSyncFriends: cb },
      );
      expect(cb).toHaveBeenCalled();
    });

    test('routes sync_notifications', () => {
      const cb = jest.fn();
      notifications.handleSilentNotification(
        { _silent: true, sync_type: 'sync_notifications' },
        { onSyncNotifications: cb },
      );
      expect(cb).toHaveBeenCalled();
    });

    test('routes sync_flares', () => {
      const cb = jest.fn();
      notifications.handleSilentNotification(
        { _silent: true, sync_type: 'sync_flares' },
        { onSyncFlares: cb },
      );
      expect(cb).toHaveBeenCalled();
    });

    test('routes sync_rooms', () => {
      const cb = jest.fn();
      notifications.handleSilentNotification(
        { _silent: true, sync_type: 'sync_rooms' },
        { onSyncRooms: cb },
      );
      expect(cb).toHaveBeenCalled();
    });

    test('routes sync_presence', () => {
      const cb = jest.fn();
      notifications.handleSilentNotification(
        { _silent: true, sync_type: 'sync_presence' },
        { onSyncPresence: cb },
      );
      expect(cb).toHaveBeenCalled();
    });

    test('triggers default syncs for unknown type', () => {
      const onNotif = jest.fn();
      const onFriends = jest.fn();
      const onFlares = jest.fn();
      notifications.handleSilentNotification(
        { _silent: true, sync_type: 'unknown' },
        { onSyncNotifications: onNotif, onSyncFriends: onFriends, onSyncFlares: onFlares },
      );
      expect(onNotif).toHaveBeenCalled();
      expect(onFriends).toHaveBeenCalled();
      expect(onFlares).toHaveBeenCalled();
    });

    test('does nothing with null data', () => {
      const cb = jest.fn();
      notifications.handleSilentNotification(null as any, { onSyncNotifications: cb });
      expect(cb).not.toHaveBeenCalled();
    });
  });

  describe('isSilentNotification', () => {
    test('returns true for silent', () => {
      const n = { request: { content: { data: { _silent: true } } } } as any;
      expect(notifications.isSilentNotification(n)).toBe(true);
    });

    test('returns false for non-silent', () => {
      const n = { request: { content: { data: {} } } } as any;
      expect(notifications.isSilentNotification(n)).toBe(false);
    });
  });

  describe('setNotificationHandler', () => {
    test('silent notification returns shouldShowAlert false', async () => {
      expect(capturedNotificationHandler).toBeDefined();
      const result = await capturedNotificationHandler.handleNotification({
        request: { content: { data: { _silent: true } } },
      });
      expect(result.shouldShowAlert).toBe(false);
      expect(result.shouldPlaySound).toBe(false);
      expect(result.shouldSetBadge).toBe(false);
    });

    test('regular notification returns shouldShowAlert true', async () => {
      const result = await capturedNotificationHandler.handleNotification({
        request: { content: { data: {} } },
      });
      expect(result.shouldShowAlert).toBe(true);
      expect(result.shouldPlaySound).toBe(true);
      expect(result.shouldSetBadge).toBe(true);
    });
  });

  describe('setupNotificationListeners callbacks', () => {
    test('received listener invokes callback', () => {
      const onReceived = jest.fn();
      const onResponse = jest.fn();
      mockAddNotificationReceivedListener.mockImplementation((cb: Function) => {
        cb({ id: 'n1' });
        return { remove: jest.fn() };
      });
      mockAddNotificationResponseReceivedListener.mockReturnValue({ remove: jest.fn() });

      notifications.setupNotificationListeners(onReceived, onResponse);
      expect(onReceived).toHaveBeenCalledWith({ id: 'n1' });
    });

    test('response listener invokes callback', () => {
      const onReceived = jest.fn();
      const onResponse = jest.fn();
      mockAddNotificationReceivedListener.mockReturnValue({ remove: jest.fn() });
      mockAddNotificationResponseReceivedListener.mockImplementation((cb: Function) => {
        cb({ actionIdentifier: 'default' });
        return { remove: jest.fn() };
      });

      notifications.setupNotificationListeners(onReceived, onResponse);
      expect(onResponse).toHaveBeenCalledWith({ actionIdentifier: 'default' });
    });
  });

  describe('constants', () => {
    test('NotificationTypes has expected keys', () => {
      expect(notifications.NotificationTypes.NUDGE).toBe('nudge');
      expect(notifications.NotificationTypes.CALL_ME).toBe('call_me');
    });

    test('SyncTypes has expected keys', () => {
      expect(notifications.SyncTypes.NOTIFICATIONS).toBe('sync_notifications');
      expect(notifications.SyncTypes.PRESENCE).toBe('sync_presence');
    });
  });
});
