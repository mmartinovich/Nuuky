import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  TouchableOpacity,
  RefreshControl,
  StatusBar,
  Animated,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
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
  const { theme, accent } = useTheme();
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

  // Mark all as read when entering the screen (mount only)
  useEffect(() => {
    if (unreadCount > 0) {
      markAllAsRead();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAcceptInvite = async (inviteId: string) => {
    const success = await acceptInvite(inviteId);
    if (success) {
      await loadMyRooms();
    } else {
      // acceptInvite already shows its own alert on error
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

  // Stable key for notifications array to avoid regrouping on same data
  const notificationsKey = useMemo(
    () => notifications.map((n) => n.id).join(','),
    [notifications]
  );

  // Group notifications by time period into SectionList-compatible format
  const sections = useMemo(() => {
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

    const result: { title: string; data: AppNotification[] }[] = [];
    if (groups.today.length > 0) result.push({ title: 'TODAY', data: groups.today });
    if (groups.yesterday.length > 0) result.push({ title: 'YESTERDAY', data: groups.yesterday });
    if (groups.earlier.length > 0) result.push({ title: 'EARLIER', data: groups.earlier });
    return result;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notificationsKey]);

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

  const renderNotificationItem = useCallback(({ item, index }: { item: AppNotification; index: number }) => (
    <View>
      {index > 0 && (
        <View style={[styles.separator, { backgroundColor: theme.colors.glass.border }]} />
      )}
      <NotificationCard
        notification={item}
        onPress={() => handleNotificationTap(item)}
        onDelete={() => handleDeleteNotification(item.id)}
        animationDelay={index * 50}
        selectionMode={selectionMode}
        isSelected={selectedIds.has(item.id)}
        onToggleSelect={() => toggleSelect(item.id)}
        onEnterSelectionMode={() => enterSelectionMode(item.id)}
        cardStyle={true}
      />
    </View>
  ), [theme, selectionMode, selectedIds, handleNotificationTap, toggleSelect, enterSelectionMode]);

  const renderSectionHeader = useCallback(({ section }: { section: { title: string } }) => (
    <Text style={[styles.sectionTitle, { color: theme.colors.text.tertiary, marginTop: 8 }]}>
      {section.title}
    </Text>
  ), [theme]);

  const keyExtractor = useCallback((item: AppNotification) => item.id, []);

  const hasNotifications = notifications.length > 0;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bg.primary }]}>
      <StatusBar barStyle={'light-content'} />
      <LinearGradient colors={theme.gradients.background} style={styles.gradient}>
        {/* Header - part of normal flow like Friends page */}
        <View style={[styles.headerSection, { paddingTop: insets.top + 8 }]}>
          <View style={styles.header}>
            <TouchableOpacity
              style={[styles.headerButton, { backgroundColor: theme.colors.glass.background }]}
              onPress={selectionMode ? clearSelection : () => router.back()}
              activeOpacity={0.7}
              accessibilityLabel={selectionMode ? "Cancel selection" : "Close notifications"}
              accessibilityRole="button"
            >
              <Ionicons name="close" size={22} color={theme.colors.text.primary} />
            </TouchableOpacity>
            {hasNotifications && !selectionMode && (
              <TouchableOpacity
                style={[styles.headerButton, { backgroundColor: theme.colors.glass.background }]}
                onPress={() => enterSelectionMode()}
                activeOpacity={0.7}
                accessibilityLabel="Edit notifications"
                accessibilityRole="button"
              >
                <Text style={[styles.editButtonText, { color: accent.primary }]}>Edit</Text>
              </TouchableOpacity>
            )}
          </View>
          <Text style={[styles.title, { color: theme.colors.text.primary }]}>
            {selectionMode ? `${selectedIds.size} Selected` : 'Notifications'}
          </Text>
          {selectionMode ? (
            <TouchableOpacity onPress={allSelected ? deselectAll : selectAll} activeOpacity={0.7} accessibilityLabel={allSelected ? "Deselect all notifications" : "Select all notifications"} accessibilityRole="button">
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
        </View>

        {/* Scrollable Content - SectionList for virtualized performance */}
        <SectionList
          sections={sections}
          keyExtractor={keyExtractor}
          renderItem={renderNotificationItem}
          renderSectionHeader={renderSectionHeader}
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingBottom: insets.bottom + (selectionMode ? 80 : 24),
            },
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refreshNotifications}
              tintColor={theme.colors.text.secondary}
            />
          }
          maxToRenderPerBatch={15}
          windowSize={7}
          initialNumToRender={15}
          stickySectionHeadersEnabled={false}
          ListHeaderComponent={
            hasInvites ? (
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
            ) : null
          }
          ListEmptyComponent={
            !hasInvites ? (
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
            ) : null
          }
        />

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
            accessibilityLabel={`Delete ${selectedIds.size} selected notification${selectedIds.size !== 1 ? 's' : ''}`}
            accessibilityRole="button"
          >
            <Ionicons name="trash-outline" size={18} color="#FFF" />
            <Text style={styles.deleteButtonText}>
              Delete{selectedIds.size > 0 ? ` (${selectedIds.size})` : ''}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  headerSection: {
    paddingHorizontal: 24,
    paddingBottom: 16,
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
    marginBottom: 8,
  },
  subtitleLink: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
  },
  section: {
    marginTop: 8,
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
