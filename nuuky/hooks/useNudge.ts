import { useState } from 'react';
import { Alert } from 'react-native';
import * as Haptics from 'expo-haptics';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../stores/appStore';

// MOCK MODE FLAG - should match useRoom.ts
const USE_MOCK_DATA = true;

export const useNudge = () => {
  const { currentUser } = useAppStore();
  const [loading, setLoading] = useState(false);

  const sendNudge = async (friendId: string, friendName: string): Promise<boolean> => {
    if (!currentUser) {
      Alert.alert('Error', 'You must be logged in');
      return false;
    }

    // Check if user is on break
    const now = new Date();
    if (currentUser.take_break_until && new Date(currentUser.take_break_until) > now) {
      Alert.alert(
        'Break Mode Active',
        'You cannot send nudges while on a break. End your break first to reconnect with friends.'
      );
      return false;
    }

    // MOCK MODE: Skip Supabase query, just show success
    if (USE_MOCK_DATA) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        'Nudge Sent! 👋',
        `${friendName} will feel a gentle vibration`,
        [{ text: 'OK', style: 'default' }]
      );
      return true;
    }

    setLoading(true);
    try {
      // Verify session exists before attempting insert
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        console.error('No active session:', sessionError);
        Alert.alert('Authentication Error', 'Please log in again to send nudges.');
        setLoading(false);
        return false;
      }

      // Try to insert the nudge - the database trigger will check rate limits
      const { error } = await supabase
        .from('nudges')
        .insert({
          sender_id: currentUser.id,
          receiver_id: friendId,
        });

      if (error) {
        console.error('Nudge insert error details:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
          userId: currentUser.id,
          sessionUserId: session.user.id,
        });

        // Check if it's a rate limit error
        if (error.message.includes('Nudge limit exceeded')) {
          Alert.alert(
            'Limit Reached',
            `You can only send 3 nudges per friend per day. Try again tomorrow!`
          );
        } else {
          throw error;
        }
        return false;
      }

      // Send push notification via Edge Function
      // (session already verified above)
      try {
        await supabase.functions.invoke('send-nudge-notification', {
          body: {
            receiver_id: friendId,
            sender_id: currentUser.id,
          },
        });
      } catch (notifError) {
        console.error('Failed to send notification:', notifError);
        // Don't fail the nudge if notification fails
      }

      // Success - play haptic feedback
      await Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success
      );

      Alert.alert(
        'Nudge Sent! 👋',
        `${friendName} will feel a gentle vibration`,
        [{ text: 'OK', style: 'default' }]
      );

      return true;
    } catch (error: any) {
      console.error('Error sending nudge:', error);
      Alert.alert('Error', 'Failed to send nudge');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const receiveNudge = async () => {
    // Play gentle haptic feedback for receiving a nudge
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  return {
    loading,
    sendNudge,
    receiveNudge,
  };
};
