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
      return new Response('Method not allowed', { status: 405, headers: { 'X-Content-Type-Options': 'nosniff' } });
    }

    const { userId, supabase } = await authenticateRequest(req);

    const { user_id, flare_id }: FlareRequest = await req.json();

    if (!user_id || !flare_id) {
      return new Response(
        JSON.stringify({ error: 'Missing user_id or flare_id' }),
        { status: 400, headers: { 'Content-Type': 'application/json', 'X-Content-Type-Options': 'nosniff' } }
      );
    }

    verifySender(userId, user_id);
    rateLimit(userId);

    console.log(`Processing flare ${flare_id} from user ${user_id}`);

    // Parallel: fetch user, friendships, and anchors
    const [userResult, friendshipsResult, anchorsResult] = await Promise.all([
      supabase.from('users').select('display_name, avatar_url').eq('id', user_id).single(),
      supabase.from('friendships').select(`
        friend_id,
        friend:friend_id (
          id,
          display_name,
          fcm_token
        )
      `).eq('user_id', user_id).eq('status', 'accepted'),
      supabase.from('anchors').select('anchor_id').eq('user_id', user_id),
    ]);

    const user = userResult.data;

    if (userResult.error || !user) {
      console.error('User not found:', userResult.error);
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json', 'X-Content-Type-Options': 'nosniff' } }
      );
    }

    const friendships = friendshipsResult.data;
    if (friendshipsResult.error) {
      console.error('Error fetching friends:', friendshipsResult.error);
      return new Response(
        JSON.stringify({ error: 'Internal server error' }),
        { status: 500, headers: { 'Content-Type': 'application/json', 'X-Content-Type-Options': 'nosniff' } }
      );
    }

    if (!friendships || friendships.length === 0) {
      console.log('User has no friends to notify');
      return new Response(
        JSON.stringify({ message: 'No friends to notify', sent: 0 }),
        { status: 200, headers: { 'Content-Type': 'application/json', 'X-Content-Type-Options': 'nosniff' } }
      );
    }

    const anchorIds = new Set(anchorsResult.data?.map(a => a.anchor_id) || []);
    const friendIds = friendships.map((f: any) => f.friend_id);

    // Fetch preferences for all friends
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

    const notificationsToInsert = filteredFriendships.map((friendship: any) => ({
      user_id: friendship.friend_id,
      type: 'flare',
      title: '🚨 Flare from ' + user.display_name,
      body: `${user.display_name} sent a flare. They might need company or support.`,
      data: {
        sender_id: user_id,
        sender_name: user.display_name,
        sender_avatar_url: user.avatar_url,
        flare_id: flare_id,
      },
      source_id: user_id,
      source_type: 'flare',
    }));

    // Parallel: insert DB records + send anchor pushes + send regular pushes + send silent pushes
    const pushPromises: Promise<any>[] = [];

    pushPromises.push(
      notificationsToInsert.length > 0
        ? supabase.from('notifications').insert(notificationsToInsert).then(({ error }) => {
            if (error) console.error('Failed to insert notifications:', error);
          })
        : Promise.resolve()
    );

    let totalSent = 0;

    if (anchorTokens.length > 0) {
      pushPromises.push(
        sendBatchExpoNotifications(anchorTokens, {
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
        }).then((result) => {
          totalSent += result.success;
          console.log(`Sent ${result.success} anchor notifications`);
        })
      );
    }

    if (regularTokens.length > 0) {
      pushPromises.push(
        sendBatchExpoNotifications(regularTokens, {
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
        }).then((result) => {
          totalSent += result.success;
          console.log(`Sent ${result.success} regular notifications`);
        })
      );
    }

    const allTokens = [...anchorTokens, ...regularTokens];
    if (allTokens.length > 0) {
      pushPromises.push(
        sendBatchSilentNotifications(allTokens, {
          sync_type: 'sync_flares',
          notification_type: 'flare',
          sender_id: user_id,
          sender_name: user.display_name,
          flare_id: flare_id,
        }).then(() => {
          console.log(`Sent ${allTokens.length} silent sync notifications`);
        })
      );
    }

    await Promise.all(pushPromises);

    return new Response(
      JSON.stringify({
        message: 'Flare notifications sent',
        sent: totalSent,
        anchors: anchorTokens.length,
        friends: regularTokens.length,
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
