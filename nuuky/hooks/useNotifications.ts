import { logger } from '../lib/logger';
import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../stores/appStore';
import { subscriptionManager } from '../lib/subscriptionManager';
import { AppNotification } from '../types';

export const useNotifications = () => {
  const router = useRouter();
  const pathname = usePathname();
  const currentUser = useAppStore((s) => s.currentUser);
  const notifications = useAppStore((s) => s.notifications);
  const unreadNotificationCount = useAppStore((s) => s.unreadNotificationCount);
  const setNotifications = useAppStore((s) => s.setNotifications);
  const addNotification = useAppStore((s) => s.addNotification);
  const markNotificationRead = useAppStore((s) => s.markNotificationRead);
  const markAllNotificationsRead = useAppStore((s) => s.markAllNotificationsRead);
  const removeNotification = useAppStore((s) => s.removeNotification);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (currentUser) {
      loadNotifications();
      const cleanup = setupRealtimeSubscription();
      return cleanup;
    }
  }, [currentUser?.id]);

  // Load notifications from Supabase
  const loadNotifications = async () => {
    if (!currentUser) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      setNotifications(data || []);
    } catch (error: any) {
      logger.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  // Refresh notifications (for pull-to-refresh)
  const refreshNotifications = async () => {
    if (!currentUser) return;

    setRefreshing(true);
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      setNotifications(data || []);
    } catch (error: any) {
      logger.error('Error refreshing notifications:', error);
      Alert.alert('Error', 'Failed to refresh notifications. Please try again.');
    } finally {
      setRefreshing(false);
    }
  };

  // Mark single notification as read
  const markAsRead = async (notificationId: string) => {
    if (!currentUser) return false;

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId)
        .eq('user_id', currentUser.id);

      if (error) throw error;

      // Update local state
      markNotificationRead(notificationId);
      return true;
    } catch (error: any) {
      logger.error('Error marking notification as read:', error);
      return false;
    }
  };

  // Mark all notifications as read
  const markAllAsRead = async () => {
    if (!currentUser) return false;

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', currentUser.id)
        .eq('is_read', false);

      if (error) throw error;

      // Update local state
      markAllNotificationsRead();
      return true;
    } catch (error: any) {
      logger.error('Error marking all notifications as read:', error);
      return false;
    }
  };

  // Delete a notification
  const deleteNotification = async (notificationId: string) => {
    if (!currentUser) return false;

    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId)
        .eq('user_id', currentUser.id);

      if (error) throw error;

      // Update local state
      removeNotification(notificationId);
      return true;
    } catch (error: any) {
      logger.error('Error deleting notification:', error);
      return false;
    }
  };

  // Handle notification tap - navigate based on type
  // Returns the notification data for special handling (e.g., photo_nudge)
  const handleNotificationTap = useCallback(async (notification: AppNotification): Promise<AppNotification> => {
    // Mark as read first
    if (!notification.is_read) {
      await markAsRead(notification.id);
    }

    // Navigate based on notification type (skip if already on target screen)
    switch (notification.type) {
      case 'nudge':
      case 'flare':
      case 'streak_fading':
        // Navigate to home (Quantum Orbit) - friend context is in the data
        // Don't navigate if already on main screen
        if (pathname !== '/' && pathname !== '/(main)') {
          router.push('/(main)');
        }
        break;
      case 'photo_nudge':
        // Navigate to home with photo_nudge_id param to open the viewer
        if (notification.data?.photo_nudge_id) {
          router.push({
            pathname: '/(main)',
            params: { photo_nudge_id: notification.data.photo_nudge_id },
          });
        } else if (pathname !== '/' && pathname !== '/(main)') {
          router.push('/(main)');
        }
        break;
      case 'voice_moment':
      case 'voice_moment_reaction':
        // Navigate to home with voice_moment_id param to open the player
        if (notification.data?.voice_moment_id) {
          router.push({
            pathname: '/(main)',
            params: { voice_moment_id: notification.data.voice_moment_id },
          });
        } else if (pathname !== '/' && pathname !== '/(main)') {
          router.push('/(main)');
        }
        break;
      case 'friend_request':
      case 'friend_accepted':
        if (pathname !== '/(main)/friends') {
          router.push('/(main)/friends');
        }
        break;
      case 'room_invite':
        if (pathname !== '/(main)/rooms') {
          router.push('/(main)/rooms');
        }
        break;
      default:
        if (pathname !== '/' && pathname !== '/(main)') {
          router.push('/(main)');
        }
    }
    return notification;
  }, [router, pathname]);

  // Setup realtime subscription for new notifications
  const setupRealtimeSubscription = () => {
    if (!currentUser) return () => {};

    const subscriptionId = `notifications-${currentUser.id}`;

    // Use subscription manager for automatic pause/resume on app background
    const cleanup = subscriptionManager.register(subscriptionId, () => {
      return supabase
        .channel(subscriptionId)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${currentUser.id}`,
          },
          (payload) => {
            try {
              // Add new notification to the top of the list
              if (payload.new && typeof payload.new === 'object') {
                useAppStore.getState().addNotification(payload.new as AppNotification);
              }
            } catch (error) {
              logger.error('Error handling new notification:', error);
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${currentUser.id}`,
          },
          (payload) => {
            try {
              // Update notification in the list (e.g., when marked as read)
              if (payload.new && typeof payload.new === 'object') {
                const updatedNotif = payload.new as AppNotification;
                const store = useAppStore.getState();
                const notifications = store.notifications.map((n) =>
                  n.id === updatedNotif.id ? updatedNotif : n
                );
                store.setNotifications(notifications);
              }
            } catch (error) {
              logger.error('Error handling notification update:', error);
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${currentUser.id}`,
          },
          (payload) => {
            try {
              if (payload.old && payload.old.id) {
                useAppStore.getState().removeNotification(payload.old.id);
              }
            } catch (error) {
              logger.error('Error handling notification deletion:', error);
            }
          }
        )
        .subscribe();
    });

    return cleanup;
  };

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(notifications.map((n) => n.id)));
  }, [notifications]);

  const deselectAll = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
    setSelectionMode(false);
  }, []);

  const enterSelectionMode = useCallback((initialId?: string) => {
    setSelectionMode(true);
    if (initialId) {
      setSelectedIds(new Set([initialId]));
    }
  }, []);

  const deleteSelected = useCallback(async () => {
    if (!currentUser || selectedIds.size === 0) return false;
    const ids = Array.from(selectedIds);
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .in('id', ids)
        .eq('user_id', currentUser.id);
      if (error) throw error;
      ids.forEach((id) => removeNotification(id));
      clearSelection();
      return true;
    } catch (error: any) {
      logger.error('Error deleting selected notifications:', error);
      return false;
    }
  }, [currentUser, selectedIds, removeNotification, clearSelection]);

  const markSelectedAsRead = useCallback(async () => {
    if (!currentUser || selectedIds.size === 0) return false;
    const ids = Array.from(selectedIds);
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .in('id', ids)
        .eq('user_id', currentUser.id);
      if (error) throw error;
      ids.forEach((id) => markNotificationRead(id));
      clearSelection();
      return true;
    } catch (error: any) {
      logger.error('Error marking selected as read:', error);
      return false;
    }
  }, [currentUser, selectedIds, markNotificationRead, clearSelection]);

  return {
    notifications,
    unreadCount: unreadNotificationCount,
    totalCount: notifications.length,
    loading,
    refreshing,
    loadNotifications,
    refreshNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    handleNotificationTap,
    selectionMode,
    selectedIds,
    toggleSelect,
    selectAll,
    deselectAll,
    clearSelection,
    enterSelectionMode,
    deleteSelected,
    markSelectedAsRead,
  };
};
