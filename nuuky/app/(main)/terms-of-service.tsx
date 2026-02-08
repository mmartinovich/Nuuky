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

export default function TermsOfServiceScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bg.primary }]}>
      <StatusBar barStyle={"light-content"} />
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
          Terms of Service
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

        <Section title="1. Acceptance of Terms" theme={theme}>
          <Paragraph theme={theme}>
            By downloading, installing, or using Nuuky, you agree to be bound by these Terms of Service. If you do not agree to these terms, do not use the app.
          </Paragraph>
        </Section>

        <Section title="2. Description of Service" theme={theme}>
          <Paragraph theme={theme}>
            Nuuky is a social application that allows you to connect with friends through mood sharing, rooms, presence features, nudges, and flares. We reserve the right to modify, suspend, or discontinue any part of the service at any time.
          </Paragraph>
        </Section>

        <Section title="3. Eligibility" theme={theme}>
          <Paragraph theme={theme}>
            You must be at least 13 years old to use Nuuky. If you are under 18, you represent that your parent or legal guardian has reviewed and agreed to these terms. By using Nuuky, you represent that you meet these requirements.
          </Paragraph>
        </Section>

        <Section title="4. Your Account" theme={theme}>
          <Paragraph theme={theme}>
            You are responsible for maintaining the security of your account and all activity that occurs under it. You must provide accurate information when creating your account. You may not:
          </Paragraph>
          <Bullet theme={theme}>Create accounts for anyone other than yourself</Bullet>
          <Bullet theme={theme}>Use another person's account without permission</Bullet>
          <Bullet theme={theme}>Share your account credentials with others</Bullet>
        </Section>

        <Section title="5. Acceptable Use" theme={theme}>
          <Paragraph theme={theme}>
            You agree not to use Nuuky to:
          </Paragraph>
          <Bullet theme={theme}>Harass, bully, threaten, or intimidate other users</Bullet>
          <Bullet theme={theme}>Share content that is illegal, harmful, or violates others' rights</Bullet>
          <Bullet theme={theme}>Impersonate any person or entity</Bullet>
          <Bullet theme={theme}>Attempt to gain unauthorized access to other accounts or our systems</Bullet>
          <Bullet theme={theme}>Use automated means to access the service (bots, scrapers, etc.)</Bullet>
          <Bullet theme={theme}>Interfere with or disrupt the service or its infrastructure</Bullet>
          <Bullet theme={theme}>Circumvent any safety or privacy features</Bullet>
        </Section>

        <Section title="6. Content & Conduct" theme={theme}>
          <Paragraph theme={theme}>
            You retain ownership of content you create on Nuuky (moods, room messages, etc.). By posting content, you grant us a limited license to display and distribute it within the app to your friends and room members as intended by the features you use.
          </Paragraph>
          <Paragraph theme={theme}>
            We may remove content or suspend accounts that violate these terms or that we reasonably believe are harmful to the community.
          </Paragraph>
        </Section>

        <Section title="7. Privacy" theme={theme}>
          <Paragraph theme={theme}>
            Your use of Nuuky is also governed by our Privacy Policy, which describes how we collect, use, and protect your information. Please review it carefully.
          </Paragraph>
        </Section>

        <Section title="8. Safety Features" theme={theme}>
          <Paragraph theme={theme}>
            Nuuky provides safety features including Ghost Mode, blocking, and Safety Anchors. These features are provided as-is and are not a substitute for contacting emergency services if you are in danger. We are not responsible for monitoring or responding to safety concerns.
          </Paragraph>
        </Section>

        <Section title="9. Termination" theme={theme}>
          <Paragraph theme={theme}>
            You may delete your account at any time. We may suspend or terminate your account if you violate these terms, engage in harmful behavior, or for any other reason at our discretion. Upon termination, your right to use the service ceases immediately.
          </Paragraph>
        </Section>

        <Section title="10. Disclaimers" theme={theme}>
          <Paragraph theme={theme}>
            Nuuky is provided "as is" and "as available" without warranties of any kind, whether express or implied. We do not guarantee that the service will be uninterrupted, secure, or error-free.
          </Paragraph>
        </Section>

        <Section title="11. Limitation of Liability" theme={theme}>
          <Paragraph theme={theme}>
            To the maximum extent permitted by law, Nuuky and its team shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of or inability to use the service.
          </Paragraph>
        </Section>

        <Section title="12. Changes to Terms" theme={theme}>
          <Paragraph theme={theme}>
            We may update these Terms of Service from time to time. We will notify you of material changes through the app. Continued use of Nuuky after changes take effect constitutes acceptance of the new terms.
          </Paragraph>
        </Section>

        <Section title="13. Contact Us" theme={theme}>
          <Paragraph theme={theme}>
            If you have questions about these Terms of Service, please contact us at support@nuuky.app.
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
