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
      return new Response('Method not allowed', { status: 405, headers: { 'X-Content-Type-Options': 'nosniff' } });
    }

    const { userId, supabase } = await authenticateRequest(req);

    let body: RoomInviteRequest;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid request body' }),
        { status: 400, headers: { 'Content-Type': 'application/json', 'X-Content-Type-Options': 'nosniff' } }
      );
    }
    const { room_id, sender_id, receiver_ids } = body;

    if (!room_id || !sender_id || !receiver_ids || receiver_ids.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Missing room_id, sender_id, or receiver_ids' }),
        { status: 400, headers: { 'Content-Type': 'application/json', 'X-Content-Type-Options': 'nosniff' } }
      );
    }

    verifySender(userId, sender_id);
    rateLimit(userId);
    validateArraySize(receiver_ids, 'receiver_ids');

    console.log(`Processing room invite from ${sender_id} for room ${room_id}`);

    // Parallel: fetch sender, room, and receivers
    const [senderResult, roomResult, receiversResult] = await Promise.all([
      supabase.from('users').select('display_name').eq('id', sender_id).single(),
      supabase.from('rooms').select('name, is_private').eq('id', room_id).single(),
      supabase.from('users').select('id, display_name, fcm_token').in('id', receiver_ids),
    ]);

    const sender = senderResult.data;
    const room = roomResult.data;
    const receivers = receiversResult.data;

    if (senderResult.error || !sender) {
      console.error('Sender not found:', senderResult.error);
      return new Response(
        JSON.stringify({ error: 'Sender not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json', 'X-Content-Type-Options': 'nosniff' } }
      );
    }

    if (roomResult.error || !room) {
      console.error('Room not found:', roomResult.error);
      return new Response(
        JSON.stringify({ error: 'Room not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json', 'X-Content-Type-Options': 'nosniff' } }
      );
    }

    if (receiversResult.error) {
      console.error('Error fetching receivers:', receiversResult.error);
      return new Response(
        JSON.stringify({ error: 'Internal server error' }),
        { status: 500, headers: { 'Content-Type': 'application/json', 'X-Content-Type-Options': 'nosniff' } }
      );
    }

    if (!receivers || receivers.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No valid receivers found', sent: 0 }),
        { status: 200, headers: { 'Content-Type': 'application/json', 'X-Content-Type-Options': 'nosniff' } }
      );
    }

    const roomName = room.name || 'a room';

    const tokens = receivers
      .filter(r => r.fcm_token)
      .map(r => r.fcm_token as string);

    if (tokens.length === 0) {
      console.log('No receivers have push tokens');
      return new Response(
        JSON.stringify({ message: 'No receivers with push tokens', sent: 0 }),
        { status: 200, headers: { 'Content-Type': 'application/json', 'X-Content-Type-Options': 'nosniff' } }
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

    // Parallel: insert DB records + send batch push + send batch silent
    const [, pushResult] = await Promise.all([
      notificationsToInsert.length > 0
        ? supabase.from('notifications').insert(notificationsToInsert).then(({ error }) => {
            if (error) console.error('Failed to insert notifications:', error);
          })
        : Promise.resolve(),
      sendBatchExpoNotifications(tokens, notification),
      sendBatchSilentNotifications(tokens, {
        sync_type: 'sync_rooms',
        notification_type: 'room_invite',
        room_id: room_id,
        room_name: roomName,
        sender_id: sender_id,
        sender_name: sender.display_name,
      }),
    ]);

    console.log(`Sent ${pushResult.success} room invite notifications + silent sync`);

    return new Response(
      JSON.stringify({
        message: 'Room invite notifications sent',
        sent: pushResult.success,
        failed: pushResult.failed,
        total_receivers: receivers.length,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json', 'X-Content-Type-Options': 'nosniff' } }
    );

  } catch (error) {
    if (error instanceof AuthError) {
      return authErrorResponse(error);
    }
    console.error('Function error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json', 'X-Content-Type-Options': 'nosniff' } }
    );
  }
});
