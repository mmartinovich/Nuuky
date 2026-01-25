import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../stores/appStore';

// MOCK MODE FLAG - should match useRoom.ts
const USE_MOCK_DATA = true;

const HEARTBEAT_INTERVAL = 30000; // 30 seconds
const OFFLINE_TIMEOUT = 120000; // 2 minutes of inactivity = offline

export const usePresence = () => {
  const { currentUser } = useAppStore();
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  const updatePresence = async (isOnline: boolean) => {
    if (!currentUser) return;

    // MOCK MODE: Skip Supabase query
    if (USE_MOCK_DATA) return;

    // Force offline if ghost mode or break mode is active
    const now = new Date();
    const ghostActive = currentUser.ghost_mode_until && new Date(currentUser.ghost_mode_until) > now;
    const breakActive = currentUser.take_break_until && new Date(currentUser.take_break_until) > now;

    const effectiveOnlineStatus = (ghostActive || breakActive) ? false : isOnline;

    try {
      await supabase
        .from('users')
        .update({
          is_online: effectiveOnlineStatus,
          last_seen_at: new Date().toISOString(),
        })
        .eq('id', currentUser.id);
    } catch (error) {
      console.error('Error updating presence:', error);
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

    // Mark as online when component mounts
    updatePresence(true);
    lastActivityRef.current = Date.now();

    // Set up heartbeat interval
    heartbeatIntervalRef.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);

    // Track app state changes
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
        // App came to foreground - mark as online
        updatePresence(true);
        lastActivityRef.current = Date.now();
      } else if (nextAppState.match(/inactive|background/)) {
        // App went to background - mark as offline
        updatePresence(false);
      }
      appStateRef.current = nextAppState;
    });

    // Track user activity (touch/interaction)
    const activityHandler = () => {
      lastActivityRef.current = Date.now();
      // Update presence on activity
      if (appStateRef.current === 'active') {
        updatePresence(true);
      }
    };

    // Listen for any user interaction
    // Note: In React Native, we can't easily track all touches globally
    // So we rely on the heartbeat and app state changes

    return () => {
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
    if (!currentUser) return;

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
