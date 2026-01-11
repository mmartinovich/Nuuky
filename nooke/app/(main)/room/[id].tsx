import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRoom } from '../../../hooks/useRoom';
import { RoomView } from '../../../components/RoomView';
import { RoomSettingsModal } from '../../../components/RoomSettingsModal';
import { InviteFriendsModal } from '../../../components/InviteFriendsModal';
import { colors } from '../../../lib/theme';
import { useAppStore } from '../../../stores/appStore';

export default function RoomScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { currentUser, friends, setCurrentRoom } = useAppStore();
  const {
    currentRoom,
    participants,
    joinRoom,
    leaveRoom,
    updateRoomName,
    deleteRoom,
    inviteFriendToRoom,
    loading,
  } = useRoom();
  const [showSettings, setShowSettings] = useState(false);
  const [showInviteFriends, setShowInviteFriends] = useState(false);

  useEffect(() => {
    if (id && currentUser) {
      // Join the room when screen mounts
      handleJoinRoom();
    }

    // Clear current room when navigating away (but don't leave the room)
    return () => {
      // Clear the current room state when navigating away
      // Users should explicitly leave via the leave button
      setCurrentRoom(null);
    };
  }, [id]);

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
    await leaveRoom();
    router.back();
  };

  const handleSettingsPress = () => {
    console.log('Opening settings modal');
    setShowSettings(true);
  };

  const handleRename = async (newName: string) => {
    if (!currentRoom) return;
    await updateRoomName(currentRoom.id, newName);
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

  if (!currentRoom || loading || !currentUser) {
    return <View style={styles.container} />;
  }

  // Get friend users
  const friendUsers = friends.map((f) => f.friend).filter(Boolean);
  const participantIds = participants.map((p) => p.user_id);

  return (
    <View style={styles.container}>
      <RoomView
        roomName={currentRoom.name}
        participants={participants}
        currentUser={currentUser}
        isCreator={currentRoom.creator_id === currentUser?.id}
        onSettingsPress={handleSettingsPress}
      />

      <RoomSettingsModal
        visible={showSettings}
        roomName={currentRoom.name}
        isCreator={currentRoom.creator_id === currentUser?.id}
        onClose={() => setShowSettings(false)}
        onRename={handleRename}
        onDelete={handleDelete}
        onLeave={handleLeaveRoom}
        onInviteFriends={handleOpenInviteFriends}
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
    backgroundColor: colors.bg.primary,
  },
});
