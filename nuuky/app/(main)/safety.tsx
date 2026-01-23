import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { spacing, radius, typography } from '../../lib/theme';
import { useTheme } from '../../hooks/useTheme';
import { useSafety } from '../../hooks/useSafety';
import { useFriends } from '../../hooks/useFriends';

export default function SafetyScreen() {
  const router = useRouter();
  const { theme, isDark } = useTheme();
  const {
    blocks,
    anchors,
    isInGhostMode,
    isOnBreak,
    enableGhostMode,
    disableGhostMode,
    takeBreak,
    endBreak,
    unblockUser,
    removeAnchor,
  } = useSafety();
  const { friends } = useFriends();

  const [showGhostDuration, setShowGhostDuration] = useState(false);
  const [showBreakDuration, setShowBreakDuration] = useState(false);

  const handleGhostModeToggle = () => {
    if (isInGhostMode) {
      disableGhostMode();
    } else {
      Alert.alert(
        'Ghost Mode Duration',
        'How long would you like to be invisible?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: '30 minutes', onPress: () => enableGhostMode(30) },
          { text: '1 hour', onPress: () => enableGhostMode(60) },
          { text: '4 hours', onPress: () => enableGhostMode(240) },
          { text: '24 hours', onPress: () => enableGhostMode(1440) },
        ]
      );
    }
  };

  const handleBreakToggle = () => {
    if (isOnBreak) {
      endBreak();
    } else {
      Alert.alert(
        'Take a Break Duration',
        'How long do you need?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: '1 hour', onPress: () => takeBreak(1) },
          { text: '6 hours', onPress: () => takeBreak(6) },
          { text: '24 hours', onPress: () => takeBreak(24) },
          { text: '3 days', onPress: () => takeBreak(72) },
          { text: '1 week', onPress: () => takeBreak(168) },
        ]
      );
    }
  };

  const handleUnblock = (userId: string, userName: string) => {
    Alert.alert(
      'Unblock User',
      `Unblock ${userName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Unblock', onPress: () => unblockUser(userId) },
      ]
    );
  };

  const handleRemoveAnchor = (userId: string, userName: string) => {
    Alert.alert(
      'Remove Anchor',
      `Remove ${userName} as your anchor?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', onPress: () => removeAnchor(userId), style: 'destructive' },
      ]
    );
  };

  const getBlockedUserName = (blockedId: string) => {
    const friend = friends.find(f => f.friend_id === blockedId);
    return friend?.friend?.display_name || 'Unknown User';
  };

  const getAnchorName = (anchor: any) => {
    return anchor.anchor?.display_name || 'Unknown';
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bg.primary }]}>
      <LinearGradient colors={theme.gradients.background} style={StyleSheet.absoluteFill} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color={theme.colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text.primary }]}>Safety & Privacy</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Privacy Modes Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>Privacy Modes</Text>

          {/* Ghost Mode */}
          <BlurView intensity={isDark ? 20 : 10} tint={theme.colors.blurTint} style={[styles.card, { borderColor: theme.colors.glass.border }]}>
            <View style={styles.cardContent}>
              <View style={styles.cardHeader}>
                <View style={styles.cardIcon}>
                  <Text style={styles.iconText}>👻</Text>
                </View>
                <View style={styles.cardInfo}>
                  <Text style={[styles.cardTitle, { color: theme.colors.text.primary }]}>Ghost Mode</Text>
                  <Text style={[styles.cardDescription, { color: theme.colors.text.secondary }]}>
                    Disappear from everyone temporarily
                  </Text>
                  {isInGhostMode && (
                    <Text style={[styles.activeText, { color: theme.colors.mood.good.base }]}>Active</Text>
                  )}
                </View>
                <Switch
                  value={isInGhostMode}
                  onValueChange={handleGhostModeToggle}
                  trackColor={{
                    false: theme.colors.glass.background,
                    true: theme.colors.mood.notGreat.base,
                  }}
                  thumbColor={theme.colors.text.primary}
                />
              </View>
            </View>
          </BlurView>

          {/* Take a Break */}
          <BlurView intensity={isDark ? 20 : 10} tint={theme.colors.blurTint} style={[styles.card, { borderColor: theme.colors.glass.border }]}>
            <View style={styles.cardContent}>
              <View style={styles.cardHeader}>
                <View style={styles.cardIcon}>
                  <Text style={styles.iconText}>🌙</Text>
                </View>
                <View style={styles.cardInfo}>
                  <Text style={[styles.cardTitle, { color: theme.colors.text.primary }]}>Take a Break</Text>
                  <Text style={[styles.cardDescription, { color: theme.colors.text.secondary }]}>
                    Pause all presence and notifications
                  </Text>
                  {isOnBreak && (
                    <Text style={[styles.activeText, { color: theme.colors.mood.good.base }]}>Active</Text>
                  )}
                </View>
                <Switch
                  value={isOnBreak}
                  onValueChange={handleBreakToggle}
                  trackColor={{
                    false: theme.colors.glass.background,
                    true: theme.colors.mood.neutral.base,
                  }}
                  thumbColor={theme.colors.text.primary}
                />
              </View>
            </View>
          </BlurView>
        </View>

        {/* Blocked Users Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>Blocked Users</Text>
          {blocks.length === 0 ? (
            <BlurView intensity={isDark ? 20 : 10} tint={theme.colors.blurTint} style={[styles.card, { borderColor: theme.colors.glass.border }]}>
              <View style={styles.cardContent}>
                <Text style={[styles.emptyText, { color: theme.colors.text.secondary }]}>No blocked users</Text>
              </View>
            </BlurView>
          ) : (
            blocks.map((block) => (
              <BlurView key={block.id} intensity={isDark ? 20 : 10} tint={theme.colors.blurTint} style={[styles.card, { borderColor: theme.colors.glass.border }]}>
                <View style={styles.cardContent}>
                  <View style={styles.cardHeader}>
                    <View style={styles.cardInfo}>
                      <Text style={[styles.cardTitle, { color: theme.colors.text.primary }]}>
                        {getBlockedUserName(block.blocked_id)}
                      </Text>
                      <Text style={[styles.cardDescription, { color: theme.colors.text.secondary }]}>
                        {block.block_type === 'mute' && 'Muted'}
                        {block.block_type === 'soft' && 'Soft Blocked'}
                        {block.block_type === 'hard' && 'Hard Blocked'}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleUnblock(block.blocked_id, getBlockedUserName(block.blocked_id))}
                      style={[styles.unblockButton, { backgroundColor: theme.colors.glass.background, borderColor: theme.colors.glass.border }]}
                    >
                      <Text style={[styles.unblockText, { color: theme.colors.text.secondary }]}>Unblock</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </BlurView>
            ))
          )}
        </View>

        {/* Anchors Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>Safety Anchors</Text>
            <Text style={[styles.sectionSubtitle, { color: theme.colors.text.secondary }]}>Trusted contacts (max 2)</Text>
          </View>
          {anchors.length === 0 ? (
            <BlurView intensity={isDark ? 20 : 10} tint={theme.colors.blurTint} style={[styles.card, { borderColor: theme.colors.glass.border }]}>
              <View style={styles.cardContent}>
                <Text style={[styles.emptyText, { color: theme.colors.text.secondary }]}>No anchors set</Text>
                <Text style={[styles.emptySubtext, { color: theme.colors.text.tertiary }]}>
                  Anchors get notified when you're inactive for 48+ hours
                </Text>
              </View>
            </BlurView>
          ) : (
            anchors.map((anchor) => (
              <BlurView key={anchor.id} intensity={isDark ? 20 : 10} tint={theme.colors.blurTint} style={[styles.card, { borderColor: theme.colors.glass.border }]}>
                <View style={styles.cardContent}>
                  <View style={styles.cardHeader}>
                    <View style={styles.cardIcon}>
                      <Text style={styles.iconText}>⚓</Text>
                    </View>
                    <View style={styles.cardInfo}>
                      <Text style={[styles.cardTitle, { color: theme.colors.text.primary }]}>{getAnchorName(anchor)}</Text>
                      <Text style={[styles.cardDescription, { color: theme.colors.text.secondary }]}>Safety Anchor</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleRemoveAnchor(anchor.anchor_id, getAnchorName(anchor))}
                      style={styles.removeButton}
                    >
                      <Feather name="x" size={20} color={theme.colors.text.secondary} />
                    </TouchableOpacity>
                  </View>
                </View>
              </BlurView>
            ))
          )}
        </View>

        {/* Info Section */}
        <View style={styles.section}>
          <BlurView intensity={isDark ? 20 : 10} tint={theme.colors.blurTint} style={[styles.infoCard, { borderColor: theme.colors.glass.border }]}>
            <View style={styles.cardContent}>
              <Text style={[styles.infoTitle, { color: theme.colors.text.primary }]}>About Safety Features</Text>
              <Text style={[styles.infoText, { color: theme.colors.text.secondary }]}>
                • All blocks are silent - users won't know{'\n'}
                • Ghost mode makes you invisible to everyone{'\n'}
                • Anchors help watch out for you{'\n'}
                • Visibility settings are per-friend
              </Text>
            </View>
          </BlurView>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: 60,
    paddingBottom: spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
  },
  content: {
    flex: 1,
  },
  section: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
  },
  sectionHeader: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    marginBottom: spacing.xs,
  },
  sectionSubtitle: {
    fontSize: typography.sizes.sm,
  },
  card: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  cardContent: {
    padding: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardIcon: {
    marginRight: spacing.md,
  },
  iconText: {
    fontSize: 32,
  },
  cardInfo: {
    flex: 1,
  },
  cardTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    marginBottom: spacing.xs / 2,
  },
  cardDescription: {
    fontSize: typography.sizes.sm,
  },
  activeText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    marginTop: spacing.xs / 2,
  },
  emptyText: {
    fontSize: typography.sizes.md,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: typography.sizes.sm,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  unblockButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  unblockText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
  },
  removeButton: {
    padding: spacing.sm,
  },
  infoCard: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
  },
  infoTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    marginBottom: spacing.sm,
  },
  infoText: {
    fontSize: typography.sizes.sm,
    lineHeight: 22,
  },
});
