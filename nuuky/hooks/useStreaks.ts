import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../stores/appStore';
import { subscriptionManager } from '../lib/subscriptionManager';
import { Streak, StreakState } from '../types';

const ACTIVE_THRESHOLD_HOURS = 18;
const FADING_THRESHOLD_HOURS = 36;

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

function deriveStreak(row: any, myId: string): Streak {
  const friendId = row.user1_id === myId ? row.user2_id : row.user1_id;
  return {
    ...row,
    friend_id: friendId,
    state: computeStreakState(row.user1_last_interaction, row.user2_last_interaction),
  };
}

function sameUTCDay(a: Date, b: Date): boolean {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  );
}

const STREAK_REFRESH_THROTTLE_MS = 5000;

export const useStreaks = () => {
  const currentUser = useAppStore((s) => s.currentUser);
  const [streaks, setStreaks] = useState<Streak[]>([]);
  const isMountedRef = useRef(true);
  const lastStreakRefreshRef = useRef(0);

  useEffect(() => {
    isMountedRef.current = true;
    if (currentUser) {
      loadStreaks();
      const cleanup = setupRealtimeSubscription();
      return () => {
        isMountedRef.current = false;
        cleanup();
      };
    }
    return () => { isMountedRef.current = false; };
  }, [currentUser?.id]);

  const loadStreaks = async () => {
    const user = useAppStore.getState().currentUser;
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('streaks')
        .select('*')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);

      if (error) throw error;

      if (isMountedRef.current && data) {
        setStreaks(data.map((s: any) => deriveStreak(s, user.id)));
      }
    } catch (_error) {
      // Silently fail
    }
  };

  const setupRealtimeSubscription = () => {
    if (!currentUser) return () => {};

    const id1 = `streaks-u1-${currentUser.id}`;
    const id2 = `streaks-u2-${currentUser.id}`;

    const cleanup1 = subscriptionManager.register(id1, () => {
      return supabase
        .channel(id1)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'streaks',
            filter: `user1_id=eq.${currentUser.id}`,
          },
          () => {
            const now = Date.now();
            if (now - lastStreakRefreshRef.current >= STREAK_REFRESH_THROTTLE_MS) {
              lastStreakRefreshRef.current = now;
              loadStreaks();
            }
          }
        )
        .subscribe();
    });

    const cleanup2 = subscriptionManager.register(id2, () => {
      return supabase
        .channel(id2)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'streaks',
            filter: `user2_id=eq.${currentUser.id}`,
          },
          () => {
            const now = Date.now();
            if (now - lastStreakRefreshRef.current >= STREAK_REFRESH_THROTTLE_MS) {
              lastStreakRefreshRef.current = now;
              loadStreaks();
            }
          }
        )
        .subscribe();
    });

    return () => { cleanup1(); cleanup2(); };
  };

  const recordInteraction = useCallback(async (friendId: string) => {
    const user = useAppStore.getState().currentUser;
    if (!user) return;

    try {
      const now = new Date();

      // Canonical order: smaller UUID = user1
      const isUser1 = user.id < friendId;
      const u1 = isUser1 ? user.id : friendId;
      const u2 = isUser1 ? friendId : user.id;
      const myCol = isUser1 ? 'user1_last_interaction' : 'user2_last_interaction';
      const theirCol = isUser1 ? 'user2_last_interaction' : 'user1_last_interaction';

      // Fetch existing streak
      const { data: existing } = await supabase
        .from('streaks')
        .select('*')
        .eq('user1_id', u1)
        .eq('user2_id', u2)
        .maybeSingle();

      if (existing) {
        const updates: Record<string, any> = { [myCol]: now.toISOString() };

        const theirLast = existing[theirCol] ? new Date(existing[theirCol]) : null;
        const myLast = existing[myCol] ? new Date(existing[myCol]) : null;

        // Check if streak should reset (>36h since either user's last interaction)
        const oldestLast = theirLast && myLast
          ? new Date(Math.min(theirLast.getTime(), myLast.getTime()))
          : null;
        const hoursSinceOldest = oldestLast
          ? (now.getTime() - oldestLast.getTime()) / (1000 * 60 * 60)
          : Infinity;

        if (hoursSinceOldest > FADING_THRESHOLD_HOURS) {
          // Reset streak
          updates.consecutive_days = 0;
          updates.last_streak_at = null;
        } else if (theirLast && sameUTCDay(theirLast, now)) {
          // Both interacted today — check if we already incremented today
          const lastStreak = existing.last_streak_at ? new Date(existing.last_streak_at) : null;
          if (!lastStreak || !sameUTCDay(lastStreak, now)) {
            updates.consecutive_days = existing.consecutive_days + 1;
            updates.last_streak_at = now.toISOString();
          }
        }

        await supabase
          .from('streaks')
          .update(updates)
          .eq('id', existing.id);
      } else {
        // New streak row
        await supabase
          .from('streaks')
          .insert({
            user1_id: u1,
            user2_id: u2,
            consecutive_days: 0,
            [myCol]: now.toISOString(),
          });
      }

      await loadStreaks();
    } catch (_error) {
      // Silently fail
    }
  }, []);

  const refreshStreaks = useCallback(() => { loadStreaks(); }, []);

  return { streaks, recordInteraction, refreshStreaks };
};
