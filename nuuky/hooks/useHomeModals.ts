import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { SoundReactionType, PhotoNudge } from '../types';

interface UseHomeModalsOptions {
  onSoundSelect: (soundId: SoundReactionType) => Promise<{ success: boolean; error?: string }>;
  onCreateRoom: (name?: string, isPrivate?: boolean) => Promise<void>;
  onJoinRoom: (roomId: string) => Promise<void>;
  isAudioConnected: boolean;
  audioConnect: () => void;
  defaultRoom: any;
  fetchPhotoNudge: (id: string) => Promise<PhotoNudge | null>;
}

export function useHomeModals({
  onSoundSelect,
  onCreateRoom,
  onJoinRoom,
  isAudioConnected,
  audioConnect,
  defaultRoom,
  fetchPhotoNudge,
}: UseHomeModalsOptions) {
  const router = useRouter();

  const [showMoodPicker, setShowMoodPicker] = useState(false);
  const [showRoomList, setShowRoomList] = useState(false);
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [showRoomSettings, setShowRoomSettings] = useState(false);
  const [showSoundPicker, setShowSoundPicker] = useState(false);
  const [showLofiMenu, setShowLofiMenu] = useState(false);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [showPhotoNudge, setShowPhotoNudge] = useState(false);
  const [activePhotoNudge, setActivePhotoNudge] = useState<PhotoNudge | null>(null);

  const openMoodPicker = useCallback(() => setShowMoodPicker(true), []);
  const closeMoodPicker = useCallback(() => setShowMoodPicker(false), []);

  const openRoomList = useCallback(() => setShowRoomList(true), []);
  const closeRoomList = useCallback(() => setShowRoomList(false), []);

  const openCreateRoom = useCallback(() => {
    setShowRoomList(false);
    setShowCreateRoom(true);
  }, []);
  const closeCreateRoom = useCallback(() => setShowCreateRoom(false), []);

  const openRoomSettings = useCallback(() => setShowRoomSettings(true), []);
  const closeRoomSettings = useCallback(() => setShowRoomSettings(false), []);

  const openLofiMenu = useCallback(() => setShowLofiMenu(true), []);
  const closeLofiMenu = useCallback(() => setShowLofiMenu(false), []);

  const openNotifications = useCallback(() => setShowNotificationsModal(true), []);
  const closeNotifications = useCallback(() => setShowNotificationsModal(false), []);

  const openSoundPicker = useCallback(() => {
    if (!defaultRoom) {
      Alert.alert("No Room", "Join a room to send sound reactions.");
      return;
    }
    if (!isAudioConnected) {
      audioConnect();
    }
    setShowSoundPicker(true);
  }, [defaultRoom, isAudioConnected, audioConnect]);
  const closeSoundPicker = useCallback(() => setShowSoundPicker(false), []);

  const handleSoundSelect = useCallback(async (soundId: SoundReactionType) => {
    const result = await onSoundSelect(soundId);
    if (!result.success && result.error) {
      Alert.alert("Cannot Send", result.error);
    }
  }, [onSoundSelect]);

  const handleCreateRoom = useCallback(async (name?: string, isPrivate?: boolean) => {
    await onCreateRoom(name, isPrivate);
    setShowCreateRoom(false);
  }, [onCreateRoom]);

  const handleJoinRoom = useCallback(async (roomId: string) => {
    setShowRoomList(false);
    await onJoinRoom(roomId);
  }, [onJoinRoom]);

  const openPhotoNudge = useCallback((photoNudge: PhotoNudge) => {
    setActivePhotoNudge(photoNudge);
    setShowPhotoNudge(true);
  }, []);

  const closePhotoNudge = useCallback(() => {
    setShowPhotoNudge(false);
    setActivePhotoNudge(null);
  }, []);

  const openPhotoNudgeById = useCallback(async (id: string) => {
    const nudge = await fetchPhotoNudge(id);
    if (nudge) {
      setActivePhotoNudge(nudge);
      setShowPhotoNudge(true);
    }
  }, [fetchPhotoNudge]);

  return {
    // Modal visibility state
    showMoodPicker,
    showRoomList,
    showCreateRoom,
    showRoomSettings,
    showSoundPicker,
    showLofiMenu,
    showNotificationsModal,
    showPhotoNudge,
    activePhotoNudge,

    // Open/close handlers
    openMoodPicker,
    closeMoodPicker,
    openRoomList,
    closeRoomList,
    openCreateRoom,
    closeCreateRoom,
    openRoomSettings,
    closeRoomSettings,
    openLofiMenu,
    closeLofiMenu,
    openNotifications,
    closeNotifications,
    openSoundPicker,
    closeSoundPicker,
    openPhotoNudge,
    closePhotoNudge,
    openPhotoNudgeById,

    // Action handlers
    handleSoundSelect,
    handleCreateRoom,
    handleJoinRoom,
  };
}
