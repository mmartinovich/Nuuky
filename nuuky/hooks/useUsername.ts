import { useState, useCallback } from "react";
import { Alert } from "react-native";
import { supabase } from "../lib/supabase";
import { useAppStore } from "../stores/appStore";

// Username validation rules
const USERNAME_MIN_LENGTH = 3;
const USERNAME_MAX_LENGTH = 30;
const USERNAME_PATTERN = /^[a-z0-9_]+$/;

export interface UsernameValidation {
  isValid: boolean;
  error?: string;
}

export const useUsername = () => {
  const { currentUser, setCurrentUser } = useAppStore();
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);

  /**
   * Validate username format (client-side)
   */
  const validateUsername = useCallback((input: string): UsernameValidation => {
    const username = input.toLowerCase().trim();

    if (username.length === 0) {
      return { isValid: false, error: "Username is required" };
    }

    if (username.length < USERNAME_MIN_LENGTH) {
      return { isValid: false, error: `Username must be at least ${USERNAME_MIN_LENGTH} characters` };
    }

    if (username.length > USERNAME_MAX_LENGTH) {
      return { isValid: false, error: `Username must be ${USERNAME_MAX_LENGTH} characters or less` };
    }

    if (!USERNAME_PATTERN.test(username)) {
      return { isValid: false, error: "Username can only contain lowercase letters, numbers, and underscores" };
    }

    // Check for reserved words
    const reserved = ["admin", "nuuky", "support", "help", "system", "null", "undefined"];
    if (reserved.includes(username)) {
      return { isValid: false, error: "This username is reserved" };
    }

    return { isValid: true };
  }, []);

  /**
   * Check if username is available (async DB check)
   */
  const checkAvailability = useCallback(
    async (username: string): Promise<boolean> => {
      const normalized = username.toLowerCase().trim();

      // Skip if it's the current user's username
      if (currentUser?.username === normalized) {
        return true;
      }

      setChecking(true);
      try {
        const { data, error } = await supabase.from("users").select("id").eq("username", normalized).maybeSingle();

        if (error) {
          console.error("Error checking username availability:", error);
          return false;
        }

        // Available if no user found
        return data === null;
      } catch (error) {
        console.error("Error checking username availability:", error);
        return false;
      } finally {
        setChecking(false);
      }
    },
    [currentUser?.username],
  );

  /**
   * Generate a username suggestion from display name
   */
  const suggestUsername = useCallback((displayName: string): string => {
    // Clean the name: lowercase, replace spaces with underscores, remove non-alphanumeric
    let suggestion = displayName
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/[^a-z0-9_]/g, "");

    // Ensure minimum length
    if (suggestion.length < USERNAME_MIN_LENGTH) {
      suggestion = "user_" + suggestion;
    }

    // Truncate to max length
    return suggestion.slice(0, USERNAME_MAX_LENGTH);
  }, []);

  /**
   * Update username in database
   */
  const updateUsername = useCallback(
    async (username: string): Promise<boolean> => {
      if (!currentUser) {
        Alert.alert("Error", "You must be logged in");
        return false;
      }

      const normalized = username.toLowerCase().trim();

      // Validate format
      const validation = validateUsername(normalized);
      if (!validation.isValid) {
        Alert.alert("Invalid Username", validation.error);
        return false;
      }

      // Check availability
      const available = await checkAvailability(normalized);
      if (!available) {
        Alert.alert("Username Taken", "This username is already in use. Please choose another.");
        return false;
      }

      setLoading(true);
      try {
        const { error } = await supabase.from("users").update({ username: normalized }).eq("id", currentUser.id);

        if (error) {
          // Handle unique constraint violation
          if (error.code === "23505") {
            Alert.alert("Username Taken", "This username was just taken. Please choose another.");
            return false;
          }
          throw error;
        }

        // Update local state
        setCurrentUser({ ...currentUser, username: normalized });
        return true;
      } catch (error: any) {
        console.error("Error updating username:", error);
        Alert.alert("Error", "Failed to update username. Please try again.");
        return false;
      } finally {
        setLoading(false);
      }
    },
    [currentUser, validateUsername, checkAvailability, setCurrentUser],
  );

  return {
    loading,
    checking,
    validateUsername,
    checkAvailability,
    suggestUsername,
    updateUsername,
  };
};
