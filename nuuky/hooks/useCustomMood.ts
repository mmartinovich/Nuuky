import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../stores/appStore';
import { CustomMood } from '../types';
import { logger } from '../lib/logger';

// MOCK MODE FLAG - should match other hooks
const USE_MOCK_DATA = false;

export const useCustomMood = () => {
  const currentUser = useAppStore((s) => s.currentUser);
  const customMoods = useAppStore((s) => s.customMoods);
  const setCustomMoods = useAppStore((s) => s.setCustomMoods);
  const addCustomMoodToStore = useAppStore((s) => s.addCustomMood);
  const deleteCustomMoodFromStore = useAppStore((s) => s.deleteCustomMood);
  const setActiveCustomMood = useAppStore((s) => s.setActiveCustomMood);
  const [loading, setLoading] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);

  // Fetch user's custom moods from database
  const fetchCustomMoods = async (): Promise<CustomMood[]> => {
    if (!currentUser) {
      return [];
    }

    // MOCK MODE: Return empty array
    if (USE_MOCK_DATA) {
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
    } catch (_error: any) {
      return [];
    }
  };

  // Upload an image to storage and return the public URL
  const uploadMoodImage = useCallback(async (imageUri: string): Promise<string | null> => {
    if (!currentUser) return null;

    try {
      const fileName = `${currentUser.id}/custom-moods/${Date.now()}.jpg`;

      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session) {
        throw new Error('Session expired - please log in again');
      }

      const formData = new FormData();
      formData.append('file', {
        uri: imageUri,
        name: `${Date.now()}.jpg`,
        type: 'image/jpeg',
      } as any);

      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const accessToken = sessionData.session.access_token;

      const uploadResponse = await fetch(
        `${supabaseUrl}/storage/v1/object/mood-selfies/${fileName}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'x-upsert': 'true',
          },
          body: formData,
        }
      );

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        throw new Error(`Upload failed: ${uploadResponse.status} - ${errorText}`);
      }

      const { data: urlData } = supabase.storage
        .from('mood-selfies')
        .getPublicUrl(fileName);

      return urlData.publicUrl;
    } catch (error: any) {
      logger.error('Error uploading mood image:', error);
      Alert.alert('Error', `Failed to upload image: ${error?.message || 'Unknown error'}`);
      return null;
    }
  }, [currentUser]);

  // Delete the image from storage and clear image_url on the custom mood row
  const deleteMoodImage = useCallback(async (customMoodId: string): Promise<boolean> => {
    if (!currentUser) return false;

    try {
      const mood = customMoods.find(m => m.id === customMoodId);
      if (!mood?.image_url) return true; // Nothing to delete

      // Extract file path from URL
      const url = new URL(mood.image_url);
      const pathParts = url.pathname.split('/');
      // Path is: {user_id}/custom-moods/{filename}.jpg (3 parts from end)
      const filePath = pathParts.slice(-3).join('/');

      // Delete from storage
      await supabase.storage
        .from('mood-selfies')
        .remove([filePath]);

      // Clear image_url on the custom mood row
      const { error } = await supabase
        .from('custom_moods')
        .update({ image_url: null })
        .eq('id', customMoodId)
        .eq('user_id', currentUser.id);

      if (error) throw error;

      // Update local state
      const updatedMood = { ...mood, image_url: undefined };
      const updatedMoods = customMoods.map(m => m.id === customMoodId ? updatedMood : m);
      setCustomMoods(updatedMoods);

      // Update active custom mood if it's the one being modified
      const activeCustomMood = useAppStore.getState().activeCustomMood;
      if (activeCustomMood?.id === customMoodId) {
        setActiveCustomMood(updatedMood);
      }

      return true;
    } catch (error: any) {
      logger.error('Error deleting mood image:', error);
      Alert.alert('Error', 'Failed to delete image');
      return false;
    }
  }, [currentUser, customMoods, setCustomMoods, setActiveCustomMood]);

  // Capture a photo from camera for custom mood (returns uploaded URL)
  const captureMoodImage = useCallback(async (): Promise<string | null> => {
    if (!currentUser) {
      Alert.alert('Error', 'You must be logged in');
      return null;
    }

    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'Please allow access to your camera in settings.');
        return null;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
        cameraType: ImagePicker.CameraType.front,
      });

      if (result.canceled) return null;

      setImageLoading(true);
      const imageUrl = await uploadMoodImage(result.assets[0].uri);
      return imageUrl;
    } catch (error: any) {
      logger.error('Error capturing mood image:', error);
      Alert.alert('Error', `Failed to capture image: ${error?.message || 'Unknown error'}`);
      return null;
    } finally {
      setImageLoading(false);
    }
  }, [currentUser, uploadMoodImage]);

  // Pick a photo from library for custom mood (returns uploaded URL)
  const pickMoodImage = useCallback(async (): Promise<string | null> => {
    if (!currentUser) {
      Alert.alert('Error', 'You must be logged in');
      return null;
    }

    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'Please allow access to your photo library in settings.');
        return null;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      if (result.canceled) return null;

      setImageLoading(true);
      const imageUrl = await uploadMoodImage(result.assets[0].uri);
      return imageUrl;
    } catch (error: any) {
      logger.error('Error picking mood image:', error);
      Alert.alert('Error', `Failed to pick image: ${error?.message || 'Unknown error'}`);
      return null;
    } finally {
      setImageLoading(false);
    }
  }, [currentUser, uploadMoodImage]);

  // Create new custom mood
  const createCustomMood = async (
    emoji: string,
    text: string,
    color: string = '#3B82F6',
    imageUrl?: string
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

    if (text && text.length > 50) {
      Alert.alert('Message Too Long', 'Status message must be 50 characters or less');
      return null;
    }

    // If user already has a custom mood, delete it first (replace behavior)
    if (customMoods.length >= 1) {
      const existing = customMoods[0];
      try {
        // Delete old mood image from storage if it exists and isn't being reused
        if (existing.image_url && existing.image_url !== imageUrl) {
          try {
            const url = new URL(existing.image_url);
            const pathParts = url.pathname.split('/');
            const filePath = pathParts.slice(-3).join('/');
            await supabase.storage.from('mood-selfies').remove([filePath]);
          } catch (_e) {
            // Continue even if storage delete fails
          }
        }
        await supabase
          .from('custom_moods')
          .delete()
          .eq('id', existing.id)
          .eq('user_id', currentUser.id);
        deleteCustomMoodFromStore(existing.id);
      } catch (_err) {
        // Continue anyway, DB trigger will handle the limit
      }
    }

    // MOCK MODE: Create mock custom mood
    if (USE_MOCK_DATA) {
      const mockMood: CustomMood = {
        id: `mock-${Date.now()}`,
        user_id: currentUser.id,
        emoji,
        text,
        color,
        image_url: imageUrl,
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
          text: text || '',
          color,
          image_url: imageUrl || null,
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      const newMood = data as CustomMood;
      addCustomMoodToStore(newMood);
      // Automatically set as active since we only allow 1 custom mood
      setActiveCustomMood(newMood);
      return newMood;
    } catch (_error: any) {
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
    } catch (_error: any) {
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
      // Delete mood image from storage if it exists
      const mood = customMoods.find(m => m.id === customMoodId);
      if (mood?.image_url) {
        try {
          const url = new URL(mood.image_url);
          const pathParts = url.pathname.split('/');
          const filePath = pathParts.slice(-3).join('/');
          await supabase.storage.from('mood-selfies').remove([filePath]);
        } catch (_e) {
          // Continue even if storage delete fails
        }
      }

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
    } catch (_error: any) {
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
    imageLoading,
    createCustomMood,
    selectCustomMood,
    deleteCustomMood,
    fetchCustomMoods,
    captureMoodImage,
    pickMoodImage,
    deleteMoodImage,
  };
};
