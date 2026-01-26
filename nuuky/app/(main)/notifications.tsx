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
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../hooks/useTheme';
import { useNotifications } from '../../hooks/useNotifications';
import { NotificationCard } from '../../components/NotificationCard';
import { spacing, radius, typography, interactionStates } from '../../lib/theme';
import { getNotificationTimeGroup } from '../../lib/utils';
import { AppNotification } from '../../types';

export default function NotificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const {
    notifications,
    unreadCount,
    loading,
    refreshing,
    loadNotifications,
    refreshNotifications,
    markAllAsRead,
    deleteNotification,
    handleNotificationTap,
  } = useNotifications();

  // Empty state animation
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    loadNotifications();
  }, []);

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

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
  };

  const handleDeleteNotification = async (notificationId: string) => {
    await deleteNotification(notificationId);
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
        {/* Header - Loóna style */}
        <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={interactionStates.pressed}
          >
            <Ionicons name="chevron-back" size={28} color={theme.colors.text.primary} />
          </TouchableOpacity>

          <Text style={[styles.headerTitle, { color: theme.colors.text.primary }]}>
            Notifications
          </Text>

          {unreadCount > 0 ? (
            <TouchableOpacity
              style={styles.markReadButton}
              onPress={handleMarkAllAsRead}
              activeOpacity={interactionStates.pressed}
            >
              <Text style={styles.markReadText}>
                Mark All
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
            { paddingBottom: insets.bottom + spacing.xl },
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
          ) : (
            <View style={styles.emptyState}>
              <Animated.View
                style={[
                  styles.emptyIconContainer,
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
  markReadButton: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(168, 85, 247, 0.1)',
  },
  markReadText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#A855F7',
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
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.bold as any,
    letterSpacing: 1,
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
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
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
});
