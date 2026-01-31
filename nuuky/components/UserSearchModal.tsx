import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  TextInput,
} from "react-native";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { spacing, radius, typography } from "../lib/theme";
import { useTheme } from "../hooks/useTheme";
import { UserSearchResult } from "../types";
import { useUserSearch } from "../hooks/useUserSearch";
import { useFriends } from "../hooks/useFriends";
import { isUserTrulyOnline } from "../lib/utils";

interface UserSearchModalProps {
  visible: boolean;
  onClose: () => void;
  onUserSelect?: (user: UserSearchResult) => void;
}

export const UserSearchModal: React.FC<UserSearchModalProps> = ({ visible, onClose, onUserSelect }) => {
  const { theme } = useTheme();
  const [query, setQuery] = useState("");
  const [addingFriend, setAddingFriend] = useState<string | null>(null);
  const { loading, results, searchUsers, clearResults } = useUserSearch();
  const { friends, addFriend } = useFriends();
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced search
  const handleSearch = useCallback(
    (text: string) => {
      setQuery(text);

      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      if (text.trim().length < 2) {
        clearResults();
        return;
      }

      debounceRef.current = setTimeout(() => {
        searchUsers(text);
      }, 300);
    },
    [searchUsers, clearResults],
  );

  // Clear state when modal closes
  useEffect(() => {
    if (!visible) {
      setQuery("");
      clearResults();
    }
  }, [visible, clearResults]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const handleAddFriend = async (user: UserSearchResult) => {
    setAddingFriend(user.id);
    try {
      await addFriend(user.id);
    } finally {
      setAddingFriend(null);
    }
  };

  const isFriend = (userId: string) => {
    return friends.some((f) => f.friend_id === userId);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />

        <View style={[styles.modalContainer, { borderColor: theme.colors.glass.border }]}>
          <BlurView intensity={80} tint="dark" style={styles.modal}>
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: theme.colors.glass.border }]}>
              <Text style={[styles.title, { color: theme.colors.text.primary }]}>Find Users</Text>
              <TouchableOpacity style={styles.closeButton} onPress={onClose} activeOpacity={0.8}>
                <Ionicons name="close" size={24} color={theme.colors.text.primary} />
              </TouchableOpacity>
            </View>

            {/* Search Input */}
            <View style={[styles.searchContainer, { borderBottomColor: theme.colors.glass.border }]}>
              <View style={[styles.searchInputWrapper, { backgroundColor: theme.colors.glass.background, borderColor: theme.colors.glass.border }]}>
                <Ionicons name="search" size={20} color={theme.colors.text.tertiary} />
                <TextInput
                  style={[styles.searchInput, { color: theme.colors.text.primary }]}
                  value={query}
                  onChangeText={handleSearch}
                  placeholder="Search by username..."
                  placeholderTextColor={theme.colors.text.tertiary}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoFocus
                />
                {loading && <ActivityIndicator size="small" color={theme.colors.text.tertiary} />}
                {query.length > 0 && !loading && (
                  <TouchableOpacity onPress={() => handleSearch("")}>
                    <Ionicons name="close-circle" size={20} color={theme.colors.text.tertiary} />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Content */}
            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
              {query.length < 2 ? (
                <View style={styles.hintState}>
                  <Ionicons name="at" size={48} color={theme.colors.text.tertiary} />
                  <Text style={[styles.hintTitle, { color: theme.colors.text.primary }]}>Search by Username</Text>
                  <Text style={[styles.hintMessage, { color: theme.colors.text.tertiary }]}>Enter at least 2 characters to search for users</Text>
                </View>
              ) : results.length === 0 && !loading ? (
                <View style={styles.emptyState}>
                  <Ionicons name="person-outline" size={48} color={theme.colors.text.tertiary} />
                  <Text style={[styles.emptyTitle, { color: theme.colors.text.primary }]}>No Users Found</Text>
                  <Text style={[styles.emptyMessage, { color: theme.colors.text.tertiary }]}>
                    No one with that username exists. Check the spelling and try again.
                  </Text>
                </View>
              ) : (
                <View style={styles.resultsList}>
                  {results.map((user) => (
                    <UserResultItem
                      key={user.id}
                      user={user}
                      isFriend={isFriend(user.id)}
                      isAdding={addingFriend === user.id}
                      onAddFriend={() => handleAddFriend(user)}
                      onSelect={onUserSelect ? () => onUserSelect(user) : undefined}
                    />
                  ))}
                </View>
              )}
            </ScrollView>
          </BlurView>
        </View>
      </View>
    </Modal>
  );
};

