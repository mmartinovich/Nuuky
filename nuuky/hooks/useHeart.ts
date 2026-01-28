import { useState } from 'react';
import { Alert } from 'react-native';
import * as Haptics from 'expo-haptics';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../stores/appStore';

export const useHeart = () => {
  const { currentUser } = useAppStore();
  const [loading, setLoading] = useState(false);

  const sendHeart = async (friendId: string, friendName: string): Promise<boolean> => {
    if (!currentUser) {
      Alert.alert('Error', 'You must be logged in');
      return false;
    }

    setLoading(true);
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        console.error('No active session:', sessionError);
        Alert.alert('Authentication Error', 'Please log in again.');
        setLoading(false);
        return false;
      }

      // Send push notification via Edge Function
      try {
        await supabase.functions.invoke('send-heart-notification', {
          body: {
            receiver_id: friendId,
            sender_id: currentUser.id,
          },
        });
      } catch (notifError) {
        console.error('Failed to send heart notification:', notifError);
      }

      await Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success
      );

      return true;
    } catch (error: any) {
      console.error('Error sending heart:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    sendHeart,
  };
};
