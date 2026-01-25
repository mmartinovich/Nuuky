import { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../stores/appStore';
import { CustomMood } from '../types';

// MOCK MODE FLAG - should match other hooks
const USE_MOCK_DATA = false;

export const useCustomMood = () => {
  const {
    currentUser,
    customMoods,
    setCustomMoods,
    addCustomMood: addCustomMoodToStore,
    deleteCustomMood: deleteCustomMoodFromStore,
    setActiveCustomMood,
  } = useAppStore();
  const [loading, setLoading] = useState(false);

  // Fetch user's custom moods from database
  const fetchCustomMoods = async (): Promise<CustomMood[]> => {
    if (!currentUser) {
      console.log('[useCustomMood] No current user');
      return [];
    }

    // MOCK MODE: Return empty array
    if (USE_MOCK_DATA) {
      console.log('[useCustomMood] Mock mode: returning empty custom moods');
      return [];
    }

    try {
      const { data, error } = await supabase
        .from('custom_moods')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('last_used_at', { ascending: false });

      if (error) throw error;

      const moods = data as CustomMood[];
      setCustomMoods(moods);
      return moods;
    } catch (error: any) {
      console.error('Error fetching custom moods:', error);
      return [];
    }
  };

  // Create new custom mood
  const createCustomMood = async (
    emoji: string,
    text: string,
    color: string = '#3B82F6'
  ): Promise<CustomMood | null> => {
    if (!currentUser) {
      Alert.alert('Error', 'You must be logged in');
      return null;
    }

    // Validate emoji (already cleaned by CustomMoodEditor)
    if (!emoji || emoji.trim().length === 0) {
      Alert.alert('Missing Emoji', 'Please select an emoji');
      return null;
    }

    // Validate text (already cleaned by CustomMoodEditor)
    if (!text || text.trim().length < 1) {
      Alert.alert('Missing Message', 'Please add a status message');
      return null;
    }

    if (text.length > 50) {
      Alert.alert('Message Too Long', 'Status message must be 50 characters or less');
      return null;
    }

    // Check 1-mood limit (client-side check)
    if (customMoods.length >= 1) {
      Alert.alert(
        'Mood Limit Reached',
        'You can only have 1 custom mood. Delete your current one to create another.'
      );
      return null;
    }

    // MOCK MODE: Create mock custom mood
    if (USE_MOCK_DATA) {
      const mockMood: CustomMood = {
        id: `mock-${Date.now()}`,
        user_id: currentUser.id,
        emoji,
        text,
        color,
        created_at: new Date().toISOString(),
        last_used_at: new Date().toISOString(),
      };
      addCustomMoodToStore(mockMood);
      return mockMood;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('custom_moods')
        .insert({
          user_id: currentUser.id,
          emoji,
          text,
          color,
        })
        .select()
        .single();

      if (error) {
        // Check if error is due to 1-mood limit
        if (error.message.includes('Maximum 1 custom mood')) {
          Alert.alert(
            'Mood Limit Reached',
            'You can only have 1 custom mood. Delete your current one to create another.'
          );
        } else {
          throw error;
        }
        return null;
      }

      const newMood = data as CustomMood;
      addCustomMoodToStore(newMood);
      // Automatically set as active since we only allow 1 custom mood
      setActiveCustomMood(newMood);
      return newMood;
    } catch (error: any) {
      console.error('Error creating custom mood:', error);
      Alert.alert('Error', 'Failed to save custom mood. Try again.');
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Use a custom mood (sets custom_mood_id on user, clears preset mood)
  const selectCustomMood = async (customMoodId: string): Promise<boolean> => {
    if (!currentUser) {
      Alert.alert('Error', 'You must be logged in');
      return false;
    }

    // Find the custom mood
    const customMood = customMoods.find(mood => mood.id === customMoodId);
    if (!customMood) {
      Alert.alert('Error', 'Custom mood not found');
      return false;
    }

    // MOCK MODE: Just update local state
    if (USE_MOCK_DATA) {
      setActiveCustomMood(customMood);
      return true;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({
          custom_mood_id: customMoodId,
          mood: 'neutral', // Set preset mood to neutral as fallback
        })
        .eq('id', currentUser.id);

      if (error) throw error;

      // Update local state
      setActiveCustomMood(customMood);
      return true;
    } catch (error: any) {
      console.error('Error selecting custom mood:', error);
      Alert.alert('Error', 'Failed to set custom mood');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Delete custom mood
  const deleteCustomMood = async (customMoodId: string): Promise<boolean> => {
    if (!currentUser) {
      Alert.alert('Error', 'You must be logged in');
      return false;
    }

    // MOCK MODE: Just remove from local state
    if (USE_MOCK_DATA) {
      deleteCustomMoodFromStore(customMoodId);
      // If this was the active custom mood, clear it and set to neutral
      if (currentUser.custom_mood_id === customMoodId) {
        setActiveCustomMood(null);
      }
      return true;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('custom_moods')
        .delete()
        .eq('id', customMoodId)
        .eq('user_id', currentUser.id);

      if (error) throw error;

      // Remove from local state
      deleteCustomMoodFromStore(customMoodId);

      // If this was the active custom mood, clear it and set to neutral
      if (currentUser.custom_mood_id === customMoodId) {
        await supabase
          .from('users')
          .update({
            custom_mood_id: null,
            mood: 'neutral',
          })
          .eq('id', currentUser.id);

        setActiveCustomMood(null);
        Alert.alert('Custom mood deleted', 'Mood set to Neutral.');
      }

      return true;
    } catch (error: any) {
      console.error('Error deleting custom mood:', error);
      Alert.alert('Error', 'Failed to delete custom mood');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Load custom moods on mount
  useEffect(() => {
    if (currentUser) {
      fetchCustomMoods();
    }
  }, [currentUser?.id]);

  return {
    customMoods,
    loading,
    createCustomMood,
    selectCustomMood,
    deleteCustomMood,
    fetchCustomMoods,
  };
};
