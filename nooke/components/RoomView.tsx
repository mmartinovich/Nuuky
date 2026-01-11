import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { OrbitView } from './OrbitView';
import { colors, spacing, radius, typography, gradients, getMoodColor } from '../lib/theme';
import { RoomParticipant, User } from '../types';

interface RoomViewProps {
  roomName?: string;
  participants: RoomParticipant[];
  currentUser: User;
  isCreator: boolean;
  onLeave: () => void;
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

  // Convert RoomParticipants to Users for OrbitView
  const participantUsers: User[] = participants
    .map((p) => p.user)
    .filter((u): u is User => u !== null && u !== undefined);

  const handleParticipantPress = (user: User) => {
    // TODO: Show participant action menu
    console.log('Participant pressed:', user.display_name);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={gradients.background} style={StyleSheet.absoluteFill} />

      <OrbitView
        participants={participantUsers}
        currentUser={currentUser}
        onParticipantPress={handleParticipantPress}
        headerContent={
          <BlurView intensity={30} style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
            <View style={styles.headerContent}>
              {/* Back Button */}
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => router.back()}
                activeOpacity={0.8}
              >
                <Ionicons name="chevron-back" size={24} color={colors.text.primary} />
              </TouchableOpacity>

              {/* Room Info */}
              <View style={styles.headerInfo}>
                <Text style={styles.roomName}>{roomName || 'Room'}</Text>
                <Text style={styles.participantCount}>
                  {participants.length} {participants.length === 1 ? 'person' : 'people'} here
                </Text>
              </View>

              {/* Settings Button (Creator Only) */}
              {isCreator && onSettingsPress && (
                <TouchableOpacity
                  style={styles.settingsButton}
                  onPress={onSettingsPress}
                  activeOpacity={0.8}
                >
                  <Ionicons name="settings-outline" size={24} color={colors.text.primary} />
                </TouchableOpacity>
              )}
              {!isCreator && <View style={styles.settingsButton} />}
            </View>
          </BlurView>
        }
        footerContent={
          <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
            <TouchableOpacity onPress={onLeave} style={styles.leaveButton} activeOpacity={0.8}>
              <LinearGradient
                colors={['rgba(239, 68, 68, 0.3)', 'rgba(220, 38, 38, 0.3)']}
                style={styles.leaveGradient}
              >
                <Ionicons name="exit-outline" size={20} color={colors.text.primary} />
                <Text style={styles.leaveText}>Leave Room</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
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
    borderBottomColor: colors.glass.border,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  headerInfo: {
    flex: 1,
    alignItems: 'center',
  },
  roomName: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold as any,
    color: colors.text.primary,
    marginBottom: spacing.xs / 2,
  },
  participantCount: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    fontWeight: typography.weight.medium as any,
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  footer: {
    padding: spacing.md,
  },
  leaveButton: {
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  leaveGradient: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  leaveText: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.bold as any,
    color: colors.text.primary,
  },
});
