import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { sendExpoNotification } from '../_shared/expo-push.ts';

// Streak state thresholds (same as client-side useStreaks.ts)
const ACTIVE_THRESHOLD_HOURS = 18;
const FADING_THRESHOLD_HOURS = 36;

// Notification cooldown to prevent spam
const NOTIFICATION_COOLDOWN_HOURS = 12;

interface User {
  id: string;
  display_name: string;
  fcm_token: string | null;
}

interface StreakRow {
  id: string;
  user1_id: string;
  user2_id: string;
  consecutive_days: number;
  user1_last_interaction: string | null;
  user2_last_interaction: string | null;
  last_streak_notification_at: string | null;
}

type StreakState = 'active' | 'fading' | 'broken';

/**
 * Compute streak state from timestamps (mirrors client-side logic)
 */
function computeStreakState(
  user1Last: string | null,
  user2Last: string | null,
): StreakState {
  if (!user1Last || !user2Last) return 'broken';
  const now = Date.now();
  const h1 = (now - new Date(user1Last).getTime()) / (1000 * 60 * 60);
  const h2 = (now - new Date(user2Last).getTime()) / (1000 * 60 * 60);
  const worst = Math.max(h1, h2);
  if (worst <= ACTIVE_THRESHOLD_HOURS) return 'active';
  if (worst <= FADING_THRESHOLD_HOURS) return 'fading';
  return 'broken';
}

/**
 * Check if enough time has passed since last notification
 */
function canSendNotification(lastNotificationAt: string | null): boolean {
  if (!lastNotificationAt) return true;
  const hoursSinceLast = (Date.now() - new Date(lastNotificationAt).getTime()) / (1000 * 60 * 60);
  return hoursSinceLast >= NOTIFICATION_COOLDOWN_HOURS;
}

serve(async (req) => {
  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting streak fading notification check...');

    // Query all streaks with consecutive_days > 0
    const { data: streaks, error: streaksError } = await supabase
      .from('streaks')
      .select('*')
      .gt('consecutive_days', 0);

    if (streaksError) {
      console.error('Error fetching streaks:', streaksError);
      throw streaksError;
    }

    console.log(`Found ${streaks?.length || 0} active streaks to check`);

    if (!streaks || streaks.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No active streaks found', count: 0 }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    let totalNotificationsSent = 0;
    let streaksProcessed = 0;
    let streaksFading = 0;

    // Process each streak
    for (const streak of streaks as StreakRow[]) {
      streaksProcessed++;

      // Compute streak state
      const state = computeStreakState(
        streak.user1_last_interaction,
        streak.user2_last_interaction
      );

      // Only notify for fading streaks
      if (state !== 'fading') {
        continue;
      }

      streaksFading++;
      console.log(`Streak ${streak.id} is fading (${streak.consecutive_days} days)`);

      // Check cooldown
      if (!canSendNotification(streak.last_streak_notification_at)) {
        console.log(`Streak ${streak.id} is on cooldown, skipping`);
        continue;
      }

      // Fetch both users' details
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, display_name, fcm_token')
        .in('id', [streak.user1_id, streak.user2_id]);

      if (usersError) {
        console.error(`Error fetching users for streak ${streak.id}:`, usersError);
        continue;
      }

      if (!users || users.length !== 2) {
        console.log(`Could not find both users for streak ${streak.id}`);
        continue;
      }

      const user1 = users.find((u: User) => u.id === streak.user1_id) as User;
      const user2 = users.find((u: User) => u.id === streak.user2_id) as User;

      // Send notification to both users
      for (const [currentUser, otherUser] of [[user1, user2], [user2, user1]] as [User, User][]) {
        if (!currentUser.fcm_token) {
          console.log(`User ${currentUser.display_name} has no push token, skipping`);
          continue;
        }

        const notification = {
          title: '⚡ Streak Fading!',
          body: `Your ${streak.consecutive_days}-day streak with ${otherUser.display_name} is fading! Nudge to keep it alive`,
          data: {
            type: 'streak_fading',
            streak_id: streak.id,
            friend_id: otherUser.id,
            friend_name: otherUser.display_name,
            consecutive_days: streak.consecutive_days.toString(),
          },
          sound: 'default' as const,
          priority: 'high' as const,
        };

        const sent = await sendExpoNotification(currentUser.fcm_token, notification);

        if (sent) {
          console.log(`✓ Notified ${currentUser.display_name} about fading streak with ${otherUser.display_name}`);
          totalNotificationsSent++;

          // Insert notification record
          await supabase
            .from('notifications')
            .insert({
              user_id: currentUser.id,
              type: 'streak_fading',
              title: notification.title,
              body: notification.body,
              data: notification.data,
              is_read: false,
            });
        } else {
          console.error(`✗ Failed to notify ${currentUser.display_name}`);
        }
      }

      // Update last_streak_notification_at
      const { error: updateError } = await supabase
        .from('streaks')
        .update({ last_streak_notification_at: new Date().toISOString() })
        .eq('id', streak.id);

      if (updateError) {
        console.error(`Error updating notification timestamp for streak ${streak.id}:`, updateError);
      }
    }

    const result = {
      message: 'Streak fading notification check completed',
      streaks_checked: streaksProcessed,
      streaks_fading: streaksFading,
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
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
