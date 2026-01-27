import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { sendExpoNotification, sendSilentNotification } from '../_shared/expo-push.ts';

/**
 * Send Call Me Notification
 *
 * This is a request from one friend to another to start a call.
 * Similar to nudge but specifically for initiating voice/video calls.
 *
 * Sends both:
 * 1. A visible push notification so the user sees the request
 * 2. A silent notification for background data sync
 */

interface CallMeRequest {
  receiver_id: string;
  sender_id: string;
  room_id?: string; // Optional: specific room to call in
}

serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    const { receiver_id, sender_id, room_id }: CallMeRequest = await req.json();

    if (!receiver_id || !sender_id) {
      return new Response(
        JSON.stringify({ error: 'Missing receiver_id or sender_id' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`Processing call me request from ${sender_id} to ${receiver_id}`);

    // Get sender info
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

    // Get receiver info and push token
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

    // Check if receiver has call notifications enabled (reusing nudges_enabled preference)
    const { data: preferences } = await supabase
      .from('user_preferences')
      .select('nudges_enabled')
      .eq('user_id', receiver_id)
      .single();

    const callsEnabled = preferences?.nudges_enabled ?? true;

    if (!callsEnabled) {
      console.log(`Receiver ${receiver.display_name} has calls disabled`);
      return new Response(
        JSON.stringify({ message: 'Receiver has calls disabled', sent: false }),
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

    // Prepare notification data
    const notificationData = {
      type: 'call_me',
      sender_id: sender_id,
      sender_name: sender.display_name,
      sender_avatar_url: sender.avatar_url,
      room_id: room_id,
    };

    // 1. Send visible push notification
    const visibleNotification = {
      title: '📞 ' + sender.display_name + ' wants to talk',
      body: `${sender.display_name} is asking you to call them`,
      data: notificationData,
      sound: 'default' as const,
      priority: 'high' as const,
    };

    const sent = await sendExpoNotification(receiver.fcm_token, visibleNotification);

    // 2. Send silent notification for background sync (Discord/Slack pattern)
    await sendSilentNotification(receiver.fcm_token, {
      sync_type: 'sync_notifications',
      notification_type: 'call_me',
      ...notificationData,
    });

    // 3. Insert notification into database for persistence
    const { error: notificationError } = await supabase
      .from('notifications')
      .insert({
        user_id: receiver_id,
        type: 'call_me',
        title: visibleNotification.title,
        body: visibleNotification.body,
        data: notificationData,
        source_id: sender_id,
        source_type: 'call_me',
      });

    if (notificationError) {
      console.error('Failed to insert notification:', notificationError);
    }

    if (sent) {
      console.log(`✓ Call me notification sent to ${receiver.display_name}`);
      return new Response(
        JSON.stringify({ message: 'Notification sent', sent: true }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    } else {
      console.error(`✗ Failed to send call me notification to ${receiver.display_name}`);
      return new Response(
        JSON.stringify({ message: 'Failed to send notification', sent: false }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('Function error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
