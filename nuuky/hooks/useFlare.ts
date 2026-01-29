import { useState, useEffect, useRef } from "react";
import { Alert } from "react-native";
import * as Haptics from "expo-haptics";
import { supabase } from "../lib/supabase";
import { useAppStore } from "../stores/appStore";
import { subscriptionManager } from "../lib/subscriptionManager";
import { Flare } from "../types";

export const useFlare = () => {
  const { currentUser, friends } = useAppStore();
  const [loading, setLoading] = useState(false);
  const [activeFlares, setActiveFlares] = useState<Flare[]>([]);
  const [myActiveFlare, setMyActiveFlare] = useState<Flare | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    if (currentUser) {
      loadActiveFlares();
      const cleanup = setupRealtimeSubscription();
      return () => {
        isMountedRef.current = false;
        cleanup();
      };
    }
    return () => {
      isMountedRef.current = false;
    };
  }, [currentUser?.id]); // Use id to avoid re-running on mood change

  // MOCK MODE FLAG - should match useRoom.ts
  const USE_MOCK_DATA = false;

  const loadActiveFlares = async () => {
    // Get fresh state from store to avoid stale closures
    const user = useAppStore.getState().currentUser;
    const currentFriends = useAppStore.getState().friends;
    if (!user) return;

    // MOCK MODE: Skip Supabase queries, use empty flares
    if (USE_MOCK_DATA) {
      if (isMountedRef.current) {
        setActiveFlares([]);
        setMyActiveFlare(null);
      }
      return;
    }

    try {
      // Get active flares from friends
      const { data, error } = await supabase
        .from("flares")
        .select(
          `
          *,
          user:user_id (
            id,
            display_name,
            mood,
            avatar_url
          )
        `,
        )
        .gte("expires_at", new Date().toISOString())
        .neq("user_id", user.id);

      if (error) throw error;

      // Get friend IDs for filtering
      const friendIds = new Set(currentFriends.map((f) => f.friend_id));

      // Filter for flares from friends only
      const friendFlares =
        data?.filter((flare: any) => {
          return friendIds.has(flare.user_id);
        }) || [];

      if (isMountedRef.current) {
        setActiveFlares(friendFlares);
      }

      // Check if user has an active flare
      const { data: myFlare } = await supabase
        .from("flares")
        .select("*")
        .eq("user_id", user.id)
        .gte("expires_at", new Date().toISOString())
        .maybeSingle();

      if (isMountedRef.current) {
        setMyActiveFlare(myFlare);
      }
    } catch (_error: any) {
      // Silently fail
    }
  };

  const setupRealtimeSubscription = () => {
    if (!currentUser) return () => {};

    const subscriptionId = `flares-${currentUser.id}`;

    // Use subscription manager for automatic pause/resume on app background
    const cleanup = subscriptionManager.register(subscriptionId, () => {
      return supabase
        .channel(subscriptionId)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "flares",
          },
          (payload) => {
            loadActiveFlares();

            // Play strong haptic if a friend sent a flare
            const user = useAppStore.getState().currentUser;
            if (payload.eventType === "INSERT" && payload.new.user_id !== user?.id) {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            }
          },
        )
        .subscribe();
    });

    return cleanup;
  };

  const sendFlare = async (): Promise<boolean> => {
    if (!currentUser) {
      Alert.alert("Error", "You must be logged in");
      return false;
    }

    // Check if user is on break
    const now = new Date();
    if (currentUser.take_break_until && new Date(currentUser.take_break_until) > now) {
      Alert.alert(
        "Break Mode Active",
        "You cannot send flares while on a break. End your break first if you need support.",
      );
      return false;
    }

    // Check if user already has an active flare
    if (myActiveFlare) {
      const remainingMinutes = Math.ceil((new Date(myActiveFlare.expires_at).getTime() - Date.now()) / 60000);
      Alert.alert("Flare Active", `You have an active flare for ${remainingMinutes} more minutes`);
      return false;
    }

    // MOCK MODE: Skip Supabase, just show success
    if (USE_MOCK_DATA) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Flare Sent! 🚨", "Your friends have been notified. The flare will remain active for 30 minutes.");
      return true;
    }

    // Confirm before sending
    return new Promise((resolve) => {
      Alert.alert(
        "Send Flare? 🚨",
        'This will send a notification to all your friends. Use this when there is "Red Alert" situation.',
        [
          {
            text: "Cancel",
            style: "cancel",
            onPress: () => resolve(false),
          },
          {
            text: "Send Flare",
            style: "default",
            onPress: async () => {
              setLoading(true);
              try {
                // Verify session exists before attempting insert
                const {
                  data: { session },
                  error: sessionError,
                } = await supabase.auth.getSession();

                if (sessionError || !session) {
                  Alert.alert("Authentication Error", "Please log in again to send flares.");
                  setLoading(false);
                  resolve(false);
                  return;
                }

                // Flare expires in 30 minutes
                const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

                const { data: flareData, error } = await supabase
                  .from("flares")
                  .insert({
                    user_id: currentUser.id,
                    expires_at: expiresAt.toISOString(),
                  })
                  .select()
                  .single();

                if (error) {
                  throw error;
                }

                // Send push notifications to all friends via Edge Function
                // (session already verified above)
                try {
                  if (flareData) {
                    await supabase.functions.invoke("send-flare-notification", {
                      body: {
                        user_id: currentUser.id,
                        flare_id: flareData.id,
                      },
                    });
                  }
                } catch (_notifError) {
                  // Don't fail the flare if notification fails
                }

                // Play strong haptic feedback
                await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

                Alert.alert(
                  "Flare Sent! 🚨",
                  "Your friends have been notified. The flare will remain active for 30 minutes.",
                );

                await loadActiveFlares();
                resolve(true);
              } catch (_error: any) {
                Alert.alert("Error", "Failed to send flare");
                resolve(false);
              } finally {
                setLoading(false);
              }
            },
          },
        ],
      );
    });
  };

  const respondToFlare = async (flareId: string): Promise<boolean> => {
    if (!currentUser) return false;

    setLoading(true);
    try {
      const { error } = await supabase.from("flares").update({ responded_by: currentUser.id }).eq("id", flareId);

      if (error) throw error;

      await loadActiveFlares();
      return true;
    } catch (_error: any) {
      Alert.alert("Error", "Failed to respond to flare");
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
