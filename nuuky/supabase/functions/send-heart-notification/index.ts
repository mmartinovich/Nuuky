import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { sendExpoNotification, sendSilentNotification } from '../_shared/expo-push.ts';

interface HeartRequest {
  receiver_id: string;
  sender_id: string;
}

serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    const { receiver_id, sender_id }: HeartRequest = await req.json();

    if (!receiver_id || !sender_id) {
      return new Response(
        JSON.stringify({ error: 'Missing receiver_id or sender_id' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`Processing heart from ${sender_id} to ${receiver_id}`);

    const { data: sender, error: senderError } = await supabase
      .from('users')
      .select('display_name')
      .eq('id', sender_id)
      .single();

    if (senderError || !sender) {
      console.error('Sender not found:', senderError);
      return new Response(
        JSON.stringify({ error: 'Sender not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

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

    const notificationData = {
      type: 'heart',
      sender_id: sender_id,
      sender_name: sender.display_name,
    };

    const notification = {
      title: '❤️ ' + sender.display_name + ' sent you love',
      body: `${sender.display_name} sent you a heart`,
      data: notificationData,
      sound: 'default' as const,
      priority: 'high' as const,
    };

    const sent = await sendExpoNotification(receiver.fcm_token, notification);

    await sendSilentNotification(receiver.fcm_token, {
      sync_type: 'sync_notifications',
      notification_type: 'heart',
      ...notificationData,
    });

    const { error: notificationError } = await supabase
      .from('notifications')
      .insert({
        user_id: receiver_id,
        type: 'heart',
        title: notification.title,
        body: notification.body,
        data: notificationData,
        source_id: sender_id,
        source_type: 'heart',
      });

    if (notificationError) {
      console.error('Failed to insert notification:', notificationError);
    }

    if (sent) {
      console.log(`✓ Heart notification sent to ${receiver.display_name}`);
      return new Response(
        JSON.stringify({ message: 'Notification sent', sent: true }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    } else {
      console.error(`✗ Failed to send heart notification to ${receiver.display_name}`);
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
