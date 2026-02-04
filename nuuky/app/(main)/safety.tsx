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
import { Image as CachedImage } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { spacing, interactionStates } from "../../lib/theme";
import { useTheme } from "../../hooks/useTheme";
import { useSafety } from "../../hooks/useSafety";
import { SwipeableAnchorRow } from "../../components/SwipeableAnchorRow";

// iOS-style icon backgrounds
const ICON_BACKGROUNDS = {
  ghost: "#AF52DE",
  break: "#5856D6",
  anchor: "#007AFF",
  info: "#8E8E93",
};

interface SafetyRowProps {
  icon?: string;
  emoji?: string;
  avatarUrl?: string;
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
  avatarUrl,
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
        {avatarUrl ? (
          <CachedImage
            source={{ uri: avatarUrl }}
            style={styles.avatarImage}
            cachePolicy="memory-disk"
            contentFit="cover"
          />
        ) : emoji ? (
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
  const { theme, isDark, accent } = useTheme();
  const {
    anchors,
    isInGhostMode,
    isOnBreak,
    enableGhostMode,
    disableGhostMode,
    takeBreak,
    endBreak,
    removeAnchor,
  } = useSafety();

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

  const handleRemoveAnchor = (anchorId: string, _name: string) => {
    removeAnchor(anchorId);
  };

  const getAnchorName = (anchor: any) => {
    return anchor.anchor?.display_name || "Unknown";
  };

  const getAnchorAvatar = (anchor: any) => {
    return anchor.anchor?.avatar_url || undefined;
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bg.primary }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <LinearGradient
        colors={theme.gradients.background}
        style={StyleSheet.absoluteFill}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 100, paddingBottom: insets.bottom + 32 },
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
            theme={theme}
            isDark={isDark}
          >
            <Switch
              value={isInGhostMode}
              onValueChange={handleGhostModeToggle}
              trackColor={{
                false: isDark ? "rgba(120,120,128,0.32)" : "rgba(120,120,128,0.16)",
                true: ICON_BACKGROUNDS.ghost,
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
            theme={theme}
            isDark={isDark}
          >
            <Switch
              value={isOnBreak}
              onValueChange={handleBreakToggle}
              trackColor={{
                false: isDark ? "rgba(120,120,128,0.32)" : "rgba(120,120,128,0.16)",
                true: ICON_BACKGROUNDS.break,
              }}
              thumbColor="#FFFFFF"
              ios_backgroundColor={
                isDark ? "rgba(120,120,128,0.32)" : "rgba(120,120,128,0.16)"
              }
            />
          </SafetyRow>
        </SafetySection>

        {/* Safety Anchors Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text.tertiary }]}>
            SAFETY ANCHORS
          </Text>
          <View style={styles.anchorsContainer}>
            {anchors.length === 0 ? (
              <TouchableOpacity
                style={[
                  styles.emptyCard,
                  { backgroundColor: theme.colors.glass.background },
                ]}
                onPress={() => router.push("/add-anchor")}
                activeOpacity={0.7}
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
                <Text style={[styles.addAnchorHint, { color: ICON_BACKGROUNDS.anchor }]}>
                  Tap to add an anchor
                </Text>
              </TouchableOpacity>
            ) : (
              <>
                {anchors.map((anchor) => (
                  <SwipeableAnchorRow
                    key={anchor.id}
                    anchorId={anchor.anchor_id}
                    name={getAnchorName(anchor)}
                    avatarUrl={getAnchorAvatar(anchor)}
                    onRemove={handleRemoveAnchor}
                  />
                ))}
                {anchors.length < 2 && (
                  <TouchableOpacity
                    style={[
                      styles.addAnchorCard,
                      {
                        backgroundColor: theme.colors.glass.background,
                        borderColor: theme.colors.glass.border,
                      },
                    ]}
                    onPress={() => router.push("/add-anchor")}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.addIconWrapper, { backgroundColor: ICON_BACKGROUNDS.anchor }]}>
                      <Ionicons name="add" size={20} color="#FFFFFF" />
                    </View>
                    <View style={styles.addTextContainer}>
                      <Text style={[styles.addLabel, { color: theme.colors.text.primary }]}>
                        Add Anchor
                      </Text>
                      <Text style={[styles.addDescription, { color: theme.colors.text.tertiary }]}>
                        Set another trusted contact
                      </Text>
                    </View>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
          <Text style={[styles.sectionFooter, { color: theme.colors.text.tertiary }]}>
            Anchors are trusted contacts who get notified when you're inactive for 48+ hours. You can set up to 2 anchors.
          </Text>
        </View>

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
          </View>
        </SafetySection>
      </ScrollView>

      {/* Header with gradient fade */}
      <LinearGradient
        colors={[theme.colors.bg.primary, theme.colors.bg.primary, `${theme.colors.bg.primary}00`]}
        locations={[0, 0.6, 1]}
        style={[styles.headerOverlay, { paddingTop: insets.top + spacing.md }]}
        pointerEvents="box-none"
      >
        <View style={styles.header} pointerEvents="box-none">
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
      </LinearGradient>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingBottom: 20,
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
  anchorsContainer: {
    gap: 10,
  },
  addAnchorCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  addIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  addTextContainer: {
    flex: 1,
  },
  addLabel: {
    fontSize: 16,
    fontWeight: "600",
  },
  addDescription: {
    fontSize: 13,
    marginTop: 2,
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
  avatarImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
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
  addAnchorHint: {
    fontSize: 13,
    fontWeight: "500",
    marginTop: spacing.sm,
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
