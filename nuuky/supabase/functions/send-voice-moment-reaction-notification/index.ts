import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { sendExpoNotification, sendSilentNotification } from '../_shared/expo-push.ts';
import { authenticateRequest, verifySender, rateLimit, AuthError, authErrorResponse } from '../_shared/auth.ts';

interface VoiceMomentReactionRequest {
  receiver_id: string;
  sender_id: string;
  voice_moment_id: string;
  reaction_type: string;
}

const REACTION_EMOJI_MAP: Record<string, string> = {
  heart: '❤️',
  laugh: '😂',
  wow: '😮',
  applause: '👏',
  aww: '🥺',
  party: '🎉',
};

serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    const { userId, supabase } = await authenticateRequest(req);

    const { receiver_id, sender_id, voice_moment_id, reaction_type }: VoiceMomentReactionRequest = await req.json();

    if (!receiver_id || !sender_id || !voice_moment_id || !reaction_type) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    verifySender(userId, sender_id);
    rateLimit(userId);

    console.log(`Processing voice moment reaction from ${sender_id} to ${receiver_id}`);

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

    const emoji = REACTION_EMOJI_MAP[reaction_type] || '💬';
    const title = `${emoji} ${sender.display_name} reacted to your voice moment`;
    const body = 'Tap to see your voice moment';

    const notification = {
      title,
      body,
      data: {
        type: 'voice_moment_reaction',
        sender_id: sender_id,
        sender_name: sender.display_name,
        sender_avatar_url: sender.avatar_url,
        voice_moment_id: voice_moment_id,
        reaction_type: reaction_type,
      },
      sound: 'default' as const,
      priority: 'high' as const,
    };

    // Push notification is best-effort - don't fail the whole request if it doesn't send
    let sent = false;
    try {
      sent = await sendExpoNotification(receiver.fcm_token, notification);
    } catch (pushError) {
      console.error('Push notification error:', pushError);
    }

    try {
      await sendSilentNotification(receiver.fcm_token, {
        sync_type: 'sync_notifications',
        notification_type: 'voice_moment_reaction',
        sender_id: sender_id,
        sender_name: sender.display_name,
        voice_moment_id: voice_moment_id,
      });
    } catch (silentError) {
      console.error('Silent notification error:', silentError);
    }

    const { error: notificationError } = await supabase
      .from('notifications')
      .insert({
        user_id: receiver_id,
        type: 'voice_moment_reaction',
        title: notification.title,
        body: notification.body,
        data: notification.data,
        source_id: voice_moment_id,
        source_type: 'voice_moment',
      });

    if (notificationError) {
      console.error('Failed to insert notification:', notificationError);
    }

    console.log(`Voice moment reaction notification: push=${sent}, db=${!notificationError}`);
    return new Response(
      JSON.stringify({ message: 'Processed', sent, saved: !notificationError }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

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
