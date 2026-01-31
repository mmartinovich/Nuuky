import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { spacing, radius, typography } from "../lib/theme";
import { AudioConnectionBadge } from "./AudioConnectionBadge";

interface TopHeaderProps {
  accent: { primary: string; soft: string; glow: string; gradient: [string, string] };
  theme: any;
  totalBadgeCount: number;
  defaultRoom: any | null;
  currentVibe: string;
  audioConnectionStatus: string;
  onNotificationPress: () => void;
  onRoomPillPress: () => void;
}

export const TopHeader = React.memo(function TopHeader({
  accent,
  theme,
  totalBadgeCount,
  defaultRoom,
  currentVibe,
  audioConnectionStatus,
  onNotificationPress,
  onRoomPillPress,
}: TopHeaderProps) {
  return (
    <View style={styles.topHeader} pointerEvents="box-none">
      <Image source={require("../assets/wordmark.png")} style={styles.wordmarkSmall} resizeMode="contain" />

      <TouchableOpacity
        style={[styles.notificationBell, { backgroundColor: accent.soft }]}
        onPress={onNotificationPress}
        activeOpacity={0.7}
        accessibilityLabel={totalBadgeCount > 0 ? `Notifications, ${totalBadgeCount} unread` : "Notifications"}
        accessibilityRole="button"
      >
        <Ionicons name="notifications-outline" size={22} color={accent.primary} />
        {totalBadgeCount > 0 && (
          <View style={[styles.notificationBadge, { backgroundColor: accent.primary }]}>
            <Text style={styles.notificationBadgeText}>
              {totalBadgeCount > 99 ? "99+" : totalBadgeCount}
            </Text>
          </View>
        )}
      </TouchableOpacity>

      {defaultRoom ? (
        <TouchableOpacity
          style={[
            styles.roomPill,
            {
              backgroundColor: theme.colors.glass.background,
              borderColor: "rgba(0, 240, 255, 0.3)",
              shadowColor: theme.colors.neon.cyan,
            },
          ]}
          onPress={onRoomPillPress}
          activeOpacity={0.7}
          accessibilityLabel={`Current room: ${defaultRoom.name || "Room"}. Tap to open settings`}
          accessibilityRole="button"
        >
          <Text style={[styles.roomPillText, { color: theme.colors.text.primary }]}>
            {defaultRoom.name || "Room"}
          </Text>
          <Ionicons name="chevron-down" size={14} color={theme.colors.text.secondary} />
        </TouchableOpacity>
      ) : (
        <Text style={[styles.moodText, { color: theme.colors.text.secondary }]}>{currentVibe}</Text>
      )}

      {audioConnectionStatus !== "disconnected" && defaultRoom && (
        <View style={{ marginTop: 8 }}>
          <AudioConnectionBadge status={audioConnectionStatus} />
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  topHeader: {
    position: "absolute",
    top: 70,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  notificationBell: {
    position: "absolute",
    top: 0,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  notificationBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  notificationBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  wordmarkSmall: {
    width: 120,
    height: 40,
  },
  moodText: {
    fontSize: 17,
    marginTop: 6,
    fontWeight: "500",
    letterSpacing: 0.2,
  },
  roomPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    borderWidth: 1,
    marginTop: 6,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  roomPillText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium as any,
  },
});
