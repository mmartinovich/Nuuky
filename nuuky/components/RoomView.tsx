import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { OrbitView } from './OrbitView';
import { spacing, radius, typography, getMoodColor } from '../lib/theme';
import { useTheme } from '../hooks/useTheme';
import { RoomParticipant, User } from '../types';

interface RoomViewProps {
  roomName?: string;
  participants: RoomParticipant[];
  currentUser: User;
  isCreator: boolean;
  onLeave?: () => void;
  onSettingsPress?: () => void;
}

export const RoomView: React.FC<RoomViewProps> = ({
  roomName,
  participants,
  currentUser,
  isCreator,
  onLeave,
  onSettingsPress,
}) => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();

  // Convert RoomParticipants to Users for OrbitView
  const participantUsers: User[] = participants
    .map((p) => p.user)
    .filter((u): u is User => u !== null && u !== undefined);

  const handleParticipantPress = (user: User) => {
    // Show participant action menu
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={theme.gradients.background} style={StyleSheet.absoluteFill} />

      <OrbitView
        participants={participantUsers}
        currentUser={currentUser}
        onParticipantPress={handleParticipantPress}
        headerContent={
          <BlurView intensity={30} style={[styles.header, { paddingTop: insets.top + spacing.sm, borderBottomColor: theme.colors.glass.border }]}>
            <View style={styles.headerContent}>
              {/* Back Button */}
              <TouchableOpacity
                style={[styles.backButton, { borderColor: theme.colors.glass.border }]}
                onPress={() => router.back()}
                activeOpacity={0.8}
                accessibilityLabel="Go back"
                accessibilityRole="button"
              >
                <Ionicons name="chevron-back" size={24} color={theme.colors.text.primary} />
              </TouchableOpacity>

              {/* Room Info */}
              <View style={styles.headerInfo}>
                <Text style={[styles.roomName, { color: theme.colors.text.primary }]}>{roomName || 'Room'}</Text>
                <Text style={[styles.participantCount, { color: theme.colors.text.secondary }]}>
                  {participants.length} {participants.length === 1 ? 'person' : 'people'} here
                </Text>
              </View>

              {/* Settings Button */}
              {onSettingsPress ? (
                <TouchableOpacity
                  style={[styles.settingsButton, { borderColor: theme.colors.glass.border }]}
                  onPress={onSettingsPress}
                  activeOpacity={0.8}
                  accessibilityLabel="Room settings"
                  accessibilityRole="button"
                >
                  <Ionicons name="settings-outline" size={24} color={theme.colors.text.primary} />
                </TouchableOpacity>
              ) : (
                <View style={styles.settingsButton} />
              )}
            </View>
          </BlurView>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    borderBottomWidth: 1,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
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
  headerInfo: {
    flex: 1,
    alignItems: 'center',
  },
  roomName: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold as any,
    marginBottom: spacing.xs / 2,
  },
  participantCount: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium as any,
  },
  settingsButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
  },
});
