import { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../stores/appStore';
import { RoomInvite } from '../types';

// Module-level subscription tracking to prevent duplicates
let activeInvitesSubscription: { cleanup: () => void; userId: string } | null = null;

// Throttle mechanism for invite updates
let lastInvitesRefresh = 0;
const INVITES_REFRESH_THROTTLE_MS = 2000; // Only refresh every 2 seconds

export const useRoomInvites = () => {
  const { currentUser, roomInvites, setRoomInvites, addRoomInvite, removeRoomInvite } = useAppStore();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (currentUser) {
      loadMyInvites();
      const cleanup = setupRealtimeSubscription();
      return cleanup;
    }
  }, [currentUser?.id]); // Use id to avoid re-running on mood change

  // MOCK MODE FLAG - should match useRoom.ts
  const USE_MOCK_DATA = true;

  // Load pending invites for current user
  const loadMyInvites = async () => {
    if (!currentUser) return;

    // MOCK MODE: Skip Supabase query, use empty invites
    if (USE_MOCK_DATA) {
      setRoomInvites([]);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('room_invites')
        .select(`
          *,
          room:room_id (
            id,
            name,
            creator_id,
            is_active
          ),
          sender:sender_id (
            id,
            display_name,
            avatar_url
          )
        `)
        .eq('receiver_id', currentUser.id)
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      setRoomInvites(data || []);
    } catch (error: any) {
      console.error('Error loading invites:', error);
      Alert.alert('Error', 'Failed to load invites');
    } finally {
      setLoading(false);
    }
  };

  // Send invite to a friend
  const sendInvite = async (roomId: string, friendId: string) => {
    if (!currentUser) return false;

    try {
      setLoading(true);

      // Check if invite already exists
      const { data: existing } = await supabase
        .from('room_invites')
        .select('id, status')
        .eq('room_id', roomId)
        .eq('receiver_id', friendId)
        .eq('status', 'pending')
        .single();

      if (existing) {
        Alert.alert('Already Invited', 'This friend has already been invited to this room');
        return false;
      }

      // Create invite
      const { data, error } = await supabase
        .from('room_invites')
        .insert({
          room_id: roomId,
          sender_id: currentUser.id,
          receiver_id: friendId,
        })
        .select(`
          *,
          room:room_id (
            id,
            name,
            creator_id
          ),
          sender:sender_id (
            id,
            display_name,
            avatar_url
          )
        `)
        .single();

      if (error) throw error;

      // TODO: Send push notification to friendId
      // This would call a Supabase Edge Function to send the notification

      return true;
    } catch (error: any) {
      console.error('Error sending invite:', error);
      Alert.alert('Error', 'Failed to send invite');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Send multiple invites at once
  const sendBulkInvites = async (roomId: string, friendIds: string[]) => {
    if (!currentUser || friendIds.length === 0) return false;

    try {
      setLoading(true);

      // Filter out friends who already have pending invites
      const { data: existingInvites } = await supabase
        .from('room_invites')
        .select('receiver_id')
        .eq('room_id', roomId)
        .eq('status', 'pending')
        .in('receiver_id', friendIds);

      const existingReceiverIds = existingInvites?.map(i => i.receiver_id) || [];
      const newFriendIds = friendIds.filter(id => !existingReceiverIds.includes(id));

      if (newFriendIds.length === 0) {
        Alert.alert('Already Invited', 'All selected friends have already been invited');
        return false;
      }

      // Create invites
      const invites = newFriendIds.map(friendId => ({
        room_id: roomId,
        sender_id: currentUser.id,
        receiver_id: friendId,
      }));

      const { error } = await supabase
        .from('room_invites')
        .insert(invites);

      if (error) throw error;

      // TODO: Send push notifications to all friendIds

      Alert.alert('Success', `Sent ${newFriendIds.length} invite(s)`);
      return true;
    } catch (error: any) {
      console.error('Error sending invites:', error);
      Alert.alert('Error', 'Failed to send invites');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Accept invite and join room
  const acceptInvite = async (inviteId: string) => {
    if (!currentUser) return false;

    try {
      setLoading(true);

      // Get invite details
      const { data: invite, error: inviteError } = await supabase
        .from('room_invites')
        .select('*, room:room_id(*)')
        .eq('id', inviteId)
        .single();

      if (inviteError) throw inviteError;

      if (!invite || !invite.room) {
        Alert.alert('Error', 'Invite not found');
        return false;
      }

      // Check if room is full (max 10 members)
      const { data: participants, error: countError } = await supabase
        .from('room_participants')
        .select('id')
        .eq('room_id', invite.room_id);

      if (countError) throw countError;

      if (participants && participants.length >= 10) {
        Alert.alert('Room Full', 'This room has reached its maximum capacity of 10 members');
        return false;
      }

      // Update invite status
      const { error: updateError } = await supabase
        .from('room_invites')
        .update({
          status: 'accepted',
          responded_at: new Date().toISOString(),
        })
        .eq('id', inviteId);

      if (updateError) throw updateError;

      // Add user to room_participants
      const { error: participantError } = await supabase
        .from('room_participants')
        .insert({
          room_id: invite.room_id,
          user_id: currentUser.id,
          is_muted: false,
        });

      if (participantError) throw participantError;

      // Remove from local state
      removeRoomInvite(inviteId);

      Alert.alert('Success', 'You joined the room!');
      return true;
    } catch (error: any) {
      console.error('Error accepting invite:', error);
      Alert.alert('Error', 'Failed to accept invite');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Decline invite
  const declineInvite = async (inviteId: string) => {
    if (!currentUser) return false;

    try {
      setLoading(true);

      const { error } = await supabase
        .from('room_invites')
        .update({
          status: 'declined',
          responded_at: new Date().toISOString(),
        })
        .eq('id', inviteId);

      if (error) throw error;

      // Remove from local state
      removeRoomInvite(inviteId);

      return true;
    } catch (error: any) {
      console.error('Error declining invite:', error);
      Alert.alert('Error', 'Failed to decline invite');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Get pending invites for a room (for creator to see who hasn't accepted)
  const getPendingInvitesForRoom = async (roomId: string) => {
    if (!currentUser) return [];

    try {
      const { data, error } = await supabase
        .from('room_invites')
        .select(`
          *,
          sender:sender_id (
            id,
            display_name,
            avatar_url
          )
        `)
        .eq('room_id', roomId)
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString());

      if (error) throw error;
      return data || [];
    } catch (error: any) {
      console.error('Error loading room invites:', error);
      return [];
    }
  };

  // Cancel invite (for sender)
  const cancelInvite = async (inviteId: string) => {
    if (!currentUser) return false;

    try {
      setLoading(true);

      const { error } = await supabase
        .from('room_invites')
        .delete()
        .eq('id', inviteId)
        .eq('sender_id', currentUser.id);

      if (error) throw error;

      return true;
    } catch (error: any) {
      console.error('Error canceling invite:', error);
      Alert.alert('Error', 'Failed to cancel invite');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Setup realtime subscription for invite changes
  const setupRealtimeSubscription = () => {
    if (!currentUser) return () => {};

    // Prevent duplicate subscriptions - return existing cleanup for proper unmount
    if (activeInvitesSubscription && activeInvitesSubscription.userId === currentUser.id) {
      return activeInvitesSubscription.cleanup;
    }

    if (activeInvitesSubscription) {
      activeInvitesSubscription.cleanup();
      activeInvitesSubscription = null;
    }

    // Throttled invite load
    const throttledLoadInvites = () => {
      const now = Date.now();
      if (now - lastInvitesRefresh < INVITES_REFRESH_THROTTLE_MS) return;
      lastInvitesRefresh = now;
      loadMyInvites();
    };

    const invitesChannel = supabase
      .channel('room-invites-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'room_invites',
          filter: `receiver_id=eq.${currentUser.id}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            throttledLoadInvites();
          } else if (payload.eventType === 'DELETE' ||
                     (payload.eventType === 'UPDATE' && payload.new.status !== 'pending')) {
            removeRoomInvite(payload.old?.id || payload.new?.id);
          }
        }
      )
      .subscribe();

    const cleanup = () => {
      supabase.removeChannel(invitesChannel);
      activeInvitesSubscription = null;
    };

    activeInvitesSubscription = { cleanup, userId: currentUser.id };

    return cleanup;
  };

  return {
    roomInvites,
    loading,
    loadMyInvites,
    sendInvite,
    sendBulkInvites,
    acceptInvite,
    declineInvite,
    getPendingInvitesForRoom,
    cancelInvite,
  };
};
