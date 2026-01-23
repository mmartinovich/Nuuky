import { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import * as Haptics from 'expo-haptics';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../stores/appStore';
import { Flare } from '../types';

// Module-level subscription tracking to prevent duplicates
let activeFlareSubscription: { cleanup: () => void; userId: string } | null = null;

export const useFlare = () => {
  const { currentUser } = useAppStore();
  const [loading, setLoading] = useState(false);
  const [activeFlares, setActiveFlares] = useState<Flare[]>([]);
  const [myActiveFlare, setMyActiveFlare] = useState<Flare | null>(null);

  useEffect(() => {
    if (currentUser) {
      loadActiveFlares();
      const cleanup = setupRealtimeSubscription();
      return cleanup;
    }
  }, [currentUser?.id]); // Use id to avoid re-running on mood change

  // MOCK MODE FLAG - should match useRoom.ts
  const USE_MOCK_DATA = true;

  const loadActiveFlares = async () => {
    if (!currentUser) return;

    // MOCK MODE: Skip Supabase queries, use empty flares
    if (USE_MOCK_DATA) {
      setActiveFlares([]);
      setMyActiveFlare(null);
      return;
    }

    try {
      // Get active flares from friends
      const { data, error } = await supabase
        .from('flares')
        .select(`
          *,
          user:user_id (
            id,
            display_name,
            mood,
            avatar_url
          )
        `)
        .gte('expires_at', new Date().toISOString())
        .neq('user_id', currentUser.id);

      if (error) throw error;

      // Filter for flares from friends only
      const friendFlares = data?.filter((flare: any) => {
        // We'd need to check if flare.user_id is in our friends list
        // For now, showing all active flares
        return true;
      }) || [];

      setActiveFlares(friendFlares);

      // Check if user has an active flare
      const { data: myFlare } = await supabase
        .from('flares')
        .select('*')
        .eq('user_id', currentUser.id)
        .gte('expires_at', new Date().toISOString())
        .maybeSingle();

      setMyActiveFlare(myFlare);
    } catch (error: any) {
      console.error('Error loading flares:', error);
    }
  };

  const setupRealtimeSubscription = () => {
    if (!currentUser) return () => {};

    // Prevent duplicate subscriptions - return existing cleanup for proper unmount
    if (activeFlareSubscription && activeFlareSubscription.userId === currentUser.id) {
      return activeFlareSubscription.cleanup;
    }

    if (activeFlareSubscription) {
      activeFlareSubscription.cleanup();
      activeFlareSubscription = null;
    }

    const channel = supabase
      .channel('flares-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'flares',
        },
        (payload) => {
          loadActiveFlares();

          // Play strong haptic if a friend sent a flare
          if (payload.eventType === 'INSERT' && payload.new.user_id !== currentUser?.id) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          }
        }
      )
      .subscribe();

    const cleanup = () => {
      supabase.removeChannel(channel);
      activeFlareSubscription = null;
    };

    activeFlareSubscription = { cleanup, userId: currentUser.id };

    return cleanup;
  };

  const sendFlare = async (): Promise<boolean> => {
    if (!currentUser) {
      Alert.alert('Error', 'You must be logged in');
      return false;
    }

    // Check if user already has an active flare
    if (myActiveFlare) {
      const remainingMinutes = Math.ceil(
        (new Date(myActiveFlare.expires_at).getTime() - Date.now()) / 60000
      );
      Alert.alert(
        'Flare Active',
        `You have an active flare for ${remainingMinutes} more minutes`
      );
      return false;
    }

    // Confirm before sending
    return new Promise((resolve) => {
      Alert.alert(
        'Send Flare? 🚨',
        'This will send a notification to all your friends. Use this when you need support or company.',
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => resolve(false),
          },
          {
            text: 'Send Flare',
            style: 'default',
            onPress: async () => {
              setLoading(true);
              try {
                // Flare expires in 30 minutes
                const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

                const { error } = await supabase
                  .from('flares')
                  .insert({
                    user_id: currentUser.id,
                    expires_at: expiresAt.toISOString(),
                  });

                if (error) throw error;

                // Play strong haptic feedback
                await Haptics.notificationAsync(
                  Haptics.NotificationFeedbackType.Success
                );

                Alert.alert(
                  'Flare Sent! 🚨',
                  'Your friends have been notified. The flare will remain active for 30 minutes.'
                );

                await loadActiveFlares();
                resolve(true);
              } catch (error: any) {
                console.error('Error sending flare:', error);
                Alert.alert('Error', 'Failed to send flare');
                resolve(false);
              } finally {
                setLoading(false);
              }
            },
          },
        ]
      );
    });
  };

  const respondToFlare = async (flareId: string): Promise<boolean> => {
    if (!currentUser) return false;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('flares')
        .update({ responded_by: currentUser.id })
        .eq('id', flareId);

      if (error) throw error;

      await loadActiveFlares();
      return true;
    } catch (error: any) {
      console.error('Error responding to flare:', error);
      Alert.alert('Error', 'Failed to respond to flare');
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    activeFlares,
    myActiveFlare,
    sendFlare,
    respondToFlare,
    refreshFlares: loadActiveFlares,
  };
};
