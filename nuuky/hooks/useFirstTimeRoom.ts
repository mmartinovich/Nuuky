import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../stores/appStore';
import { useRoom } from './useRoom';
import { useDefaultRoom } from './useDefaultRoom';

export const useFirstTimeRoom = () => {
  const { currentUser } = useAppStore();
  const { myRooms, loadMyRooms, createRoom } = useRoom();
  const { setAsDefaultRoom } = useDefaultRoom();
  const [isFirstTime, setIsFirstTime] = useState(false);
  const [loading, setLoading] = useState(true);
  const [defaultRoomCreated, setDefaultRoomCreated] = useState(false);

  useEffect(() => {
    if (currentUser) {
      checkAndCreateDefaultRoom();
    }
  }, [currentUser?.id]); // Use id to avoid re-running on mood change

  const checkAndCreateDefaultRoom = async () => {
    if (!currentUser) return;

    try {
      setLoading(true);

      // Check if user has any rooms (as creator or participant)
      const { data: participantData, error: participantError } = await supabase
        .from('room_participants')
        .select('room_id')
        .eq('user_id', currentUser.id);

      if (participantError) throw participantError;

      const hasRooms = participantData && participantData.length > 0;

      if (!hasRooms) {
        // First time user - create default room
        setIsFirstTime(true);
        await createDefaultRoom();
      } else {
        setIsFirstTime(false);
      }
    } catch (error: any) {
      console.error('Error checking first time status:', error);
    } finally {
      setLoading(false);
    }
  };

  const createDefaultRoom = async () => {
    if (!currentUser || defaultRoomCreated) return;

    try {
      // Create "My Nūūky" default room
      const room = await createRoom('My Nūūky');

      if (room) {
        setDefaultRoomCreated(true);
        // Set as default room
        await setAsDefaultRoom(room.id);
        await loadMyRooms();
      }
    } catch (error: any) {
      console.error('Error creating default room:', error);
    }
  };

  // Reset first-time status (for testing or re-onboarding)
  const resetFirstTimeStatus = () => {
    setIsFirstTime(false);
    setDefaultRoomCreated(false);
  };

  return {
    isFirstTime,
    loading,
    defaultRoomCreated,
    checkAndCreateDefaultRoom,
    resetFirstTimeStatus,
  };
};