interface UserResultItemProps {
  user: UserSearchResult;
  isFriend: boolean;
  isAdding: boolean;
  onAddFriend: () => void;
  onSelect?: () => void;
}

const UserResultItem: React.FC<UserResultItemProps> = ({ user, isFriend, isAdding, onAddFriend, onSelect }) => {
  const { theme } = useTheme();

  return (
    <TouchableOpacity
      style={[styles.userItem, { backgroundColor: theme.colors.glass.background, borderColor: theme.colors.glass.border }]}
      onPress={onSelect}
      activeOpacity={onSelect ? 0.8 : 1}
      disabled={!onSelect}
    >
      <View style={styles.userInfo}>
        {/* Avatar */}
        <View style={styles.avatarContainer}>
          {user.avatar_url ? (
            <Image source={{ uri: user.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: theme.colors.glass.background, borderColor: theme.colors.glass.border }]}>
              <Text style={[styles.avatarText, { color: theme.colors.text.primary }]}>{user.display_name.charAt(0).toUpperCase()}</Text>
            </View>
          )}

          {/* Online indicator */}
          {isUserTrulyOnline(user.is_online, user.last_seen_at) && (
            <View style={[styles.onlineIndicator, { backgroundColor: theme.colors.bg.primary }]}>
              <View style={[styles.onlineDot, { backgroundColor: theme.colors.mood.good.base }]} />
            </View>
          )}
        </View>

        {/* Name and Username */}
        <View style={styles.userTextContainer}>
          <Text style={[styles.userName, { color: theme.colors.text.primary }]}>{user.display_name}</Text>
          <Text style={[styles.userUsername, { color: theme.colors.text.tertiary }]}>@{user.username}</Text>
        </View>
      </View>

      {/* Action Button */}
      {isFriend ? (
        <View style={styles.friendBadge}>
          <Ionicons name="checkmark-circle" size={16} color={theme.colors.mood.good.base} />
          <Text style={[styles.friendBadgeText, { color: theme.colors.mood.good.base }]}>Friends</Text>
        </View>
      ) : (
        <TouchableOpacity style={styles.addButton} onPress={onAddFriend} disabled={isAdding} activeOpacity={0.8}>
          <LinearGradient colors={theme.gradients.neonCyan} style={styles.addGradient}>
            {isAdding ? (
              <ActivityIndicator size="small" color={theme.colors.text.primary} />
            ) : (
              <>
                <Ionicons name="person-add" size={16} color={theme.colors.text.primary} />
                <Text style={[styles.addButtonText, { color: theme.colors.text.primary }]}>Add</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContainer: {
    width: "90%",
    maxWidth: 400,
    height: "70%",
    borderRadius: radius.xl,
    overflow: "hidden",
    borderWidth: 1,
  },
  modal: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold as any,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
  searchContainer: {
    padding: spacing.md,
    borderBottomWidth: 1,
  },
  searchInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: typography.size.md,
    paddingVertical: spacing.sm,
  },
  content: {
    flex: 1,
  },
  resultsList: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  userItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flex: 1,
  },
  avatarContainer: {
    position: "relative",
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarPlaceholder: {
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
  },
  avatarText: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.bold as any,
  },
  onlineIndicator: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    justifyContent: "center",
    alignItems: "center",
  },
  onlineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  userTextContainer: {
    flex: 1,
  },
  userName: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold as any,
  },
  userUsername: {
    fontSize: typography.size.sm,
  },
  addButton: {
    borderRadius: radius.md,
    overflow: "hidden",
  },
  addGradient: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  addButtonText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold as any,
  },
  friendBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    backgroundColor: "rgba(34, 197, 94, 0.1)",
    borderRadius: radius.md,
  },
  friendBadgeText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium as any,
  },
  hintState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing["3xl"],
    paddingHorizontal: spacing.xl,
  },
  hintTitle: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold as any,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  hintMessage: {
    fontSize: typography.size.sm,
    textAlign: "center",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing["3xl"],
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold as any,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  emptyMessage: {
    fontSize: typography.size.sm,
    textAlign: "center",
  },
});
