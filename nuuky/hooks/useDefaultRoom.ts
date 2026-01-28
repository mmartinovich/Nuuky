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

    // If we already have a defaultRoomId in Zustand, don't override it
    // This prevents race conditions when navigating after room selection
    const currentDefaultRoomId = useAppStore.getState().defaultRoomId;
    if (currentDefaultRoomId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Step 1: Load from AsyncStorage for fast startup
      const cachedRoomId = await AsyncStorage.getItem(DEFAULT_ROOM_KEY);
      if (cachedRoomId) {
        setDefaultRoomId(cachedRoomId);
        setLoading(false);
        return;
      }

      // Step 2: Only fetch from Supabase if no local cache exists
      const { data: userData, error } = await supabase
        .from('users')
        .select('default_room_id')
        .eq('id', currentUser.id)
        .single();

      if (!error && userData && userData.default_room_id) {
        setDefaultRoomId(userData.default_room_id);
        await AsyncStorage.setItem(DEFAULT_ROOM_KEY, userData.default_room_id);
      }
    } catch (error) {
      console.error('Error initializing default room:', error);
    } finally {
      setLoading(false);
    }
  };

  const setAsDefaultRoom = (roomId: string): boolean => {
    if (!currentUser) return false;

    // Optimistic update: Set locally first for instant UI
    setDefaultRoomId(roomId);

    // Persist in background (don't block navigation)
    AsyncStorage.setItem(DEFAULT_ROOM_KEY, roomId).catch(console.error);

    // Sync to Supabase in background
    supabase
      .from('users')
      .update({ default_room_id: roomId })
      .eq('id', currentUser.id)
      .then(({ error }) => {
        if (error) {
          console.error('Error syncing default room to Supabase:', error);
        }
      });

    return true;
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
