import { logger } from '../lib/logger';
import { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../stores/appStore';
import { Anchor } from '../types';

type Visibility = 'full' | 'limited' | 'minimal' | 'hidden';

export const useSafety = () => {
  const { currentUser, setCurrentUser } = useAppStore();
  const [anchors, setAnchors] = useState<Anchor[]>([]);
  const [isInGhostMode, setIsInGhostMode] = useState(false);
  const [isOnBreak, setIsOnBreak] = useState(false);
  const [loading, setLoading] = useState(false);

  // Derive ghost/break mode from store instead of redundant network queries
  useEffect(() => {
    if (currentUser) {
      loadAnchors();
      // Derive from currentUser in store instead of querying DB
      const now = new Date();
      setIsInGhostMode(
        !!currentUser.ghost_mode_until && new Date(currentUser.ghost_mode_until) > now
      );
      setIsOnBreak(
        !!currentUser.take_break_until && new Date(currentUser.take_break_until) > now
      );
    }
  }, [currentUser?.id, currentUser?.ghost_mode_until, currentUser?.take_break_until]);

  const loadAnchors = async () => {
    if (!currentUser) return;

    try {
      const { data, error } = await supabase
        .from('anchors')
        .select(`
          *,
          anchor:anchor_id (
            id,
            display_name,
            avatar_url
          )
        `)
        .eq('user_id', currentUser.id);

      if (error) throw error;
      setAnchors(data || []);
    } catch (error: any) {
      logger.error('Error loading anchors:', error);
    }
  };

  const checkGhostMode = async () => {
    if (!currentUser) return;

    try {
      const { data, error } = await supabase
        .from('users')
        .select('ghost_mode_until')
        .eq('id', currentUser.id)
        .single();

      if (error) throw error;

      if (data?.ghost_mode_until) {
        const ghostUntil = new Date(data.ghost_mode_until);
        setIsInGhostMode(ghostUntil > new Date());
      } else {
        setIsInGhostMode(false);
      }
    } catch (error: any) {
      logger.error('Error checking ghost mode:', error);
    }
  };

  const checkBreakMode = async () => {
    if (!currentUser) return;

    try {
      const { data, error } = await supabase
        .from('users')
        .select('take_break_until')
        .eq('id', currentUser.id)
        .single();

      if (error) throw error;

      if (data?.take_break_until) {
        const breakUntil = new Date(data.take_break_until);
        setIsOnBreak(breakUntil > new Date());
      } else {
        setIsOnBreak(false);
      }
    } catch (error: any) {
      logger.error('Error checking break mode:', error);
    }
  };

  const enableGhostMode = async (durationMinutes: number): Promise<boolean> => {
    if (!currentUser) {
      Alert.alert('Error', 'You must be logged in');
      return false;
    }

    setLoading(true);
    try {
      const ghostUntil = new Date(Date.now() + durationMinutes * 60 * 1000);

      const { error } = await supabase
        .from('users')
        .update({ ghost_mode_until: ghostUntil.toISOString() })
        .eq('id', currentUser.id);

      if (error) throw error;

      // Sync to Zustand store so other hooks can react
      setCurrentUser({ ...currentUser, ghost_mode_until: ghostUntil.toISOString() });

      setIsInGhostMode(true);
      Alert.alert('Ghost Mode Enabled', `You're invisible for ${durationMinutes} minutes`);
      return true;
    } catch (error: any) {
      logger.error('Error enabling ghost mode:', error);
      Alert.alert('Error', 'Failed to enable ghost mode');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const disableGhostMode = async (): Promise<boolean> => {
    if (!currentUser) return false;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({ ghost_mode_until: null })
        .eq('id', currentUser.id);

      if (error) throw error;

      // Sync to Zustand store
      setCurrentUser({ ...currentUser, ghost_mode_until: undefined });

      setIsInGhostMode(false);
      return true;
    } catch (error: any) {
      logger.error('Error disabling ghost mode:', error);
      Alert.alert('Error', 'Failed to disable ghost mode');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const takeBreak = async (durationHours: number): Promise<boolean> => {
    if (!currentUser) {
      Alert.alert('Error', 'You must be logged in');
      return false;
    }

    setLoading(true);
    try {
      const breakUntil = new Date(Date.now() + durationHours * 60 * 60 * 1000);

      const { error } = await supabase
        .from('users')
        .update({ take_break_until: breakUntil.toISOString() })
        .eq('id', currentUser.id);

      if (error) throw error;

      // Sync to Zustand store so other hooks can react
      setCurrentUser({ ...currentUser, take_break_until: breakUntil.toISOString() });

      setIsOnBreak(true);
      Alert.alert('Break Mode Enabled', `Taking a break for ${durationHours} hours`);
      return true;
    } catch (error: any) {
      logger.error('Error enabling break mode:', error);
      Alert.alert('Error', 'Failed to enable break mode');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const endBreak = async (): Promise<boolean> => {
    if (!currentUser) return false;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({ take_break_until: null })
        .eq('id', currentUser.id);

      if (error) throw error;

      // Sync to Zustand store
      setCurrentUser({ ...currentUser, take_break_until: undefined });

      setIsOnBreak(false);
      return true;
    } catch (error: any) {
      logger.error('Error ending break:', error);
      Alert.alert('Error', 'Failed to end break');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const reportUser = async (
    userId: string,
    reportType: string,
    details?: string
  ): Promise<boolean> => {
    if (!currentUser) {
      Alert.alert('Error', 'You must be logged in');
      return false;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('reports')
        .insert({
          reporter_id: currentUser.id,
          reported_id: userId,
          report_type: reportType,
          details: details || null,
          status: 'pending',
        });

      if (error) throw error;

      Alert.alert('Report Submitted', 'Thank you for your report. We will review it shortly.');
      return true;
    } catch (error: any) {
      logger.error('Error reporting user:', error);
      Alert.alert('Error', 'Failed to submit report');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const addAnchor = async (userId: string): Promise<boolean> => {
    if (!currentUser) {
      Alert.alert('Error', 'You must be logged in');
      return false;
    }

    // Check if already at max anchors (2)
    if (anchors.length >= 2) {
      Alert.alert('Max Anchors', 'You can only have 2 anchors. Remove one to add another.');
      return false;
    }

    setLoading(true);
    try {
      // Check if already an anchor
      const { data: existing } = await supabase
        .from('anchors')
        .select('*')
        .eq('user_id', currentUser.id)
        .eq('anchor_id', userId)
        .maybeSingle();

      if (existing) {
        Alert.alert('Already Anchor', 'This user is already your anchor');
        return false;
      }

      const { error } = await supabase
        .from('anchors')
        .insert({
          user_id: currentUser.id,
          anchor_id: userId,
        });

      if (error) throw error;

      await loadAnchors();
      Alert.alert('Anchor Added', 'This person is now your safety anchor');
      return true;
    } catch (error: any) {
      logger.error('Error adding anchor:', error);
      Alert.alert('Error', 'Failed to add anchor');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const removeAnchor = async (userId: string): Promise<boolean> => {
    if (!currentUser) return false;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('anchors')
        .delete()
        .eq('user_id', currentUser.id)
        .eq('anchor_id', userId);

      if (error) throw error;

      await loadAnchors();
      Alert.alert('Anchor Removed', 'This person is no longer your anchor');
      return true;
    } catch (error: any) {
      logger.error('Error removing anchor:', error);
      Alert.alert('Error', 'Failed to remove anchor');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const setFriendVisibility = async (
    friendshipId: string,
    visibility: Visibility
  ): Promise<boolean> => {
    if (!currentUser) return false;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('friendships')
        .update({ visibility })
        .eq('id', friendshipId);

      if (error) throw error;

      Alert.alert('Visibility Updated', 'Friend visibility settings have been updated');
      return true;
    } catch (error: any) {
      logger.error('Error updating visibility:', error);
      Alert.alert('Error', 'Failed to update visibility');
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    anchors,
    isInGhostMode,
    isOnBreak,
    loading,
    enableGhostMode,
    disableGhostMode,
    takeBreak,
    endBreak,
    reportUser,
    addAnchor,
    removeAnchor,
    setFriendVisibility,
  };
};
