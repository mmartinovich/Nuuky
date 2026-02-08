import { logger } from '../lib/logger';
import { useState } from 'react';
import { Alert } from 'react-native';
import * as Haptics from 'expo-haptics';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../stores/appStore';

export const useHeart = () => {
  const currentUser = useAppStore((s) => s.currentUser);
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
        logger.error('No active session:', sessionError);
        Alert.alert('Authentication Error', 'Please log in again.');
        setLoading(false);
        return false;
      }

      // Insert into hearts table for rate limiting
      const { error: heartError } = await supabase
        .from('hearts')
        .insert({
          sender_id: currentUser.id,
          receiver_id: friendId,
        });

      if (heartError) {
        if (heartError.message?.includes('Heart limit exceeded')) {
          Alert.alert('Limit Reached', 'You can only send 10 hearts per friend per day.');
          return false;
        }
        throw heartError;
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
        logger.error('Failed to send heart notification:', notifError);
      }

      await Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success
      );

      return true;
    } catch (error: any) {
      logger.error('Error sending heart:', error);
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
