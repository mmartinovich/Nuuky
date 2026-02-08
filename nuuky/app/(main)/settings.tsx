import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  StatusBar,
  Switch,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../hooks/useAuth";
import { useTheme } from "../../hooks/useTheme";
import { usePreferences } from "../../hooks/usePreferences";
import { useAppStore } from "../../stores/appStore";
import { spacing, interactionStates } from "../../lib/theme";


interface SettingsRowProps {
  icon: string;
  label: string;
  value?: string;
  showChevron?: boolean;
  isDestructive?: boolean;
  onPress?: () => void;
  isFirst?: boolean;
  isLast?: boolean;
  children?: React.ReactNode;
  theme: ReturnType<typeof useTheme>["theme"];
}

const SettingsRow: React.FC<SettingsRowProps> = ({
  icon,
  label,
  value,
  showChevron = true,
  isDestructive = false,
  onPress,
  isFirst = false,
  isLast = false,
  children,
  theme,
}) => {
  const content = (
    <View
      style={[
        styles.rowContainer,
        {
          backgroundColor: theme.colors.glass.background,
          borderTopLeftRadius: isFirst ? 16 : 0,
          borderTopRightRadius: isFirst ? 16 : 0,
          borderBottomLeftRadius: isLast ? 16 : 0,
          borderBottomRightRadius: isLast ? 16 : 0,
        },
      ]}
    >
      <View style={styles.rowContent}>
        <Ionicons
          name={icon as any}
          size={22}
          color={isDestructive ? theme.colors.status?.error || "#EF4444" : theme.colors.text.primary}
          style={styles.rowIcon}
        />
        <Text
          style={[
            styles.rowLabel,
            { color: isDestructive ? (theme.colors.status?.error || "#EF4444") : theme.colors.text.primary },
          ]}
        >
          {label}
        </Text>
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
              style={styles.chevron}
            />
          )}
        </View>
      </View>
      {!isLast && (
        <View style={styles.separatorContainer}>
          <View
            style={[styles.separator, { backgroundColor: theme.colors.ui.borderLight }]}
          />
        </View>
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={interactionStates.pressed} onPress={onPress}>
        {content}
      </TouchableOpacity>
    );
  }
  return content;
};

interface SettingsSectionProps {
  title?: string;
  footer?: string;
  children: React.ReactNode;
  theme: ReturnType<typeof useTheme>["theme"];
}

const SettingsSection: React.FC<SettingsSectionProps> = ({
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

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { signOut } = useAuth();
  const { theme, accent } = useTheme();
  const {
    nudgesEnabled,
    flaresEnabled,
    toggleNudges,
    toggleFlares,
    loading: prefsLoading,
  } = usePreferences();
  const handleLogout = async () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          try {
            await signOut();
            router.replace("/(auth)/login");
          } catch (error) {
            Alert.alert("Error", "Failed to sign out");
          }
        },
      },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bg.primary }]}>
      <StatusBar barStyle={"light-content"} />
      <LinearGradient
        colors={theme.gradients.background}
        style={StyleSheet.absoluteFill}
      />

      <ScrollView
        style={styles.content}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 100, paddingBottom: insets.bottom + 32 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Section */}
        <SettingsSection theme={theme}>
          <SettingsRow
            icon="person-circle"
            label="Profile"
            onPress={() => router.push("/(main)/profile")}
            isFirst
            isLast
            theme={theme}
          />
        </SettingsSection>

        {/* Appearance Section - hidden until light mode is ready */}

        {/* Privacy & Safety Section */}
        <SettingsSection title="PRIVACY & SAFETY" theme={theme}>
          <SettingsRow
            icon="shield-checkmark"
            label="Safety & Privacy"
            onPress={() => router.push("/(main)/safety")}
            isFirst
            isLast
            theme={theme}
          />
        </SettingsSection>

        {/* Notifications Section */}
        <SettingsSection
          title="NOTIFICATIONS"
          footer="Control which notifications you receive from your friends."
          theme={theme}
        >
          <SettingsRow
            icon="hand-left"
            label="Nudges"
            showChevron={false}
            isFirst
            theme={theme}
          >
            <Switch
              value={nudgesEnabled}
              onValueChange={() => { toggleNudges(); }}
              disabled={prefsLoading}
              trackColor={{
                false: "rgba(120,120,128,0.32)",
                true: accent.primary,
              }}
              thumbColor="#FFFFFF"
              ios_backgroundColor={
                "rgba(120,120,128,0.32)"
              }
            />
          </SettingsRow>
          <SettingsRow
            icon="flame"
            label="Flares"
            showChevron={false}
            isLast
            theme={theme}
          >
            <Switch
              value={flaresEnabled}
              onValueChange={() => { toggleFlares(); }}
              disabled={prefsLoading}
              trackColor={{
                false: "rgba(120,120,128,0.32)",
                true: accent.primary,
              }}
              thumbColor="#FFFFFF"
              ios_backgroundColor={
                "rgba(120,120,128,0.32)"
              }
            />
          </SettingsRow>
        </SettingsSection>

        {/* About Section */}
        <SettingsSection title="ABOUT" theme={theme}>
          <SettingsRow
            icon="information-circle"
            label="Version"
            value="1.0.0"
            showChevron={false}
            isFirst
            theme={theme}
          />
          <SettingsRow
            icon="document-text"
            label="Privacy Policy"
            onPress={() => router.push("/(main)/privacy-policy")}
            theme={theme}
          />
          <SettingsRow
            icon="reader"
            label="Terms of Service"
            onPress={() => router.push("/(main)/terms-of-service")}
            isLast
            theme={theme}
          />
        </SettingsSection>

        {/* Account Section */}
        <SettingsSection theme={theme}>
          <SettingsRow
            icon="log-out"
            label="Sign Out"
            isDestructive
            showChevron={false}
            onPress={handleLogout}
            isFirst
            isLast
            theme={theme}
          />
        </SettingsSection>
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
            Settings
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
    width: 44, // Match backButton width for centered title
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: spacing.md,
  },
  section: {
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.screenPadding, // Updated: spacing.md → screenPadding (24px)
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "500", // Updated: 400 → 500 for better readability
    letterSpacing: 0.5, // Updated: -0.08 → 0.5 for cleaner look
    marginBottom: spacing.sm + 4, // 12px
    marginLeft: spacing.md,
    textTransform: "uppercase",
  },
  sectionContent: {
    borderRadius: 16, // Updated: 12 → 16 for more modern look
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
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
    minHeight: 56, // Updated: 44 → 56 for better touch target
  },
  rowContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md, // 20px
    paddingVertical: 14, // Updated: 11 → 14 for proper proportions with 56px height
    minHeight: 56, // Updated: 44 → 56
  },
  rowIcon: {
    marginRight: 12,
  },
  rowLabel: {
    flex: 1,
    fontSize: 16, // Updated: 17 → 16 to match new typography.size.base
    fontWeight: "400",
    letterSpacing: -0.41,
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
  chevron: {
    marginLeft: spacing.xs,
  },
  separatorContainer: {
    paddingLeft: 50, // icon (22) + margin (12) + padding (16)
  },
  separator: {
    height: StyleSheet.hairlineWidth,
  },
});
