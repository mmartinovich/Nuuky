import React, { useState, useCallback, useMemo, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Image as CachedImage } from 'expo-image';
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useContactSync } from "../../hooks/useContactSync";
import { useInvite } from "../../hooks/useInvite";
import { useFriends } from "../../hooks/useFriends";
import { useTheme } from "../../hooks/useTheme";
import { spacing, interactionStates } from "../../lib/theme";
import { MatchedContact, PhoneContact } from "../../types";

export default function OnboardingInviteScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme, accent } = useTheme();

  const { loading: syncLoading, hasSynced, matches, syncContacts } = useContactSync();
  const { sending, shareInvite, inviteWithChoice } = useInvite();
  const { addFriend, loading: addingFriend } = useFriends();

  const [addedContacts, setAddedContacts] = useState<Set<string>>(new Set());
  const [addingUserId, setAddingUserId] = useState<string | null>(null);
  const isSyncingRef = useRef(false);

  // Count of friends added during this onboarding
  const addedCount = addedContacts.size;

  // Filter out already-added contacts
  const contactsOnNuuky = useMemo(() => {
    return matches.onNuuky.filter((c) => !addedContacts.has(c.userId || ""));
  }, [matches.onNuuky, addedContacts]);

  const contactsToInvite = useMemo(() => {
    // Show first 5 contacts to invite
    return matches.notOnNuuky.slice(0, 5);
  }, [matches.notOnNuuky]);

  const handleSyncContacts = async () => {
    if (isSyncingRef.current || syncLoading) return;
    isSyncingRef.current = true;
    try {
      await syncContacts();
    } catch (error) {
      Alert.alert("Sync Failed", "Unable to sync contacts. Please try again.");
    } finally {
      isSyncingRef.current = false;
    }
  };

  const handleAddFromContacts = async (contact: MatchedContact) => {
    if (!contact.userId || addingUserId) return;

    setAddingUserId(contact.userId);
    try {
      const success = await addFriend(contact.userId);
      if (success) {
        setAddedContacts((prev) => new Set(prev).add(contact.userId!));
      }
    } finally {
      setAddingUserId(null);
    }
  };

  const handleInviteContact = (contact: PhoneContact) => {
    if (contact.phoneNumbers.length > 0) {
      inviteWithChoice(contact.phoneNumbers[0], contact.name);
    }
  };

  const handleShareInvite = async () => {
    await shareInvite();
  };

  const handleSkip = () => {
    Alert.alert(
      "Nuuky is better with friends!",
      "Skip anyway?",
      [
        { text: "Keep Going", style: "cancel" },
        {
          text: "Skip Anyway",
          style: "destructive",
          onPress: () => router.replace("/(main)"),
        },
      ]
    );
  };

  const handleContinue = () => {
    router.replace("/(main)");
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bg.primary }]}>
      <LinearGradient colors={theme.gradients.background as any} style={StyleSheet.absoluteFill} />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.colors.text.primary }]}>
            Find Your Friends
          </Text>
          <Text style={[styles.subtitle, { color: theme.colors.text.tertiary }]}>
            See who's already on Nuuky or invite them
          </Text>
        </View>

        {/* Before Sync State */}
        {!hasSynced && (
          <View style={styles.syncSection}>
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.skipButton, { backgroundColor: theme.colors.glass.background, borderColor: theme.colors.glass.border }]}
                onPress={handleSkip}
                activeOpacity={interactionStates.pressed}
              >
                <Text style={[styles.skipButtonText, { color: theme.colors.text.primary }]}>
                  Skip
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.syncButton, { backgroundColor: accent.primary }]}
                onPress={handleSyncContacts}
                disabled={syncLoading}
                activeOpacity={interactionStates.pressed}
              >
                {syncLoading ? (
                  <ActivityIndicator size="small" color={accent.textOnPrimary} />
                ) : (
                  <>
                    <Ionicons name="people" size={20} color={accent.textOnPrimary} style={styles.buttonIcon} />
                    <Text style={[styles.syncButtonText, { color: accent.textOnPrimary }]}>
                      Sync Contacts
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* After Sync State */}
        {hasSynced && (
          <>
            {/* Added Count Badge */}
            {addedCount > 0 && (
              <View style={[styles.addedBadge, { backgroundColor: 'rgba(34,197,94,0.1)' }]}>
                <Ionicons name="checkmark-circle" size={18} color="#22c55e" />
                <Text style={[styles.addedBadgeText, { color: '#22c55e' }]}>
                  Added: {addedCount} friend{addedCount !== 1 ? 's' : ''} ✓
                </Text>
              </View>
            )}

            {/* People on Nuuky Section */}
            {contactsOnNuuky.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.colors.text.tertiary }]}>
                  PEOPLE ON NUUKY
                </Text>
                <View style={[styles.sectionCard, { backgroundColor: theme.colors.glass.background, borderColor: theme.colors.glass.border }]}>
                  {contactsOnNuuky.map((contact, index) => (
                    <React.Fragment key={contact.id}>
                      {index > 0 && <View style={[styles.separator, { backgroundColor: theme.colors.glass.border }]} />}
                      <View style={styles.contactRow}>
                        <View style={styles.contactInfo}>
                          {contact.avatarUrl ? (
                            <CachedImage
                              source={{ uri: contact.avatarUrl }}
                              style={[styles.avatar, { borderColor: theme.colors.glass.border }]}
                              cachePolicy="memory-disk"
                              contentFit="cover"
                            />
                          ) : (
                            <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: accent.soft, borderColor: theme.colors.glass.border }]}>
                              <Text style={[styles.avatarText, { color: accent.primary }]}>
                                {(contact.displayName || contact.name).charAt(0).toUpperCase()}
                              </Text>
                            </View>
                          )}
                          <Text style={[styles.contactName, { color: theme.colors.text.primary }]} numberOfLines={1}>
                            {contact.displayName || contact.name}
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={[styles.addButton, { backgroundColor: accent.primary }]}
                          onPress={() => handleAddFromContacts(contact)}
                          disabled={addingUserId === contact.userId}
                          activeOpacity={interactionStates.pressed}
                        >
                          {addingUserId === contact.userId ? (
                            <ActivityIndicator size="small" color={accent.textOnPrimary} />
                          ) : (
                            <Text style={[styles.addButtonText, { color: accent.textOnPrimary }]}>Add</Text>
                          )}
                        </TouchableOpacity>
                      </View>
                    </React.Fragment>
                  ))}
                </View>
              </View>
            )}

            {/* Already added all contacts on Nuuky */}
            {contactsOnNuuky.length === 0 && matches.onNuuky.length > 0 && (
              <View style={[styles.allAddedCard, { backgroundColor: 'rgba(34,197,94,0.1)', borderColor: 'rgba(34,197,94,0.2)' }]}>
                <Ionicons name="checkmark-circle" size={24} color="#22c55e" />
                <Text style={[styles.allAddedText, { color: '#22c55e' }]}>
                  All contacts on Nuuky added!
                </Text>
              </View>
            )}

            {/* Invite to Nuuky Section */}
            {contactsToInvite.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.colors.text.tertiary }]}>
                  INVITE TO NUUKY
                </Text>
                <View style={[styles.sectionCard, { backgroundColor: theme.colors.glass.background, borderColor: theme.colors.glass.border }]}>
                  {contactsToInvite.map((contact, index) => (
                    <React.Fragment key={contact.id}>
                      {index > 0 && <View style={[styles.separator, { backgroundColor: theme.colors.glass.border }]} />}
                      <View style={styles.contactRow}>
                        <View style={styles.contactInfo}>
                          <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: theme.colors.glass.background, borderColor: theme.colors.glass.border }]}>
                            <Ionicons name="person" size={18} color={theme.colors.text.tertiary} />
                          </View>
                          <Text style={[styles.contactName, { color: theme.colors.text.primary }]} numberOfLines={1}>
                            {contact.name}
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={[styles.inviteButton, { backgroundColor: theme.colors.glass.background, borderColor: theme.colors.glass.border }]}
                          onPress={() => handleInviteContact(contact)}
                          activeOpacity={interactionStates.pressed}
                        >
                          <Text style={[styles.inviteButtonText, { color: theme.colors.text.primary }]}>Invite</Text>
                        </TouchableOpacity>
                      </View>
                    </React.Fragment>
                  ))}
                </View>

                {matches.notOnNuuky.length > 5 && (
                  <TouchableOpacity
                    style={styles.moreContactsButton}
                    onPress={handleShareInvite}
                    activeOpacity={interactionStates.pressed}
                  >
                    <Text style={[styles.moreContactsText, { color: accent.primary }]}>
                      + {matches.notOnNuuky.length - 5} more contacts to invite
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* No contacts found */}
            {matches.onNuuky.length === 0 && matches.notOnNuuky.length === 0 && (
              <View style={styles.emptySection}>
                <Text style={[styles.emptyText, { color: theme.colors.text.tertiary }]}>
                  No contacts found. Share your invite link to bring friends to Nuuky!
                </Text>
                <TouchableOpacity
                  style={[styles.shareButton, { backgroundColor: theme.colors.glass.background, borderColor: theme.colors.glass.border }]}
                  onPress={handleShareInvite}
                  disabled={sending}
                  activeOpacity={interactionStates.pressed}
                >
                  <Ionicons name="share-social-outline" size={18} color={theme.colors.text.primary} style={styles.buttonIcon} />
                  <Text style={[styles.shareButtonText, { color: theme.colors.text.primary }]}>
                    Share Invite Link
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Continue Button */}
            <View style={styles.continueSection}>
              <TouchableOpacity
                style={[styles.continueButton, { backgroundColor: "#FFFFFF" }]}
                onPress={handleContinue}
                activeOpacity={interactionStates.pressed}
              >
                <Text style={styles.continueButtonText}>Continue to Nuuky</Text>
                <Ionicons name="arrow-forward" size={18} color="#000" />
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.screenPadding,
  },
  header: {
    alignItems: "center",
    marginBottom: spacing["2xl"],
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    textAlign: "center",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    textAlign: "center",
    marginTop: spacing.xs,
  },
  syncSection: {
    flex: 1,
    justifyContent: "flex-end",
  },
  buttonRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  skipButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 56,
    borderRadius: 16,
    borderWidth: 1,
  },
  skipButtonText: {
    fontSize: 17,
    fontWeight: "600",
  },
  syncButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 56,
    borderRadius: 16,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  syncButtonText: {
    fontSize: 17,
    fontWeight: "600",
  },
  buttonIcon: {
    marginRight: spacing.sm,
  },
  addedBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.lg,
    gap: spacing.xs,
  },
  addedBadgeText: {
    fontSize: 15,
    fontWeight: "600",
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "500",
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
    textTransform: "uppercase",
  },
  sectionCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  separator: {
    height: 1,
    marginLeft: 56,
  },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  contactInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
  },
  avatarPlaceholder: {
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontSize: 15,
    fontWeight: "600",
  },
  contactName: {
    fontSize: 16,
    fontWeight: "500",
    flex: 1,
  },
  addButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    minWidth: 60,
    alignItems: "center",
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  inviteButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
  },
  inviteButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  allAddedCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: spacing.xl,
    gap: spacing.sm,
  },
  allAddedText: {
    fontSize: 16,
    fontWeight: "600",
  },
  moreContactsButton: {
    alignItems: "center",
    paddingVertical: spacing.md,
  },
  moreContactsText: {
    fontSize: 14,
    fontWeight: "500",
  },
  emptySection: {
    alignItems: "center",
    paddingVertical: spacing.lg,
    gap: spacing.lg,
  },
  emptyText: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
  },
  shareButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 50,
    borderRadius: 14,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
  },
  shareButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  continueSection: {
    marginTop: "auto",
    paddingTop: spacing.xl,
  },
  continueButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 56,
    borderRadius: 16,
    gap: spacing.xs,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  continueButtonText: {
    fontSize: 17,
    fontWeight: "600",
    color: "#000",
  },
});
