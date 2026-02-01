import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { spacing, interactionStates } from "../../lib/theme";
import { useTheme } from "../../hooks/useTheme";

const LAST_UPDATED = "February 1, 2026";

interface SectionProps {
  title: string;
  children: React.ReactNode;
  theme: ReturnType<typeof useTheme>["theme"];
}

const Section: React.FC<SectionProps> = ({ title, children, theme }) => (
  <View style={styles.section}>
    <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
      {title}
    </Text>
    {children}
  </View>
);

interface ParagraphProps {
  children: string;
  theme: ReturnType<typeof useTheme>["theme"];
}

const Paragraph: React.FC<ParagraphProps> = ({ children, theme }) => (
  <Text style={[styles.paragraph, { color: theme.colors.text.secondary }]}>
    {children}
  </Text>
);

interface BulletProps {
  children: string;
  theme: ReturnType<typeof useTheme>["theme"];
}

const Bullet: React.FC<BulletProps> = ({ children, theme }) => (
  <View style={styles.bulletRow}>
    <Text style={[styles.bulletDot, { color: theme.colors.text.tertiary }]}>
      {"\u2022"}
    </Text>
    <Text style={[styles.bulletText, { color: theme.colors.text.secondary }]}>
      {children}
    </Text>
  </View>
);

