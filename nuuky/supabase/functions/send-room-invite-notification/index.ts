import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { sendBatchExpoNotifications, sendBatchSilentNotifications } from '../_shared/expo-push.ts';
import { authenticateRequest, verifySender, rateLimit, validateArraySize, AuthError, authErrorResponse } from '../_shared/auth.ts';

interface RoomInviteRequest {
  room_id: string;
  sender_id: string;
  receiver_ids: string[];
}

serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    const { userId, supabase } = await authenticateRequest(req);

    const { room_id, sender_id, receiver_ids }: RoomInviteRequest = await req.json();

    if (!room_id || !sender_id || !receiver_ids || receiver_ids.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Missing room_id, sender_id, or receiver_ids' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    verifySender(userId, sender_id);
    rateLimit(userId);
    validateArraySize(receiver_ids, 'receiver_ids');

    console.log(`Processing room invite from ${sender_id} for room ${room_id}`);

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

    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('name, is_private')
      .eq('id', room_id)
      .single();

    if (roomError || !room) {
      console.error('Room not found:', roomError);
      return new Response(
        JSON.stringify({ error: 'Room not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const roomName = room.name || 'a room';

    const { data: receivers, error: receiversError } = await supabase
      .from('users')
      .select('id, display_name, fcm_token')
      .in('id', receiver_ids);

    if (receiversError) {
      console.error('Error fetching receivers:', receiversError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch receivers' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!receivers || receivers.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No valid receivers found', sent: 0 }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const tokens = receivers
      .filter(r => r.fcm_token)
      .map(r => r.fcm_token as string);

    if (tokens.length === 0) {
      console.log('No receivers have push tokens');
      return new Response(
        JSON.stringify({ message: 'No receivers with push tokens', sent: 0 }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const notification = {
      title: '🎙️ Room Invite from ' + sender.display_name,
      body: `${sender.display_name} invited you to join ${roomName}`,
      data: {
        type: 'room_invite',
        room_id: room_id,
        room_name: roomName,
        sender_id: sender_id,
        sender_name: sender.display_name,
      },
      sound: 'default' as const,
      priority: 'high' as const,
    };

    const notificationsToInsert = receivers.map((receiver: any) => ({
      user_id: receiver.id,
      type: 'room_invite',
      title: notification.title,
      body: notification.body,
      data: notification.data,
      source_id: room_id,
      source_type: 'room_invite',
    }));

    if (notificationsToInsert.length > 0) {
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert(notificationsToInsert);

      if (notificationError) {
        console.error('Failed to insert notifications:', notificationError);
      }
    }

    const result = await sendBatchExpoNotifications(tokens, notification);

    await sendBatchSilentNotifications(tokens, {
      sync_type: 'sync_rooms',
      notification_type: 'room_invite',
      room_id: room_id,
      room_name: roomName,
      sender_id: sender_id,
      sender_name: sender.display_name,
    });

    console.log(`Sent ${result.success} room invite notifications + silent sync`);

    return new Response(
      JSON.stringify({
        message: 'Room invite notifications sent',
        sent: result.success,
        failed: result.failed,
        total_receivers: receivers.length,
      }),
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
