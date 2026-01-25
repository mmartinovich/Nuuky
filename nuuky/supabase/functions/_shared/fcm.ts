/**
 * Firebase Cloud Messaging (FCM) Helper
 *
 * Sends push notifications via FCM to user devices
 */

interface FCMNotification {
  title: string;
  body: string;
  data?: Record<string, string>;
}

interface FCMMessage {
  to: string; // FCM token
  notification: FCMNotification;
  priority: 'high' | 'normal';
  data?: Record<string, string>;
}

/**
 * Send a push notification to a specific FCM token
 */
export async function sendFCMNotification(
  fcmToken: string,
  notification: FCMNotification
): Promise<boolean> {
  const fcmServerKey = Deno.env.get('FCM_SERVER_KEY');

  if (!fcmServerKey) {
    console.error('FCM_SERVER_KEY not configured');
    return false;
  }

  const message: FCMMessage = {
    to: fcmToken,
    notification: {
      title: notification.title,
      body: notification.body,
    },
    priority: 'high',
    data: notification.data || {},
  };

  try {
    const response = await fetch('https://fcm.googleapis.com/fcm/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `key=${fcmServerKey}`,
      },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('FCM notification failed:', error);
      return false;
    }

    const result = await response.json();
    console.log('FCM notification sent:', result);
    return true;
  } catch (error) {
    console.error('Error sending FCM notification:', error);
    return false;
  }
}

/**
 * Send notifications to multiple FCM tokens
 */
export async function sendBatchFCMNotifications(
  tokens: string[],
  notification: FCMNotification
): Promise<{ success: number; failed: number }> {
  const results = await Promise.allSettled(
    tokens.map(token => sendFCMNotification(token, notification))
  );

  const success = results.filter(r => r.status === 'fulfilled' && r.value === true).length;
  const failed = results.length - success;

  return { success, failed };
}
