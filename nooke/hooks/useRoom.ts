import { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../stores/appStore';
import { Room, RoomParticipant } from '../types';

export const useRoom = () => {
  const { currentUser, currentRoom, setCurrentRoom, setActiveRooms, myRooms, setMyRooms, addMyRoom, removeMyRoom } = useAppStore();
  const [participants, setParticipants] = useState<RoomParticipant[]>([]);
  const [activeRooms, setActiveRoomsList] = useState<Room[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (currentUser) {
      loadActiveRooms();
      loadMyRooms();
      setupRealtimeSubscription();
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentRoom) {
      loadParticipants();
    }
  }, [currentRoom]);

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
              mood
            )
          )
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const rooms = data || [];
      setActiveRoomsList(rooms);
      setActiveRooms(rooms);
    } catch (error: any) {
      console.error('Error loading active rooms:', error);
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
              is_online
            )
          )
        `)
        .in('id', roomIds)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setMyRooms(data || []);
    } catch (error: any) {
      console.error('Error loading my rooms:', error);
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
            is_online
          )
        `)
        .eq('room_id', currentRoom.id);

      if (error) throw error;
      setParticipants(data || []);
    } catch (error: any) {
      console.error('Error loading participants:', error);
    }
  };

  const setupRealtimeSubscription = () => {
    if (!currentUser) return;

    // Subscribe to room changes
    const roomsChannel = supabase
      .channel('rooms-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rooms',
        },
        () => {
          loadActiveRooms();
        }
      )
      .subscribe();

    // Subscribe to participant changes
    const participantsChannel = supabase
      .channel('participants-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'room_participants',
        },
        () => {
          if (currentRoom) {
            loadParticipants();
          }
          loadActiveRooms();
          loadMyRooms();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(roomsChannel);
      supabase.removeChannel(participantsChannel);
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
      console.error('Error checking room limit:', error);
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
        // TODO: Send push notifications
      }

      setCurrentRoom(room);
      addMyRoom(room);
      await loadActiveRooms();
      await loadMyRooms();

      return room;
    } catch (error: any) {
      console.error('Error creating room:', error);
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
          setCurrentRoom(room);
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

      setCurrentRoom(room);
      await loadActiveRooms();
      await loadMyRooms();

      return true;
    } catch (error: any) {
      console.error('Error joining room:', error);
      Alert.alert('Error', 'Failed to join room');
      return false;
    } finally {
      setLoading(false);
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
      setParticipants([]);
      await loadActiveRooms();
      await loadMyRooms();
    } catch (error: any) {
      console.error('Error leaving room:', error);
      Alert.alert('Error', 'Failed to leave room');
    } finally {
      setLoading(false);
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
      console.error('Error toggling mute:', error);
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
        setParticipants([]);
      }

      removeMyRoom(roomId);
      await loadActiveRooms();
      await loadMyRooms();

      Alert.alert('Success', 'Room deleted');
      return true;
    } catch (error: any) {
      console.error('Error deleting room:', error);
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

      const { error } = await supabase
        .from('rooms')
        .update({ name: newName })
        .eq('id', roomId);

      if (error) throw error;

      // Update current room if it's the one being renamed
      if (currentRoom?.id === roomId) {
        setCurrentRoom({ ...currentRoom, name: newName });
      }

      await loadActiveRooms();
      await loadMyRooms();

      return true;
    } catch (error: any) {
      console.error('Error updating room name:', error);
      Alert.alert('Error', 'Failed to update room name');
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

      await loadParticipants();
      await loadMyRooms();

      return true;
    } catch (error: any) {
      console.error('Error removing participant:', error);
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
      console.error('Error transferring ownership:', error);
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
      console.error('Error inviting friend:', error);
      Alert.alert('Error', 'Failed to send invite');
      return false;
    }
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
    toggleMute,
    deleteRoom,
    updateRoomName,
    removeParticipant,
    transferOwnership,
    inviteFriendToRoom,
    loadActiveRooms,
    loadMyRooms,
  };
};