export default function PrivacyPolicyScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bg.primary }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <LinearGradient
        colors={theme.gradients.background}
        style={StyleSheet.absoluteFill}
      />

      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={interactionStates.pressed}
        >
          <Ionicons name="chevron-back" size={28} color={theme.colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text.primary }]}>
          Privacy Policy
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
        <Text style={[styles.lastUpdated, { color: theme.colors.text.tertiary }]}>
          Last updated: {LAST_UPDATED}
        </Text>

        <Section title="1. Introduction" theme={theme}>
          <Paragraph theme={theme}>
            Nuuky ("we," "our," or "us") is a social app that helps you stay connected with your friends through moods, rooms, and real-time presence. This Privacy Policy explains how we collect, use, and protect your information when you use the Nuuky mobile application.
          </Paragraph>
          <Paragraph theme={theme}>
            By using Nuuky, you agree to the collection and use of information as described in this policy.
          </Paragraph>
        </Section>

        <Section title="2. Information We Collect" theme={theme}>
          <Paragraph theme={theme}>
            We collect the following types of information:
          </Paragraph>
          <Text style={[styles.subheading, { color: theme.colors.text.primary }]}>
            Account Information
          </Text>
          <Bullet theme={theme}>Name and display name</Bullet>
          <Bullet theme={theme}>Email address</Bullet>
          <Bullet theme={theme}>Profile photo (if provided)</Bullet>
          <Bullet theme={theme}>Authentication data from Google or Apple sign-in</Bullet>

          <Text style={[styles.subheading, { color: theme.colors.text.primary }]}>
            Usage Information
          </Text>
          <Bullet theme={theme}>Mood and status updates you share</Bullet>
          <Bullet theme={theme}>Rooms you create or join</Bullet>
          <Bullet theme={theme}>Friend connections and interactions</Bullet>
          <Bullet theme={theme}>Nudges and flares you send or receive</Bullet>

          <Text style={[styles.subheading, { color: theme.colors.text.primary }]}>
            Device Information
          </Text>
          <Bullet theme={theme}>Device type and operating system</Bullet>
          <Bullet theme={theme}>Push notification tokens</Bullet>
          <Bullet theme={theme}>App version</Bullet>
        </Section>

        <Section title="3. How We Use Your Information" theme={theme}>
          <Paragraph theme={theme}>
            We use your information to:
          </Paragraph>
          <Bullet theme={theme}>Provide and maintain the Nuuky service</Bullet>
          <Bullet theme={theme}>Connect you with your friends and display your presence</Bullet>
          <Bullet theme={theme}>Send push notifications for nudges, flares, and friend activity</Bullet>
          <Bullet theme={theme}>Enable safety features like Ghost Mode and safety anchors</Bullet>
          <Bullet theme={theme}>Improve and personalize your experience</Bullet>
          <Bullet theme={theme}>Detect and prevent abuse or violations of our terms</Bullet>
        </Section>

        <Section title="4. Information Sharing" theme={theme}>
          <Paragraph theme={theme}>
            Your mood, status, and presence are visible to your friends on Nuuky. Room activity is visible to room members.
          </Paragraph>
          <Paragraph theme={theme}>
            We do not sell your personal information to third parties. We may share information with:
          </Paragraph>
          <Bullet theme={theme}>Service providers that help us operate Nuuky (hosting, analytics, notifications)</Bullet>
          <Bullet theme={theme}>Law enforcement when required by law</Bullet>
          <Bullet theme={theme}>Other parties with your explicit consent</Bullet>
        </Section>

        <Section title="5. Safety & Privacy Controls" theme={theme}>
          <Paragraph theme={theme}>
            Nuuky provides built-in privacy controls:
          </Paragraph>
          <Bullet theme={theme}>Ghost Mode lets you become invisible to all friends temporarily</Bullet>
          <Bullet theme={theme}>Take a Break pauses all presence and notifications</Bullet>
          <Bullet theme={theme}>Safety Anchors are trusted contacts notified if you're inactive for extended periods</Bullet>
        </Section>

        <Section title="6. Data Storage & Security" theme={theme}>
          <Paragraph theme={theme}>
            Your data is stored securely using Supabase infrastructure with encryption in transit and at rest. We implement industry-standard security measures to protect your information, but no method of transmission over the internet is 100% secure.
          </Paragraph>
        </Section>

        <Section title="7. Data Retention" theme={theme}>
          <Paragraph theme={theme}>
            We retain your account data for as long as your account is active. You can request deletion of your account and associated data at any time by contacting us. Upon deletion, your data will be removed within 30 days, except where retention is required by law.
          </Paragraph>
        </Section>

        <Section title="8. Children's Privacy" theme={theme}>
          <Paragraph theme={theme}>
            Nuuky is not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13. If we become aware that we have collected such information, we will take steps to delete it.
          </Paragraph>
        </Section>

        <Section title="9. Your Rights" theme={theme}>
          <Paragraph theme={theme}>
            Depending on your location, you may have the right to:
          </Paragraph>
          <Bullet theme={theme}>Access the personal data we hold about you</Bullet>
          <Bullet theme={theme}>Request correction of inaccurate data</Bullet>
          <Bullet theme={theme}>Request deletion of your data</Bullet>
          <Bullet theme={theme}>Object to or restrict processing of your data</Bullet>
          <Bullet theme={theme}>Data portability</Bullet>
        </Section>

        <Section title="10. Changes to This Policy" theme={theme}>
          <Paragraph theme={theme}>
            We may update this Privacy Policy from time to time. We will notify you of significant changes through the app or via email. Continued use of Nuuky after changes constitutes acceptance of the updated policy.
          </Paragraph>
        </Section>

        <Section title="11. Contact Us" theme={theme}>
          <Paragraph theme={theme}>
            If you have questions about this Privacy Policy or your data, please contact us at support@nuuky.app.
          </Paragraph>
        </Section>
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
    paddingHorizontal: spacing.screenPadding || 24,
    paddingTop: spacing.sm,
  },
  lastUpdated: {
    fontSize: 13,
    fontWeight: "400",
    marginBottom: spacing.xl,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    letterSpacing: -0.3,
    marginBottom: spacing.sm,
  },
  subheading: {
    fontSize: 15,
    fontWeight: "600",
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  paragraph: {
    fontSize: 15,
    fontWeight: "400",
    lineHeight: 22,
    marginBottom: spacing.sm,
  },
  bulletRow: {
    flexDirection: "row",
    paddingLeft: spacing.sm,
    marginBottom: 6,
  },
  bulletDot: {
    fontSize: 15,
    lineHeight: 22,
    marginRight: 8,
  },
  bulletText: {
    fontSize: 15,
    fontWeight: "400",
    lineHeight: 22,
    flex: 1,
  },
});
