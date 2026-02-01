import { logger } from '../lib/logger';
import { useState, useEffect, useMemo, useRef } from 'react';
import { Alert } from 'react-native';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../stores/appStore';
import { subscriptionManager } from '../lib/subscriptionManager';
import { Room, RoomParticipant } from '../types';

const REFRESH_THROTTLE_MS = 2000; // Only allow refresh every 2 seconds

export const useRoom = () => {
  // Instance-level refs instead of module-level variables to avoid cross-instance race conditions
  const lastRoomsRefreshRef = useRef(0);
  const lastParticipantsRefreshRef = useRef(0);
  const isJoiningRoomRef = useRef(false);
  const lastJoinedRoomIdRef = useRef<string | null>(null);
  const { currentUser, currentRoom, setCurrentRoom, setActiveRooms, myRooms, setMyRooms, addMyRoom, updateMyRoom, removeMyRoom, setRoomParticipants, roomParticipants } = useAppStore();
  const [activeRooms, setActiveRoomsList] = useState<Room[]>([]);
  const [loading, setLoading] = useState(false);

  // Derive participants directly from myRooms to avoid stale state
  // This ensures participants are always in sync with the current room
  // Memoized to prevent recalculation on every render
  const participants: RoomParticipant[] = useMemo(() => {
    if (!currentRoom) return [];
    return roomParticipants;
  }, [currentRoom?.id, roomParticipants]);

  useEffect(() => {
    if (currentUser) {
      loadActiveRooms();
      loadMyRooms();
      const cleanup = setupRealtimeSubscription();
      return cleanup;
    }
  }, [currentUser?.id]); // Use id to avoid re-running on mood change

  useEffect(() => {
    if (currentRoom) {
      loadParticipants();
    }
  }, [currentRoom?.id]);

  // Subscribe to participant changes for the current room (any user joining/leaving)
  useEffect(() => {
    if (!currentRoom) return;

    const subId = `room-participants-room-${currentRoom.id}`;
    const cleanup = subscriptionManager.register(subId, () => {
      return supabase
        .channel(subId)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'room_participants',
            filter: `room_id=eq.${currentRoom.id}`,
          },
          () => {
            loadParticipants();
            loadMyRooms();
          }
        )
        .subscribe();
    });

    return cleanup;
  }, [currentRoom?.id]);

  const loadActiveRooms = async () => {
    if (!currentUser) return;

    try {
      const { data, error } = await supabase
        .from('rooms')
        .select(`
          *,
          participants:room_participants (
            id,
            user_id,
            is_muted,
            joined_at,
            user:user_id (
              id,
              display_name,
              avatar_url,
              mood,
              default_room_id
            )
          )
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setActiveRoomsList(data || []);
      setActiveRooms(data || []);
    } catch (error: any) {
      logger.error('Error loading active rooms:', error);
    }
  };

  const loadMyRooms = async () => {
    if (!currentUser) return;

    try {
      // Get rooms where user is creator or participant
      const { data: participantData } = await supabase
        .from('room_participants')
        .select('room_id')
        .eq('user_id', currentUser.id);

      const roomIds = participantData?.map(p => p.room_id) || [];

      if (roomIds.length === 0) {
        setMyRooms([]);
        return;
      }

      const { data, error } = await supabase
        .from('rooms')
        .select(`
          *,
          creator:creator_id (
            id,
            display_name
          ),
          participants:room_participants (
            id,
            user_id,
            is_muted,
            joined_at,
            user:user_id (
              id,
              display_name,
              avatar_url,
              mood,
              is_online,
              last_seen_at,
              default_room_id
            )
          )
        `)
        .in('id', roomIds)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setMyRooms(data || []);
    } catch (error: any) {
      logger.error('Error loading my rooms:', error);
    }
  };

  const loadParticipants = async () => {
    if (!currentRoom) return;

    try {
      const { data, error } = await supabase
        .from('room_participants')
        .select(`
          *,
          user:user_id (
            id,
            display_name,
            avatar_url,
            mood,
            is_online,
            last_seen_at,
            default_room_id
          )
        `)
        .eq('room_id', currentRoom.id);

      if (error) throw error;
      const participantsData = data || [];
      // Update the global store
      setRoomParticipants(participantsData);
    } catch (error: any) {
      logger.error('Error loading participants:', error);
    }
  };

  const setupRealtimeSubscription = () => {
    if (!currentUser) return () => {};

    const roomsSubscriptionId = `rooms-${currentUser.id}`;
    const participantsSubscriptionId = `room-participants-${currentUser.id}`;

    // Throttled refresh function
    const throttledRefresh = () => {
      const now = Date.now();
      if (now - lastRoomsRefreshRef.current < REFRESH_THROTTLE_MS) return;
      lastRoomsRefreshRef.current = now;
      loadActiveRooms();
      loadMyRooms();
    };

    const throttledParticipantsRefresh = () => {
      const now = Date.now();
      if (now - lastParticipantsRefreshRef.current < REFRESH_THROTTLE_MS) return;
      lastParticipantsRefreshRef.current = now;
      const room = useAppStore.getState().currentRoom;
      if (room) {
        loadParticipants();
      }
    };

    // Use subscription manager for automatic pause/resume on app background
    // Filter to only rooms where the current user is a participant
    const cleanupRooms = subscriptionManager.register(roomsSubscriptionId, () => {
      return supabase
        .channel(roomsSubscriptionId)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'rooms',
            filter: `creator_id=eq.${currentUser.id}`,
          },
          throttledRefresh
        )
        .subscribe();
    });

    // Filter to only participant changes for the current user
    const cleanupParticipants = subscriptionManager.register(participantsSubscriptionId, () => {
      return supabase
        .channel(participantsSubscriptionId)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'room_participants',
            filter: `user_id=eq.${currentUser.id}`,
          },
          () => {
            throttledParticipantsRefresh();
            throttledRefresh();
          }
        )
        .subscribe();
    });

    return () => {
      cleanupRooms();
      cleanupParticipants();
    };
  };

  // Check if user can create a room (max 5 rooms)
  const canCreateRoom = async (): Promise<boolean> => {
    if (!currentUser) return false;

    try {
      const { data, error } = await supabase
        .from('rooms')
        .select('id')
        .eq('creator_id', currentUser.id)
        .eq('is_active', true);

      if (error) throw error;

      return (data?.length || 0) < 5;
    } catch (error: any) {
      logger.error('Error checking room limit:', error);
      return false;
    }
  };

  const createRoom = async (name?: string, friendIds?: string[]): Promise<Room | null> => {
    if (!currentUser) {
      Alert.alert('Error', 'You must be logged in');
      return null;
    }

    // Verify auth session before creating room
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      Alert.alert('Session Expired', 'Please log in again');
      return null;
    }

    // Check room limit
    const canCreate = await canCreateRoom();
    if (!canCreate) {
      Alert.alert('Room Limit Reached', 'You can only create up to 5 rooms. Delete an existing room to create a new one.');
      return null;
    }

    setLoading(true);
    try {
      // Create the room - all rooms are private now
      const { data: room, error: roomError } = await supabase
        .from('rooms')
        .insert({
          creator_id: currentUser.id,
          name: name || `${currentUser.display_name}'s Room`,
          is_private: true, // All rooms are private
          is_active: true,
          audio_active: false,
        })
        .select()
        .single();

      if (roomError) throw roomError;

      // Auto-join the creator
      const { error: joinError } = await supabase
        .from('room_participants')
        .insert({
          room_id: room.id,
          user_id: currentUser.id,
          is_muted: true,
        });

      if (joinError) throw joinError;

      // Send invites if friendIds provided
      if (friendIds && friendIds.length > 0) {
        const invites = friendIds.map(friendId => ({
          room_id: room.id,
          sender_id: currentUser.id,
          receiver_id: friendId,
        }));

        await supabase.from('room_invites').insert(invites);

        // Send push notifications to invited friends
        try {
          await supabase.functions.invoke('send-room-invite-notification', {
            body: {
              room_id: room.id,
              sender_id: currentUser.id,
              receiver_ids: friendIds,
            },
          });
        } catch (notificationError) {
          // Don't fail room creation if notifications fail
          logger.error('Failed to send room invite notifications:', notificationError);
        }
      }

      setCurrentRoom(room);
      addMyRoom(room);
      await loadActiveRooms();
      await loadMyRooms();

      return room;
    } catch (error: any) {
      logger.error('Error creating room:', error);
      Alert.alert('Error', 'Failed to create room');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const joinRoom = async (roomId: string): Promise<boolean> => {
    if (!currentUser) {
      Alert.alert('Error', 'You must be logged in');
      return false;
    }

    // Prevent multiple simultaneous calls
    if (isJoiningRoomRef.current) {
      return false;
    }
    if (lastJoinedRoomIdRef.current === roomId && currentRoom?.id === roomId) {
      // Already in this room, but refresh participants to ensure fresh data
      await loadParticipants();
      return true;
    }

    isJoiningRoomRef.current = true;
    setLoading(true);
    try {
      // Check if already in the room
      const { data: existing } = await supabase
        .from('room_participants')
        .select('*')
        .eq('room_id', roomId)
        .eq('user_id', currentUser.id)
        .maybeSingle();

      if (existing) {
        // Already in room, just load it
        const { data: room } = await supabase
          .from('rooms')
          .select('*')
          .eq('id', roomId)
          .single();

        if (room) {
          // Load myRooms first to ensure we have fresh participant data
          await loadMyRooms();
          setCurrentRoom(room);
          lastJoinedRoomIdRef.current = roomId;
          return true;
        }
      }

      // Join the room - RLS policy will verify auth.uid() matches user_id
      const { error: joinError } = await supabase
        .from('room_participants')
        .insert({
          room_id: roomId,
          user_id: currentUser.id,
          is_muted: true,
        });

      if (joinError) throw joinError;

      // Load the room
      const { data: room, error: roomError } = await supabase
        .from('rooms')
        .select('*')
        .eq('id', roomId)
        .single();

      if (roomError) throw roomError;

      // Load rooms data first to ensure we have fresh participant data
      await Promise.all([loadActiveRooms(), loadMyRooms()]);
      setCurrentRoom(room);
      lastJoinedRoomIdRef.current = roomId;

      return true;
    } catch (error: any) {
      logger.error('Error joining room:', error);
      Alert.alert('Error', 'Failed to join room');
      return false;
    } finally {
      setLoading(false);
      isJoiningRoomRef.current = false;
    }
  };

  const leaveRoom = async (): Promise<void> => {
    if (!currentUser || !currentRoom) return;

    setLoading(true);
    try {
      // If user is creator, check for other participants
      if (currentRoom.creator_id === currentUser.id) {
        const { data: otherParticipants } = await supabase
          .from('room_participants')
          .select('user_id')
          .eq('room_id', currentRoom.id)
          .neq('user_id', currentUser.id);

        if (otherParticipants && otherParticipants.length > 0) {
          // Other participants exist - must transfer or delete
          Alert.alert(
            'Transfer or Delete',
            'You are the room creator. Transfer ownership to another member or delete the room.',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Delete Room',
                style: 'destructive',
                onPress: async () => await deleteRoom(currentRoom.id)
              }
            ]
          );
          return;
        } else {
          // No other participants - auto-delete the room
          await deleteRoom(currentRoom.id);
          return;
        }
      }

      // Non-creator can leave freely
      const { error: deleteError } = await supabase
        .from('room_participants')
        .delete()
        .eq('room_id', currentRoom.id)
        .eq('user_id', currentUser.id);

      if (deleteError) throw deleteError;

      setCurrentRoom(null);
      setRoomParticipants([]);
      lastJoinedRoomIdRef.current = null;
      await loadActiveRooms();
      await loadMyRooms();
    } catch (error: any) {
      logger.error('Error leaving room:', error);
      Alert.alert('Error', 'Failed to leave room');
    } finally {
      setLoading(false);
    }
  };

  // Leave a specific room by ID (for swipe-to-leave on non-active rooms)
  const leaveRoomById = async (roomId: string): Promise<void> => {
    if (!currentUser) return;

    try {
      const { error } = await supabase
        .from('room_participants')
        .delete()
        .eq('room_id', roomId)
        .eq('user_id', currentUser.id);

      if (error) throw error;

      // Clear current room if it was the one left
      if (currentRoom?.id === roomId) {
        setCurrentRoom(null);
        setRoomParticipants([]);
        lastJoinedRoomIdRef.current = null;
      }

      removeMyRoom(roomId);
      await loadMyRooms();
    } catch (error: any) {
      logger.error('Error leaving room:', error);
      Alert.alert('Error', 'Failed to leave room');
    }
  };

  const toggleMute = async (): Promise<void> => {
    if (!currentUser || !currentRoom) return;

    try {
      // Get current mute state
      const { data: participant } = await supabase
        .from('room_participants')
        .select('is_muted')
        .eq('room_id', currentRoom.id)
        .eq('user_id', currentUser.id)
        .single();

      if (!participant) return;

      // Toggle mute - RLS policy will verify auth.uid() matches user_id
      const { error } = await supabase
        .from('room_participants')
        .update({ is_muted: !participant.is_muted })
        .eq('room_id', currentRoom.id)
        .eq('user_id', currentUser.id);

      if (error) throw error;

      await loadParticipants();
    } catch (error: any) {
      logger.error('Error toggling mute:', error);
    }
  };

  // Delete room (creator only)
  const deleteRoom = async (roomId: string): Promise<boolean> => {
    if (!currentUser) return false;

    try {
      setLoading(true);

      // Verify user is creator
      const { data: room } = await supabase
        .from('rooms')
        .select('creator_id')
        .eq('id', roomId)
        .single();

      if (!room || room.creator_id !== currentUser.id) {
        Alert.alert('Error', 'Only the creator can delete this room');
        return false;
      }

      // Delete room (CASCADE will delete participants and invites)
      const { error } = await supabase
        .from('rooms')
        .delete()
        .eq('id', roomId);

      if (error) throw error;

      // Clear current room if it was deleted
      if (currentRoom?.id === roomId) {
        setCurrentRoom(null);
        setRoomParticipants([]);
      }

      removeMyRoom(roomId);
      await loadActiveRooms();
      await loadMyRooms();

      Alert.alert('Success', 'Room deleted');
      return true;
    } catch (error: any) {
      logger.error('Error deleting room:', error);
      Alert.alert('Error', 'Failed to delete room');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Update room name (creator only)
  const updateRoomName = async (roomId: string, newName: string): Promise<boolean> => {
    if (!currentUser) return false;

    try {
      setLoading(true);

      // Verify user is creator
      const { data: room } = await supabase
        .from('rooms')
        .select('creator_id')
        .eq('id', roomId)
        .single();

      if (!room || room.creator_id !== currentUser.id) {
        Alert.alert('Error', 'Only the creator can rename this room');
        return false;
      }

      // Optimistic update: Update local state immediately
      if (currentRoom?.id === roomId) {
        setCurrentRoom({ ...currentRoom, name: newName });
      }
      updateMyRoom(roomId, { name: newName });

      // Update database
      const { error } = await supabase
        .from('rooms')
        .update({ name: newName })
        .eq('id', roomId);

      if (error) throw error;

      // Don't immediately refresh - optimistic update is sufficient
      // The realtime subscription will sync any changes from other clients
      // Immediate refresh can cause race conditions that revert the name

      return true;
    } catch (error: any) {
      logger.error('Error updating room name:', error);
      Alert.alert('Error', 'Failed to update room name');

      // Rollback optimistic update on error by reloading from database
      await loadActiveRooms();
      await loadMyRooms();

      return false;
    } finally {
      setLoading(false);
    }
  };

  // Remove participant (creator only)
  const removeParticipant = async (roomId: string, userId: string): Promise<boolean> => {
    if (!currentUser) return false;

    try {
      setLoading(true);

      // Verify user is creator
      const { data: room } = await supabase
        .from('rooms')
        .select('creator_id')
        .eq('id', roomId)
        .single();

      if (!room || room.creator_id !== currentUser.id) {
        Alert.alert('Error', 'Only the creator can remove members');
        return false;
      }

      // Cannot remove creator
      if (userId === currentUser.id) {
        Alert.alert('Error', 'Cannot remove yourself. Leave or delete the room instead.');
        return false;
      }

      const { error } = await supabase
        .from('room_participants')
        .delete()
        .eq('room_id', roomId)
        .eq('user_id', userId);

      if (error) throw error;

      // Immediately update local state for instant UI feedback
      const currentParticipants = useAppStore.getState().roomParticipants;
      setRoomParticipants(currentParticipants.filter(p => p.user_id !== userId));

      // Then reload for full consistency
      await loadParticipants();
      await loadMyRooms();

      return true;
    } catch (error: any) {
      logger.error('Error removing participant:', error);
      Alert.alert('Error', 'Failed to remove participant');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Transfer ownership (creator only)
  const transferOwnership = async (roomId: string, newOwnerId: string): Promise<boolean> => {
    if (!currentUser) return false;

    try {
      setLoading(true);

      // Verify user is creator
      const { data: room } = await supabase
        .from('rooms')
        .select('creator_id')
        .eq('id', roomId)
        .single();

      if (!room || room.creator_id !== currentUser.id) {
        Alert.alert('Error', 'Only the creator can transfer ownership');
        return false;
      }

      // Verify new owner is a participant
      const { data: participant } = await supabase
        .from('room_participants')
        .select('id')
        .eq('room_id', roomId)
        .eq('user_id', newOwnerId)
        .single();

      if (!participant) {
        Alert.alert('Error', 'New owner must be a room member');
        return false;
      }

      const { error } = await supabase
        .from('rooms')
        .update({ creator_id: newOwnerId })
        .eq('id', roomId);

      if (error) throw error;

      // Update current room if it's the one being transferred
      if (currentRoom?.id === roomId) {
        setCurrentRoom({ ...currentRoom, creator_id: newOwnerId });
      }

      await loadMyRooms();

      Alert.alert('Success', 'Ownership transferred');
      return true;
    } catch (error: any) {
      logger.error('Error transferring ownership:', error);
      Alert.alert('Error', 'Failed to transfer ownership');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Invite friend to room
  const inviteFriendToRoom = async (roomId: string, friendId: string): Promise<boolean> => {
    if (!currentUser) return false;

    try {
      // Verify user is in the room
      const { data: participant } = await supabase
        .from('room_participants')
        .select('id')
        .eq('room_id', roomId)
        .eq('user_id', currentUser.id)
        .single();

      if (!participant) {
        Alert.alert('Error', 'You must be in the room to invite others');
        return false;
      }

      // Check if friend is already in the room
      const { data: existingParticipant } = await supabase
        .from('room_participants')
        .select('id')
        .eq('room_id', roomId)
        .eq('user_id', friendId)
        .maybeSingle();

      if (existingParticipant) {
        Alert.alert('Already in room', 'This friend is already in the room');
        return false;
      }

      // Check if invite already exists
      const { data: existingInvite } = await supabase
        .from('room_invites')
        .select('id')
        .eq('room_id', roomId)
        .eq('receiver_id', friendId)
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();

      if (existingInvite) {
        Alert.alert('Invite pending', 'This friend already has a pending invite');
        return false;
      }

      // Create invite
      const { error } = await supabase
        .from('room_invites')
        .insert({
          room_id: roomId,
          sender_id: currentUser.id,
          receiver_id: friendId,
        });

      if (error) throw error;

      Alert.alert('Success', 'Invite sent!');
      return true;
    } catch (error: any) {
      logger.error('Error inviting friend:', error);
      Alert.alert('Error', 'Failed to send invite');
      return false;
    }
  };

  // Clear the last joined room ID to allow rejoining
  const clearLastJoinedRoom = () => {
    lastJoinedRoomIdRef.current = null;
  };

  return {
    currentRoom,
    participants,
    activeRooms,
    myRooms,
    loading,
    canCreateRoom,
    createRoom,
    joinRoom,
    leaveRoom,
    leaveRoomById,
    toggleMute,
    deleteRoom,
    updateRoomName,
    removeParticipant,
    transferOwnership,
    inviteFriendToRoom,
    loadActiveRooms,
    loadMyRooms,
    loadParticipants,
    clearLastJoinedRoom,
  };
};
