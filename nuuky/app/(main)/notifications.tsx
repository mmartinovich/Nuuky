import React, { useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StatusBar,
  Animated,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../hooks/useTheme';
import { useNotifications } from '../../hooks/useNotifications';
import { useRoomInvites } from '../../hooks/useRoomInvites';
import { useRoom } from '../../hooks/useRoom';
import { NotificationCard } from '../../components/NotificationCard';
import { InviteCard } from '../../components/InviteCard';
import { getNotificationTimeGroup } from '../../lib/utils';
import { AppNotification } from '../../types';

export default function NotificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme, isDark, accent } = useTheme();
  const {
    notifications,
    unreadCount,
    refreshing,
    loadNotifications,
    refreshNotifications,
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
  } = useNotifications();

  const { roomInvites, loadMyInvites, acceptInvite, declineInvite } = useRoomInvites();
  const { loadMyRooms } = useRoom();

  // Empty state animation
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    loadNotifications();
    loadMyInvites();
  }, []);

  // Mark all as read when viewing the screen
  useEffect(() => {
    if (unreadCount > 0) {
      markAllAsRead();
    }
  }, [notifications.length]);

  const handleAcceptInvite = async (inviteId: string) => {
    const success = await acceptInvite(inviteId);
    if (success) {
      await loadMyRooms();
    }
  };

  const handleDeclineInvite = async (inviteId: string) => {
    await declineInvite(inviteId);
  };

  const hasInvites = roomInvites.length > 0;

  // Pulse animation for empty state icon
  useEffect(() => {
    if (notifications.length === 0 && !hasInvites) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [notifications.length, hasInvites]);

  // Group notifications by time period
  const groupedNotifications = useMemo(() => {
    const groups: {
      today: AppNotification[];
      yesterday: AppNotification[];
      earlier: AppNotification[];
    } = {
      today: [],
      yesterday: [],
      earlier: [],
    };

    notifications.forEach((notification) => {
      const group = getNotificationTimeGroup(notification.created_at);
      groups[group].push(notification);
    });

    return groups;
  }, [notifications]);

  const handleDeleteNotification = async (notificationId: string) => {
    await deleteNotification(notificationId);
  };

  const handleDeleteSelected = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await deleteSelected();
  };

  const allSelected = notifications.length > 0 && selectedIds.size === notifications.length;

  // Bottom bar animation
  const bottomBarAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(bottomBarAnim, {
      toValue: selectionMode ? 1 : 0,
      useNativeDriver: true,
      friction: 8,
    }).start();
  }, [selectionMode]);

  const renderSection = (
    title: string,
    sectionNotifications: AppNotification[],
    baseDelay: number
  ) => {
    if (sectionNotifications.length === 0) return null;

    return (
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text.tertiary }]}>
          {title}
        </Text>
        <View
          style={[
            styles.notificationsCard,
            { backgroundColor: theme.colors.glass.background, borderColor: theme.colors.glass.border },
          ]}
        >
          {sectionNotifications.map((notification, index) => (
            <React.Fragment key={notification.id}>
              {index > 0 && (
                <View style={[styles.separator, { backgroundColor: theme.colors.glass.border }]} />
              )}
              <NotificationCard
                notification={notification}
                onPress={() => handleNotificationTap(notification)}
                onDelete={() => handleDeleteNotification(notification.id)}
                animationDelay={baseDelay + index * 50}
                selectionMode={selectionMode}
                isSelected={selectedIds.has(notification.id)}
                onToggleSelect={() => toggleSelect(notification.id)}
                onEnterSelectionMode={() => enterSelectionMode(notification.id)}
                cardStyle={true}
              />
            </React.Fragment>
          ))}
        </View>
      </View>
    );
  };

  const hasNotifications = notifications.length > 0;

  return (
    <View style={styles.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Background - glass blur like Music page */}
      <BlurView intensity={50} tint="dark" style={StyleSheet.absoluteFill}>
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.5)' }]} />
      </BlurView>

      {/* Content */}
      <View style={[styles.content, { paddingTop: insets.top + 8 }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={[styles.headerButton, { backgroundColor: theme.colors.glass.background }]}
            onPress={selectionMode ? clearSelection : () => router.back()}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={22} color={theme.colors.text.primary} />
          </TouchableOpacity>
          {hasNotifications && !selectionMode && (
            <TouchableOpacity
              style={[styles.headerButton, { backgroundColor: theme.colors.glass.background }]}
              onPress={() => enterSelectionMode()}
              activeOpacity={0.7}
            >
              <Text style={[styles.editButtonText, { color: accent.primary }]}>Edit</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Title */}
        <Text style={[styles.title, { color: theme.colors.text.primary }]}>
          {selectionMode ? `${selectedIds.size} Selected` : 'Notifications'}
        </Text>
        {selectionMode ? (
          <TouchableOpacity onPress={allSelected ? deselectAll : selectAll} activeOpacity={0.7}>
            <Text style={[styles.subtitleLink, { color: accent.primary }]}>
              {allSelected ? 'Deselect All' : 'Select All'}
            </Text>
          </TouchableOpacity>
        ) : (
          <Text style={[styles.subtitle, { color: theme.colors.text.tertiary }]}>
            {hasNotifications
              ? `${notifications.length} notification${notifications.length !== 1 ? 's' : ''}${hasInvites ? `, ${roomInvites.length} invite${roomInvites.length !== 1 ? 's' : ''}` : ''}`
              : hasInvites
                ? `${roomInvites.length} invite${roomInvites.length !== 1 ? 's' : ''}`
                : 'Stay connected with your friends'}
          </Text>
        )}

        {/* Scrollable Content */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + 24 + (selectionMode ? 70 : 0) },
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refreshNotifications}
              tintColor={theme.colors.text.secondary}
            />
          }
        >
          {/* Room Invites Section */}
          {hasInvites && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: theme.colors.text.tertiary }]}>
                  ROOM INVITES
                </Text>
                <View style={[styles.badge, { backgroundColor: accent.soft }]}>
                  <Text style={[styles.badgeText, { color: accent.primary }]}>
                    {roomInvites.length}
                  </Text>
                </View>
              </View>
              <View
                style={[
                  styles.invitesCard,
                  { backgroundColor: theme.colors.glass.background, borderColor: theme.colors.glass.border },
                ]}
              >
                {roomInvites.map((invite, index) => (
                  <React.Fragment key={invite.id}>
                    {index > 0 && (
                      <View style={[styles.separator, { backgroundColor: theme.colors.glass.border }]} />
                    )}
                    <InviteCard
                      invite={invite}
                      onAccept={() => handleAcceptInvite(invite.id)}
                      onDecline={() => handleDeclineInvite(invite.id)}
                      cardStyle={true}
                    />
                  </React.Fragment>
                ))}
              </View>
            </View>
          )}

          {hasNotifications ? (
            <>
              {renderSection('TODAY', groupedNotifications.today, 0)}
              {renderSection(
                'YESTERDAY',
                groupedNotifications.yesterday,
                groupedNotifications.today.length * 50
              )}
              {renderSection(
                'EARLIER',
                groupedNotifications.earlier,
                (groupedNotifications.today.length + groupedNotifications.yesterday.length) * 50
              )}
            </>
          ) : !hasInvites && (
            <View style={styles.emptyState}>
              <Animated.View
                style={[
                  styles.emptyIconContainer,
                  {
                    backgroundColor: theme.colors.glass.background,
                    borderColor: theme.colors.glass.border,
                    transform: [{ scale: pulseAnim }],
                  },
                ]}
              >
                <Ionicons
                  name="notifications-off-outline"
                  size={48}
                  color={theme.colors.text.tertiary}
                />
              </Animated.View>
              <Text style={[styles.emptyTitle, { color: theme.colors.text.primary }]}>
                No notifications yet
              </Text>
              <Text style={[styles.emptyMessage, { color: theme.colors.text.tertiary }]}>
                When friends nudge you or invite you to rooms, you'll see it here
              </Text>
            </View>
          )}
        </ScrollView>

        {/* Bottom action bar for selection mode */}
        <Animated.View
          style={[
            styles.bottomBar,
            {
              paddingBottom: insets.bottom + 8,
              backgroundColor: theme.colors.bg.secondary,
              borderTopColor: theme.colors.glass.border,
              transform: [
                {
                  translateY: bottomBarAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [120, 0],
                  }),
                },
              ],
              opacity: bottomBarAnim,
            },
          ]}
          pointerEvents={selectionMode ? 'auto' : 'none'}
        >
          <TouchableOpacity
            style={[
              styles.deleteButton,
              { backgroundColor: '#EF4444', opacity: selectedIds.size > 0 ? 1 : 0.4 },
            ]}
            onPress={handleDeleteSelected}
            activeOpacity={0.7}
            disabled={selectedIds.size === 0}
          >
            <Ionicons name="trash-outline" size={18} color="#FFF" />
            <Text style={styles.deleteButtonText}>
              Delete{selectedIds.size > 0 ? ` (${selectedIds.size})` : ''}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerButton: {
    height: 40,
    minWidth: 40,
    paddingHorizontal: 12,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 24,
  },
  subtitleLink: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 24,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  notificationsCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  invitesCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  separator: {
    height: 1,
    marginHorizontal: 14,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 12,
  },
  deleteButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFF',
  },
});
