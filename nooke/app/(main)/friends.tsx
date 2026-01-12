import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
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
import { useAppStore } from '../../stores/appStore';
import { colors, gradients, typography, spacing, radius, getMoodColor } from '../../lib/theme';
import { User, MatchedContact } from '../../types';

export default function FriendsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const {
    friends,
    loading,
    initialLoading,
    hasLoadedOnce,
    addFriend: addFriendHook,
    removeFriendship,
    refreshFriends,
  } = useFriends();

  const { setFriends } = useAppStore();

  const {
    loading: syncLoading,
    hasSynced,
    matches,
    syncContacts,
    clearMatches,
  } = useContactSync();

  const { sending, shareInvite } = useInvite();

  const [refreshing, setRefreshing] = useState(false);
  const [addedContacts, setAddedContacts] = useState<Set<string>>(new Set());
  const [isMounted, setIsMounted] = useState(false);
  const hasEverHadFriends = useRef(friends.length > 0);

  useEffect(() => {
    console.log('[Friends Screen] Friends changed, count:', friends.length);
    if (friends.length > 0) {
      console.log('[Friends Screen] First friend ID:', friends[0].friend_id);
      hasEverHadFriends.current = true;
    }
  }, [friends.length]);

  useEffect(() => {
    const timer = setTimeout(() => setIsMounted(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const handleSyncContacts = async () => {
    await syncContacts();
  };

  const handleAddFromContacts = async (contact: MatchedContact) => {
    console.log('=== ADD FRIEND CLICKED ===');
    console.log('Contact:', contact.name, 'UserId:', contact.userId);
    if (contact.userId) {
      console.log('Calling addFriendHook with userId:', contact.userId);
      const success = await addFriendHook(contact.userId);
      console.log('addFriendHook returned:', success);
      if (success) {
        console.log('Adding to addedContacts set');
        setAddedContacts(prev => new Set(prev).add(contact.userId!));
      }
    } else {
      console.log('ERROR: contact.userId is missing!');
    }
  };

  const handleInviteToNooke = async () => {
    await shareInvite();
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    // Clear store first to ensure fresh data
    setFriends([]);
    await refreshFriends();
    setRefreshing(false);
  };

  const handleRemoveFriend = (friendship: any) => {
    const friend = friendship.friend as User;
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

          <TouchableOpacity
            style={styles.debugButton}
            onPress={async () => {
              console.log('=== MANUAL REFRESH TRIGGERED ===');
              console.log('Current friends count before clear:', friends.length);
              if (friends.length > 0) {
                console.log('First friend before clear:', JSON.stringify(friends[0], null, 2));
              }
              setFriends([]);
              console.log('Friends cleared, now calling refreshFriends');
              await refreshFriends();
              console.log('=== MANUAL REFRESH COMPLETED ===');
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="refresh" size={20} color={colors.text.secondary} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + spacing['3xl'] }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.text.secondary}
            />
          }
        >
        {initialLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.text.secondary} />
          </View>
        ) : (
          <>
        {/* Hero Section */}
        {isMounted && hasLoadedOnce && !hasSynced && friends.length === 0 && !hasEverHadFriends.current && (
          <View style={styles.heroSection}>
            <View style={styles.heroIconContainer}>
              <LinearGradient colors={gradients.neonCyan} style={styles.heroIconGradient}>
                <Ionicons name="people" size={32} color={colors.text.primary} />
              </LinearGradient>
            </View>
            <Text style={styles.heroTitle}>Connect with Friends</Text>
            <Text style={styles.heroSubtitle}>
              Find friends who are already on Nūūky or invite new ones to join
            </Text>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionsSection}>
          {/* Find Friends Button */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleSyncContacts}
            disabled={syncLoading}
            style={styles.actionButtonWrapper}
          >
            <LinearGradient
              colors={gradients.neonCyan}
              style={[styles.primaryActionButton, syncLoading && styles.buttonDisabled]}
            >
              {syncLoading ? (
                <ActivityIndicator size="small" color={colors.text.primary} />
              ) : (
                <Ionicons name="search" size={22} color={colors.text.primary} />
              )}
              <View style={styles.actionButtonTextContainer}>
                <Text style={styles.actionButtonTitle}>
                  {syncLoading ? 'Searching...' : 'Find Friends'}
                </Text>
                <Text style={styles.actionButtonSubtitle}>
                  From your contacts
                </Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>

          {/* Invite Button */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleInviteToNooke}
            disabled={sending}
            style={styles.actionButtonWrapper}
          >
            <LinearGradient
              colors={['rgba(139, 92, 246, 0.2)', 'rgba(139, 92, 246, 0.1)']}
              style={[styles.secondaryActionButton, sending && styles.buttonDisabled]}
            >
              <Ionicons name="share-social-outline" size={22} color="#A78BFA" />
              <View style={styles.actionButtonTextContainer}>
                <Text style={styles.secondaryActionButtonTitle}>
                  Invite to Nūūky
                </Text>
                <Text style={styles.actionButtonSubtitle}>
                  Share with anyone
                </Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Contacts on Nūūky */}
        {hasSynced && (() => {
          const notYetAddedContacts = matches.onNuuky.filter((contact) => {
            const isAlreadyFriend = addedContacts.has(contact.userId || '') ||
                                   friends.some(f => f.friend_id === contact.userId);
            return !isAlreadyFriend;
          });

          if (notYetAddedContacts.length === 0) return null;

          return (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <View>
                <Text style={styles.sectionTitle}>People on Nūūky</Text>
                <Text style={styles.sectionSubtitle}>
                  {notYetAddedContacts.length} {notYetAddedContacts.length === 1 ? 'contact' : 'contacts'} found
                </Text>
              </View>
            </View>

            <View style={styles.contactsList}>
              {notYetAddedContacts.map((contact) => {
                return (
                  <View key={contact.id} style={styles.contactCardWrapper}>
                    <LinearGradient
                      colors={['rgba(255, 255, 255, 0.08)', 'rgba(255, 255, 255, 0.04)']}
                      style={styles.contactCard}
                    >
                      <View style={styles.contactInfo}>
                        <LinearGradient
                          colors={gradients.neonCyan}
                          style={styles.contactAvatar}
                        >
                          <Ionicons name="person" size={20} color={colors.text.primary} />
                        </LinearGradient>
                        <View style={styles.contactText}>
                          <Text style={styles.contactName}>{contact.displayName || contact.name}</Text>
                          <Text style={styles.contactPhone}>
                            {contact.phoneNumbers[0]}
                          </Text>
                        </View>
                      </View>

                      <TouchableOpacity
                        onPress={() => handleAddFromContacts(contact)}
                        disabled={loading}
                        style={styles.addContactButtonWrapper}
                        activeOpacity={0.7}
                      >
                        <LinearGradient
                          colors={gradients.neonCyan}
                          style={styles.addContactButton}
                        >
                          <Text style={styles.addButtonText}>Add</Text>
                        </LinearGradient>
                      </TouchableOpacity>
                    </LinearGradient>
                  </View>
                );
              })}
            </View>
          </View>
          );
        })()}

        {/* Friends List */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={styles.sectionTitle}>My Friends</Text>
              <Text style={styles.sectionSubtitle}>
                {friends.length} {friends.length === 1 ? 'friend' : 'friends'}
              </Text>
            </View>
          </View>

          {friends.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconContainer}>
                <Ionicons name="person-add-outline" size={40} color={colors.text.tertiary} />
              </View>
              <Text style={styles.emptyText}>No friends yet</Text>
              <Text style={styles.emptySubtext}>
                Find friends from your contacts to get started
              </Text>
            </View>
          ) : (
            <View style={styles.friendsList}>
              {friends.map((friendship) => {
                const friend = friendship.friend as User;
                const moodColors = getMoodColor(friend.mood);

                return (
                  <View key={friendship.id} style={styles.friendCardWrapper}>
                    <LinearGradient
                      colors={['rgba(255, 255, 255, 0.08)', 'rgba(255, 255, 255, 0.04)']}
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
                          <View style={styles.friendStatusRow}>
                            <View style={[
                              styles.statusDot,
                              { backgroundColor: friend.is_online ? colors.mood.good.base : colors.text.tertiary }
                            ]} />
                            <Text style={styles.friendStatus}>
                              {friend.is_online ? 'Online' : 'Offline'}
                            </Text>
                          </View>
                        </View>
                      </View>

                      <TouchableOpacity
                        onPress={() => handleRemoveFriend(friendship)}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        style={styles.removeButtonWrapper}
                        activeOpacity={0.7}
                      >
                        <View style={styles.removeButton}>
                          <Ionicons name="close" size={20} color={colors.text.tertiary} />
                        </View>
                      </TouchableOpacity>
                    </LinearGradient>
                  </View>
                );
              })}
            </View>
          )}
        </View>
        </>
        )}
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
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.glass.border,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
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
    letterSpacing: -0.5,
  },
  placeholderButton: {
    width: 44,
    height: 44,
  },
  debugButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  loadingContainer: {
    paddingVertical: spacing['3xl'],
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Hero Section
  heroSection: {
    alignItems: 'center',
    paddingVertical: spacing['3xl'],
    paddingHorizontal: spacing.xl,
  },
  heroIconContainer: {
    marginBottom: spacing.lg,
  },
  heroIconGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroTitle: {
    fontSize: typography.size['2xl'],
    fontWeight: typography.weight.bold as any,
    color: colors.text.primary,
    marginBottom: spacing.sm,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    fontSize: typography.size.base,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  // Actions Section
  actionsSection: {
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  actionButtonWrapper: {
    borderRadius: radius.xl,
    overflow: 'hidden',
  },
  primaryActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.3)',
  },
  secondaryActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  actionButtonTextContainer: {
    flex: 1,
  },
  actionButtonTitle: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.semibold as any,
    color: colors.text.primary,
    marginBottom: 2,
    letterSpacing: -0.3,
  },
  secondaryActionButtonTitle: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.semibold as any,
    color: '#A78BFA',
    marginBottom: 2,
    letterSpacing: -0.3,
  },
  actionButtonSubtitle: {
    fontSize: typography.size.sm,
    color: colors.text.tertiary,
  },
  // Section Headers
  section: {
    marginBottom: spacing['2xl'],
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold as any,
    color: colors.text.primary,
    letterSpacing: -0.3,
    marginBottom: spacing.xs / 2,
  },
  sectionSubtitle: {
    fontSize: typography.size.sm,
    color: colors.text.tertiary,
    fontWeight: typography.weight.medium as any,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  // Contact Cards
  contactsList: {
    gap: spacing.sm,
  },
  contactCardWrapper: {
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  contactInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.md,
  },
  contactAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactText: {
    flex: 1,
  },
  contactName: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.semibold as any,
    color: colors.text.primary,
    marginBottom: 2,
    letterSpacing: -0.2,
  },
  contactPhone: {
    fontSize: typography.size.sm,
    color: colors.text.tertiary,
    fontWeight: typography.weight.medium as any,
  },
  addContactButtonWrapper: {
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  addContactButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.3)',
  },
  addButtonText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold as any,
    color: colors.text.primary,
    letterSpacing: -0.2,
  },
  addedBadge: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
  },
  addedText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold as any,
    color: colors.mood.good.base,
    letterSpacing: -0.2,
  },
  // Friends List
  friendsList: {
    gap: spacing.sm,
  },
  friendCardWrapper: {
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  friendCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  friendInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.md,
  },
  miniOrbWrapper: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  miniGlow: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    opacity: 0.4,
  },
  miniOrb: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  offline: {
    opacity: 0.5,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.mood.good.base,
    borderWidth: 2,
    borderColor: 'rgba(10, 10, 32, 1)',
  },
  friendText: {
    flex: 1,
  },
  friendName: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.semibold as any,
    color: colors.text.primary,
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  friendStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  friendStatus: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    fontWeight: typography.weight.medium as any,
  },
  removeButtonWrapper: {
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  removeButton: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing['3xl'],
    paddingHorizontal: spacing.xl,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.glass.border,
    borderStyle: 'dashed',
  },
  emptyIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  emptyText: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.semibold as any,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  emptySubtext: {
    fontSize: typography.size.sm,
    color: colors.text.tertiary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
