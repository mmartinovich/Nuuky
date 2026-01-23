import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, StatusBar } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { spacing, radius, typography } from '../../lib/theme';

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { signOut } = useAuth();
  const { theme, isDark } = useTheme();

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
              router.replace('/(auth)/login');
            } catch (error) {
              Alert.alert('Error', 'Failed to logout');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bg.primary }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <LinearGradient
        colors={theme.gradients.background as unknown as string[]}
        style={StyleSheet.absoluteFill}
      />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.md, borderBottomColor: theme.colors.glass.border }]}>
        <TouchableOpacity
          style={[styles.backButton, { borderColor: theme.colors.glass.border }]}
          onPress={() => router.back()}
          activeOpacity={0.8}
        >
          <Ionicons name="chevron-back" size={24} color={theme.colors.text.primary} />
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { color: theme.colors.text.primary }]}>Settings</Text>

        <View style={styles.placeholderButton} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Privacy & Safety Section */}
        <Text style={[styles.sectionTitle, { color: theme.colors.text.primary, marginTop: spacing.lg }]}>
          Privacy & Safety
        </Text>

        <TouchableOpacity
          style={[styles.settingCard, { borderColor: theme.colors.glass.border }]}
          onPress={() => router.push('/(main)/safety')}
        >
          <BlurView intensity={isDark ? 20 : 10} tint={theme.colors.blurTint} style={styles.cardBlur}>
            <View style={styles.cardContent}>
              <View style={styles.settingItem}>
                <View style={styles.iconContainer}>
                  <Text style={styles.icon}>🛡️</Text>
                </View>
                <Text style={[styles.settingLabel, { color: theme.colors.text.primary }]}>
                  Safety & Privacy
                </Text>
                <Feather name="chevron-right" size={20} color={theme.colors.text.secondary} />
              </View>
            </View>
          </BlurView>
        </TouchableOpacity>

        {/* Notifications Section */}
        <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
          Notifications
        </Text>

        <BlurView
          intensity={isDark ? 20 : 10}
          tint={theme.colors.blurTint}
          style={[styles.settingCard, { borderColor: theme.colors.glass.border }]}
        >
          <View style={styles.cardContent}>
            <View style={styles.settingItem}>
              <View style={styles.iconContainer}>
                <Text style={styles.icon}>👋</Text>
              </View>
              <Text style={[styles.settingLabel, { color: theme.colors.text.primary }]}>Nudges</Text>
              <Text style={[styles.settingValue, { color: theme.colors.text.secondary }]}>Enabled</Text>
            </View>
          </View>
        </BlurView>

        <BlurView
          intensity={isDark ? 20 : 10}
          tint={theme.colors.blurTint}
          style={[styles.settingCard, { borderColor: theme.colors.glass.border }]}
        >
          <View style={styles.cardContent}>
            <View style={styles.settingItem}>
              <View style={styles.iconContainer}>
                <Text style={styles.icon}>🔥</Text>
              </View>
              <Text style={[styles.settingLabel, { color: theme.colors.text.primary }]}>Flares</Text>
              <Text style={[styles.settingValue, { color: theme.colors.text.secondary }]}>Enabled</Text>
            </View>
          </View>
        </BlurView>

        {/* About Section */}
        <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>About</Text>

        <BlurView
          intensity={isDark ? 20 : 10}
          tint={theme.colors.blurTint}
          style={[styles.settingCard, { borderColor: theme.colors.glass.border }]}
        >
          <View style={styles.cardContent}>
            <View style={styles.settingItem}>
              <View style={styles.iconContainer}>
                <Text style={styles.icon}>ℹ️</Text>
              </View>
              <Text style={[styles.settingLabel, { color: theme.colors.text.primary }]}>Version</Text>
              <Text style={[styles.settingValue, { color: theme.colors.text.secondary }]}>1.0.0</Text>
            </View>
          </View>
        </BlurView>

        <TouchableOpacity style={[styles.settingCard, { borderColor: theme.colors.glass.border }]}>
          <BlurView intensity={isDark ? 20 : 10} tint={theme.colors.blurTint} style={styles.cardBlur}>
            <View style={styles.cardContent}>
              <View style={styles.settingItem}>
                <View style={styles.iconContainer}>
                  <Text style={styles.icon}>📄</Text>
                </View>
                <Text style={[styles.settingLabel, { color: theme.colors.text.primary }]}>
                  Privacy Policy
                </Text>
                <Feather name="chevron-right" size={20} color={theme.colors.text.secondary} />
              </View>
            </View>
          </BlurView>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.settingCard, { borderColor: theme.colors.glass.border }]}>
          <BlurView intensity={isDark ? 20 : 10} tint={theme.colors.blurTint} style={styles.cardBlur}>
            <View style={styles.cardContent}>
              <View style={styles.settingItem}>
                <View style={styles.iconContainer}>
                  <Text style={styles.icon}>📋</Text>
                </View>
                <Text style={[styles.settingLabel, { color: theme.colors.text.primary }]}>
                  Terms of Service
                </Text>
                <Feather name="chevron-right" size={20} color={theme.colors.text.secondary} />
              </View>
            </View>
          </BlurView>
        </TouchableOpacity>

        {/* Account Section */}
        <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>Account</Text>

        <TouchableOpacity
          style={[styles.settingCard, { borderColor: theme.colors.glass.border }]}
          onPress={handleLogout}
        >
          <BlurView intensity={isDark ? 20 : 10} tint={theme.colors.blurTint} style={styles.cardBlur}>
            <View style={styles.cardContent}>
              <View style={styles.settingItem}>
                <View style={styles.iconContainer}>
                  <Text style={styles.icon}>🚪</Text>
                </View>
                <Text style={[styles.settingLabel, styles.logoutText]}>Logout</Text>
                <Feather name="log-out" size={20} color="#EC4899" />
              </View>
            </View>
          </BlurView>
        </TouchableOpacity>

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
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
  },
  headerTitle: {
    fontSize: typography.sizes['2xl'],
    fontWeight: typography.weights.bold as any,
    letterSpacing: -0.5,
  },
  placeholderButton: {
    width: 44,
    height: 44,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
  },
  sectionTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold as any,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  settingCard: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  cardBlur: {
    overflow: 'hidden',
  },
  cardContent: {
    padding: spacing.md,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    marginRight: spacing.md,
  },
  icon: {
    fontSize: 24,
  },
  settingLabel: {
    flex: 1,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold as any,
  },
  settingValue: {
    fontSize: typography.sizes.sm,
    marginRight: spacing.sm,
  },
  logoutText: {
    color: '#EC4899',
  },
});
