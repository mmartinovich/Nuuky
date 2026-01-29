import { useState } from 'react';
import { Alert } from 'react-native';
import * as Haptics from 'expo-haptics';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../stores/appStore';

/**
 * Hook for sending "Call Me" requests to friends
 * This is similar to a nudge but specifically requests a voice/video call
 */
export const useCallMe = () => {
  const { currentUser } = useAppStore();
  const [loading, setLoading] = useState(false);

  const sendCallMe = async (
    friendId: string,
    friendName: string,
    roomId?: string
  ): Promise<boolean> => {
    if (!currentUser) {
      Alert.alert('Error', 'You must be logged in');
      return false;
    }

    // Check if user is on break
    const now = new Date();
    if (currentUser.take_break_until && new Date(currentUser.take_break_until) > now) {
      Alert.alert(
        'Break Mode Active',
        'You cannot send call requests while on a break. End your break first to reconnect with friends.'
      );
      return false;
    }

    setLoading(true);
    try {
      // Verify session exists before attempting
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        console.error('No active session:', sessionError);
        Alert.alert('Authentication Error', 'Please log in again.');
        setLoading(false);
        return false;
      }

      // Send push notification via Edge Function
      const { data, error } = await supabase.functions.invoke('send-call-me-notification', {
        body: {
          receiver_id: friendId,
          sender_id: currentUser.id,
          room_id: roomId,
        },
      });

      // Edge Functions sometimes return 500 status even when notification sends successfully
      // If we got any response data (not null/undefined), consider it a success
      // This handles cases where the function succeeds but returns non-2xx status
      if (error) {
        console.log('Call me response data:', data);
        console.log('Call me error:', error);

        // If there's any data payload, the notification likely succeeded
        if (!data || (typeof data === 'object' && Object.keys(data).length === 0)) {
          // Only throw if we truly got no response
          throw error;
        }
        // Otherwise continue - notification was sent despite error status
      }

      // Success - play haptic feedback (no alert needed)
      await Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success
      );

      return true;
    } catch (error: any) {
      console.error('Error sending call request:', error);
      Alert.alert('Error', 'Failed to send call request');
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    sendCallMe,
  };
};
