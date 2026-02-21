import { useState } from 'react';
import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../stores/appStore';

export const useProfile = () => {
  const currentUser = useAppStore((state) => state.currentUser);
  const setCurrentUser = useAppStore((state) => state.setCurrentUser);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewUri, setPreviewUri] = useState<string | null>(null);

  const updateDisplayName = async (name: string): Promise<boolean> => {
    if (!currentUser) {
      Alert.alert('Error', 'You must be logged in');
      return false;
    }

    // Validate display name (1-50 chars)
    const trimmedName = name.trim();
    if (trimmedName.length < 1) {
      Alert.alert('Invalid Name', 'Display name cannot be empty');
      return false;
    }
    if (trimmedName.length > 50) {
      Alert.alert('Invalid Name', 'Display name must be 50 characters or less');
      return false;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({ display_name: trimmedName })
        .eq('id', currentUser.id);

      if (error) throw error;

      // Update store
      setCurrentUser({ ...currentUser, display_name: trimmedName });
      Alert.alert('Success', 'Display name updated');
      return true;
    } catch (_error: any) {
      Alert.alert('Error', 'Failed to update display name');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const updatePhone = async (phone: string): Promise<boolean> => {
    if (!currentUser) {
      Alert.alert('Error', 'You must be logged in');
      return false;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({ phone })
        .eq('id', currentUser.id);

      if (error) throw error;

      // Update store
      setCurrentUser({ ...currentUser, phone });
      return true;
    } catch (_error: any) {
      Alert.alert('Error', 'Failed to save phone number');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const pickAndUploadAvatar = async (
    source: 'camera' | 'gallery'
  ): Promise<boolean> => {
    if (!currentUser) {
      Alert.alert('Error', 'You must be logged in');
      return false;
    }

    try {
      // Request permissions
      let permissionResult;
      if (source === 'camera') {
        permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      } else {
        permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      }

      if (!permissionResult.granted) {
        Alert.alert(
          'Permission Required',
          `Please allow access to your ${source === 'camera' ? 'camera' : 'photo library'} in settings.`
        );
        return false;
      }

      // Pick image
      let result;
      if (source === 'camera') {
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });
      } else {
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });
      }

      if (result.canceled) {
        return false;
      }

      const asset = result.assets[0];
      const imageUri = asset.uri;

      // Validate file size (max 5MB)
      const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
      if (asset.fileSize && asset.fileSize > MAX_FILE_SIZE) {
        Alert.alert(
          'File Too Large',
          'Please choose an image under 5MB.'
        );
        return false;
      }

      // Validate MIME type based on file extension
      const ext = imageUri.split('.').pop()?.toLowerCase();
      const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png'];
      if (ext && ext.length <= 5 && !ext.includes('/') && !ALLOWED_EXTENSIONS.includes(ext)) {
        Alert.alert(
          'Invalid File Type',
          'Only JPEG and PNG images are allowed.'
        );
        return false;
      }

      // Also check mimeType if available from the picker
      if (asset.mimeType && !['image/jpeg', 'image/png'].includes(asset.mimeType)) {
        Alert.alert(
          'Invalid File Type',
          'Only JPEG and PNG images are allowed.'
        );
        return false;
      }

      // Show preview immediately for instant feedback
      setPreviewUri(imageUri);
      setLoading(true);
      setUploadProgress(0);

      // Check if file exists and validate size from filesystem if not available from picker
      const fileInfo = await FileSystem.getInfoAsync(imageUri);
      if (!fileInfo.exists) {
        throw new Error('Selected image file not found');
      }

      // Double-check file size from filesystem if picker didn't provide it
      if (!asset.fileSize && fileInfo.size && fileInfo.size > MAX_FILE_SIZE) {
        setPreviewUri(null);
        Alert.alert(
          'File Too Large',
          'Please choose an image under 5MB.'
        );
        return false;
      }

      // Create file path - handle camera URIs that may not have extension
      let fileExt = imageUri.split('.').pop()?.toLowerCase();
      // If no valid extension or it looks like a path component, default to jpg
      if (!fileExt || fileExt.length > 5 || fileExt.includes('/')) {
        fileExt = 'jpg';
      }
      const fileName = `${currentUser.id}/${Date.now()}.${fileExt}`;

      // Determine content type based on extension
      const contentType = fileExt === 'png' ? 'image/png' : 'image/jpeg';

      // Refresh session to ensure token is valid for upload
      const { data: sessionData, error: sessionError } = await supabase.auth.refreshSession();
      if (sessionError || !sessionData?.session) {
        throw new Error('Session expired - please log in again');
      }

      // For React Native, use FormData approach
      const formData = new FormData();
      formData.append('file', {
        uri: imageUri,
        name: fileName.split('/').pop(),
        type: contentType,
      } as any);

      // Get the storage URL and auth token
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const accessToken = sessionData.session.access_token;

      const uploadResponse = await fetch(
        `${supabaseUrl}/storage/v1/object/avatars/${fileName}`,
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
        .from('avatars')
        .getPublicUrl(fileName);

      const avatarUrl = urlData.publicUrl;

      // Update user profile in database (without cache-busting param)
      const { error: updateError } = await supabase
        .from('users')
        .update({ avatar_url: avatarUrl })
        .eq('id', currentUser.id);

      if (updateError) {
        throw updateError;
      }

      // Update store with the URL - get fresh state to avoid stale closures
      const freshUser = useAppStore.getState().currentUser;
      if (freshUser) {
        setCurrentUser({ ...freshUser, avatar_url: avatarUrl });
      }

      // Don't clear preview - it will naturally clear when user navigates away
      // This prevents the glitchy transition between preview and loaded image

      return true;
    } catch (error: any) {
      Alert.alert('Error', `Failed to upload profile picture: ${error?.message || 'Unknown error'}`);
      setPreviewUri(null); // Clear preview on error
      return false;
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  const deleteAvatar = async (): Promise<boolean> => {
    if (!currentUser) {
      Alert.alert('Error', 'You must be logged in');
      return false;
    }

    if (!currentUser.avatar_url) {
      Alert.alert('No Avatar', 'You do not have a profile picture to delete');
      return false;
    }

    setLoading(true);
    setPreviewUri(null);
    try {
      // Extract file path from URL
      const url = new URL(currentUser.avatar_url);
      const pathParts = url.pathname.split('/');
      const filePath = pathParts.slice(-2).join('/'); // Get user_id/filename.ext

      // Delete from storage
      const { error: deleteError } = await supabase.storage
        .from('avatars')
        .remove([filePath]);

      if (deleteError) throw deleteError;

      // Update user profile in database
      const { error: updateError } = await supabase
        .from('users')
        .update({ avatar_url: null })
        .eq('id', currentUser.id);

      if (updateError) throw updateError;

      // Update store
      setCurrentUser({ ...currentUser, avatar_url: undefined });

      return true;
    } catch (_error: any) {
      Alert.alert('Error', 'Failed to delete profile picture');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const completeProfile = async (): Promise<boolean> => {
    if (!currentUser) {
      Alert.alert('Error', 'You must be logged in');
      return false;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({ profile_completed: true })
        .eq('id', currentUser.id);

      if (error) throw error;

      // Update store
      setCurrentUser({ ...currentUser, profile_completed: true });
      return true;
    } catch (_error: any) {
      Alert.alert('Error', 'Failed to complete profile setup');
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    uploadProgress,
    previewUri,
    updateDisplayName,
    updatePhone,
    pickAndUploadAvatar,
    deleteAvatar,
    completeProfile,
  };
};
