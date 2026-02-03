import { useState, useCallback, useMemo } from 'react';
import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../stores/appStore';
import { MoodSelfie } from '../types';
import { logger } from '../lib/logger';

export const useMoodSelfie = () => {
  const currentUser = useAppStore((state) => state.currentUser);
  const setCurrentUser = useAppStore((state) => state.setCurrentUser);
  const [loading, setLoading] = useState(false);
  const [activeSelfie, setActiveSelfie] = useState<MoodSelfie | null>(null);

  const isExpired = useMemo(() => {
    if (!activeSelfie) return true;
    return new Date(activeSelfie.expires_at) <= new Date();
  }, [activeSelfie]);

  const getTimeRemaining = useCallback(() => {
    if (!activeSelfie || isExpired) return { hours: 0, minutes: 0 };

    const now = new Date();
    const expiresAt = new Date(activeSelfie.expires_at);
    const diffMs = expiresAt.getTime() - now.getTime();

    if (diffMs <= 0) return { hours: 0, minutes: 0 };

    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    return { hours, minutes };
  }, [activeSelfie, isExpired]);

  const fetchActiveSelfie = useCallback(async () => {
    if (!currentUser) return null;

    try {
      const { data, error } = await supabase
        .from('mood_selfies')
        .select('*')
        .eq('user_id', currentUser.id)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
        throw error;
      }

      setActiveSelfie(data || null);
      return data || null;
    } catch (error: any) {
      logger.error('Error fetching mood selfie:', error);
      return null;
    }
  }, [currentUser]);

  const captureSelfie = useCallback(async (): Promise<boolean> => {
    if (!currentUser) {
      Alert.alert('Error', 'You must be logged in');
      return false;
    }

    try {
      // Request camera permission
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert(
          'Permission Required',
          'Please allow access to your camera in settings.'
        );
        return false;
      }

      // Launch front-facing camera with compression
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7, // Compress to ~70% quality for smaller file size
        cameraType: ImagePicker.CameraType.front,
      });

      if (result.canceled) {
        return false;
      }

      setLoading(true);
      const imageUri = result.assets[0].uri;

      // Check if file exists
      const fileInfo = await FileSystem.getInfoAsync(imageUri);
      if (!fileInfo.exists) {
        throw new Error('Captured image file not found');
      }

      // Create file path
      const fileName = `${currentUser.id}/${Date.now()}.jpg`;

      // Verify auth session
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session) {
        throw new Error('Session expired - please log in again');
      }

      // Upload using FormData
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

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('mood-selfies')
        .getPublicUrl(fileName);

      const imageUrl = urlData.publicUrl;

      // Delete any existing selfie first (the unique constraint ensures only one per user)
      await supabase
        .from('mood_selfies')
        .delete()
        .eq('user_id', currentUser.id);

      // Insert new selfie record
      const { data: selfieData, error: insertError } = await supabase
        .from('mood_selfies')
        .insert({
          user_id: currentUser.id,
          image_url: imageUrl,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      setActiveSelfie(selfieData);

      // Update current user with new selfie
      const freshUser = useAppStore.getState().currentUser;
      if (freshUser) {
        setCurrentUser({
          ...freshUser,
          mood_selfie_id: selfieData.id,
          mood_selfie: selfieData,
        });
      }

      return true;
    } catch (error: any) {
      logger.error('Error capturing mood selfie:', error);
      Alert.alert('Error', `Failed to capture selfie: ${error?.message || 'Unknown error'}`);
      return false;
    } finally {
      setLoading(false);
    }
  }, [currentUser, setCurrentUser]);

  const deleteSelfie = useCallback(async (): Promise<boolean> => {
    if (!currentUser || !activeSelfie) {
      return false;
    }

    setLoading(true);
    try {
      // Extract file path from URL
      const url = new URL(activeSelfie.image_url);
      const pathParts = url.pathname.split('/');
      const filePath = pathParts.slice(-2).join('/'); // Get user_id/filename.jpg

      // Delete from storage
      await supabase.storage
        .from('mood-selfies')
        .remove([filePath]);

      // Delete from database (trigger will clear user's mood_selfie_id)
      const { error } = await supabase
        .from('mood_selfies')
        .delete()
        .eq('id', activeSelfie.id);

      if (error) throw error;

      setActiveSelfie(null);

      // Update current user
      const freshUser = useAppStore.getState().currentUser;
      if (freshUser) {
        setCurrentUser({
          ...freshUser,
          mood_selfie_id: undefined,
          mood_selfie: undefined,
        });
      }

      return true;
    } catch (error: any) {
      logger.error('Error deleting mood selfie:', error);
      Alert.alert('Error', 'Failed to delete selfie');
      return false;
    } finally {
      setLoading(false);
    }
  }, [currentUser, activeSelfie, setCurrentUser]);

  return {
    loading,
    activeSelfie,
    isExpired,
    captureSelfie,
    deleteSelfie,
    fetchActiveSelfie,
    getTimeRemaining,
  };
};
