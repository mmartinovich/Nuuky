import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { colors, spacing, radius, typography, gradients } from '../../lib/theme';

export default function SettingsScreen() {
  const router = useRouter();
  const { signOut } = useAuth();

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
          }
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={gradients.background} style={StyleSheet.absoluteFill} />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>Privacy & Safety</Text>

        <TouchableOpacity
          style={styles.settingCard}
          onPress={() => router.push('/(main)/safety')}
        >
          <BlurView intensity={20} style={styles.cardBlur}>
            <View style={styles.cardContent}>
              <View style={styles.settingItem}>
                <View style={styles.iconContainer}>
                  <Text style={styles.icon}>🛡️</Text>
                </View>
                <Text style={styles.settingLabel}>Safety & Privacy</Text>
                <Feather name="chevron-right" size={20} color={colors.text.secondary} />
              </View>
            </View>
          </BlurView>
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Notifications</Text>

        <BlurView intensity={20} style={styles.settingCard}>
          <View style={styles.cardContent}>
            <View style={styles.settingItem}>
              <View style={styles.iconContainer}>
                <Text style={styles.icon}>👋</Text>
              </View>
              <Text style={styles.settingLabel}>Nudges</Text>
              <Text style={styles.settingValue}>Enabled</Text>
            </View>
          </View>
        </BlurView>

        <BlurView intensity={20} style={styles.settingCard}>
          <View style={styles.cardContent}>
            <View style={styles.settingItem}>
              <View style={styles.iconContainer}>
                <Text style={styles.icon}>🔥</Text>
              </View>
              <Text style={styles.settingLabel}>Flares</Text>
              <Text style={styles.settingValue}>Enabled</Text>
            </View>
          </View>
        </BlurView>

        <Text style={styles.sectionTitle}>About</Text>

        <BlurView intensity={20} style={styles.settingCard}>
          <View style={styles.cardContent}>
            <View style={styles.settingItem}>
              <View style={styles.iconContainer}>
                <Text style={styles.icon}>ℹ️</Text>
              </View>
              <Text style={styles.settingLabel}>Version</Text>
              <Text style={styles.settingValue}>1.0.0</Text>
            </View>
          </View>
        </BlurView>

        <TouchableOpacity style={styles.settingCard}>
          <BlurView intensity={20} style={styles.cardBlur}>
            <View style={styles.cardContent}>
              <View style={styles.settingItem}>
                <View style={styles.iconContainer}>
                  <Text style={styles.icon}>📄</Text>
                </View>
                <Text style={styles.settingLabel}>Privacy Policy</Text>
                <Feather name="chevron-right" size={20} color={colors.text.secondary} />
              </View>
            </View>
          </BlurView>
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingCard}>
          <BlurView intensity={20} style={styles.cardBlur}>
            <View style={styles.cardContent}>
              <View style={styles.settingItem}>
                <View style={styles.iconContainer}>
                  <Text style={styles.icon}>📋</Text>
                </View>
                <Text style={styles.settingLabel}>Terms of Service</Text>
                <Feather name="chevron-right" size={20} color={colors.text.secondary} />
              </View>
            </View>
          </BlurView>
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Account</Text>

        <TouchableOpacity style={styles.settingCard} onPress={handleLogout}>
          <BlurView intensity={20} style={styles.cardBlur}>
            <View style={styles.cardContent}>
              <View style={styles.settingItem}>
                <View style={styles.iconContainer}>
                  <Text style={styles.icon}>🚪</Text>
                </View>
                <Text style={[styles.settingLabel, styles.logoutText]}>Logout</Text>
                <Feather name="log-out" size={20} color={colors.mood.reachOut.base} />
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
    backgroundColor: colors.bg.primary,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
  },
  sectionTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  settingCard: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.glass.border,
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
    fontWeight: typography.weights.semibold,
    color: colors.text.primary,
  },
  settingValue: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
    marginRight: spacing.sm,
  },
  logoutText: {
    color: colors.mood.reachOut.base,
  },
});
