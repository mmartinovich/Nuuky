import { useState, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { useAppStore } from "../stores/appStore";
import { UserSearchResult } from "../types";

export const useUserSearch = () => {
  const { currentUser } = useAppStore();
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  /**
   * Search users by username prefix (case-insensitive)
   * Excludes current user and blocked users
   */
  const searchUsers = useCallback(
    async (query: string): Promise<UserSearchResult[]> => {
      const trimmedQuery = query.trim().toLowerCase();

      // Clear results if query is too short
      if (trimmedQuery.length < 2) {
        setResults([]);
        setError(null);
        return [];
      }

      setLoading(true);
      setError(null);

      try {
        // Get blocked user IDs to exclude
        let blockedIds: string[] = [];
        if (currentUser) {
          const { data: blocks } = await supabase.from("blocks").select("blocked_id").eq("blocker_id", currentUser.id);

          blockedIds = blocks?.map((b) => b.blocked_id) || [];
        }

        // Search by username prefix
        let searchQuery = supabase
          .from("users")
          .select("id, username, display_name, avatar_url, is_online, last_seen_at, mood")
          .ilike("username", `${trimmedQuery}%`)
          .limit(20);

        // Exclude current user
        if (currentUser) {
          searchQuery = searchQuery.neq("id", currentUser.id);
        }

        const { data, error: searchError } = await searchQuery;

        if (searchError) {
          throw searchError;
        }

        // Filter out blocked users
        const filteredResults = (data || []).filter((user) => !blockedIds.includes(user.id)) as UserSearchResult[];

        setResults(filteredResults);
        return filteredResults;
      } catch (err: any) {
        console.error("Error searching users:", err);
        setError("Failed to search users");
        setResults([]);
        return [];
      } finally {
        setLoading(false);
      }
    },
    [currentUser],
  );

  /**
   * Get a user by exact username
   */
  const getUserByUsername = useCallback(async (username: string): Promise<UserSearchResult | null> => {
    const normalized = username.trim().toLowerCase();

    if (!normalized) {
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from("users")
        .select("id, username, display_name, avatar_url, is_online, last_seen_at, mood")
        .eq("username", normalized)
        .single();

      if (fetchError) {
        if (fetchError.code === "PGRST116") {
          // No user found
          return null;
        }
        throw fetchError;
      }

      return data as UserSearchResult;
    } catch (err: any) {
      console.error("Error fetching user by username:", err);
      setError("Failed to find user");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Clear search results
   */
  const clearResults = useCallback(() => {
    setResults([]);
    setError(null);
  }, []);

  return {
    loading,
    results,
    error,
    searchUsers,
    getUserByUsername,
    clearResults,
  };
};
