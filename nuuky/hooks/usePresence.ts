import { logger } from '../lib/logger';
import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../stores/appStore';

// MOCK MODE FLAG - should match useRoom.ts
const USE_MOCK_DATA = false;

const HEARTBEAT_INTERVAL = 60000; // 60 seconds - optimized for battery
const OFFLINE_TIMEOUT = 120000; // 2 minutes of inactivity = offline

export const usePresence = () => {
  const currentUser = useAppStore((s) => s.currentUser);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const isMountedRef = useRef(true);

  const updatePresence = async (isOnline: boolean) => {
    // Get fresh user from store to avoid stale closure
    const user = useAppStore.getState().currentUser;
    if (!user) return;

    // MOCK MODE: Skip Supabase query
    if (USE_MOCK_DATA) return;

    // Force offline if ghost mode or break mode is active
    const now = new Date();
    const ghostActive = user.ghost_mode_until && new Date(user.ghost_mode_until) > now;
    const breakActive = user.take_break_until && new Date(user.take_break_until) > now;

    const effectiveOnlineStatus = (ghostActive || breakActive) ? false : isOnline;

    try {
      await supabase
        .from('users')
        .update({
          is_online: effectiveOnlineStatus,
          last_seen_at: new Date().toISOString(),
        })
        .eq('id', user.id);
    } catch (error) {
      logger.error('Error updating presence:', error);
    }
  };

  const sendHeartbeat = () => {
    if (!currentUser) return;
    
    const now = Date.now();
    const timeSinceLastActivity = now - lastActivityRef.current;

    // If user has been inactive for more than timeout, mark as offline
    if (timeSinceLastActivity > OFFLINE_TIMEOUT) {
      updatePresence(false);
      return;
    }

    // Otherwise, send heartbeat to keep online status fresh
    updatePresence(true);
    lastActivityRef.current = now;
  };

  useEffect(() => {
    if (!currentUser) return;

    isMountedRef.current = true;

    // Mark as online when component mounts
    updatePresence(true);
    lastActivityRef.current = Date.now();

    // Set up heartbeat interval
    heartbeatIntervalRef.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);

    // Track app state changes - pause/resume heartbeat
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (!isMountedRef.current) return;

      if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
        // App came to foreground - mark as online and restart heartbeat
        updatePresence(true);
        lastActivityRef.current = Date.now();
        // Clear any existing interval before creating a new one to prevent leaks
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
        }
        heartbeatIntervalRef.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);
      } else if (nextAppState.match(/inactive|background/)) {
        // App went to background - mark as offline and stop heartbeat
        updatePresence(false);
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
          heartbeatIntervalRef.current = null;
        }
      }
      appStateRef.current = nextAppState;
    });

    // Track user activity (touch/interaction)
    // Note: In React Native, we can't easily track all touches globally
    // So we rely on the heartbeat and app state changes

    return () => {
      // Mark as unmounted to prevent state updates after cleanup
      isMountedRef.current = false;
      // Cleanup: mark as offline when component unmounts
      updatePresence(false);
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
      subscription.remove();
    };
  }, [currentUser?.id]); // Use id to avoid re-running on mood change

  // Immediately update presence when ghost/break mode changes
  useEffect(() => {
    if (!currentUser || !isMountedRef.current) return;

    const now = new Date();
    const ghostActive = currentUser.ghost_mode_until && new Date(currentUser.ghost_mode_until) > now;
    const breakActive = currentUser.take_break_until && new Date(currentUser.take_break_until) > now;

    if (ghostActive || breakActive) {
      updatePresence(false); // Immediately push offline status
    }
  }, [currentUser?.ghost_mode_until, currentUser?.take_break_until]);

  return {
    updateActivity: () => {
      lastActivityRef.current = Date.now();
    },
  };
};
