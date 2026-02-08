/**
 * Expo Push Notification Helper
 *
 * Sends push notifications via Expo Push Service
 * Free tier: 600 notifications/hour (~432,000/month)
 *
 * Supports both visible notifications and silent/data-only notifications
 * for background sync (like Discord/Slack pattern)
 */

interface ExpoNotification {
  title: string;
  body: string;
  data?: Record<string, any>;
  sound?: 'default' | null;
  badge?: number;
  priority?: 'default' | 'normal' | 'high';
}

interface ExpoPushMessage {
  to: string | string[]; // Expo push token(s)
  title?: string;
  body?: string;
  data?: Record<string, any>;
  sound?: 'default' | null;
  badge?: number;
  priority?: 'default' | 'normal' | 'high';
  channelId?: string;
  // For silent/background notifications
  _contentAvailable?: boolean;
}

interface ExpoPushTicket {
  status: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: any;
}

interface ExpoPushResponse {
  data: ExpoPushTicket[];
}

/**
 * Send a push notification to a specific Expo push token
 */
export async function sendExpoNotification(
  expoPushToken: string,
  notification: ExpoNotification
): Promise<boolean> {
  if (!expoPushToken || !expoPushToken.startsWith('ExponentPushToken[')) {
    console.error('Invalid Expo push token:', expoPushToken);
    return false;
  }

  const message: ExpoPushMessage = {
    to: expoPushToken,
    title: notification.title,
    body: notification.body,
    data: notification.data || {},
    sound: notification.sound ?? 'default',
    badge: notification.badge,
    priority: notification.priority ?? 'high',
  };

  try {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Expo push notification failed:', error);
      return false;
    }

    const result = await response.json();

    if (result.data && Array.isArray(result.data) && result.data.length > 0) {
      const ticket = result.data[0];

      if (ticket.status === 'error') {
        console.error('Expo push error:', ticket.message, ticket.details);
        return false;
      }

      console.log('Expo notification sent successfully:', ticket.id);
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error sending Expo notification:', error);
    return false;
  }
}

/**
 * Send notifications to multiple Expo push tokens in batch
 * Expo supports up to 100 tokens per request
 */
export async function sendBatchExpoNotifications(
  tokens: string[],
  notification: ExpoNotification
): Promise<{ success: number; failed: number; tickets: ExpoPushTicket[] }> {
  // Filter out invalid tokens
  const validTokens = tokens.filter(token =>
    token && token.startsWith('ExponentPushToken[')
  );

  if (validTokens.length === 0) {
    console.error('No valid Expo push tokens provided');
    return { success: 0, failed: 0, tickets: [] };
  }

  // Split into batches of 100 (Expo's limit)
  const batches: string[][] = [];
  for (let i = 0; i < validTokens.length; i += 100) {
    batches.push(validTokens.slice(i, i + 100));
  }

  const allTickets: ExpoPushTicket[] = [];
  let totalSuccess = 0;
  let totalFailed = 0;

  for (const batch of batches) {
    const messages: ExpoPushMessage[] = batch.map(token => ({
      to: token,
      title: notification.title,
      body: notification.body,
      data: notification.data || {},
      sound: notification.sound ?? 'default',
      badge: notification.badge,
      priority: notification.priority ?? 'high',
    }));

    try {
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messages),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('Batch Expo push failed:', error);
        totalFailed += batch.length;
        continue;
      }

      const result: ExpoPushResponse = await response.json();

      if (result.data) {
        allTickets.push(...result.data);

        result.data.forEach(ticket => {
          if (ticket.status === 'ok') {
            totalSuccess++;
          } else {
            totalFailed++;
            console.error('Ticket error:', ticket.message, ticket.details);
          }
        });
      }
    } catch (error) {
      console.error('Error in batch send:', error);
      totalFailed += batch.length;
    }
  }

  console.log(`Batch send complete: ${totalSuccess} success, ${totalFailed} failed`);

  return {
    success: totalSuccess,
    failed: totalFailed,
    tickets: allTickets,
  };
}

/**
 * Check if a token is a valid Expo push token
 */
export function isValidExpoPushToken(token: string): boolean {
  return Boolean(token && typeof token === 'string' && token.startsWith('ExponentPushToken['));
}

/**
 * Send a silent/data-only push notification for background sync
 * This wakes the app in background without showing anything to the user
 * Used for syncing data when WebSocket is disconnected (Discord/Slack pattern)
 */
export async function sendSilentNotification(
  expoPushToken: string,
  data: Record<string, any>
): Promise<boolean> {
  if (!expoPushToken || !expoPushToken.startsWith('ExponentPushToken[')) {
    console.error('Invalid Expo push token:', expoPushToken);
    return false;
  }

  const message: ExpoPushMessage = {
    to: expoPushToken,
    data: {
      ...data,
      _silent: true, // Flag for client to identify silent notifications
    },
    _contentAvailable: true, // Required for iOS background notifications
    priority: 'normal', // Use normal priority for silent notifications (saves battery)
  };

  try {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Silent notification failed:', error);
      return false;
    }

    const result: ExpoPushResponse = await response.json();

    if (result.data && result.data.length > 0) {
      const ticket = result.data[0];
      if (ticket.status === 'error') {
        console.error('Silent push error:', ticket.message, ticket.details);
        return false;
      }
      console.log('Silent notification sent:', ticket.id);
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error sending silent notification:', error);
    return false;
  }
}

/**
 * Send batch silent notifications for background sync
 */
export async function sendBatchSilentNotifications(
  tokens: string[],
  data: Record<string, any>
): Promise<{ success: number; failed: number; tickets: ExpoPushTicket[] }> {
  const validTokens = tokens.filter(token =>
    token && token.startsWith('ExponentPushToken[')
  );

  if (validTokens.length === 0) {
    console.error('No valid Expo push tokens provided');
    return { success: 0, failed: 0, tickets: [] };
  }

  const batches: string[][] = [];
  for (let i = 0; i < validTokens.length; i += 100) {
    batches.push(validTokens.slice(i, i + 100));
  }

  const allTickets: ExpoPushTicket[] = [];
  let totalSuccess = 0;
  let totalFailed = 0;

  for (const batch of batches) {
    const messages: ExpoPushMessage[] = batch.map(token => ({
      to: token,
      data: {
        ...data,
        _silent: true,
      },
      _contentAvailable: true,
      priority: 'normal',
    }));

    try {
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messages),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('Batch silent push failed:', error);
        totalFailed += batch.length;
        continue;
      }

      const result: ExpoPushResponse = await response.json();

      if (result.data) {
        allTickets.push(...result.data);
        result.data.forEach(ticket => {
          if (ticket.status === 'ok') {
            totalSuccess++;
          } else {
            totalFailed++;
            console.error('Silent ticket error:', ticket.message, ticket.details);
          }
        });
      }
    } catch (error) {
      console.error('Error in batch silent send:', error);
      totalFailed += batch.length;
    }
  }

  console.log(`Batch silent send: ${totalSuccess} success, ${totalFailed} failed`);

  return {
    success: totalSuccess,
    failed: totalFailed,
    tickets: allTickets,
  };
}
