import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { supabase } from './supabase';

/**
 * Configure how notifications should be handled when app is foregrounded
 * Silent notifications (with _silent flag) won't show UI
 * This follows the Discord/Slack pattern where background data syncs silently
 */
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const data = notification.request.content.data;

    // Silent/data-only notifications should not show any UI
    // They're used for background data sync when app is backgrounded
    if (data?._silent) {
      return {
        shouldShowAlert: false,
        shouldPlaySound: false,
        shouldSetBadge: false,
      };
    }

    // When app is foregrounded, suppress system notification UI
    // The in-app banner (NotificationBannerContext) handles display instead
    return {
      shouldShowAlert: false,
      shouldPlaySound: false,
      shouldSetBadge: false,
    };
  },
});

export async function registerForPushNotificationsAsync(): Promise<string | undefined> {
  let token;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#a855f7',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      return;
    }

    token = (await Notifications.getExpoPushTokenAsync()).data;
  }

  return token;
}

export async function savePushTokenToUser(userId: string, token: string) {
  try {
    const { error } = await supabase
      .from('users')
      .update({ fcm_token: token })
      .eq('id', userId);

    if (error) throw error;
  } catch (_error) {
    // Silently fail
  }
}

export async function sendPushNotification(
  expoPushToken: string,
  title: string,
  body: string,
  data?: any
) {
  const message = {
    to: expoPushToken,
    sound: 'default',
    title,
    body,
    data,
  };

  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Accept-encoding': 'gzip, deflate',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(message),
  });
}

// Notification types for different events
export const NotificationTypes = {
  NUDGE: 'nudge',
  FLARE: 'flare',
  FRIEND_REQUEST: 'friend_request',
  FRIEND_ACCEPTED: 'friend_accepted',
  ROOM_INVITE: 'room_invite',
  CALL_ME: 'call_me', // New: request for a call
} as const;

/**
 * Sync types for silent background notifications
 * These are used to tell the app what data to refresh
 */
export const SyncTypes = {
  NOTIFICATIONS: 'sync_notifications',
  FRIENDS: 'sync_friends',
  FLARES: 'sync_flares',
  ROOMS: 'sync_rooms',
  PRESENCE: 'sync_presence',
} as const;

// Setup notification listeners
export function setupNotificationListeners(
  onNotificationReceived?: (notification: Notifications.Notification) => void,
  onNotificationResponse?: (response: Notifications.NotificationResponse) => void
) {
  // Handler for notifications received while app is foregrounded
  const notificationListener = Notifications.addNotificationReceivedListener(
    (notification) => {
      onNotificationReceived?.(notification);
    }
  );

  // Handler for when user taps on notification
  const responseListener = Notifications.addNotificationResponseReceivedListener(
    (response) => {
      onNotificationResponse?.(response);
    }
  );

  return () => {
    notificationListener.remove();
    responseListener.remove();
  };
}

// Schedule a local notification (for testing)
export async function scheduleLocalNotification(
  title: string,
  body: string,
  data?: any,
  seconds: number = 0
) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data,
      sound: true,
    },
    trigger: seconds > 0 ? { seconds } : null,
  });
}

/**
 * Handle silent notification data for background sync
 * This is called when a silent push notification arrives
 * The app uses this to know what data to refresh
 */
export function handleSilentNotification(
  data: Record<string, any>,
  callbacks?: {
    onSyncNotifications?: () => void;
    onSyncFriends?: () => void;
    onSyncFlares?: () => void;
    onSyncRooms?: () => void;
    onSyncPresence?: () => void;
  }
) {
  if (!data?._silent) return;

  const syncType = data.sync_type;

  switch (syncType) {
    case SyncTypes.NOTIFICATIONS:
      callbacks?.onSyncNotifications?.();
      break;
    case SyncTypes.FRIENDS:
      callbacks?.onSyncFriends?.();
      break;
    case SyncTypes.FLARES:
      callbacks?.onSyncFlares?.();
      break;
    case SyncTypes.ROOMS:
      callbacks?.onSyncRooms?.();
      break;
    case SyncTypes.PRESENCE:
      callbacks?.onSyncPresence?.();
      break;
    default:
      // If no specific sync type, trigger all syncs
      callbacks?.onSyncNotifications?.();
      callbacks?.onSyncFriends?.();
      callbacks?.onSyncFlares?.();
      break;
  }
}

/**
 * Check if a notification is a silent/background notification
 */
export function isSilentNotification(notification: Notifications.Notification): boolean {
  return notification.request.content.data?._silent === true;
}
