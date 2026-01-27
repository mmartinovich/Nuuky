import { useEffect, useState, useRef } from 'react';
import { Stack, useRouter } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Linking from 'expo-linking';
import * as SplashScreen from 'expo-splash-screen';
import { Asset } from 'expo-asset';
import { useAppStore } from '../stores/appStore';
import { supabase } from '../lib/supabase';
import { ThemeProvider } from '../context/ThemeContext';
import { initializeLiveKit } from '../lib/livekit';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { getAllMoodImages } from '../lib/theme';
import {
  registerForPushNotificationsAsync,
  savePushTokenToUser,
  setupNotificationListeners,
} from '../lib/notifications';

// Keep the splash screen visible while we initialize
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { setCurrentUser } = useAppStore();
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);
  const notificationCleanupRef = useRef<(() => void) | null>(null);

  // Handle notification tap navigation
  const handleNotificationNavigation = (data: any) => {
    const type = data?.type;

    switch (type) {
      case 'nudge':
      case 'flare':
        router.push('/(main)');
        break;
      case 'friend_request':
      case 'friend_accepted':
        router.push('/(main)/friends');
        break;
      case 'room_invite':
      case 'call_me':
        // Both room invites and call requests go to rooms
        router.push('/(main)/rooms');
        break;
      default:
        router.push('/(main)/notifications');
    }
  };

  // Setup notification listeners
  useEffect(() => {
    const cleanup = setupNotificationListeners(
      // On notification received (foreground)
      (notification) => {
        console.log('Notification received:', notification.request.content);
      },
      // On notification response (tap)
      (response) => {
        const data = response.notification.request.content.data;
        handleNotificationNavigation(data);
      }
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

    // Handle deep links for OAuth callback
    const handleDeepLink = async (url: string) => {
      const { queryParams } = Linking.parse(url);

      if (queryParams?.access_token && queryParams?.refresh_token) {
        // Set session from OAuth callback
        const { data, error } = await supabase.auth.setSession({
          access_token: queryParams.access_token as string,
          refresh_token: queryParams.refresh_token as string,
        });

        if (data.session?.user) {
          // Fetch or create user profile
          const userId = data.session.user.id;
          let { data: userData, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .single();

          if (!userData && data.session.user) {
            // Create profile for OAuth user
            const { data: newUser } = await supabase
              .from('users')
              .insert({
                id: userId,
                email: data.session.user.email!,
                display_name: data.session.user.user_metadata?.full_name ||
                              data.session.user.user_metadata?.name ||
                              data.session.user.email?.split('@')[0] ||
                              'User',
                avatar_url: data.session.user.user_metadata?.avatar_url ||
                            data.session.user.user_metadata?.picture,
                auth_provider: data.session.user.app_metadata?.provider || 'google',
                is_online: true,
                mood: 'neutral',
                profile_completed: false,  // New users need onboarding
              })
              .select()
              .single();
            userData = newUser;
          }

          if (userData) {
            // Ensure mood defaults to neutral if not set
            if (!userData.mood) {
              userData.mood = 'neutral';
            }
            setCurrentUser(userData);
            // Redirect based on profile completion status
            if (userData.profile_completed) {
              router.replace('/(main)');
            } else {
              router.replace('/(auth)/onboarding');
            }
          }
        }
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
      const subscription = Linking.addEventListener('url', (event) => {
        handleDeepLink(event.url);
      });

      // Check if app was opened from a deep link
      const url = await Linking.getInitialURL();
      if (url) {
        await handleDeepLink(url);
      }

      // Check for existing session on mount
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        // Fetch user profile
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (data && !error) {
          // Ensure mood defaults to neutral if not set
          if (!data.mood) {
            data.mood = 'neutral';
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
    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (data && !error) {
            // Ensure mood defaults to neutral if not set
            if (!data.mood) {
              data.mood = 'neutral';
            }
            setCurrentUser(data);
            // Note: Navigation handled by index.tsx based on auth state
          }
        } else if (event === 'SIGNED_OUT') {
          setCurrentUser(null);
        }
      }
    );

    // Start initialization and get subscription
    let linkingSubscription: ReturnType<typeof Linking.addEventListener> | undefined;
    initialize().then(subscription => {
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
