import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { spacing, interactionStates } from "../lib/theme";

interface OrbitEmptyStateProps {
  onAddFriends: () => void;
  onShareInvite: () => void;
  theme: any;
  accent: any;
}

export const OrbitEmptyState: React.FC<OrbitEmptyStateProps> = ({
  onAddFriends,
  onShareInvite,
  theme,
  accent,
}) => {
  return (
    <View style={styles.container} pointerEvents="box-none">
      {/* Title & Subtitle - Above Orb */}
      <View style={styles.topContent}>
        <Text style={[styles.title, { color: theme.colors.text.primary }]}>
          Your Orbit is Empty
        </Text>
        <Text style={[styles.subtitle, { color: theme.colors.text.tertiary }]}>
          Add friends to see them orbit around you
        </Text>
      </View>

      {/* Buttons - Below Orb */}
      <View style={styles.bottomContent}>
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: accent.primary }]}
            onPress={onAddFriends}
            activeOpacity={interactionStates.pressed}
          >
            <Ionicons name="person-add" size={18} color={accent.textOnPrimary} style={styles.buttonIcon} />
            <Text style={[styles.primaryButtonText, { color: accent.textOnPrimary }]}>
              Add Friends
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.secondaryButton, { backgroundColor: theme.colors.glass.background, borderColor: theme.colors.glass.border }]}
            onPress={onShareInvite}
            activeOpacity={interactionStates.pressed}
          >
            <Ionicons name="share-social-outline" size={18} color={theme.colors.text.primary} style={styles.buttonIcon} />
            <Text style={[styles.secondaryButtonText, { color: theme.colors.text.primary }]}>
              Share Invite
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    paddingHorizontal: spacing.lg,
  },
  topContent: {
    position: "absolute",
    top: 200,
    left: spacing.lg,
    right: spacing.lg,
    alignItems: "center",
  },
  bottomContent: {
    position: "absolute",
    bottom: 180,
    left: spacing.lg,
    right: spacing.lg,
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: spacing.xs,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
  },
  buttonContainer: {
    flexDirection: "row",
    width: "100%",
    gap: spacing.sm,
  },
  primaryButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 50,
    borderRadius: 14,
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
  secondaryButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
  },
  buttonIcon: {
    marginRight: spacing.xs,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: "600",
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: "600",
  },
});
