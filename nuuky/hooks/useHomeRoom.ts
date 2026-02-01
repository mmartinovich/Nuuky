import { logger } from '../lib/logger';
import { useState, useEffect, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../stores/appStore';
import { Room } from '../types';

const HOME_ROOM_KEY = 'nooke_home_room_id';

export const useHomeRoom = () => {
  const {
    currentUser,
    homeRoomId,
    setHomeRoomId,
    defaultRoomId,
    myRooms
  } = useAppStore();

  const [loading, setLoading] = useState(true);

  // Get the home room object from myRooms
  const homeRoom = useMemo(() => {
    if (!homeRoomId || myRooms.length === 0) return null;
    return myRooms.find(r => r.id === homeRoomId) || null;
  }, [homeRoomId, myRooms]);

  // Initialize: Load from AsyncStorage first, then sync with Supabase
  useEffect(() => {
    if (currentUser) {
      initializeHomeRoom();
    }
  }, [currentUser?.id]);

  // Handle invalid home room (deleted or left)
  useEffect(() => {
    if (homeRoomId && myRooms.length > 0 && !homeRoom) {
      clearHomeRoom();
    }
  }, [homeRoomId, myRooms, homeRoom]);

  const initializeHomeRoom = async () => {
    if (!currentUser) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Step 1: Load from AsyncStorage for fast startup
      const cachedRoomId = await AsyncStorage.getItem(HOME_ROOM_KEY);
      if (cachedRoomId) {
        setHomeRoomId(cachedRoomId);
      }

      // Step 2: Sync with Supabase (source of truth for cross-device)
      const { data: userData, error } = await supabase
        .from('users')
        .select('home_room_id, default_room_id')
        .eq('id', currentUser.id)
        .single();

      if (!error && userData) {
        let supabaseRoomId = userData.home_room_id;

        // Migration: If home_room_id is not set but default_room_id is, use default_room_id
        if (!supabaseRoomId && userData.default_room_id) {
          supabaseRoomId = userData.default_room_id;
          // Persist the migration to Supabase
          await supabase
            .from('users')
            .update({ home_room_id: supabaseRoomId })
            .eq('id', currentUser.id);
        }

        // Update if different from cached value
        if (supabaseRoomId !== cachedRoomId) {
          setHomeRoomId(supabaseRoomId);
          if (supabaseRoomId) {
            await AsyncStorage.setItem(HOME_ROOM_KEY, supabaseRoomId);
          } else {
            await AsyncStorage.removeItem(HOME_ROOM_KEY);
          }
        }
      }
    } catch (error) {
      logger.error('Error initializing home room:', error);
    } finally {
      setLoading(false);
    }
  };

  const setAsHomeRoom = async (roomId: string): Promise<boolean> => {
    if (!currentUser) return false;

    try {
      // Optimistic update: Set locally first for instant UI
      setHomeRoomId(roomId);
      await AsyncStorage.setItem(HOME_ROOM_KEY, roomId);

      // Sync to Supabase
      const { error } = await supabase
        .from('users')
        .update({ home_room_id: roomId })
        .eq('id', currentUser.id);

      if (error) {
        // Rollback on error
        const cachedRoomId = await AsyncStorage.getItem(HOME_ROOM_KEY);
        setHomeRoomId(cachedRoomId);
        throw error;
      }

      return true;
    } catch (error) {
      logger.error('Error setting home room:', error);
      return false;
    }
  };

  const clearHomeRoom = async (): Promise<boolean> => {
    if (!currentUser) return false;

    try {
      // Optimistic update
      setHomeRoomId(null);
      await AsyncStorage.removeItem(HOME_ROOM_KEY);

      // Sync to Supabase
      const { error } = await supabase
        .from('users')
        .update({ home_room_id: null })
        .eq('id', currentUser.id);

      if (error) throw error;

      return true;
    } catch (error) {
      logger.error('Error clearing home room:', error);
      return false;
    }
  };

  // Check if a specific room is the home room
  const isHomeRoom = (roomId: string): boolean => {
    return homeRoomId === roomId;
  };

  return {
    homeRoom,
    homeRoomId,
    loading,
    isHomeRoom,
    setAsHomeRoom,
    clearHomeRoom,
  };
};
