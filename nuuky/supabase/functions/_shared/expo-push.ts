/**
 * Expo Push Notification Helper
 *
 * Sends push notifications via Expo Push Service
 * Free tier: 600 notifications/hour (~432,000/month)
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
  title: string;
  body: string;
  data?: Record<string, any>;
  sound?: 'default' | null;
  badge?: number;
  priority?: 'default' | 'normal' | 'high';
  channelId?: string;
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

    const result: ExpoPushResponse = await response.json();

    if (result.data && result.data.length > 0) {
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
  return token && typeof token === 'string' && token.startsWith('ExponentPushToken[');
}
