import React, { useState, useMemo, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Image as CachedImage } from "expo-image";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
  Easing,
} from "react-native-reanimated";
import { useFriends } from "../../hooks/useFriends";
import { useSafety } from "../../hooks/useSafety";
import { useTheme } from "../../hooks/useTheme";
import { spacing, radius } from "../../lib/theme";
import { User, Friendship } from "../../types";

// Fuzzy match function for typo-tolerant search
const fuzzyMatch = (query: string, text: string): boolean => {
  const q = query.toLowerCase();
  const t = text.toLowerCase();
  if (t.includes(q)) return true;
  let qIndex = 0;
  for (let i = 0; i < t.length && qIndex < q.length; i++) {
    if (t[i] === q[qIndex]) qIndex++;
  }
  return qIndex === q.length;
};

export default function AddAnchorScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme, accent } = useTheme();

  const { friends } = useFriends();
  const { anchors, addAnchor, loading } = useSafety();

  const [searchQuery, setSearchQuery] = useState("");
  const [addingId, setAddingId] = useState<string | null>(null);
  const [visible, setVisible] = useState(true);

  const progress = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      progress.value = withTiming(1, { duration: 250, easing: Easing.out(Easing.cubic) });
    } else {
      progress.value = 0;
    }
  }, [visible]);

  const handleClose = useCallback(() => {
    progress.value = withTiming(0, { duration: 200, easing: Easing.in(Easing.cubic) }, () => {
      runOnJS(router.back)();
    });
  }, [router, progress]);

  // Filter out friends who are already anchors
  const existingAnchorIds = useMemo(
    () => new Set(anchors.map((a) => a.anchor_id)),
    [anchors]
  );

  const availableFriends = useMemo(() => {
    return friends.filter((f) => !existingAnchorIds.has(f.friend_id));
  }, [friends, existingAnchorIds]);

  // Apply search filter
  const filteredFriends = useMemo(() => {
    if (!searchQuery.trim()) return availableFriends;
    const q = searchQuery.trim();
    return availableFriends
      .filter((f) => {
        const friend = f.friend as User;
        return (
          fuzzyMatch(q, friend.display_name) ||
          fuzzyMatch(q, friend.username || "")
        );
      })
      .sort((a, b) => {
        const aName = (a.friend as User).display_name.toLowerCase();
        const bName = (b.friend as User).display_name.toLowerCase();
        const qLower = searchQuery.toLowerCase();
        const aStartsWith = aName.startsWith(qLower);
        const bStartsWith = bName.startsWith(qLower);
        if (aStartsWith && !bStartsWith) return -1;
        if (!aStartsWith && bStartsWith) return 1;
        return aName.localeCompare(bName);
      });
  }, [availableFriends, searchQuery]);

  const handleAddAnchor = useCallback(
    async (friendId: string) => {
      setAddingId(friendId);
      try {
        const success = await addAnchor(friendId);
        if (success) {
          handleClose();
        }
      } finally {
        setAddingId(null);
      }
    },
    [addAnchor, handleClose]
  );

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
  }));

  const contentStyle = useAnimatedStyle(() => {
    const p = progress.value;
    return {
      opacity: p,
      transform: [{ scale: 0.3 + p * 0.7 }],
    };
  });

  const renderFriendItem = useCallback(
    (friendship: Friendship, index: number) => {
      const friend = friendship.friend as User;
      const isAdding = addingId === friendship.friend_id;

      return (
        <View
          key={friendship.id}
          style={[
            styles.friendCard,
            {
              backgroundColor: theme.colors.glass.background,
              borderColor: theme.colors.glass.border,
            },
          ]}
        >
          <View style={styles.friendInfo}>
            {friend?.avatar_url ? (
              <CachedImage
                source={{ uri: friend.avatar_url }}
                style={styles.avatar}
                cachePolicy="memory-disk"
                contentFit="cover"
              />
            ) : (
              <View
                style={[styles.avatarPlaceholder, { backgroundColor: accent.soft }]}
              >
                <Text style={[styles.avatarText, { color: accent.primary }]}>
                  {friend?.display_name?.charAt(0).toUpperCase() || "?"}
                </Text>
              </View>
            )}
            <Text
              style={[styles.friendName, { color: theme.colors.text.primary }]}
              numberOfLines={1}
            >
              {friend?.display_name || "Unknown"}
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.iconButton, { backgroundColor: accent.soft }]}
            onPress={() => handleAddAnchor(friendship.friend_id)}
            disabled={isAdding || loading}
            activeOpacity={0.7}
          >
            {isAdding ? (
              <ActivityIndicator size="small" color={accent.primary} />
            ) : (
              <Ionicons name="add" size={24} color={accent.primary} />
            )}
          </TouchableOpacity>
        </View>
      );
    },
    [addingId, loading, handleAddAnchor, theme, accent]
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <View style={styles.fullScreen}>
        {/* Backdrop */}
        <Animated.View style={[StyleSheet.absoluteFill, backdropStyle]}>
          <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill}>
            <TouchableOpacity
              style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.2)' }]}
              activeOpacity={1}
              onPress={handleClose}
            />
          </BlurView>
        </Animated.View>

        {/* Content */}
        <Animated.View style={[styles.fullScreenContent, contentStyle]}>
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
          {/* ScrollView - underneath header */}
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={[
              styles.contentContainer,
              {
                paddingTop: insets.top + 160,
                paddingBottom: insets.bottom + 24,
              },
            ]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Search Bar */}
            {availableFriends.length > 0 && (
              <View
                style={[
                  styles.searchBar,
                  {
                    backgroundColor: theme.colors.glass.background,
                    borderColor: theme.colors.glass.border,
                  },
                ]}
              >
                <Ionicons name="search" size={18} color={theme.colors.text.tertiary} />
                <TextInput
                  style={[styles.searchInput, { color: theme.colors.text.primary }]}
                  placeholder="Search friends..."
                  placeholderTextColor={theme.colors.text.tertiary}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  autoCorrect={false}
                  autoCapitalize="none"
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity
                    onPress={() => setSearchQuery("")}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name="close-circle"
                      size={18}
                      color={theme.colors.text.tertiary}
                    />
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Content */}
            {availableFriends.length === 0 ? (
              <View style={styles.emptyState}>
                <View
                  style={[styles.emptyIconContainer, { backgroundColor: accent.soft }]}
                >
                  <Ionicons name="people-outline" size={36} color={accent.primary} />
                </View>
                <Text
                  style={[styles.emptyTitle, { color: theme.colors.text.primary }]}
                >
                  {friends.length === 0
                    ? "No Friends Yet"
                    : "All Friends Are Anchors"}
                </Text>
                <Text
                  style={[styles.emptyMessage, { color: theme.colors.text.tertiary }]}
                >
                  {friends.length === 0
                    ? "Add some friends first to set them as safety anchors."
                    : "You've already set all your friends as anchors."}
                </Text>
              </View>
            ) : filteredFriends.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons
                  name="search"
                  size={48}
                  color={theme.colors.text.tertiary}
                />
                <Text
                  style={[styles.emptyTitle, { color: theme.colors.text.primary }]}
                >
                  No Results
                </Text>
                <Text
                  style={[styles.emptyMessage, { color: theme.colors.text.tertiary }]}
                >
                  No friends match "{searchQuery}"
                </Text>
              </View>
            ) : (
              <View style={styles.section}>
                <Text
                  style={[styles.sectionTitle, { color: theme.colors.text.tertiary }]}
                >
                  CHOOSE A TRUSTED FRIEND
                </Text>
                {filteredFriends.map((friendship, index) =>
                  renderFriendItem(friendship, index)
                )}
              </View>
            )}
          </ScrollView>
          </KeyboardAvoidingView>

          {/* Header with gradient fade - absolute positioned on top */}
          <LinearGradient
            colors={[
              'rgba(0,0,0,0.98)',
              'rgba(0,0,0,0.95)',
              'rgba(0,0,0,0.85)',
              'rgba(0,0,0,0.6)',
              'transparent'
            ]}
            locations={[0, 0.3, 0.6, 0.85, 1]}
            style={[styles.headerOverlay, { paddingTop: insets.top + 8 }]}
            pointerEvents="box-none"
          >
            <View style={styles.header} pointerEvents="box-none">
              <TouchableOpacity
                style={[styles.closeButton, { backgroundColor: theme.colors.glass.background }]}
                onPress={handleClose}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={22} color={theme.colors.text.primary} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.headerTitle, { color: theme.colors.text.primary }]}>
              Safety Anchors
            </Text>
            <Text style={[styles.subtitle, { color: theme.colors.text.tertiary }]}>
              Choose someone you trust to check on you
            </Text>
          </LinearGradient>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fullScreen: {
    flex: 1,
  },
  fullScreenContent: {
    flex: 1,
  },
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 24,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 20,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
    padding: 0,
  },
  friendCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    borderRadius: radius.md,
    borderWidth: 1,
    marginBottom: 10,
  },
  friendInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontSize: 16,
    fontWeight: "600",
  },
  friendName: {
    fontSize: 16,
    fontWeight: "600",
    flex: 1,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
    marginTop: 16,
  },
  emptyMessage: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
});
