import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  StatusBar,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { spacing, interactionStates } from "../../lib/theme";
import { useTheme } from "../../hooks/useTheme";
import { useSafety } from "../../hooks/useSafety";
import { useFriends } from "../../hooks/useFriends";

// iOS-style icon backgrounds
const ICON_BACKGROUNDS = {
  ghost: "#AF52DE",
  break: "#5856D6",
  blocked: "#FF3B30",
  anchor: "#007AFF",
  info: "#8E8E93",
};

interface SafetyRowProps {
  icon?: string;
  emoji?: string;
  iconBg: string;
  label: string;
  description?: string;
  value?: string;
  showChevron?: boolean;
  isDestructive?: boolean;
  onPress?: () => void;
  isFirst?: boolean;
  isLast?: boolean;
  isActive?: boolean;
  children?: React.ReactNode;
  theme: ReturnType<typeof useTheme>["theme"];
  isDark: boolean;
}

const SafetyRow: React.FC<SafetyRowProps> = ({
  icon,
  emoji,
  iconBg,
  label,
  description,
  value,
  showChevron = false,
  isDestructive = false,
  onPress,
  isFirst = false,
  isLast = false,
  isActive = false,
  children,
  theme,
}) => {
  const content = (
    <View
      style={[
        styles.rowContainer,
        {
          backgroundColor: theme.colors.glass.background,
          borderTopLeftRadius: isFirst ? 12 : 0,
          borderTopRightRadius: isFirst ? 12 : 0,
          borderBottomLeftRadius: isLast ? 12 : 0,
          borderBottomRightRadius: isLast ? 12 : 0,
        },
      ]}
    >
      <View style={styles.rowContent}>
        {emoji ? (
          <View style={styles.emojiWrapper}>
            <Text style={styles.emojiText}>{emoji}</Text>
          </View>
        ) : (
          <View style={[styles.iconWrapper, { backgroundColor: iconBg }]}>
            <Ionicons name={icon as any} size={18} color="#FFFFFF" />
          </View>
        )}
        <View style={styles.rowTextContainer}>
          <View style={styles.labelRow}>
            <Text
              style={[
                styles.rowLabel,
                { color: isDestructive ? "#FF3B30" : theme.colors.text.primary },
              ]}
            >
              {label}
            </Text>
            {isActive && (
              <View style={[styles.activeBadge, { backgroundColor: "#34C759" }]}>
                <Text style={styles.activeBadgeText}>Active</Text>
              </View>
            )}
          </View>
          {description && (
            <Text style={[styles.rowDescription, { color: theme.colors.text.tertiary }]}>
              {description}
            </Text>
          )}
        </View>
        <View style={styles.rowRight}>
          {value && (
            <Text style={[styles.rowValue, { color: theme.colors.text.tertiary }]}>
              {value}
            </Text>
          )}
          {children}
          {showChevron && !children && (
            <Ionicons
              name="chevron-forward"
              size={18}
              color={theme.colors.text.tertiary}
            />
          )}
        </View>
      </View>
      {!isLast && (
        <View style={styles.separatorContainer}>
          <View
            style={[styles.separator, { backgroundColor: theme.colors.glass.border }]}
          />
        </View>
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={0.6} onPress={onPress}>
        {content}
      </TouchableOpacity>
    );
  }
  return content;
};

interface SafetySectionProps {
  title?: string;
  footer?: string;
  children: React.ReactNode;
  theme: ReturnType<typeof useTheme>["theme"];
}

const SafetySection: React.FC<SafetySectionProps> = ({
  title,
  footer,
  children,
  theme,
}) => (
  <View style={styles.section}>
    {title && (
      <Text style={[styles.sectionTitle, { color: theme.colors.text.tertiary }]}>
        {title}
      </Text>
    )}
    <View
      style={[
        styles.sectionContent,
        {
          borderColor: theme.colors.glass.border,
          shadowColor: theme.colors.glass.shadow,
        },
      ]}
    >
      {children}
    </View>
    {footer && (
      <Text style={[styles.sectionFooter, { color: theme.colors.text.tertiary }]}>
        {footer}
      </Text>
    )}
  </View>
);

export default function SafetyScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
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

  const handleGhostModeToggle = () => {
    if (isInGhostMode) {
      disableGhostMode();
    } else {
      Alert.alert("Ghost Mode Duration", "How long would you like to be invisible?", [
        { text: "Cancel", style: "cancel" },
        { text: "30 minutes", onPress: () => enableGhostMode(30) },
        { text: "1 hour", onPress: () => enableGhostMode(60) },
        { text: "4 hours", onPress: () => enableGhostMode(240) },
        { text: "24 hours", onPress: () => enableGhostMode(1440) },
      ]);
    }
  };

  const handleBreakToggle = () => {
    if (isOnBreak) {
      endBreak();
    } else {
      Alert.alert("Take a Break Duration", "How long do you need?", [
        { text: "Cancel", style: "cancel" },
        { text: "1 hour", onPress: () => takeBreak(1) },
        { text: "6 hours", onPress: () => takeBreak(6) },
        { text: "24 hours", onPress: () => takeBreak(24) },
        { text: "3 days", onPress: () => takeBreak(72) },
        { text: "1 week", onPress: () => takeBreak(168) },
      ]);
    }
  };

  const handleUnblock = (userId: string, userName: string) => {
    Alert.alert("Unblock User", `Unblock ${userName}?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Unblock", onPress: () => unblockUser(userId) },
    ]);
  };

  const handleRemoveAnchor = (userId: string, userName: string) => {
    Alert.alert("Remove Anchor", `Remove ${userName} as your anchor?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", onPress: () => removeAnchor(userId), style: "destructive" },
    ]);
  };

  const getBlockedUserName = (blockedId: string) => {
    const friend = friends.find((f) => f.friend_id === blockedId);
    return friend?.friend?.display_name || "Unknown User";
  };

  const getAnchorName = (anchor: any) => {
    return anchor.anchor?.display_name || "Unknown";
  };

  const getBlockTypeLabel = (blockType: string) => {
    switch (blockType) {
      case "mute":
        return "Muted";
      case "soft":
        return "Soft Block";
      case "hard":
        return "Hard Block";
      default:
        return "Blocked";
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bg.primary }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <LinearGradient
        colors={theme.gradients.background}
        style={StyleSheet.absoluteFill}
      />

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
          Safety & Privacy
        </Text>
        
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 32 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Privacy Modes Section */}
        <SafetySection
          title="PRIVACY MODES"
          footer="These modes help you take a break from social activity when you need it."
          theme={theme}
        >
          <SafetyRow
            emoji="👻"
            iconBg={ICON_BACKGROUNDS.ghost}
            label="Ghost Mode"
            description="Disappear from everyone temporarily"
            isFirst
            isActive={isInGhostMode}
            theme={theme}
            isDark={isDark}
          >
            <Switch
              value={isInGhostMode}
              onValueChange={handleGhostModeToggle}
              trackColor={{
                false: isDark ? "rgba(120,120,128,0.32)" : "rgba(120,120,128,0.16)",
                true: "#AF52DE",
              }}
              thumbColor="#FFFFFF"
              ios_backgroundColor={
                isDark ? "rgba(120,120,128,0.32)" : "rgba(120,120,128,0.16)"
              }
            />
          </SafetyRow>
          <SafetyRow
            emoji="🌙"
            iconBg={ICON_BACKGROUNDS.break}
            label="Take a Break"
            description="Pause all presence and notifications"
            isLast
            isActive={isOnBreak}
            theme={theme}
            isDark={isDark}
          >
            <Switch
              value={isOnBreak}
              onValueChange={handleBreakToggle}
              trackColor={{
                false: isDark ? "rgba(120,120,128,0.32)" : "rgba(120,120,128,0.16)",
                true: "#5856D6",
              }}
              thumbColor="#FFFFFF"
              ios_backgroundColor={
                isDark ? "rgba(120,120,128,0.32)" : "rgba(120,120,128,0.16)"
              }
            />
          </SafetyRow>
        </SafetySection>

        {/* Blocked Users Section */}
        <SafetySection title="BLOCKED USERS" theme={theme}>
          {blocks.length === 0 ? (
            <View
              style={[
                styles.emptyCard,
                { backgroundColor: theme.colors.glass.background },
              ]}
            >
              <Text style={[styles.emptyText, { color: theme.colors.text.tertiary }]}>
                No blocked users
              </Text>
            </View>
          ) : (
            blocks.map((block, index) => (
              <SafetyRow
                key={block.id}
                icon="person-remove"
                iconBg={ICON_BACKGROUNDS.blocked}
                label={getBlockedUserName(block.blocked_id)}
                description={getBlockTypeLabel(block.block_type)}
                value="Unblock"
                onPress={() =>
                  handleUnblock(block.blocked_id, getBlockedUserName(block.blocked_id))
                }
                isFirst={index === 0}
                isLast={index === blocks.length - 1}
                theme={theme}
                isDark={isDark}
              />
            ))
          )}
        </SafetySection>

        {/* Safety Anchors Section */}
        <SafetySection
          title="SAFETY ANCHORS"
          footer="Anchors are trusted contacts who get notified when you're inactive for 48+ hours. You can set up to 2 anchors."
          theme={theme}
        >
          {anchors.length === 0 ? (
            <View
              style={[
                styles.emptyCard,
                { backgroundColor: theme.colors.glass.background },
              ]}
            >
              <Ionicons
                name="shield-checkmark"
                size={32}
                color={theme.colors.text.tertiary}
                style={styles.emptyIcon}
              />
              <Text style={[styles.emptyText, { color: theme.colors.text.tertiary }]}>
                No anchors set
              </Text>
            </View>
          ) : (
            anchors.map((anchor, index) => (
              <SafetyRow
                key={anchor.id}
                icon="shield-checkmark"
                iconBg={ICON_BACKGROUNDS.anchor}
                label={getAnchorName(anchor)}
                description="Safety Anchor"
                onPress={() => handleRemoveAnchor(anchor.anchor_id, getAnchorName(anchor))}
                showChevron
                isFirst={index === 0}
                isLast={index === anchors.length - 1}
                theme={theme}
                isDark={isDark}
              />
            ))
          )}
        </SafetySection>

        {/* About Section */}
        <SafetySection title="ABOUT" theme={theme}>
          <View
            style={[
              styles.infoCard,
              { backgroundColor: theme.colors.glass.background },
            ]}
          >
            <View style={styles.infoRow}>
              <Ionicons
                name="checkmark-circle"
                size={16}
                color={theme.colors.text.tertiary}
              />
              <Text style={[styles.infoText, { color: theme.colors.text.secondary }]}>
                All blocks are silent - users won't know
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons
                name="checkmark-circle"
                size={16}
                color={theme.colors.text.tertiary}
              />
              <Text style={[styles.infoText, { color: theme.colors.text.secondary }]}>
                Ghost mode makes you invisible to everyone
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons
                name="checkmark-circle"
                size={16}
                color={theme.colors.text.tertiary}
              />
              <Text style={[styles.infoText, { color: theme.colors.text.secondary }]}>
                Anchors help watch out for you
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons
                name="checkmark-circle"
                size={16}
                color={theme.colors.text.tertiary}
              />
              <Text style={[styles.infoText, { color: theme.colors.text.secondary }]}>
                Visibility settings are per-friend
              </Text>
            </View>
          </View>
        </SafetySection>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.screenPadding || 24,
    paddingBottom: spacing.lg,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  headerSpacer: {
    width: 44,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: spacing.md,
  },
  section: {
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "400",
    letterSpacing: -0.08,
    marginBottom: spacing.sm,
    marginLeft: spacing.md,
    textTransform: "uppercase",
  },
  sectionContent: {
    borderRadius: 12,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  sectionFooter: {
    fontSize: 13,
    fontWeight: "400",
    lineHeight: 18,
    marginTop: spacing.sm,
    marginHorizontal: spacing.md,
  },
  rowContainer: {
    minHeight: 44,
  },
  rowContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    minHeight: 60,
  },
  iconWrapper: {
    width: 29,
    height: 29,
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  emojiWrapper: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  emojiText: {
    fontSize: 28,
  },
  rowTextContainer: {
    flex: 1,
    marginRight: spacing.sm,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  rowLabel: {
    fontSize: 17,
    fontWeight: "400",
    letterSpacing: -0.41,
  },
  rowDescription: {
    fontSize: 13,
    fontWeight: "400",
    marginTop: 2,
  },
  activeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  activeBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  rowRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  rowValue: {
    fontSize: 17,
    fontWeight: "400",
    marginRight: spacing.xs,
  },
  separatorContainer: {
    paddingLeft: 57,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
  },
  emptyCard: {
    borderRadius: 12,
    padding: spacing.xl,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyIcon: {
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: "400",
  },
  infoCard: {
    borderRadius: 12,
    padding: spacing.md,
    gap: 12,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  infoText: {
    fontSize: 15,
    fontWeight: "400",
    flex: 1,
    lineHeight: 20,
  },
});
