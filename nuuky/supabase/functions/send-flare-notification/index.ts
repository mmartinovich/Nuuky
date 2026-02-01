import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { sendBatchExpoNotifications, sendBatchSilentNotifications } from '../_shared/expo-push.ts';
import { authenticateRequest, verifySender, rateLimit, AuthError, authErrorResponse } from '../_shared/auth.ts';

interface FlareRequest {
  user_id: string;
  flare_id: string;
}

serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    const { userId, supabase } = await authenticateRequest(req);

    const { user_id, flare_id }: FlareRequest = await req.json();

    if (!user_id || !flare_id) {
      return new Response(
        JSON.stringify({ error: 'Missing user_id or flare_id' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    verifySender(userId, user_id);
    rateLimit(userId);

    console.log(`Processing flare ${flare_id} from user ${user_id}`);

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

    const { data: anchors } = await supabase
      .from('anchors')
      .select('anchor_id')
      .eq('user_id', user_id);

    const anchorIds = new Set(anchors?.map(a => a.anchor_id) || []);

    const friendIds = friendships.map((f: any) => f.friend_id);

    const { data: allPreferences } = await supabase
      .from('user_preferences')
      .select('user_id, flares_enabled')
      .in('user_id', friendIds);

    const preferencesMap = new Map<string, boolean>();
    allPreferences?.forEach((pref: any) => {
      preferencesMap.set(pref.user_id, pref.flares_enabled);
    });

    const regularTokens: string[] = [];
    const anchorTokens: string[] = [];
    const filteredFriendships: any[] = [];

    friendships.forEach((friendship: any) => {
      const friend = friendship.friend;
      const flaresEnabled = preferencesMap.get(friend?.id) ?? true;

      if (!flaresEnabled) {
        console.log(`Skipping ${friend?.display_name} - flares disabled`);
        return;
      }

      filteredFriendships.push(friendship);

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

    const notificationsToInsert = filteredFriendships.map((friendship: any) => ({
      user_id: friendship.friend_id,
      type: 'flare',
      title: '🚨 Flare from ' + user.display_name,
      body: `${user.display_name} sent a flare. They might need company or support.`,
      data: {
        sender_id: user_id,
        sender_name: user.display_name,
        flare_id: flare_id,
      },
      source_id: user_id,
      source_type: 'flare',
    }));

    if (notificationsToInsert.length > 0) {
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert(notificationsToInsert);

      if (notificationError) {
        console.error('Failed to insert notifications:', notificationError);
      }
    }

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

    const allTokens = [...anchorTokens, ...regularTokens];
    if (allTokens.length > 0) {
      await sendBatchSilentNotifications(allTokens, {
        sync_type: 'sync_flares',
        notification_type: 'flare',
        sender_id: user_id,
        sender_name: user.display_name,
        flare_id: flare_id,
      });
      console.log(`Sent ${allTokens.length} silent sync notifications`);
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
