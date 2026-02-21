import { logger } from '../lib/logger';
import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../stores/appStore';
import { PhotoNudge } from '../types';

interface SendPhotoNudgeParams {
  receiverId: string;
  receiverName: string;
  imageUri: string;
  caption?: string;
}

export const usePhotoNudge = () => {
  const currentUser = useAppStore((state) => state.currentUser);
  const [loading, setLoading] = useState(false);
  const [capturedImageUri, setCapturedImageUri] = useState<string | null>(null);

  /**
   * Capture a photo using the device camera
   */
  const capturePhoto = useCallback(async (cameraType: 'front' | 'back' = 'front'): Promise<string | null> => {
    if (!currentUser) {
      Alert.alert('Error', 'You must be logged in');
      return null;
    }

    try {
      // Request camera permission
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert(
          'Permission Required',
          'Please allow access to your camera in settings.'
        );
        return null;
      }

      // Launch camera with compression
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: false,
        aspect: [4, 3],
        quality: 0.7,
        cameraType: cameraType === 'front' ? ImagePicker.CameraType.front : ImagePicker.CameraType.back,
      });

      if (result.canceled) {
        return null;
      }

      const imageUri = result.assets[0].uri;
      setCapturedImageUri(imageUri);
      return imageUri;
    } catch (error: any) {
      logger.error('Error capturing photo:', error);
      Alert.alert('Error', 'Failed to capture photo');
      return null;
    }
  }, [currentUser]);

  /**
   * Clear the captured image
   */
  const clearCapturedImage = useCallback(() => {
    setCapturedImageUri(null);
  }, []);

  /**
   * Send a photo nudge to a friend
   */
  const sendPhotoNudge = useCallback(async ({
    receiverId,
    receiverName,
    imageUri,
    caption,
  }: SendPhotoNudgeParams): Promise<boolean> => {
    if (!currentUser) {
      Alert.alert('Error', 'You must be logged in');
      return false;
    }

    // Check if user is on break
    const now = new Date();
    if (currentUser.take_break_until && new Date(currentUser.take_break_until) > now) {
      Alert.alert(
        'Break Mode Active',
        'You cannot send photo nudges while on a break. End your break first to reconnect with friends.'
      );
      return false;
    }

    setLoading(true);
    try {
      // Verify session exists
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session) {
        Alert.alert('Authentication Error', 'Please log in again to send photo nudges.');
        setLoading(false);
        return false;
      }

      // Create file path
      const fileName = `${currentUser.id}/${Date.now()}.jpg`;

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
        `${supabaseUrl}/storage/v1/object/photo-nudges/${fileName}`,
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

      // Get the image URL (private bucket, so use signed URL or store path)
      const { data: urlData } = supabase.storage
        .from('photo-nudges')
        .getPublicUrl(fileName);

      const imageUrl = urlData.publicUrl;

      // Insert photo nudge record (trigger will check rate limit)
      const { data: photoNudge, error } = await supabase
        .from('photo_nudges')
        .insert({
          sender_id: currentUser.id,
          receiver_id: receiverId,
          image_url: imageUrl,
          caption: caption?.trim() || null,
        })
        .select()
        .single();

      if (error) {
        logger.error('Photo nudge insert error:', {
          code: error.code,
          message: error.message,
          details: error.details,
        });

        // Check if it's a rate limit error
        if (error.message.includes('Photo nudge limit exceeded')) {
          Alert.alert(
            'Limit Reached',
            'You can only send 3 photo nudges per friend per day. Try again tomorrow!'
          );
        } else {
          throw error;
        }
        return false;
      }

      // Send push notification via Edge Function
      try {
        await supabase.functions.invoke('send-photo-nudge-notification', {
          body: {
            receiver_id: receiverId,
            sender_id: currentUser.id,
            photo_nudge_id: photoNudge.id,
            caption: caption?.trim() || null,
          },
        });
      } catch (notifError) {
        logger.error('Failed to send photo nudge notification:', notifError);
        // Don't fail the photo nudge if notification fails
      }

      // Success - play haptic feedback
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Clear the captured image
      setCapturedImageUri(null);

      return true;
    } catch (error: any) {
      logger.error('Error sending photo nudge:', error);
      Alert.alert('Error', 'Failed to send photo nudge');
      return false;
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  /**
   * Fetch received photo nudges that haven't expired
   */
  const fetchReceivedPhotoNudges = useCallback(async (): Promise<PhotoNudge[]> => {
    if (!currentUser) return [];

    try {
      const { data, error } = await supabase
        .from('photo_nudges')
        .select(`
          *,
          sender:users!photo_nudges_sender_id_fkey(
            id,
            display_name,
            avatar_url,
            username
          )
        `)
        .eq('receiver_id', currentUser.id)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get signed URLs for all photos (private bucket)
      const results = await Promise.allSettled(
        (data || []).map(async (nudge) => {
          const urlParts = nudge.image_url.split('/photo-nudges/');
          if (urlParts.length === 2) {
            const filePath = urlParts[1];
            const { data: signedData } = await supabase.storage
              .from('photo-nudges')
              .createSignedUrl(filePath, 3600);
            if (signedData?.signedUrl) {
              nudge.image_url = signedData.signedUrl;
            }
          }
          return nudge;
        })
      );

      const photosWithSignedUrls = results
        .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
        .map(r => r.value);

      return photosWithSignedUrls as PhotoNudge[];
    } catch (error: any) {
      logger.error('Error fetching photo nudges:', error);
      return [];
    }
  }, [currentUser]);

  /**
   * Mark a photo nudge as viewed
   */
  const markAsViewed = useCallback(async (photoNudgeId: string): Promise<boolean> => {
    if (!currentUser) return false;

    try {
      const { error } = await supabase
        .from('photo_nudges')
        .update({ viewed_at: new Date().toISOString() })
        .eq('id', photoNudgeId)
        .eq('receiver_id', currentUser.id);

      if (error) throw error;

      return true;
    } catch (error: any) {
      logger.error('Error marking photo nudge as viewed:', error);
      return false;
    }
  }, [currentUser]);

  /**
   * React to a photo nudge with a heart
   */
  const reactWithHeart = useCallback(async (photoNudgeId: string): Promise<boolean> => {
    if (!currentUser) return false;

    try {
      const { data: photoNudge, error: fetchError } = await supabase
        .from('photo_nudges')
        .select('sender_id, reaction')
        .eq('id', photoNudgeId)
        .eq('receiver_id', currentUser.id)
        .single();

      if (fetchError) throw fetchError;

      // Toggle reaction
      const newReaction = photoNudge.reaction === 'heart' ? null : 'heart';

      const { error } = await supabase
        .from('photo_nudges')
        .update({ reaction: newReaction })
        .eq('id', photoNudgeId)
        .eq('receiver_id', currentUser.id);

      if (error) throw error;

      // Send notification to sender when liking (not when unliking)
      if (newReaction === 'heart' && photoNudge.sender_id) {
        try {
          await supabase.functions.invoke('send-photo-like-notification', {
            body: {
              receiver_id: photoNudge.sender_id,
              sender_id: currentUser.id,
              photo_nudge_id: photoNudgeId,
            },
          });
        } catch (notifError) {
          logger.error('Failed to send photo like notification:', notifError);
          // Don't fail the reaction if notification fails
        }
      }

      // Play haptic feedback
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      return true;
    } catch (error: any) {
      logger.error('Error reacting to photo nudge:', error);
      return false;
    }
  }, [currentUser]);

  /**
   * Fetch a single photo nudge by ID
   */
  const fetchPhotoNudge = useCallback(async (photoNudgeId: string): Promise<PhotoNudge | null> => {
    if (!currentUser) return null;

    try {
      const { data, error } = await supabase
        .from('photo_nudges')
        .select(`
          *,
          sender:users!photo_nudges_sender_id_fkey(
            id,
            display_name,
            avatar_url,
            username
          )
        `)
        .eq('id', photoNudgeId)
        .or(`sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`)
        .single();

      if (error) throw error;

      // Get signed URL for private bucket
      // Extract file path from the stored URL (format: .../photo-nudges/userId/timestamp.jpg)
      const urlParts = data.image_url.split('/photo-nudges/');
      if (urlParts.length === 2) {
        const filePath = urlParts[1];
        const { data: signedData, error: signedError } = await supabase.storage
          .from('photo-nudges')
          .createSignedUrl(filePath, 3600); // 1 hour expiry

        if (!signedError && signedData?.signedUrl) {
          data.image_url = signedData.signedUrl;
        }
      }

      return data as PhotoNudge;
    } catch (error: any) {
      logger.error('Error fetching photo nudge:', error);
      return null;
    }
  }, [currentUser]);

  /**
   * Get time remaining until expiration
   */
  const getTimeRemaining = useCallback((expiresAt: string) => {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diffMs = expires.getTime() - now.getTime();

    if (diffMs <= 0) return { hours: 0, minutes: 0, expired: true };

    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    return { hours, minutes, expired: false };
  }, []);

  return {
    loading,
    capturedImageUri,
    capturePhoto,
    sendPhotoNudge,
    fetchReceivedPhotoNudges,
    fetchPhotoNudge,
    markAsViewed,
    reactWithHeart,
    clearCapturedImage,
    getTimeRemaining,
  };
};
