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

      // Insert into call_me_requests table for rate limiting
      const { error: callMeError } = await supabase
        .from('call_me_requests')
        .insert({
          sender_id: currentUser.id,
          receiver_id: friendId,
        });

      if (callMeError) {
        if (callMeError.message?.includes('Call-me limit exceeded')) {
          Alert.alert('Limit Reached', 'You can only send 3 call-me requests per friend per day.');
          return false;
        }
        throw callMeError;
      }

      // Send push notification via Edge Function
      const { data, error } = await supabase.functions.invoke('send-call-me-notification', {
        body: {
          receiver_id: friendId,
          sender_id: currentUser.id,
          room_id: roomId,
        },
      });

      console.log('[CallMe] Response data:', data);
      if (error) {
        console.warn('[CallMe] Edge function returned error:', error);
      }

      // Edge Functions may return error status even when notification is created in DB
      // Check if notification was actually sent by looking at the response
      const notificationSent = data?.sent !== false; // Treat undefined/true as success

      if (!notificationSent && error) {
        // Only fail if explicitly marked as failed AND there's an error
        console.error('[CallMe] Failed to send notification');
        throw new Error('Failed to send call request');
      }

      // Success - play haptic feedback (no alert needed)
      await Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success
      );

      return true;
    } catch (error: any) {
      console.error('[CallMe] Error sending call request:', error);
      Alert.alert('Error', error?.message || 'Failed to send call request');
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
