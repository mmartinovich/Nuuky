import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../stores/appStore';
import { User } from '../types';
import { registerForPushNotificationsAsync, savePushTokenToUser } from '../lib/notifications';

export const useAuth = () => {
  const { currentUser, isAuthenticated, setCurrentUser, logout } = useAppStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    checkSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          await fetchUserProfile(session.user.id);
        } else if (event === 'SIGNED_OUT') {
          logout();
        }
        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const checkSession = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await fetchUserProfile(session.user.id);
      }
    } catch (error) {
      console.error('Error checking session:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      let { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      // If user doesn't exist, create profile (fallback if trigger doesn't work)
      if (error && error.code === 'PGRST116' && user) {
        const { data: newUser } = await supabase
          .from('users')
          .insert({
            id: userId,
            email: user.email!,
            display_name: user.user_metadata?.full_name ||
                          user.user_metadata?.name ||
                          user.email?.split('@')[0] ||
                          'User',
            avatar_url: user.user_metadata?.avatar_url ||
                        user.user_metadata?.picture,
            auth_provider: user.app_metadata?.provider || 'google',
            is_online: true,
          })
          .select()
          .single();
        data = newUser;
      }

      if (data) {
        // Preserve local mood if it exists (for mock mode)
        const userProfile = data as User;
        const existingUser = useAppStore.getState().currentUser;
        if (existingUser?.mood) {
          userProfile.mood = existingUser.mood;
        }
        setCurrentUser(userProfile);
        // Update online status
        await updateOnlineStatus(true);
        // Register for push notifications
        await registerPushNotifications(userId);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const updateOnlineStatus = async (isOnline: boolean) => {
    if (!currentUser) return;

    try {
      await supabase
        .from('users')
        .update({
          is_online: isOnline,
          last_seen_at: new Date().toISOString(),
        })
        .eq('id', currentUser.id);
    } catch (error) {
      console.error('Error updating online status:', error);
    }
  };

  const registerPushNotifications = async (userId: string) => {
    try {
      const token = await registerForPushNotificationsAsync();
      if (token) {
        await savePushTokenToUser(userId, token);
      }
    } catch (error) {
      console.error('Error registering push notifications:', error);
    }
  };

  const signOut = async () => {
    try {
      // Update online status before signing out
      await updateOnlineStatus(false);
      await supabase.auth.signOut();
      logout();
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  };

  return {
    user: currentUser,
    isAuthenticated,
    loading,
    signOut,
    updateOnlineStatus,
  };
};
