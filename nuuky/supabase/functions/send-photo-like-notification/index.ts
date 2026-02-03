import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { sendExpoNotification, sendSilentNotification } from '../_shared/expo-push.ts';
import { authenticateRequest, verifySender, rateLimit, AuthError, authErrorResponse } from '../_shared/auth.ts';

interface PhotoLikeNotificationRequest {
  receiver_id: string;
  sender_id: string;
  photo_nudge_id: string;
}

serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    // Authenticate and authorize
    const { userId, supabase } = await authenticateRequest(req);

    const { receiver_id, sender_id, photo_nudge_id }: PhotoLikeNotificationRequest = await req.json();

    if (!receiver_id || !sender_id || !photo_nudge_id) {
      return new Response(
        JSON.stringify({ error: 'Missing receiver_id, sender_id, or photo_nudge_id' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    verifySender(userId, sender_id);
    rateLimit(userId);

    console.log(`Processing photo like notification from ${sender_id} to ${receiver_id}`);

    // Get sender info (the one who liked the photo)
    const { data: sender, error: senderError } = await supabase
      .from('users')
      .select('display_name, avatar_url')
      .eq('id', sender_id)
      .single();

    if (senderError || !sender) {
      console.error('Sender not found:', senderError);
      return new Response(
        JSON.stringify({ error: 'Sender not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get receiver info (the original photo sender)
    const { data: receiver, error: receiverError } = await supabase
      .from('users')
      .select('fcm_token, display_name')
      .eq('id', receiver_id)
      .single();

    if (receiverError || !receiver) {
      console.error('Receiver not found:', receiverError);
      return new Response(
        JSON.stringify({ error: 'Receiver not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!receiver.fcm_token) {
      console.log(`Receiver ${receiver.display_name} has no push token`);
      return new Response(
        JSON.stringify({ message: 'Receiver has no push token', sent: false }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Build notification content
    const title = `${sender.display_name} liked your photo`;
    const body = 'Tap to see your photo';

    const notification = {
      title,
      body,
      data: {
        type: 'photo_like',
        sender_id: sender_id,
        sender_name: sender.display_name,
        sender_avatar_url: sender.avatar_url,
        photo_nudge_id: photo_nudge_id,
      },
      sound: 'default' as const,
      priority: 'high' as const,
    };

    const sent = await sendExpoNotification(receiver.fcm_token, notification);

    // Send silent notification for background sync
    await sendSilentNotification(receiver.fcm_token, {
      sync_type: 'sync_notifications',
      notification_type: 'photo_like',
      sender_id: sender_id,
      sender_name: sender.display_name,
      photo_nudge_id: photo_nudge_id,
    });

    // Insert notification record
    const { error: notificationError } = await supabase
      .from('notifications')
      .insert({
        user_id: receiver_id,
        type: 'photo_like',
        title: notification.title,
        body: notification.body,
        data: notification.data,
        source_id: photo_nudge_id,
        source_type: 'photo_nudge',
      });

    if (notificationError) {
      console.error('Failed to insert notification:', notificationError);
    }

    if (sent) {
      console.log(`✓ Photo like notification sent to ${receiver.display_name}`);
      return new Response(
        JSON.stringify({ message: 'Notification sent', sent: true }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    } else {
      console.error(`✗ Failed to send photo like notification to ${receiver.display_name}`);
      return new Response(
        JSON.stringify({ message: 'Failed to send notification', sent: false }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    if (error instanceof AuthError) {
      return authErrorResponse(error);
    }
    console.error('Function error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
