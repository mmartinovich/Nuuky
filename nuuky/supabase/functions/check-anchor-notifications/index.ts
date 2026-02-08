import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { sendExpoNotification } from '../_shared/expo-push.ts';

const INACTIVITY_THRESHOLD_HOURS = 48;

interface User {
  id: string;
  display_name: string;
  last_seen_at: string;
  fcm_token: string | null; // Actually stores Expo push token
}

interface Anchor {
  user_id: string;
  anchor_id: string;
  anchor: User;
}

serve(async (req) => {
  try {
    // Verify cron secret using constant-time comparison to prevent timing attacks
    const authHeader = req.headers.get('Authorization');
    const cronSecret = Deno.env.get('CRON_SECRET');
    const providedSecret = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : '';
    const encoder = new TextEncoder();
    const secretBytes = encoder.encode(cronSecret || '');
    const providedBytes = encoder.encode(providedSecret);
    const secretsMatch = cronSecret && secretBytes.length === providedBytes.length &&
      crypto.subtle.timingSafeEqual ? await crypto.subtle.timingSafeEqual(secretBytes, providedBytes) :
      cronSecret === providedSecret; // Fallback if timingSafeEqual unavailable
    if (!cronSecret || !secretsMatch) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting anchor inactivity check...');

    // Calculate the cutoff time (48 hours ago)
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - INACTIVITY_THRESHOLD_HOURS);
    const cutoffISO = cutoffTime.toISOString();

    console.log('Checking for users inactive since:', cutoffISO);

    // Find users who have been inactive for 48+ hours
    const { data: inactiveUsers, error: usersError } = await supabase
      .from('users')
      .select('id, display_name, last_seen_at')
      .lt('last_seen_at', cutoffISO);

    if (usersError) {
      console.error('Error fetching inactive users:', usersError);
      throw usersError;
    }

    console.log(`Found ${inactiveUsers?.length || 0} inactive users`);

    if (!inactiveUsers || inactiveUsers.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No inactive users found', count: 0 }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    let totalNotificationsSent = 0;

    // Batch-fetch all anchors for inactive users in a single query (avoids N+1)
    const inactiveUserIds = inactiveUsers.map((u: { id: string }) => u.id);
    const { data: allAnchors, error: anchorsError } = await supabase
      .from('anchors')
      .select(`
        user_id,
        anchor_id,
        anchor:anchor_id (
          id,
          display_name,
          fcm_token
        )
      `)
      .in('user_id', inactiveUserIds);

    if (anchorsError) {
      console.error('Error fetching anchors for inactive users:', anchorsError);
      throw anchorsError;
    }

    // Group anchors by user_id
    const anchorsByUserId = new Map<string, Anchor[]>();
    if (allAnchors) {
      for (const anchor of allAnchors as Anchor[]) {
        const existing = anchorsByUserId.get(anchor.user_id);
        if (existing) {
          existing.push(anchor);
        } else {
          anchorsByUserId.set(anchor.user_id, [anchor]);
        }
      }
    }

    // For each inactive user, notify their anchors
    for (const user of inactiveUsers) {
      console.log(`Processing inactive user: ${user.display_name} (${user.id})`);

      const anchors = anchorsByUserId.get(user.id);

      if (!anchors || anchors.length === 0) {
        console.log(`User ${user.display_name} has no anchors`);
        continue;
      }

      console.log(`Found ${anchors.length} anchor(s) for ${user.display_name}`);

      // Send notification to each anchor
      for (const anchorRelation of anchors) {
        const anchor = anchorRelation.anchor;

        if (!anchor.fcm_token) {
          console.log(`Anchor ${anchor.display_name} has no Expo push token, skipping`);
          continue;
        }

        // Calculate how long the user has been inactive
        const lastSeen = new Date(user.last_seen_at);
        const hoursInactive = Math.floor(
          (Date.now() - lastSeen.getTime()) / (1000 * 60 * 60)
        );

        const notification = {
          title: '⚓ Anchor Alert',
          body: `${user.display_name} has been inactive for ${hoursInactive} hours. You might want to check in on them.`,
          data: {
            type: 'anchor_inactivity',
            user_id: user.id,
            user_name: user.display_name,
            hours_inactive: hoursInactive.toString(),
          },
          sound: 'default' as const,
          priority: 'high' as const,
        };

        const sent = await sendExpoNotification(anchor.fcm_token, notification);

        if (sent) {
          console.log(`✓ Notified anchor ${anchor.display_name} about ${user.display_name}`);
          totalNotificationsSent++;
        } else {
          console.error(`✗ Failed to notify anchor ${anchor.display_name}`);
        }
      }
    }

    const result = {
      message: 'Anchor inactivity check completed',
      inactive_users_count: inactiveUsers.length,
      notifications_sent: totalNotificationsSent,
      timestamp: new Date().toISOString(),
    };

    console.log('Check complete:', result);

    return new Response(
      JSON.stringify(result),
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
