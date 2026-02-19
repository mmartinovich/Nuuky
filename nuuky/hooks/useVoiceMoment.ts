import { logger } from '../lib/logger';
import { useState, useCallback, useRef, useEffect } from 'react';
import { Alert } from 'react-native';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../stores/appStore';
import { VoiceMoment, VoiceMomentReaction } from '../types';

const MAX_DURATION_MS = 30000; // 30 seconds

const recordingOptions: Audio.RecordingOptions = {
  android: {
    extension: '.m4a',
    outputFormat: Audio.AndroidOutputFormat.MPEG_4,
    audioEncoder: Audio.AndroidAudioEncoder.AAC,
    sampleRate: 44100,
    numberOfChannels: 1,
    bitRate: 128000,
  },
  ios: {
    extension: '.m4a',
    audioQuality: Audio.IOSAudioQuality.HIGH,
    sampleRate: 44100,
    numberOfChannels: 1,
    bitRate: 128000,
    outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
  },
  web: {},
};

interface SendVoiceMomentParams {
  receiverId: string;
  receiverName: string;
  audioUri: string;
  durationMs: number;
  caption?: string;
}

export const useVoiceMoment = () => {
  const currentUser = useAppStore((state) => state.currentUser);
  const [loading, setLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDurationMs, setRecordingDurationMs] = useState(0);
  const [meteringLevel, setMeteringLevel] = useState(-160);

  const recordingRef = useRef<Audio.Recording | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync().catch(() => {});
        recordingRef.current = null;
      }
    };
  }, []);

  const startRecording = useCallback(async (): Promise<boolean> => {
    if (!currentUser) {
      Alert.alert('Error', 'You must be logged in');
      return false;
    }

    try {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          'Permission Required',
          'Please allow microphone access in settings to send voice moments.'
        );
        return false;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync({
        ...recordingOptions,
        isMeteringEnabled: true,
      });
      await recording.startAsync();

      recordingRef.current = recording;
      startTimeRef.current = Date.now();
      setIsRecording(true);
      setRecordingDurationMs(0);

      // Timer for duration + metering + auto-stop
      timerRef.current = setInterval(async () => {
        const elapsed = Date.now() - startTimeRef.current;
        setRecordingDurationMs(elapsed);

        // Read metering
        try {
          const status = await recording.getStatusAsync();
          if (status.isRecording && status.metering !== undefined) {
            setMeteringLevel(status.metering);
          }
        } catch {}

        // Auto-stop at max duration
        if (elapsed >= MAX_DURATION_MS) {
          if (timerRef.current) clearInterval(timerRef.current);
          timerRef.current = null;
          try {
            await recording.stopAndUnloadAsync();
          } catch {}
          setIsRecording(false);
          setRecordingDurationMs(MAX_DURATION_MS);
        }
      }, 100);

      return true;
    } catch (error: any) {
      logger.error('Error starting recording:', error);
      Alert.alert('Error', 'Failed to start recording');
      return false;
    }
  }, [currentUser]);

  const stopRecording = useCallback(async (): Promise<{ uri: string; durationMs: number } | null> => {
    if (!recordingRef.current) return null;

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    try {
      const recording = recordingRef.current;
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      const durationMs = Date.now() - startTimeRef.current;

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
      });

      recordingRef.current = null;
      setIsRecording(false);
      setMeteringLevel(-160);

      if (!uri) return null;

      return { uri, durationMs: Math.min(durationMs, MAX_DURATION_MS) };
    } catch (error: any) {
      logger.error('Error stopping recording:', error);
      recordingRef.current = null;
      setIsRecording(false);
      return null;
    }
  }, []);

  const cancelRecording = useCallback(async () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (recordingRef.current) {
      try {
        await recordingRef.current.stopAndUnloadAsync();
      } catch {}
      recordingRef.current = null;
    }

    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
    }).catch(() => {});

    setIsRecording(false);
    setRecordingDurationMs(0);
    setMeteringLevel(-160);
  }, []);

  const sendVoiceMoment = useCallback(async ({
    receiverId,
    receiverName,
    audioUri,
    durationMs,
    caption,
  }: SendVoiceMomentParams): Promise<boolean> => {
    if (!currentUser) {
      Alert.alert('Error', 'You must be logged in');
      return false;
    }

    const now = new Date();
    if (currentUser.take_break_until && new Date(currentUser.take_break_until) > now) {
      Alert.alert(
        'Break Mode Active',
        'You cannot send voice moments while on a break. End your break first to reconnect with friends.'
      );
      return false;
    }

    setLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session) {
        Alert.alert('Authentication Error', 'Please log in again to send voice moments.');
        setLoading(false);
        return false;
      }

      const fileName = `${currentUser.id}/${Date.now()}.m4a`;

      const formData = new FormData();
      formData.append('file', {
        uri: audioUri,
        name: `${Date.now()}.m4a`,
        type: 'audio/mp4',
      } as any);

      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const accessToken = sessionData.session.access_token;

      const uploadResponse = await fetch(
        `${supabaseUrl}/storage/v1/object/voice-moments/${fileName}`,
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
        .from('voice-moments')
        .getPublicUrl(fileName);

      const audioUrl = urlData.publicUrl;

      const { data: voiceMoment, error } = await supabase
        .from('voice_moments')
        .insert({
          sender_id: currentUser.id,
          receiver_id: receiverId,
          audio_url: audioUrl,
          duration_ms: durationMs,
          caption: caption?.trim() || null,
        })
        .select()
        .single();

      if (error) {
        logger.error('Voice moment insert error:', {
          code: error.code,
          message: error.message,
          details: error.details,
        });

        if (error.message.includes('Voice moment limit exceeded')) {
          Alert.alert(
            'Limit Reached',
            'You can only send 3 voice moments per friend per day. Try again tomorrow!'
          );
        } else {
          throw error;
        }
        return false;
      }

      try {
        const { error: notifError } = await supabase.functions.invoke('send-voice-moment-notification', {
          body: {
            receiver_id: receiverId,
            sender_id: currentUser.id,
            voice_moment_id: voiceMoment.id,
            caption: caption?.trim() || null,
          },
        });
        if (notifError) {
          logger.error('Failed to send voice moment notification:', notifError);
        }
      } catch (notifError) {
        logger.error('Failed to send voice moment notification:', notifError);
      }

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      return true;
    } catch (error: any) {
      logger.error('Error sending voice moment:', error);
      Alert.alert('Error', 'Failed to send voice moment');
      return false;
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  const fetchReceivedVoiceMoments = useCallback(async (): Promise<VoiceMoment[]> => {
    if (!currentUser) return [];

    try {
      const { data, error } = await supabase
        .from('voice_moments')
        .select(`
          *,
          sender:users!voice_moments_sender_id_fkey(
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

      const momentsWithSignedUrls = await Promise.all(
        (data || []).map(async (moment) => {
          const urlParts = moment.audio_url.split('/voice-moments/');
          if (urlParts.length === 2) {
            const filePath = urlParts[1];
            const { data: signedData } = await supabase.storage
              .from('voice-moments')
              .createSignedUrl(filePath, 3600);
            if (signedData?.signedUrl) {
              moment.audio_url = signedData.signedUrl;
            }
          }
          return moment;
        })
      );

      return momentsWithSignedUrls as VoiceMoment[];
    } catch (error: any) {
      logger.error('Error fetching voice moments:', error);
      return [];
    }
  }, [currentUser]);

  const fetchVoiceMoment = useCallback(async (voiceMomentId: string): Promise<VoiceMoment | null> => {
    if (!currentUser) return null;

    try {
      const { data, error } = await supabase
        .from('voice_moments')
        .select(`
          *,
          sender:users!voice_moments_sender_id_fkey(
            id,
            display_name,
            avatar_url,
            username
          )
        `)
        .eq('id', voiceMomentId)
        .or(`sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`)
        .single();

      if (error) throw error;

      const urlParts = data.audio_url.split('/voice-moments/');
      if (urlParts.length === 2) {
        const filePath = urlParts[1];
        const { data: signedData, error: signedError } = await supabase.storage
          .from('voice-moments')
          .createSignedUrl(filePath, 3600);

        if (!signedError && signedData?.signedUrl) {
          data.audio_url = signedData.signedUrl;
        }
      }

      return data as VoiceMoment;
    } catch (error: any) {
      logger.error('Error fetching voice moment:', error);
      return null;
    }
  }, [currentUser]);

  const markAsViewed = useCallback(async (voiceMomentId: string): Promise<boolean> => {
    if (!currentUser) return false;

    try {
      const { error } = await supabase
        .from('voice_moments')
        .update({ viewed_at: new Date().toISOString() })
        .eq('id', voiceMomentId)
        .eq('receiver_id', currentUser.id);

      if (error) throw error;
      return true;
    } catch (error: any) {
      logger.error('Error marking voice moment as viewed:', error);
      return false;
    }
  }, [currentUser]);

  const reactToVoiceMoment = useCallback(async (
    voiceMomentId: string,
    reaction: VoiceMomentReaction,
  ): Promise<boolean> => {
    if (!currentUser) return false;

    try {
      const { data: voiceMoment, error: fetchError } = await supabase
        .from('voice_moments')
        .select('sender_id, reaction')
        .eq('id', voiceMomentId)
        .eq('receiver_id', currentUser.id)
        .single();

      if (fetchError) throw fetchError;

      // Toggle: if same reaction, remove it; otherwise set new one
      const newReaction = voiceMoment.reaction === reaction ? null : reaction;

      const { error } = await supabase
        .from('voice_moments')
        .update({ reaction: newReaction })
        .eq('id', voiceMomentId)
        .eq('receiver_id', currentUser.id);

      if (error) throw error;

      // Send notification when reacting (not when removing)
      if (newReaction && voiceMoment.sender_id) {
        try {
          const { error: reactionNotifError } = await supabase.functions.invoke('send-voice-moment-reaction-notification', {
            body: {
              receiver_id: voiceMoment.sender_id,
              sender_id: currentUser.id,
              voice_moment_id: voiceMomentId,
              reaction_type: newReaction,
            },
          });
          if (reactionNotifError) {
            logger.error('Failed to send voice moment reaction notification:', reactionNotifError);
          }
        } catch (notifError) {
          logger.error('Failed to send voice moment reaction notification:', notifError);
        }
      }

      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      return true;
    } catch (error: any) {
      logger.error('Error reacting to voice moment:', error);
      return false;
    }
  }, [currentUser]);

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
    isRecording,
    recordingDurationMs,
    meteringLevel,
    startRecording,
    stopRecording,
    cancelRecording,
    sendVoiceMoment,
    fetchReceivedVoiceMoments,
    fetchVoiceMoment,
    markAsViewed,
    reactToVoiceMoment,
    getTimeRemaining,
  };
};
