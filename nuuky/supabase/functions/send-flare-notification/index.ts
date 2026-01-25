import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { sendBatchExpoNotifications } from '../_shared/expo-push.ts';

interface FlareRequest {
  user_id: string;
  flare_id: string;
}

serve(async (req) => {
  try {
    // Only allow POST requests
    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    // Parse request body
    const { user_id, flare_id }: FlareRequest = await req.json();

    if (!user_id || !flare_id) {
      return new Response(
        JSON.stringify({ error: 'Missing user_id or flare_id' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`Processing flare ${flare_id} from user ${user_id}`);

    // Get user info
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('display_name')
      .eq('id', user_id)
      .single();

    if (userError || !user) {
      console.error('User not found:', userError);
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get all friends of this user
    const { data: friendships, error: friendsError } = await supabase
      .from('friendships')
      .select(`
        friend_id,
        friend:friend_id (
          id,
          display_name,
          fcm_token
        )
      `)
      .eq('user_id', user_id)
      .eq('status', 'accepted');

    if (friendsError) {
      console.error('Error fetching friends:', friendsError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch friends' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!friendships || friendships.length === 0) {
      console.log('User has no friends to notify');
      return new Response(
        JSON.stringify({ message: 'No friends to notify', sent: 0 }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check which friends are anchors (they get stronger notification)
    const { data: anchors } = await supabase
      .from('anchors')
      .select('anchor_id')
      .eq('user_id', user_id);

    const anchorIds = new Set(anchors?.map(a => a.anchor_id) || []);

    // Collect push tokens
    const regularTokens: string[] = [];
    const anchorTokens: string[] = [];

    friendships.forEach((friendship: any) => {
      const friend = friendship.friend;
      if (friend && friend.fcm_token) {
        if (anchorIds.has(friend.id)) {
          anchorTokens.push(friend.fcm_token);
        } else {
          regularTokens.push(friend.fcm_token);
        }
      }
    });

    console.log(`Found ${regularTokens.length} regular friends and ${anchorTokens.length} anchors with tokens`);

    let totalSent = 0;

    // Send stronger notification to anchors
    if (anchorTokens.length > 0) {
      const anchorNotification = {
        title: '🚨 FLARE from ' + user.display_name,
        body: `${user.display_name} needs support right now. They sent a flare.`,
        data: {
          type: 'flare',
          user_id: user_id,
          user_name: user.display_name,
          flare_id: flare_id,
          is_anchor: 'true',
        },
        sound: 'default' as const,
        priority: 'high' as const,
      };

      const anchorResult = await sendBatchExpoNotifications(anchorTokens, anchorNotification);
      totalSent += anchorResult.success;
      console.log(`Sent ${anchorResult.success} anchor notifications`);
    }

    // Send regular notification to other friends
    if (regularTokens.length > 0) {
      const regularNotification = {
        title: '🚨 Flare from ' + user.display_name,
        body: `${user.display_name} sent a flare. They might need company or support.`,
        data: {
          type: 'flare',
          user_id: user_id,
          user_name: user.display_name,
          flare_id: flare_id,
          is_anchor: 'false',
        },
        sound: 'default' as const,
        priority: 'high' as const,
      };

      const regularResult = await sendBatchExpoNotifications(regularTokens, regularNotification);
      totalSent += regularResult.success;
      console.log(`Sent ${regularResult.success} regular notifications`);
    }

    return new Response(
      JSON.stringify({
        message: 'Flare notifications sent',
        sent: totalSent,
        anchors: anchorTokens.length,
        friends: regularTokens.length,
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
