import { useEffect, useState, useRef } from "react";
import { Alert } from "react-native";
import { Stack, useRouter } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import * as Linking from "expo-linking";
import * as SplashScreen from "expo-splash-screen";
import { Asset } from "expo-asset";
import { useAppStore } from "../stores/appStore";
import { supabase } from "../lib/supabase";
import { ThemeProvider } from "../context/ThemeContext";
import { initializeLiveKit } from "../lib/livekit";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { getAllMoodImages } from "../lib/theme";
import {
  registerForPushNotificationsAsync,
  savePushTokenToUser,
  setupNotificationListeners,
} from "../lib/notifications";

// Type for pending deep link actions (to execute after login)
interface PendingDeepLinkAction {
  type: "profile" | "room_invite";
  payload: string; // username or token
}

// Keep the splash screen visible while we initialize
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { currentUser, setCurrentUser } = useAppStore();
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);
  const notificationCleanupRef = useRef<(() => void) | null>(null);
  const pendingDeepLinkRef = useRef<PendingDeepLinkAction | null>(null);

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
        console.log("Notification received:", notification.request.content);
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
      // Initialize LiveKit WebRTC globals
      initializeLiveKit();

      // Preload mood images at app startup (only once)
      try {
        const images = getAllMoodImages();
        await Asset.loadAsync(images);
      } catch (_error) {
        // Silently fail preloading - images will load on demand
      }

      // Listen for incoming deep links
      const subscription = Linking.addEventListener("url", (event) => {
        handleDeepLink(event.url);
      });

      // Check if app was opened from a deep link
      const url = await Linking.getInitialURL();
      if (url) {
        await handleDeepLink(url);
      }

      // Check for existing session on mount
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user) {
        // Fetch user profile
        const { data, error } = await supabase.from("users").select("*").eq("id", session.user.id).single();

        if (data && !error) {
          // Ensure mood defaults to neutral if not set
          if (!data.mood) {
            data.mood = "neutral";
          }
          setCurrentUser(data);

          // Register for push notifications
          const pushToken = await registerForPushNotificationsAsync();
          if (pushToken) {
            await savePushTokenToUser(data.id, pushToken);
          }
          // Note: Navigation handled by index.tsx based on auth state
        }
      }

      // Mark app as ready after initialization
      if (mounted) {
        setIsReady(true);
      }

      return subscription;
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
    initialize().then((subscription) => {
      linkingSubscription = subscription;
    });

    return () => {
      mounted = false;
      linkingSubscription?.remove();
      authSubscription.unsubscribe();
    };
  }, []);

  // Hide splash screen when app is ready
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
  if (!isReady) {
    return null;
  }

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <Stack
            screenOptions={{
              headerShown: false,
            }}
          >
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(main)" />
          </Stack>
        </GestureHandlerRootView>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
