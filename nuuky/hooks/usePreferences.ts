import { logger } from '../lib/logger';
import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../stores/appStore';
import { UserPreferences } from '../types';

export const usePreferences = () => {
  const { currentUser } = useAppStore();
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(true);

  // Load preferences on mount and when user changes
  useEffect(() => {
    if (currentUser) {
      loadPreferences();
    } else {
      setPreferences(null);
      setLoading(false);
    }
  }, [currentUser?.id]);

  const loadPreferences = async () => {
    if (!currentUser) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', currentUser.id)
        .single();

      if (error) {
        // If no preferences exist, create default ones using upsert to handle race
        if (error.code === 'PGRST116') {
          const { data: newPrefs, error: createError } = await supabase
            .from('user_preferences')
            .upsert({ user_id: currentUser.id }, { onConflict: 'user_id' })
            .select()
            .single();

          if (createError) throw createError;
          setPreferences(newPrefs);
        } else {
          throw error;
        }
      } else {
        setPreferences(data);
      }
    } catch (error: any) {
      logger.error('Error loading preferences:', error);
      // Set default preferences locally if loading fails
      setPreferences({
        id: '',
        user_id: currentUser.id,
        nudges_enabled: true,
        flares_enabled: true,
        room_invites_enabled: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    } finally {
      setLoading(false);
    }
  };

  const updatePreference = useCallback(async (
    key: 'nudges_enabled' | 'flares_enabled' | 'room_invites_enabled',
    value: boolean
  ): Promise<boolean> => {
    if (!currentUser || !preferences) return false;

    // Optimistic update
    const previousPreferences = preferences;
    setPreferences({ ...preferences, [key]: value });

    try {
      const { error } = await supabase
        .from('user_preferences')
        .update({ [key]: value, updated_at: new Date().toISOString() })
        .eq('user_id', currentUser.id);

      if (error) throw error;
      return true;
    } catch (error: any) {
      logger.error('Error updating preference:', error);
      // Revert optimistic update on failure
      setPreferences(previousPreferences);
      Alert.alert('Error', 'Failed to update preference. Please try again.');
      return false;
    }
  }, [currentUser, preferences]);

  const toggleNudges = useCallback(async (): Promise<boolean> => {
    if (!preferences) return false;
    return updatePreference('nudges_enabled', !preferences.nudges_enabled);
  }, [preferences, updatePreference]);

  const toggleFlares = useCallback(async (): Promise<boolean> => {
    if (!preferences) return false;
    return updatePreference('flares_enabled', !preferences.flares_enabled);
  }, [preferences, updatePreference]);

  const toggleRoomInvites = useCallback(async (): Promise<boolean> => {
    if (!preferences) return false;
    return updatePreference('room_invites_enabled', !preferences.room_invites_enabled);
  }, [preferences, updatePreference]);

  return {
    preferences,
    loading,
    nudgesEnabled: preferences?.nudges_enabled ?? true,
    flaresEnabled: preferences?.flares_enabled ?? true,
    roomInvitesEnabled: preferences?.room_invites_enabled ?? true,
    toggleNudges,
    toggleFlares,
    toggleRoomInvites,
    refreshPreferences: loadPreferences,
  };
};
