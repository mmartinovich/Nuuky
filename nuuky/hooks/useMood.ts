import { useState } from 'react';
import { Alert } from 'react-native';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../stores/appStore';
import { User } from '../types';

// MOCK MODE FLAG - should match useRoom.ts
const USE_MOCK_DATA = true;

export const useMood = () => {
  const { currentUser, updateUserMood } = useAppStore();
  const [loading, setLoading] = useState(false);

  const changeMood = async (mood: User['mood']): Promise<boolean> => {
    if (!currentUser) {
      Alert.alert('Error', 'You must be logged in');
      return false;
    }

    // MOCK MODE: Skip Supabase query, just update local state
    if (USE_MOCK_DATA) {
      updateUserMood(mood);
      return true;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({ mood })
        .eq('id', currentUser.id);

      if (error) throw error;

      // Update local state
      updateUserMood(mood);

      return true;
    } catch (error: any) {
      console.error('Error updating mood:', error);
      Alert.alert('Error', 'Failed to update mood');
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    currentMood: currentUser?.mood || 'neutral',
    loading,
    changeMood,
  };
};
