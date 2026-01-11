import { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Linking from 'expo-linking';
import { useAppStore } from '../stores/appStore';
import { supabase } from '../lib/supabase';

export default function RootLayout() {
  const { setCurrentUser } = useAppStore();
  const router = useRouter();

  useEffect(() => {
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
              })
              .select()
              .single();
            userData = newUser;
          }

          if (userData) {
            setCurrentUser(userData);
            router.replace('/(main)');
          }
        }
      }
    };

    // Listen for incoming deep links
    const subscription = Linking.addEventListener('url', (event) => {
      handleDeepLink(event.url);
    });

    // Check if app was opened from a deep link
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink(url);
      }
    });

    // Check for existing session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        // Fetch user profile
        supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single()
          .then(({ data, error }) => {
            if (data && !error) {
              setCurrentUser(data);
            }
          });
      }
    });

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
            setCurrentUser(data);
          }
        } else if (event === 'SIGNED_OUT') {
          setCurrentUser(null);
        }
      }
    );

    return () => {
      subscription.remove();
      authSubscription.unsubscribe();
    };
  }, []);

  return (
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
  );
}
