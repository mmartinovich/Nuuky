import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, Alert, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRoom } from '../../../hooks/useRoom';
import { useAudio } from '../../../hooks/useAudio';
import { useTheme } from '../../../hooks/useTheme';
import { RoomView } from '../../../components/RoomView';
import { RoomSettingsModal } from '../../../components/RoomSettingsModal';
import { InviteFriendsModal } from '../../../components/InviteFriendsModal';
import { AudioConnectionBadge } from '../../../components/AudioConnectionBadge';
import { useAppStore } from '../../../stores/appStore';
import { supabase } from '../../../lib/supabase';

const PURPLE_ACCENT = '#A855F7';

export default function RoomScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { theme } = useTheme();
  const { currentUser, friends, setCurrentRoom, setRoomParticipants } = useAppStore();
  const {
    currentRoom,
    participants,
    joinRoom,
    leaveRoom,
    updateRoomName,
    deleteRoom,
    inviteFriendToRoom,
    removeParticipant,
    loadParticipants,
    loading,
    clearLastJoinedRoom,
  } = useRoom();
  const [showSettings, setShowSettings] = useState(false);
  const [showInviteFriends, setShowInviteFriends] = useState(false);
  const [isMuted, setIsMuted] = useState(true);

  // Audio integration
  const {
    connectionStatus: audioConnectionStatus,
    isConnecting: isAudioConnecting,
    unmute: audioUnmute,
    mute: audioMute,
    disconnect: audioDisconnect,
  } = useAudio(currentRoom?.id || null);

  useEffect(() => {
    if (id && currentUser) {
      // Join the room when screen mounts
      handleJoinRoom();
    }

    // Clear current room when navigating away (but don't leave the room)
    return () => {
      // Disconnect audio when navigating away
      audioDisconnect();
      // Clear the current room state and participants when navigating away
      // Users should explicitly leave via the leave button
      setCurrentRoom(null);
      setRoomParticipants([]);
      clearLastJoinedRoom();
    };
  }, [id, audioDisconnect]);

  // Refresh participants when screen gains focus (e.g., returning from friends page)
  useFocusEffect(
    useCallback(() => {
      if (currentRoom) {
        loadParticipants();
      }
    }, [currentRoom?.id, loadParticipants])
  );

  const handleJoinRoom = async () => {
    if (!id) return;

    const success = await joinRoom(id);
    if (!success) {
      Alert.alert('Error', 'Failed to join room', [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    }
  };

  const handleLeaveRoom = async () => {
    // Disconnect audio before leaving
    await audioDisconnect();
    await leaveRoom();
    router.back();
  };

  // Toggle mute - connects to audio on first unmute
  const handleToggleMute = async () => {
    if (!currentRoom || !currentUser) {
      return;
    }

    if (isMuted) {
      // User is unmuting - connect to audio
      const success = await audioUnmute();
      if (success) {
        setIsMuted(false);
        // Update database
        await supabase
          .from('room_participants')
          .update({ is_muted: false })
          .eq('room_id', currentRoom.id)
          .eq('user_id', currentUser.id);
      }
    } else {
      // User is muting
      await audioMute();
      setIsMuted(true);
      // Update database
      await supabase
        .from('room_participants')
        .update({ is_muted: true })
        .eq('room_id', currentRoom.id)
        .eq('user_id', currentUser.id);
    }
  };

  const handleSettingsPress = () => {
    setShowSettings(true);
  };

  const handleRename = async (newName: string) => {
    if (!currentRoom) return;
    const success = await updateRoomName(currentRoom.id, newName);
    if (!success) {
      throw new Error('Failed to rename room');
    }
  };

  const handleDelete = async () => {
    if (!currentRoom) return;
    const success = await deleteRoom(currentRoom.id);
    if (success) {
      router.back();
    }
  };

  const handleInviteFriend = async (friendId: string) => {
    if (!currentRoom) return;
    await inviteFriendToRoom(currentRoom.id, friendId);
  };

  const handleOpenInviteFriends = () => {
    setShowSettings(false);
    setShowInviteFriends(true);
  };

  const handleRemoveParticipant = async (userId: string) => {
    if (!currentRoom) return;
    await removeParticipant(currentRoom.id, userId);
  };

  if (!currentRoom || loading || !currentUser) {
    return <View style={[styles.container, { backgroundColor: theme.colors.bg.primary }]} />;
  }

  // Get friend users
  const friendUsers = friends.map((f) => f.friend).filter(Boolean);
  const participantIds = participants.map((p) => p.user_id);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bg.primary }]}>
      <RoomView
        roomName={currentRoom.name}
        participants={participants}
        currentUser={currentUser}
        isCreator={currentRoom.creator_id === currentUser?.id}
        onSettingsPress={handleSettingsPress}
      />

      {/* Audio Status Badge */}
      {audioConnectionStatus !== 'disconnected' && (
        <View style={styles.audioBadgeContainer}>
          <AudioConnectionBadge status={audioConnectionStatus} />
        </View>
      )}

      {/* Mute/Unmute Button */}
      <View style={styles.muteButtonContainer}>
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            handleToggleMute();
          }}
          activeOpacity={0.8}
          disabled={isAudioConnecting}
          style={[
            styles.muteButton,
            {
              backgroundColor: isMuted ? 'transparent' : PURPLE_ACCENT,
              borderColor: PURPLE_ACCENT,
              opacity: isAudioConnecting ? 0.7 : 1,
            },
          ]}
        >
          {isAudioConnecting ? (
            <ActivityIndicator size="small" color={isMuted ? PURPLE_ACCENT : '#FFFFFF'} />
          ) : (
            <Ionicons
              name={isMuted ? 'mic-off' : 'mic'}
              size={28}
              color={isMuted ? PURPLE_ACCENT : '#FFFFFF'}
            />
          )}
        </TouchableOpacity>
      </View>

      <RoomSettingsModal
        visible={showSettings}
        roomName={currentRoom.name || 'Room'}
        roomId={currentRoom.id}
        isCreator={currentRoom.creator_id === currentUser?.id}
        creatorId={currentRoom.creator_id}
        participants={participants}
        currentUserId={currentUser.id}
        onClose={() => setShowSettings(false)}
        onRename={handleRename}
        onDelete={handleDelete}
        onLeave={handleLeaveRoom}
        onInviteFriends={handleOpenInviteFriends}
        onRemoveParticipant={handleRemoveParticipant}
      />

      <InviteFriendsModal
        visible={showInviteFriends}
        friends={friendUsers}
        participantIds={participantIds}
        onClose={() => setShowInviteFriends(false)}
        onInvite={handleInviteFriend}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  audioBadgeContainer: {
    position: 'absolute',
    top: 120,
    alignSelf: 'center',
    zIndex: 100,
  },
  muteButtonContainer: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
    zIndex: 100,
  },
  muteButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    shadowColor: PURPLE_ACCENT,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 10,
  },
});
