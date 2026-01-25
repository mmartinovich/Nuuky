import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { sendExpoNotification, sendBatchExpoNotifications } from '../_shared/expo-push.ts';

interface RoomInviteRequest {
  room_id: string;
  sender_id: string;
  receiver_ids: string[]; // Can invite multiple people
}

serve(async (req) => {
  try {
    // Only allow POST requests
    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    // Parse request body
    const { room_id, sender_id, receiver_ids }: RoomInviteRequest = await req.json();

    if (!room_id || !sender_id || !receiver_ids || receiver_ids.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Missing room_id, sender_id, or receiver_ids' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`Processing room invite from ${sender_id} for room ${room_id}`);

    // Get sender info
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

    // Get room info
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

    // Get all receivers and their push tokens
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

    // Collect push tokens
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

    // Send notifications
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

    const result = await sendBatchExpoNotifications(tokens, notification);

    console.log(`Sent ${result.success} room invite notifications`);

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
    console.error('Function error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
