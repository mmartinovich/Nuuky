import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  RefreshControl,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFriends } from '../../hooks/useFriends';
import { useContactSync } from '../../hooks/useContactSync';
import { useInvite } from '../../hooks/useInvite';
import { colors, gradients, typography, spacing, radius, getMoodColor } from '../../lib/theme';
import { User, PhoneContact, MatchedContact } from '../../types';

export default function FriendsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const {
    friends,
    pendingRequests,
    loading,
    sendFriendRequest,
    acceptFriendRequest,
    declineFriendRequest,
    removeFriendship,
    refreshFriends,
  } = useFriends();

  const {
    loading: syncLoading,
    hasSynced,
    matches,
    syncContacts,
    clearMatches,
  } = useContactSync();

  const { sending, inviteWithChoice } = useInvite();

  const [phone, setPhone] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const handleSyncContacts = async () => {
    await syncContacts();
  };

  const handleAddFromContacts = async (contact: MatchedContact) => {
    if (contact.phoneNumbers.length > 0) {
      const success = await sendFriendRequest(contact.phoneNumbers[0]);
      if (success) {
        Alert.alert('Request Sent', `Friend request sent to ${contact.displayName || contact.name}`);
      }
    }
  };

  const handleInviteContact = (contact: PhoneContact) => {
    if (contact.phoneNumbers.length > 0) {
      inviteWithChoice(contact.phoneNumbers[0], contact.name);
    }
  };

  const handleAddFriend = async () => {
    if (!phone) {
      Alert.alert('Phone Required', 'Please enter a phone number');
      return;
    }

    const formattedPhone = phone.startsWith('+') ? phone : `+${phone}`;
    const success = await sendFriendRequest(formattedPhone);

    if (success) {
      setPhone('');
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshFriends();
    setRefreshing(false);
  };

  const handleRemoveFriend = (friend: User) => {
    Alert.alert(
      'Remove Friend',
      `Remove ${friend.display_name} from your friends?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => removeFriendship(friend.id),
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={gradients.background} style={styles.gradient}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.8}>
            <Ionicons name="chevron-back" size={24} color={colors.text.primary} />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Friends</Text>

          <View style={styles.placeholderButton} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.text.secondary}
            />
          }
        >
        {/* Add Friend Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Add Friend</Text>

          <LinearGradient colors={gradients.card} style={styles.card}>
            <Text style={styles.label}>Phone Number</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                placeholder="+1 234 567 8900"
                placeholderTextColor={colors.text.tertiary}
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
                editable={!loading}
              />
            </View>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleAddFriend}
              disabled={loading}
            >
              <LinearGradient
                colors={gradients.button}
                style={[styles.button, loading && styles.buttonDisabled]}
              >
                <Text style={styles.buttonText}>
                  {loading ? 'Sending...' : 'Send Request'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Sync Contacts Button */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleSyncContacts}
              disabled={syncLoading}
            >
              <LinearGradient
                colors={['rgba(34, 197, 94, 0.2)', 'rgba(34, 197, 94, 0.1)']}
                style={[styles.syncButton, syncLoading && styles.buttonDisabled]}
              >
                {syncLoading ? (
                  <ActivityIndicator size="small" color={colors.mood.good.base} />
                ) : (
                  <Ionicons name="people-outline" size={20} color={colors.mood.good.base} />
                )}
                <Text style={styles.syncButtonText}>
                  {syncLoading ? 'Syncing...' : 'Find Friends from Contacts'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </LinearGradient>
        </View>

        {/* Contacts on Nooke */}
        {hasSynced && matches.onNooke.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              On Nooke ({matches.onNooke.length})
            </Text>

            {matches.onNooke.map((contact) => (
              <LinearGradient
                key={contact.id}
                colors={gradients.card}
                style={styles.contactCard}
              >
                <View style={styles.contactInfo}>
                  <View style={styles.contactAvatar}>
                    <Ionicons name="person" size={18} color={colors.mood.good.base} />
                  </View>
                  <View style={styles.contactText}>
                    <Text style={styles.contactName}>{contact.name}</Text>
                    <Text style={styles.contactPhone}>
                      {contact.displayName || contact.phoneNumbers[0]}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  onPress={() => handleAddFromContacts(contact)}
                  disabled={loading}
                  style={styles.addContactButton}
                >
                  <LinearGradient
                    colors={gradients.button}
                    style={styles.addContactButtonGradient}
                  >
                    <Text style={styles.addContactButtonText}>Add</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </LinearGradient>
            ))}
          </View>
        )}

        {/* Invite to Nooke */}
        {hasSynced && matches.notOnNooke.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Invite to Nooke ({matches.notOnNooke.length})
            </Text>

            {matches.notOnNooke.slice(0, 15).map((contact) => (
              <LinearGradient
                key={contact.id}
                colors={gradients.card}
                style={styles.contactCard}
              >
                <View style={styles.contactInfo}>
                  <View style={[styles.contactAvatar, styles.inviteAvatar]}>
                    <Ionicons name="person-add-outline" size={16} color={colors.text.secondary} />
                  </View>
                  <View style={styles.contactText}>
                    <Text style={styles.contactName}>{contact.name}</Text>
                    <Text style={styles.contactPhone}>{contact.phoneNumbers[0]}</Text>
                  </View>
                </View>

                <TouchableOpacity
                  onPress={() => handleInviteContact(contact)}
                  disabled={sending}
                  style={styles.inviteButton}
                >
                  <Ionicons name="paper-plane-outline" size={16} color={colors.neon.cyan} />
                  <Text style={styles.inviteButtonText}>Invite</Text>
                </TouchableOpacity>
              </LinearGradient>
            ))}

            {matches.notOnNooke.length > 15 && (
              <Text style={styles.moreContactsText}>
                + {matches.notOnNooke.length - 15} more contacts to invite
              </Text>
            )}
          </View>
        )}

        {/* Pending Requests */}
        {pendingRequests.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Pending Requests ({pendingRequests.length})
            </Text>

            {pendingRequests.map((request) => {
              const friend = request.friend as User;
              const moodColors = getMoodColor(friend.mood);

              return (
                <LinearGradient
                  key={request.id}
                  colors={gradients.card}
                  style={styles.requestCard}
                >
                  <View style={styles.requestInfo}>
                    {/* Friend orb */}
                    <View style={styles.miniOrbWrapper}>
                      <View
                        style={[
                          styles.miniGlow,
                          { backgroundColor: moodColors.glow },
                        ]}
                      />
                      <View
                        style={[
                          styles.miniOrb,
                          { backgroundColor: moodColors.base },
                        ]}
                      />
                    </View>

                    <View style={styles.requestText}>
                      <Text style={styles.requestName}>{friend.display_name}</Text>
                      <Text style={styles.requestPhone}>{friend.phone}</Text>
                    </View>
                  </View>

                  <View style={styles.requestActions}>
                    <TouchableOpacity
                      onPress={() => acceptFriendRequest(request.id)}
                      disabled={loading}
                    >
                      <LinearGradient
                        colors={gradients.button}
                        style={styles.acceptButton}
                      >
                        <Text style={styles.acceptButtonText}>Accept</Text>
                      </LinearGradient>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => declineFriendRequest(request.id)}
                      disabled={loading}
                      style={styles.declineButton}
                    >
                      <Text style={styles.declineButtonText}>Decline</Text>
                    </TouchableOpacity>
                  </View>
                </LinearGradient>
              );
            })}
          </View>
        )}

        {/* Friends List */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Friends ({friends.length})
          </Text>

          {friends.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No friends yet</Text>
              <Text style={styles.emptySubtext}>
                Add friends using their phone number
              </Text>
            </View>
          ) : (
            friends.map((friendship) => {
              const friend = friendship.friend as User;
              const moodColors = getMoodColor(friend.mood);

              return (
                <LinearGradient
                  key={friendship.id}
                  colors={gradients.card}
                  style={styles.friendCard}
                >
                  <View style={styles.friendInfo}>
                    {/* Friend orb */}
                    <View style={styles.miniOrbWrapper}>
                      <View
                        style={[
                          styles.miniGlow,
                          { backgroundColor: moodColors.glow },
                        ]}
                      />
                      <View
                        style={[
                          styles.miniOrb,
                          { backgroundColor: moodColors.base },
                          !friend.is_online && styles.offline,
                        ]}
                      />
                      {friend.is_online && (
                        <View style={styles.onlineIndicator} />
                      )}
                    </View>

                    <View style={styles.friendText}>
                      <Text style={styles.friendName}>
                        {friend.display_name}
                      </Text>
                      <Text style={styles.friendStatus}>
                        {friend.is_online ? 'Online' : 'Offline'} · {friend.mood}
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    onPress={() => handleRemoveFriend(friend)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Text style={styles.removeButton}>×</Text>
                  </TouchableOpacity>
                </LinearGradient>
              );
            })
          )}
        </View>
      </ScrollView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.primary,
  },
  gradient: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.glass.border,
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
  headerTitle: {
    fontSize: typography.size['2xl'],
    fontWeight: typography.weight.bold as any,
    color: colors.text.primary,
  },
  placeholderButton: {
    width: 40,
    height: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing['3xl'],
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
    marginBottom: spacing.md,
    letterSpacing: -0.3,
  },
  card: {
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.ui.border,
  },
  label: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputWrapper: {
    backgroundColor: colors.ui.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.ui.border,
    marginBottom: spacing.md,
  },
  input: {
    padding: spacing.md,
    fontSize: typography.size.base,
    color: colors.text.primary,
  },
  button: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.ui.border,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
  },
  requestCard: {
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.ui.border,
    marginBottom: spacing.sm,
  },
  requestInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  requestText: {
    flex: 1,
  },
  requestName: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.medium,
    color: colors.text.primary,
    marginBottom: spacing.xs / 2,
  },
  requestPhone: {
    fontSize: typography.size.sm,
    color: colors.text.tertiary,
  },
  requestActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  acceptButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.ui.border,
  },
  acceptButtonText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
  },
  declineButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.ui.border,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  declineButtonText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.text.tertiary,
  },
  friendCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.ui.border,
    marginBottom: spacing.sm,
  },
  friendInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  miniOrbWrapper: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  miniGlow: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    opacity: 0.4,
  },
  miniOrb: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  offline: {
    opacity: 0.5,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.mood.good.base,
    borderWidth: 2,
    borderColor: colors.bg.primary,
  },
  friendText: {
    flex: 1,
  },
  friendName: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.medium,
    color: colors.text.primary,
    marginBottom: spacing.xs / 2,
  },
  friendStatus: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
  },
  removeButton: {
    fontSize: 32,
    color: colors.text.tertiary,
    fontWeight: '300',
    lineHeight: 32,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  emptyText: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.medium,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  emptySubtext: {
    fontSize: typography.size.sm,
    color: colors.text.tertiary,
  },
  // New styles for contact sync and invite
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.ui.border,
  },
  dividerText: {
    marginHorizontal: spacing.md,
    fontSize: typography.size.sm,
    color: colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
    gap: spacing.sm,
  },
  syncButtonText: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.semibold,
    color: colors.mood.good.base,
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.ui.border,
    marginBottom: spacing.sm,
  },
  contactInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  contactAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  inviteAvatar: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  contactText: {
    flex: 1,
  },
  contactName: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.medium,
    color: colors.text.primary,
    marginBottom: 2,
  },
  contactPhone: {
    fontSize: typography.size.sm,
    color: colors.text.tertiary,
  },
  addContactButton: {
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  addContactButtonGradient: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.ui.border,
  },
  addContactButtonText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
  },
  inviteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.3)',
    backgroundColor: 'rgba(0, 240, 255, 0.08)',
    gap: spacing.xs,
  },
  inviteButtonText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.neon.cyan,
  },
  moreContactsText: {
    fontSize: typography.size.sm,
    color: colors.text.tertiary,
    textAlign: 'center',
    marginTop: spacing.sm,
    fontStyle: 'italic',
  },
});
