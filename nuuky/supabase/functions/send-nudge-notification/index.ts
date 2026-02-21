import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { sendExpoNotification, sendSilentNotification } from '../_shared/expo-push.ts';
import { authenticateRequest, verifySender, rateLimit, AuthError, authErrorResponse } from '../_shared/auth.ts';

interface NudgeRequest {
  receiver_id: string;
  sender_id: string;
}

serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    // Authenticate and authorize
    const { userId, supabase } = await authenticateRequest(req);

    const { receiver_id, sender_id }: NudgeRequest = await req.json();

    if (!receiver_id || !sender_id) {
      return new Response(
        JSON.stringify({ error: 'Missing receiver_id or sender_id' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    verifySender(userId, sender_id);
    rateLimit(userId);

    console.log(`Processing nudge from ${sender_id} to ${receiver_id}`);

    // Parallel: fetch sender, receiver, preferences, and unread count
    const [senderResult, receiverResult, prefsResult, unreadResult] = await Promise.all([
      supabase.from('users').select('display_name, avatar_url').eq('id', sender_id).single(),
      supabase.from('users').select('fcm_token, display_name').eq('id', receiver_id).single(),
      supabase.from('user_preferences').select('nudges_enabled').eq('user_id', receiver_id).single(),
      supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', receiver_id).eq('is_read', false),
    ]);

    const sender = senderResult.data;
    const receiver = receiverResult.data;

    if (senderResult.error || !sender) {
      console.error('Sender not found:', senderResult.error);
      return new Response(
        JSON.stringify({ error: 'Sender not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (receiverResult.error || !receiver) {
      console.error('Receiver not found:', receiverResult.error);
      return new Response(
        JSON.stringify({ error: 'Receiver not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const nudgesEnabled = prefsResult.data?.nudges_enabled ?? true;

    if (!nudgesEnabled) {
      console.log(`Receiver ${receiver.display_name} has nudges disabled`);
      return new Response(
        JSON.stringify({ message: 'Receiver has nudges disabled', sent: false }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!receiver.fcm_token) {
      console.log(`Receiver ${receiver.display_name} has no push token`);
      return new Response(
        JSON.stringify({ message: 'Receiver has no push token', sent: false }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const badgeCount = (unreadResult.count ?? 0) + 1;

    const notification = {
      title: '👋 Nudge from ' + sender.display_name,
      body: `${sender.display_name} is thinking of you`,
      data: {
        type: 'nudge',
        sender_id: sender_id,
        sender_name: sender.display_name,
        sender_avatar_url: sender.avatar_url,
      },
      sound: 'default' as const,
      priority: 'high' as const,
      badge: badgeCount,
    };

    // Parallel: send push, silent push, and insert DB record
    const [pushResult] = await Promise.all([
      sendExpoNotification(receiver.fcm_token, notification),
      sendSilentNotification(receiver.fcm_token, {
        sync_type: 'sync_notifications',
        notification_type: 'nudge',
        sender_id: sender_id,
        sender_name: sender.display_name,
      }),
      supabase.from('notifications').insert({
        user_id: receiver_id,
        type: 'nudge',
        title: notification.title,
        body: notification.body,
        data: notification.data,
        source_id: sender_id,
        source_type: 'nudge',
      }).then(({ error }) => {
        if (error) console.error('Failed to insert notification:', error);
      }),
    ]);

    if (pushResult) {
      console.log(`✓ Nudge notification sent to ${receiver.display_name}`);
      return new Response(
        JSON.stringify({ message: 'Notification sent', sent: true }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    } else {
      console.error(`✗ Failed to send nudge notification to ${receiver.display_name}`);
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
