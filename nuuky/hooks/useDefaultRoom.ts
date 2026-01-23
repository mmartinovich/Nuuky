import { useState, useEffect, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../stores/appStore';
import { Room } from '../types';

const DEFAULT_ROOM_KEY = 'nooke_default_room_id';

export const useDefaultRoom = () => {
  const {
    currentUser,
    defaultRoomId,
    setDefaultRoomId,
    myRooms
  } = useAppStore();

  const [loading, setLoading] = useState(true);

  // Get the default room object from myRooms
  const defaultRoom = useMemo(() => {
    if (!defaultRoomId || myRooms.length === 0) return null;
    return myRooms.find(r => r.id === defaultRoomId) || null;
  }, [defaultRoomId, myRooms]);

  // Initialize: Load from AsyncStorage first, then sync with Supabase
  useEffect(() => {
    if (currentUser) {
      initializeDefaultRoom();
    }
  }, [currentUser?.id]); // Use id to avoid re-running on mood change

  // Handle invalid default room (deleted or left)
  useEffect(() => {
    if (defaultRoomId && myRooms.length > 0 && !defaultRoom) {
      clearDefaultRoom();
    }
  }, [defaultRoomId, myRooms, defaultRoom]);

  const initializeDefaultRoom = async () => {
    if (!currentUser) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Step 1: Load from AsyncStorage for fast startup
      const cachedRoomId = await AsyncStorage.getItem(DEFAULT_ROOM_KEY);
      if (cachedRoomId) {
        setDefaultRoomId(cachedRoomId);
      }

      // Step 2: Sync with Supabase (source of truth for cross-device)
      const { data: userData, error } = await supabase
        .from('users')
        .select('default_room_id')
        .eq('id', currentUser.id)
        .single();

      if (!error && userData) {
        const supabaseRoomId = userData.default_room_id;

        // Update if different from cached value
        if (supabaseRoomId !== cachedRoomId) {
          setDefaultRoomId(supabaseRoomId);
          if (supabaseRoomId) {
            await AsyncStorage.setItem(DEFAULT_ROOM_KEY, supabaseRoomId);
          } else {
            await AsyncStorage.removeItem(DEFAULT_ROOM_KEY);
          }
        }
      }
    } catch (error) {
      console.error('Error initializing default room:', error);
    } finally {
      setLoading(false);
    }
  };

  const setAsDefaultRoom = async (roomId: string): Promise<boolean> => {
    if (!currentUser) return false;

    try {
      // Optimistic update: Set locally first for instant UI
      setDefaultRoomId(roomId);
      await AsyncStorage.setItem(DEFAULT_ROOM_KEY, roomId);

      // Sync to Supabase
      const { error } = await supabase
        .from('users')
        .update({ default_room_id: roomId })
        .eq('id', currentUser.id);

      if (error) {
        // Rollback on error
        const cachedRoomId = await AsyncStorage.getItem(DEFAULT_ROOM_KEY);
        setDefaultRoomId(cachedRoomId);
        throw error;
      }

      return true;
    } catch (error) {
      console.error('Error setting default room:', error);
      return false;
    }
  };

  const clearDefaultRoom = async (): Promise<boolean> => {
    if (!currentUser) return false;

    try {
      // Optimistic update
      setDefaultRoomId(null);
      await AsyncStorage.removeItem(DEFAULT_ROOM_KEY);

      // Sync to Supabase
      const { error } = await supabase
        .from('users')
        .update({ default_room_id: null })
        .eq('id', currentUser.id);

      if (error) throw error;

      return true;
    } catch (error) {
      console.error('Error clearing default room:', error);
      return false;
    }
  };

  // Check if a specific room is the default
  const isDefaultRoom = (roomId: string): boolean => {
    return defaultRoomId === roomId;
  };

  return {
    defaultRoom,
    defaultRoomId,
    loading,
    isDefaultRoom,
    setAsDefaultRoom,
    clearDefaultRoom,
  };
};
