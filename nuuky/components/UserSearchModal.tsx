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
import { colors, spacing, radius, typography, gradients } from "../lib/theme";
import { UserSearchResult } from "../types";
import { useUserSearch } from "../hooks/useUserSearch";
import { useFriends } from "../hooks/useFriends";

interface UserSearchModalProps {
  visible: boolean;
  onClose: () => void;
  onUserSelect?: (user: UserSearchResult) => void;
}

export const UserSearchModal: React.FC<UserSearchModalProps> = ({ visible, onClose, onUserSelect }) => {
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

        <View style={styles.modalContainer}>
          <BlurView intensity={80} tint="dark" style={styles.modal}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Find Users</Text>
              <TouchableOpacity style={styles.closeButton} onPress={onClose} activeOpacity={0.8}>
                <Ionicons name="close" size={24} color={colors.text.primary} />
              </TouchableOpacity>
            </View>

            {/* Search Input */}
            <View style={styles.searchContainer}>
              <View style={styles.searchInputWrapper}>
                <Ionicons name="search" size={20} color={colors.text.tertiary} />
                <TextInput
                  style={styles.searchInput}
                  value={query}
                  onChangeText={handleSearch}
                  placeholder="Search by username..."
                  placeholderTextColor={colors.text.tertiary}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoFocus
                />
                {loading && <ActivityIndicator size="small" color={colors.text.tertiary} />}
                {query.length > 0 && !loading && (
                  <TouchableOpacity onPress={() => handleSearch("")}>
                    <Ionicons name="close-circle" size={20} color={colors.text.tertiary} />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Content */}
            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
              {query.length < 2 ? (
                <View style={styles.hintState}>
                  <Ionicons name="at" size={48} color={colors.text.tertiary} />
                  <Text style={styles.hintTitle}>Search by Username</Text>
                  <Text style={styles.hintMessage}>Enter at least 2 characters to search for users</Text>
                </View>
              ) : results.length === 0 && !loading ? (
                <View style={styles.emptyState}>
                  <Ionicons name="person-outline" size={48} color={colors.text.tertiary} />
                  <Text style={styles.emptyTitle}>No Users Found</Text>
                  <Text style={styles.emptyMessage}>
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
  return (
    <TouchableOpacity
      style={styles.userItem}
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
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarText}>{user.display_name.charAt(0).toUpperCase()}</Text>
            </View>
          )}

          {/* Online indicator */}
          {user.is_online && (
            <View style={styles.onlineIndicator}>
              <View style={styles.onlineDot} />
            </View>
          )}
        </View>

        {/* Name and Username */}
        <View style={styles.userTextContainer}>
          <Text style={styles.userName}>{user.display_name}</Text>
          <Text style={styles.userUsername}>@{user.username}</Text>
        </View>
      </View>

      {/* Action Button */}
      {isFriend ? (
        <View style={styles.friendBadge}>
          <Ionicons name="checkmark-circle" size={16} color={colors.mood.good.base} />
          <Text style={styles.friendBadgeText}>Friends</Text>
        </View>
      ) : (
        <TouchableOpacity style={styles.addButton} onPress={onAddFriend} disabled={isAdding} activeOpacity={0.8}>
          <LinearGradient colors={gradients.neonCyan} style={styles.addGradient}>
            {isAdding ? (
              <ActivityIndicator size="small" color={colors.text.primary} />
            ) : (
              <>
                <Ionicons name="person-add" size={16} color={colors.text.primary} />
                <Text style={styles.addButtonText}>Add</Text>
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
    borderColor: colors.glass.border,
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
    borderBottomColor: colors.glass.border,
  },
  title: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold as any,
    color: colors.text.primary,
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
    borderBottomColor: colors.glass.border,
  },
  searchInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.glass.background,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.glass.border,
    paddingHorizontal: spacing.sm,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: typography.size.md,
    color: colors.text.primary,
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
    backgroundColor: colors.glass.background,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.glass.border,
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
    backgroundColor: colors.glass.background,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  avatarText: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.bold as any,
    color: colors.text.primary,
  },
  onlineIndicator: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.bg.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  onlineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.mood.good.base,
  },
  userTextContainer: {
    flex: 1,
  },
  userName: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold as any,
    color: colors.text.primary,
  },
  userUsername: {
    fontSize: typography.size.sm,
    color: colors.text.tertiary,
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
    color: colors.text.primary,
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
    color: colors.mood.good.base,
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
    color: colors.text.primary,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  hintMessage: {
    fontSize: typography.size.sm,
    color: colors.text.tertiary,
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
    color: colors.text.primary,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  emptyMessage: {
    fontSize: typography.size.sm,
    color: colors.text.tertiary,
    textAlign: "center",
  },
});
