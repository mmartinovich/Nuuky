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
import { spacing, radius, typography, interactionStates } from '../../lib/theme';
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
    if (notifications.length === 0) {
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
  }, [notifications.length]);

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

  // Dynamic styles that depend on theme
  const dynamicStyles = {
    editButton: {
      backgroundColor: accent.soft,
    },
    emptyIconContainer: {
      backgroundColor: theme.colors.glass.background,
    },
  };

  const renderSection = (
    title: string,
    sectionNotifications: AppNotification[],
    baseDelay: number
  ) => {
    if (sectionNotifications.length === 0) return null;

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text.secondary }]}>
            {title}
          </Text>
        </View>
        <View style={styles.notificationsList}>
          {sectionNotifications.map((notification, index) => (
            <NotificationCard
              key={notification.id}
              notification={notification}
              onPress={() => handleNotificationTap(notification)}
              onDelete={() => handleDeleteNotification(notification.id)}
              animationDelay={baseDelay + index * 50}
              selectionMode={selectionMode}
              isSelected={selectedIds.has(notification.id)}
              onToggleSelect={() => toggleSelect(notification.id)}
              onEnterSelectionMode={() => enterSelectionMode(notification.id)}
            />
          ))}
        </View>
      </View>
    );
  };

  const hasNotifications = notifications.length > 0;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bg.primary }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <LinearGradient colors={theme.gradients.background} style={styles.gradient}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
          {selectionMode ? (
            <TouchableOpacity
              style={[styles.headerTextButton]}
              onPress={allSelected ? deselectAll : selectAll}
              activeOpacity={interactionStates.pressed}
            >
              <Text style={[styles.headerTextButtonLabel, { color: accent.primary }]}>
                {allSelected ? 'Deselect All' : 'Select All'}
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
              activeOpacity={interactionStates.pressed}
            >
              <Ionicons name="chevron-back" size={28} color={theme.colors.text.primary} />
            </TouchableOpacity>
          )}

          <Text style={[styles.headerTitle, { color: theme.colors.text.primary }]}>
            Notifications
          </Text>

          {selectionMode ? (
            <TouchableOpacity
              style={[styles.headerTextButton]}
              onPress={clearSelection}
              activeOpacity={interactionStates.pressed}
            >
              <Text style={[styles.headerTextButtonLabel, { color: accent.primary }]}>
                Done
              </Text>
            </TouchableOpacity>
          ) : hasNotifications ? (
            <TouchableOpacity
              style={styles.headerTextButton}
              onPress={() => enterSelectionMode()}
              activeOpacity={interactionStates.pressed}
            >
              <Text style={[styles.headerTextButtonLabel, { color: accent.primary }]}>
                Edit
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.placeholderButton} />
          )}
        </View>

        {/* Content */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + spacing.xl + (selectionMode ? 70 : 0) },
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
                <Text style={[styles.sectionTitle, { color: theme.colors.text.secondary }]}>
                  Room Invites
                </Text>
                <View style={[styles.inviteBadge, { backgroundColor: theme.colors.text.secondary + '20' }]}>
                  <Text style={[styles.inviteBadgeText, { color: theme.colors.text.secondary }]}>
                    {roomInvites.length}
                  </Text>
                </View>
              </View>
              <View style={styles.invitesList}>
                {roomInvites.map((invite) => (
                  <InviteCard
                    key={invite.id}
                    invite={invite}
                    onAccept={() => handleAcceptInvite(invite.id)}
                    onDecline={() => handleDeclineInvite(invite.id)}
                  />
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
                  dynamicStyles.emptyIconContainer,
                  {
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

        {/* Bottom action bar */}
        <Animated.View
          style={[
            styles.bottomBar,
            {
              paddingBottom: insets.bottom + spacing.sm,
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
              styles.bottomBarButton,
              { backgroundColor: '#EF4444', opacity: selectedIds.size > 0 ? 1 : 0.4 },
            ]}
            onPress={handleDeleteSelected}
            activeOpacity={interactionStates.pressed}
            disabled={selectedIds.size === 0}
          >
            <Ionicons name="trash-outline" size={18} color="#FFFFFF" />
            <Text style={styles.bottomBarButtonText}>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.screenPadding || 24,
    paddingBottom: spacing.lg,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  editButton: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  headerTextButton: {
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTextButtonLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  placeholderButton: {
    width: 44,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.bold as any,
    letterSpacing: 1,
  },
  inviteBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  inviteBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  invitesList: {
    gap: spacing.sm,
  },
  notificationsList: {
    gap: 0, // NotificationCard handles its own margin
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing['3xl'],
    paddingHorizontal: spacing.xl,
  },
  emptyIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold as any,
    marginBottom: spacing.xs,
  },
  emptyMessage: {
    fontSize: typography.size.md,
    textAlign: 'center',
    lineHeight: 22,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    gap: spacing.sm,
    borderTopWidth: 1,
  },
  bottomBarButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 44,
    borderRadius: radius.md,
  },
  bottomBarButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
