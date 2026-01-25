import { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../stores/appStore';
import { Friendship } from '../types';

// Module-level subscription tracking to prevent duplicates
let activeFriendsSubscription: { cleanup: () => void; userId: string } | null = null;

// Throttle mechanism to prevent excessive API calls on realtime updates
let lastFriendsRefresh = 0;
const FRIENDS_REFRESH_THROTTLE_MS = 3000; // Only refresh every 3 seconds

/**
 * TESTING MODE TOGGLE
 *
 * Set to true to use mocked friend data for testing/development
 * Set to false to use real data from Supabase
 *
 * Mock data includes:
 * - 5 friends with various moods and online statuses
 * - 2 pending friend requests
 */
const USE_MOCK_DATA = true;

// Mock data for testing (matching the friends from index.tsx with avatars)
const MOCK_FRIENDS: Friendship[] = [
  {
    id: 'mock-1',
    user_id: 'current-user',
    friend_id: 'friend-1',
    status: 'accepted',
    visibility: 'full',
    created_at: new Date().toISOString(),
    last_interaction_at: new Date().toISOString(),
    friend: {
      id: 'friend-1',
      phone: '+1234567890',
      display_name: 'Alex',
      mood: 'good',
      is_online: true,
      last_seen_at: new Date().toISOString(),
      avatar_url: 'https://i.pravatar.cc/150?img=1',
      created_at: new Date().toISOString(),
    },
  },
  {
    id: 'mock-2',
    user_id: 'current-user',
    friend_id: 'friend-2',
    status: 'accepted',
    visibility: 'full',
    created_at: new Date().toISOString(),
    last_interaction_at: new Date().toISOString(),
    friend: {
      id: 'friend-2',
      phone: '+1234567891',
      display_name: 'Sam',
      mood: 'neutral',
      is_online: false,
      last_seen_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      avatar_url: 'https://i.pravatar.cc/150?img=5',
      created_at: new Date().toISOString(),
    },
  },
  {
    id: 'mock-3',
    user_id: 'current-user',
    friend_id: 'friend-3',
    status: 'accepted',
    visibility: 'full',
    created_at: new Date().toISOString(),
    last_interaction_at: new Date().toISOString(),
    friend: {
      id: 'friend-3',
      phone: '+1234567892',
      display_name: 'Jordan',
      mood: 'not_great',
      is_online: true,
      last_seen_at: new Date().toISOString(),
      avatar_url: 'https://i.pravatar.cc/150?img=12',
      created_at: new Date().toISOString(),
    },
  },
  {
    id: 'mock-4',
    user_id: 'current-user',
    friend_id: 'friend-4',
    status: 'accepted',
    visibility: 'full',
    created_at: new Date().toISOString(),
    last_interaction_at: new Date().toISOString(),
    friend: {
      id: 'friend-4',
      phone: '+1234567893',
      display_name: 'Taylor',
      mood: 'reach_out',
      is_online: false,
      last_seen_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      avatar_url: 'https://i.pravatar.cc/150?img=47',
      created_at: new Date().toISOString(),
    },
  },
  {
    id: 'mock-5',
    user_id: 'current-user',
    friend_id: 'friend-5',
    status: 'accepted',
    visibility: 'full',
    created_at: new Date().toISOString(),
    last_interaction_at: new Date().toISOString(),
    friend: {
      id: 'friend-5',
      phone: '+1234567894',
      display_name: 'Riley',
      mood: 'good',
      is_online: true,
      last_seen_at: new Date().toISOString(),
      avatar_url: 'https://i.pravatar.cc/150?img=33',
      created_at: new Date().toISOString(),
    },
  },
];

const MOCK_PENDING_REQUESTS: Friendship[] = [
  {
    id: 'mock-pending-1',
    user_id: 'friend-6',
    friend_id: 'current-user',
    status: 'pending',
    visibility: 'full',
    created_at: new Date().toISOString(),
    last_interaction_at: new Date().toISOString(),
    friend: {
      id: 'friend-6',
      phone: '+1234567895',
      display_name: 'Riley Davis',
      mood: 'neutral',
      is_online: true,
      last_seen_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    },
  },
  {
    id: 'mock-pending-2',
    user_id: 'friend-7',
    friend_id: 'current-user',
    status: 'pending',
    visibility: 'full',
    created_at: new Date().toISOString(),
    last_interaction_at: new Date().toISOString(),
    friend: {
      id: 'friend-7',
      phone: '+1234567896',
      display_name: 'Casey Wilson',
      mood: 'good',
      is_online: false,
      last_seen_at: new Date(Date.now() - 1800000).toISOString(),
      created_at: new Date().toISOString(),
    },
  },
];

export const useFriends = () => {
  const { currentUser, friends, setFriends, removeFriend } = useAppStore();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  useEffect(() => {
    if (currentUser) {
      console.log('Initializing friends for user:', currentUser.id);
      loadFriends(true);
      const cleanup = setupRealtimeSubscription();
      return cleanup;
    } else {
      setInitialLoading(false);
      setFriends([]); // Clear friends when no user
    }
  }, [currentUser?.id]); // Use id to avoid re-running on mood change

  const loadFriends = async (isInitial = false) => {
    if (!currentUser) return;

    console.log(`========== LOAD FRIENDS START (isInitial: ${isInitial}) ==========`);
    console.log('Current user:', currentUser.id);
    console.log('Current friends count in store:', friends.length);

    if (isInitial) {
      setInitialLoading(true);
      // Clear any stale friends data when doing initial load
      setFriends([]);
    }

    try {
      // Use mocked data if enabled
      if (USE_MOCK_DATA) {
        setFriends(MOCK_FRIENDS);
        setHasLoadedOnce(true);
        return;
      }

      console.log('Querying friendships table...');
      const { data, error } = await supabase
        .from('friendships')
        .select(`
          *,
          friend:friend_id (
            id,
            display_name,
            mood,
            custom_mood_id,
            is_online,
            last_seen_at,
            avatar_url,
            custom_mood:custom_mood_id (
              id,
              emoji,
              text,
              color
            )
          )
        `)
        .eq('user_id', currentUser.id)
        .eq('status', 'accepted');

      if (error) throw error;

      console.log(`Loaded ${data?.length || 0} friends from database`);

      // Fetch blocks to filter out blocked users
      const { data: blocks } = await supabase
        .from('blocks')
        .select('blocked_id')
        .eq('blocker_id', currentUser.id);

      const blockedIds = new Set(blocks?.map(b => b.blocked_id) || []);

      // Filter out blocked friends
      const filteredFriends = data?.filter(f => !blockedIds.has(f.friend_id)) || [];

      console.log(`After filtering blocks: ${filteredFriends.length} friends`);
      if (filteredFriends.length > 0) {
        console.log('First friend:', JSON.stringify(filteredFriends[0], null, 2));
        console.log('All friend IDs:', filteredFriends.map(f => f.friend_id).join(', '));
      }

      console.log('Setting friends in store...');
      setFriends(filteredFriends);
      setHasLoadedOnce(true);
      console.log('========== LOAD FRIENDS END (success) ==========');
    } catch (error: any) {
      console.error('Error loading friends:', error);
      setFriends([]); // Clear friends on error
      console.log('========== LOAD FRIENDS END (error) ==========');
    } finally {
      if (isInitial) setInitialLoading(false);
    }
  };


  const setupRealtimeSubscription = () => {
    if (!currentUser) return () => {};

    // Prevent duplicate subscriptions - return existing cleanup to properly cleanup on unmount
    if (activeFriendsSubscription && activeFriendsSubscription.userId === currentUser.id) {
      console.log('Realtime subscription already exists for this user, returning existing cleanup');
      return activeFriendsSubscription.cleanup;
    }

    if (activeFriendsSubscription) {
      console.log('Cleaning up old subscription for different user');
      activeFriendsSubscription.cleanup();
      activeFriendsSubscription = null;
    }

    console.log('Setting up new realtime subscription for user:', currentUser.id);

    // Throttled refresh to prevent excessive API calls
    const throttledLoadFriends = (payload?: any) => {
      console.log('Realtime event triggered:', payload?.eventType, 'table:', payload?.table);
      const now = Date.now();
      if (now - lastFriendsRefresh < FRIENDS_REFRESH_THROTTLE_MS) {
        console.log('Refresh throttled - too soon since last refresh');
        return;
      }
      lastFriendsRefresh = now;
      console.log('Refreshing friends due to realtime event');
      loadFriends();
    };

    const channel = supabase
      .channel(`friendships-changes-${currentUser.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'friendships',
          filter: `user_id=eq.${currentUser.id}`,
        },
        throttledLoadFriends
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'friendships',
          filter: `friend_id=eq.${currentUser.id}`,
        },
        throttledLoadFriends
      )
      .subscribe();

    const cleanup = () => {
      console.log('Cleaning up realtime subscription');
      supabase.removeChannel(channel);
      if (activeFriendsSubscription && activeFriendsSubscription.userId === currentUser.id) {
        activeFriendsSubscription = null;
      }
    };

    activeFriendsSubscription = { cleanup, userId: currentUser.id };

    return cleanup;
  };

  const addFriend = async (userId: string): Promise<boolean> => {
    if (!currentUser) {
      Alert.alert('Error', 'You must be logged in');
      return false;
    }

    console.log('========== ADD FRIEND START ==========');
    console.log('Current user:', currentUser.id);
    console.log('Friend to add:', userId);
    console.log('Current friends in store:', friends.length);

    setLoading(true);
    try {
      // Mock mode: just show success
      if (USE_MOCK_DATA) {
        Alert.alert('Success', 'Friend added (mock mode)');
        setLoading(false);
        return true;
      }

      if (userId === currentUser.id) {
        Alert.alert('Error', 'You cannot add yourself as a friend');
        return false;
      }

      // Check if friendship already exists (either direction)
      console.log('Step 1: Checking if friendship already exists...');
      const { data: existing, error: checkError } = await supabase
        .from('friendships')
        .select('id, user_id, friend_id, status')
        .or(`and(user_id.eq.${currentUser.id},friend_id.eq.${userId}),and(user_id.eq.${userId},friend_id.eq.${currentUser.id})`);

      console.log('Existing friendship check result:', JSON.stringify(existing, null, 2));
      console.log('Check error:', checkError);

      if (checkError) {
        console.error('Error checking existing friendship:', checkError);
      }

      if (existing && existing.length > 0) {
        console.log('Existing friendship found! Count:', existing.length);

        // Check if BOTH directions exist
        const hasForward = existing.some(f => f.user_id === currentUser.id && f.friend_id === userId);
        const hasReverse = existing.some(f => f.user_id === userId && f.friend_id === currentUser.id);

        console.log('Has forward direction (me → them):', hasForward);
        console.log('Has reverse direction (them → me):', hasReverse);

        if (hasForward && hasReverse) {
          console.log('Both directions exist! Refreshing friends list.');
          await loadFriends();
          console.log('After loadFriends, store now has:', friends.length, 'friends');
          console.log('========== ADD FRIEND END (already existed) ==========');
          return true;
        }

        // Only ONE direction exists - insert the missing direction
        console.log('Only one direction exists! Inserting missing direction...');
        const missingRecords = [];
        if (!hasForward) {
          missingRecords.push({
            user_id: currentUser.id,
            friend_id: userId,
            status: 'accepted',
          });
          console.log('Missing: me → them');
        }
        if (!hasReverse) {
          missingRecords.push({
            user_id: userId,
            friend_id: currentUser.id,
            status: 'accepted',
          });
          console.log('Missing: them → me');
        }

        const { data: insertedMissing, error: insertMissingError } = await supabase
          .from('friendships')
          .insert(missingRecords)
          .select();

        if (insertMissingError) {
          console.error('Error inserting missing direction:', insertMissingError);
          if (insertMissingError.code !== '23505') {
            throw insertMissingError;
          }
        } else {
          console.log('Successfully inserted missing direction(s):', insertedMissing?.length);
        }

        await loadFriends();
        console.log('After loadFriends, store now has:', friends.length, 'friends');
        console.log('========== ADD FRIEND END (fixed missing direction) ==========');
        return true;
      }

      console.log('Step 2: No existing friendship found, proceeding to create new friendship');

      // Get user details for confirmation message
      const { data: targetUser } = await supabase
        .from('users')
        .select('display_name')
        .eq('id', userId)
        .single();

      console.log('Target user:', targetUser?.display_name);

      // Create instant two-way friendship (no pending state)
      console.log(`Step 3: Creating two-way friendship: ${currentUser.id} <-> ${userId}`);
      const { data: insertedData, error: insertError } = await supabase
        .from('friendships')
        .insert([
          {
            user_id: currentUser.id,
            friend_id: userId,
            status: 'accepted',
          },
          {
            user_id: userId,
            friend_id: currentUser.id,
            status: 'accepted',
          },
        ])
        .select();

      if (insertError) {
        console.error('Insert error:', insertError);
        // Handle duplicate key error - means they're already friends
        if (insertError.code === '23505') {
          console.log('Duplicate key error - already friends, refreshing list');
          await loadFriends();
          console.log('After loadFriends (dup error), store now has:', friends.length, 'friends');
          console.log('========== ADD FRIEND END (duplicate) ==========');
          return true; // Silently succeed since they're already friends
        }
        throw insertError;
      }

      console.log(`Step 4: Successfully inserted ${insertedData?.length || 0} friendship records`);
      console.log('Inserted data:', JSON.stringify(insertedData, null, 2));

      console.log('Step 5: Refreshing friends list after add...');
      console.log('Friends in store before refresh:', friends.length);
      await loadFriends();
      console.log('Friends in store after refresh:', friends.length);

      Alert.alert('Success', `${targetUser?.display_name || 'Friend'} added!`);
      console.log('========== ADD FRIEND END (success) ==========');
      return true;
    } catch (error: any) {
      console.error('Error adding friend:', error);

      // Don't show error for duplicate - just refresh
      if (error.code === '23505') {
        await loadFriends();
        console.log('========== ADD FRIEND END (error but duplicate) ==========');
        return true;
      }

      Alert.alert('Error', error.message || 'Failed to add friend');
      console.log('========== ADD FRIEND END (error) ==========');
      return false;
    } finally {
      setLoading(false);
    }
  };


  const removeFriendship = async (friendId: string): Promise<boolean> => {
    if (!currentUser) return false;

    console.log('========== REMOVE FRIEND START ==========');
    console.log('Current user:', currentUser.id);
    console.log('Friend to remove:', friendId);
    console.log('Current friends in store:', friends.length);

    setLoading(true);
    try {
      // Mock mode: remove from friends list
      if (USE_MOCK_DATA) {
        setFriends(friends.filter(f => f.friend_id !== friendId));
        setLoading(false);
        return true;
      }

      console.log('Step 1: Checking friendships before deletion...');
      const { data: beforeDelete } = await supabase
        .from('friendships')
        .select('id, user_id, friend_id, status')
        .or(`and(user_id.eq.${currentUser.id},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${currentUser.id})`);

      console.log('Friendships found before delete:', JSON.stringify(beforeDelete, null, 2));

      // Delete both directions of the friendship
      console.log('Step 2: Deleting both directions of friendship...');
      const { data, error, count } = await supabase
        .from('friendships')
        .delete()
        .or(`and(user_id.eq.${currentUser.id},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${currentUser.id})`)
        .select();

      if (error) throw error;

      console.log(`Step 3: Deleted ${data?.length || 0} friendship records`);
      console.log('Deleted records:', JSON.stringify(data, null, 2));

      console.log('Step 4: Verifying deletion from database...');
      const { data: afterDelete } = await supabase
        .from('friendships')
        .select('id')
        .or(`and(user_id.eq.${currentUser.id},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${currentUser.id})`);

      console.log('Friendships remaining after delete:', afterDelete?.length || 0);

      // Immediately update local state to prevent the realtime subscription from showing stale data
      console.log('Step 5: Updating local state...');
      console.log('Friends before filter:', friends.length);
      setFriends(friends.filter(f => f.friend_id !== friendId));
      console.log('Friends should now be:', friends.filter(f => f.friend_id !== friendId).length);

      console.log('========== REMOVE FRIEND END (success) ==========');
      return true;
    } catch (error: any) {
      console.error('Error removing friend:', error);
      Alert.alert('Error', 'Failed to remove friend');
      console.log('========== REMOVE FRIEND END (error) ==========');
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    friends,
    loading,
    initialLoading,
    hasLoadedOnce,
    addFriend,
    removeFriendship,
    refreshFriends: loadFriends,
  };
};
