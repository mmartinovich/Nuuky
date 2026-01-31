import { useEffect, useState, useRef } from "react";
import { Alert } from "react-native";
import { Stack, useRouter } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import * as Linking from "expo-linking";
import * as SplashScreen from "expo-splash-screen";
import { Asset } from "expo-asset";
import { useFonts } from "expo-font";
import {
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_600SemiBold,
  Outfit_700Bold,
} from "@expo-google-fonts/outfit";
import { useAppStore } from "../stores/appStore";
import { supabase } from "../lib/supabase";
import { ThemeProvider } from "../context/ThemeContext";
import { NotificationBannerProvider, useNotificationBanner } from "../context/NotificationBannerContext";
import { initializeLiveKit } from "../lib/livekit";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { getAllMoodImages, getTheme } from "../lib/theme";
import { useTheme } from "../hooks/useTheme";
import { startNetworkMonitor, stopNetworkMonitor } from "../lib/network";
import { OfflineBanner } from "../components/OfflineBanner";
import {
  registerForPushNotificationsAsync,
  savePushTokenToUser,
  setupNotificationListeners,
  isSilentNotification,
} from "../lib/notifications";

// Type for pending deep link actions (to execute after login)
interface PendingDeepLinkAction {
  type: "profile" | "room_invite";
  payload: string; // username or token
}

// Keep the splash screen visible while we initialize
SplashScreen.preventAutoHideAsync();

// Helper component to connect notification banner context with ref
function NotificationBannerConnector({ onReady }: { onReady: (fn: any) => void }) {
  const { showNotification } = useNotificationBanner();
  useEffect(() => {
    onReady(showNotification);
  }, [showNotification, onReady]);
  return null;
}

function ThemedAppShell() {
  const { theme } = useTheme();
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: theme.colors.bg.primary }}>
      <OfflineBanner />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: {
            backgroundColor: theme.colors.bg.primary,
          },
          animation: "slide_from_right",
        }}
      >
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(main)" />
      </Stack>
    </GestureHandlerRootView>
  );
}

export default function RootLayout() {
  const { currentUser, setCurrentUser } = useAppStore();
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);
  const [fontsLoaded] = useFonts({
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
    Outfit_700Bold,
  });
  const notificationCleanupRef = useRef<(() => void) | null>(null);
  const pendingDeepLinkRef = useRef<PendingDeepLinkAction | null>(null);
  const showNotificationBannerRef = useRef<((notification: any) => void) | null>(null);

  // Handle notification tap navigation
  const handleNotificationNavigation = (data: any) => {
    const type = data?.type;

    switch (type) {
      case "nudge":
      case "flare":
        router.push("/(main)");
        break;
      case "friend_request":
      case "friend_accepted":
        router.push("/(main)/friends");
        break;
      case "room_invite":
      case "call_me":
        // Both room invites and call requests go to rooms
        router.push("/(main)/rooms");
        break;
      default:
        router.push("/(main)/notifications");
    }
  };

  // Setup notification listeners
  useEffect(() => {
    const cleanup = setupNotificationListeners(
      // On notification received (foreground)
      (notification) => {
        // Skip silent notifications (they're for background data sync only)
        if (isSilentNotification(notification)) {
          return;
        }

        const content = notification.request.content;
        const data = content.data || {};

        // Show in-app banner for foreground notifications
        if (showNotificationBannerRef.current) {
          // Get notification style based on type
          let icon = 'notifications';
          let color = '#A855F7';

          switch (data.type) {
            case 'nudge':
              icon = 'hand-left';
              color = '#8B5CF6';
              break;
            case 'flare':
              icon = 'flame';
              color = '#F97316';
              break;
            case 'friend_request':
              icon = 'person-add';
              color = '#06B6D4';
              break;
            case 'friend_accepted':
              icon = 'checkmark-circle';
              color = '#10B981';
              break;
            case 'room_invite':
              icon = 'people';
              color = '#A855F7';
              break;
            case 'call_me':
              icon = 'call';
              color = '#10B981';
              break;
          }

          showNotificationBannerRef.current({
            id: notification.request.identifier,
            title: content.title || 'Notification',
            body: content.body || '',
            icon,
            color,
            avatarUrl: data.sender_avatar_url || data.friend_avatar_url,
            onPress: () => handleNotificationNavigation(data),
          });
        }
      },
      // On notification response (tap)
      (response) => {
        const data = response.notification.request.content.data;
        handleNotificationNavigation(data);
      },
    );

    notificationCleanupRef.current = cleanup;

    return () => {
      if (notificationCleanupRef.current) {
        notificationCleanupRef.current();
      }
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    // Handle profile deep link (nuuky://u/{username})
    const handleProfileDeepLink = async (username: string) => {
      const user = useAppStore.getState().currentUser;
      if (!user) {
        // Store for after login
        pendingDeepLinkRef.current = { type: "profile", payload: username };
        return;
      }

      try {
        // Look up user by username
        const { data: targetUser, error } = await supabase
          .from("users")
          .select("id, username, display_name, avatar_url")
          .eq("username", username.toLowerCase())
          .single();

        if (error || !targetUser) {
          Alert.alert("User Not Found", `No user with username @${username} exists.`);
          return;
        }

        if (targetUser.id === user.id) {
          // It's the current user, navigate to profile
          router.push("/(main)/profile");
          return;
        }

        // Check if already friends
        const { data: friendship } = await supabase
          .from("friendships")
          .select("id")
          .eq("user_id", user.id)
          .eq("friend_id", targetUser.id)
          .maybeSingle();

        if (friendship) {
          Alert.alert("Already Friends", `You're already friends with ${targetUser.display_name}!`);
        } else {
          // Prompt to add friend
          Alert.alert(
            "Add Friend",
            `Would you like to add ${targetUser.display_name} (@${targetUser.username}) as a friend?`,
            [
              { text: "Cancel", style: "cancel" },
              {
                text: "Add Friend",
                onPress: async () => {
                  try {
                    // Create two-way friendship
                    await supabase.from("friendships").insert([
                      { user_id: user.id, friend_id: targetUser.id, status: "accepted" },
                      { user_id: targetUser.id, friend_id: user.id, status: "accepted" },
                    ]);
                    Alert.alert("Success", `${targetUser.display_name} added as friend!`);
                  } catch (err) {
                    console.error("Error adding friend:", err);
                    Alert.alert("Error", "Failed to add friend");
                  }
                },
              },
            ],
          );
        }
      } catch (err) {
        console.error("Error handling profile deep link:", err);
      }
    };

    // Handle room invite deep link (nuuky://r/{token})
    const handleRoomInviteDeepLink = async (token: string) => {
      const user = useAppStore.getState().currentUser;
      if (!user) {
        // Store for after login
        pendingDeepLinkRef.current = { type: "room_invite", payload: token };
        return;
      }

      try {
        // Get invite link info
        const { data: link, error } = await supabase
          .from("room_invite_links")
          .select(
            `
            *,
            room:room_id (id, name, is_active),
            creator:created_by (display_name)
          `,
          )
          .eq("token", token)
          .single();

        if (error || !link) {
          Alert.alert("Invalid Link", "This invite link does not exist or has expired.");
          return;
        }

        // Check validity
        if (!link.room?.is_active) {
          Alert.alert("Room Closed", "This room is no longer active.");
          return;
        }

        if (link.expires_at && new Date(link.expires_at) < new Date()) {
          Alert.alert("Link Expired", "This invite link has expired.");
          return;
        }

        if (link.max_uses !== null && link.use_count >= link.max_uses) {
          Alert.alert("Link Used", "This invite link has reached its maximum uses.");
          return;
        }

        // Check if already in room
        const { data: existingParticipant } = await supabase
          .from("room_participants")
          .select("id")
          .eq("room_id", link.room.id)
          .eq("user_id", user.id)
          .maybeSingle();

        if (existingParticipant) {
          // Already in room, just navigate
          router.push(`/(main)/room/${link.room.id}`);
          return;
        }

        // Confirm join
        Alert.alert(
          "Join Room",
          `You've been invited to join "${link.room.name || "a room"}" by ${link.creator?.display_name || "someone"}. Would you like to join?`,
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Join",
              onPress: async () => {
                try {
                  // Check capacity
                  const { count } = await supabase
                    .from("room_participants")
                    .select("id", { count: "exact", head: true })
                    .eq("room_id", link.room.id);

                  if (count !== null && count >= 10) {
                    Alert.alert("Room Full", "This room has reached its maximum capacity.");
                    return;
                  }

                  // Increment use count
                  await supabase.rpc("increment_invite_link_use", { link_token: token });

                  // Join room
                  await supabase.from("room_participants").insert({
                    room_id: link.room.id,
                    user_id: user.id,
                    is_muted: false,
                  });

                  Alert.alert("Joined!", `You've joined ${link.room.name || "the room"}`);
                  router.push(`/(main)/room/${link.room.id}`);
                } catch (err) {
                  console.error("Error joining room:", err);
                  Alert.alert("Error", "Failed to join room");
                }
              },
            },
          ],
        );
      } catch (err) {
        console.error("Error handling room invite deep link:", err);
      }
    };

    // Handle all deep links
    const handleDeepLink = async (url: string) => {
      const parsed = Linking.parse(url);
      const { queryParams, path } = parsed;

      // Handle OAuth callback (existing logic)
      if (queryParams?.access_token && queryParams?.refresh_token) {
        const { data, error } = await supabase.auth.setSession({
          access_token: queryParams.access_token as string,
          refresh_token: queryParams.refresh_token as string,
        });

        if (data.session?.user) {
          const userId = data.session.user.id;
          let { data: userData, error: userError } = await supabase.from("users").select("*").eq("id", userId).single();

          if (!userData && data.session.user) {
            const { data: newUser } = await supabase
              .from("users")
              .insert({
                id: userId,
                email: data.session.user.email!,
                display_name:
                  data.session.user.user_metadata?.full_name ||
                  data.session.user.user_metadata?.name ||
                  data.session.user.email?.split("@")[0] ||
                  "User",
                avatar_url: data.session.user.user_metadata?.avatar_url || data.session.user.user_metadata?.picture,
                auth_provider: data.session.user.app_metadata?.provider || "google",
                is_online: true,
                mood: "neutral",
                profile_completed: false,
              })
              .select()
              .single();
            userData = newUser;
          }

          if (userData) {
            if (!userData.mood) {
              userData.mood = "neutral";
            }
            setCurrentUser(userData);

            // Execute any pending deep link action
            if (pendingDeepLinkRef.current) {
              const pendingAction = pendingDeepLinkRef.current;
              pendingDeepLinkRef.current = null;

              // Wait a moment for state to settle
              setTimeout(() => {
                if (pendingAction.type === "profile") {
                  handleProfileDeepLink(pendingAction.payload);
                } else if (pendingAction.type === "room_invite") {
                  handleRoomInviteDeepLink(pendingAction.payload);
                }
              }, 500);
            }

            if (userData.profile_completed) {
              router.replace("/(main)");
            } else {
              router.replace("/(auth)/onboarding");
            }
          }
        }
        return;
      }

      // Handle profile link: nuuky://u/{username}
      if (path?.startsWith("u/")) {
        const username = path.substring(2);
        if (username) {
          await handleProfileDeepLink(username);
        }
        return;
      }

      // Handle room invite link: nuuky://r/{token}
      if (path?.startsWith("r/")) {
        const token = path.substring(2);
        if (token) {
          await handleRoomInviteDeepLink(token);
        }
        return;
      }
    };

    const initialize = async () => {
      try {
        // Start network monitoring
        startNetworkMonitor();

        // Initialize LiveKit WebRTC globals (synchronous, shouldn't block)
        initializeLiveKit();

        // Preload mood images at app startup (only once)
        try {
          const images = getAllMoodImages();
          // Add timeout to prevent hanging
          await Promise.race([
            Asset.loadAsync(images),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Asset load timeout')), 5000)),
          ]);
        } catch (_error) {
          // Silently fail preloading - images will load on demand
          console.log('Asset preload failed or timed out, continuing...');
        }

        // Listen for incoming deep links
        const subscription = Linking.addEventListener("url", (event) => {
          handleDeepLink(event.url);
        });

        // Check if app was opened from a deep link (with timeout)
        try {
          const url = await Promise.race([
            Linking.getInitialURL(),
            new Promise<string | null>((resolve) => setTimeout(() => resolve(null), 2000)),
          ]);
          if (url) {
            await handleDeepLink(url);
          }
        } catch (error) {
          console.log('Deep link check failed:', error);
        }

        // Check for existing session on mount (with timeout protection)
        try {
          const sessionPromise = supabase.auth.getSession();
          const {
            data: { session },
          } = await Promise.race([
            sessionPromise,
            new Promise<{ data: { session: null } }>((resolve) =>
              setTimeout(() => resolve({ data: { session: null } }), 5000)
            ),
          ]);

          if (session?.user) {
            // Fetch user profile (with timeout)
            try {
              const userPromise = supabase.from("users").select("*").eq("id", session.user.id).single();
              const { data, error } = await Promise.race([
                userPromise,
                new Promise<{ data: null; error: null }>((resolve) =>
                  setTimeout(() => resolve({ data: null, error: null }), 5000)
                ),
              ]);

              if (data && !error) {
                // Ensure mood defaults to neutral if not set
                if (!data.mood) {
                  data.mood = "neutral";
                }
                setCurrentUser(data);

                // Register for push notifications (non-blocking, don't wait)
                registerForPushNotificationsAsync()
                  .then((pushToken) => {
                    if (pushToken) {
                      savePushTokenToUser(data.id, pushToken).catch((err) =>
                        console.log('Failed to save push token:', err)
                      );
                    }
                  })
                  .catch((err) => console.log('Push notification registration failed:', err));
              }
            } catch (error) {
              console.log('User profile fetch failed:', error);
            }
          }
        } catch (error) {
          console.log('Session check failed:', error);
        }

        // Mark app as ready after initialization (always set, even if some operations failed)
        if (mounted) {
          setIsReady(true);
        }

        return subscription;
      } catch (error) {
        console.error('Initialization error:', error);
        // Always mark as ready even if initialization fails
        if (mounted) {
          setIsReady(true);
        }
        return null;
      }
    };

    // Listen for auth changes
    const {
      data: { subscription: authSubscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        const { data, error } = await supabase.from("users").select("*").eq("id", session.user.id).single();

        if (data && !error) {
          // Ensure mood defaults to neutral if not set
          if (!data.mood) {
            data.mood = "neutral";
          }
          setCurrentUser(data);
          // Note: Navigation handled by index.tsx based on auth state
        }
      } else if (event === "SIGNED_OUT") {
        setCurrentUser(null);
      }
    });

    // Start initialization and get subscription
    let linkingSubscription: ReturnType<typeof Linking.addEventListener> | undefined;
    
    // Fallback timeout: ensure app loads even if initialization hangs
    const fallbackTimeout = setTimeout(() => {
      if (mounted) {
        console.warn('Initialization timeout reached, forcing app ready');
        setIsReady(true);
      }
    }, 10000); // 10 second maximum wait

    initialize()
      .then((subscription) => {
        linkingSubscription = subscription;
        clearTimeout(fallbackTimeout);
      })
      .catch((error) => {
        console.error('Initialization promise rejected:', error);
        clearTimeout(fallbackTimeout);
        if (mounted) {
          setIsReady(true);
        }
      });

    return () => {
      mounted = false;
      linkingSubscription?.remove();
      authSubscription.unsubscribe();
      stopNetworkMonitor();
      clearTimeout(fallbackTimeout);
    };
  }, []);

  // Hide splash screen once layout is ready
  // The main screen may also call hideAsync() for a data-loaded transition,
  // but we must ensure it's called here too for auth/onboarding routes
  useEffect(() => {
    if (isReady) {
      SplashScreen.hideAsync();
    }
  }, [isReady]);

  // Execute pending deep link when user becomes authenticated
  useEffect(() => {
    if (currentUser && pendingDeepLinkRef.current) {
      const pendingAction = pendingDeepLinkRef.current;
      pendingDeepLinkRef.current = null;

      // Wait for navigation to settle
      const timer = setTimeout(async () => {
        if (pendingAction.type === "profile") {
          // Look up user and prompt to add friend
          const { data: targetUser } = await supabase
            .from("users")
            .select("id, username, display_name")
            .eq("username", pendingAction.payload.toLowerCase())
            .single();

          if (targetUser && targetUser.id !== currentUser.id) {
            Alert.alert(
              "Add Friend",
              `Would you like to add ${targetUser.display_name} (@${targetUser.username}) as a friend?`,
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Add Friend",
                  onPress: async () => {
                    try {
                      await supabase.from("friendships").insert([
                        { user_id: currentUser.id, friend_id: targetUser.id, status: "accepted" },
                        { user_id: targetUser.id, friend_id: currentUser.id, status: "accepted" },
                      ]);
                      Alert.alert("Success", `${targetUser.display_name} added as friend!`);
                    } catch (err) {
                      console.error("Error adding friend:", err);
                    }
                  },
                },
              ],
            );
          }
        } else if (pendingAction.type === "room_invite") {
          // Navigate to room after joining via the token
          router.push("/(main)/rooms");
        }
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [currentUser]);

  // Keep splash screen visible while initializing (return null to render nothing)
  if (!isReady || !fontsLoaded) {
    return null;
  }

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <NotificationBannerProvider>
          <NotificationBannerConnector
            onReady={(showNotification) => {
              showNotificationBannerRef.current = showNotification;
            }}
          />
          <ThemedAppShell />
        </NotificationBannerProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
