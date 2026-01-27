import { useState, useCallback } from "react";
import { Alert, Share } from "react-native";
import { supabase } from "../lib/supabase";
import { useAppStore } from "../stores/appStore";
import { RoomInviteLink, Room } from "../types";

interface CreateInviteLinkOptions {
  maxUses?: number;
  expiresInHours?: number;
}

interface InviteLinkInfo {
  token: string;
  room: Room;
  creator: {
    id: string;
    display_name: string;
    avatar_url?: string;
  };
  isValid: boolean;
  reason?: string;
}

export const useInviteLink = () => {
  const { currentUser } = useAppStore();
  const [loading, setLoading] = useState(false);

  /**
   * Generate the full invite URL from a token
   */
  const getInviteUrl = useCallback((token: string): string => {
    return `nuuky://r/${token}`;
  }, []);

  /**
   * Create a new shareable invite link for a room
   */
  const createInviteLink = useCallback(
    async (roomId: string, options?: CreateInviteLinkOptions): Promise<RoomInviteLink | null> => {
      if (!currentUser) {
        Alert.alert("Error", "You must be logged in");
        return null;
      }

      setLoading(true);
      try {
        // Calculate expiration if provided
        let expiresAt: string | null = null;
        if (options?.expiresInHours) {
          const expDate = new Date();
          expDate.setHours(expDate.getHours() + options.expiresInHours);
          expiresAt = expDate.toISOString();
        }

        const { data, error } = await supabase
          .from("room_invite_links")
          .insert({
            room_id: roomId,
            created_by: currentUser.id,
            max_uses: options?.maxUses || null,
            expires_at: expiresAt,
          })
          .select(
            `
          *,
          room:room_id (
            id,
            name,
            is_active,
            is_private
          )
        `,
          )
          .single();

        if (error) {
          throw error;
        }

        return data as RoomInviteLink;
      } catch (error: any) {
        console.error("Error creating invite link:", error);
        Alert.alert("Error", "Failed to create invite link");
        return null;
      } finally {
        setLoading(false);
      }
    },
    [currentUser],
  );

  /**
   * Get invite link info by token (for previewing before joining)
   */
  const getInviteLinkInfo = useCallback(async (token: string): Promise<InviteLinkInfo | null> => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("room_invite_links")
        .select(
          `
          *,
          room:room_id (
            id,
            name,
            is_active,
            is_private,
            creator_id
          ),
          creator:created_by (
            id,
            display_name,
            avatar_url
          )
        `,
        )
        .eq("token", token)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          return null; // Not found
        }
        throw error;
      }

      const link = data as RoomInviteLink & { creator: any };

      // Check validity
      let isValid = true;
      let reason: string | undefined;

      // Check if room is active
      if (!link.room?.is_active) {
        isValid = false;
        reason = "This room is no longer active";
      }

      // Check expiration
      if (link.expires_at && new Date(link.expires_at) < new Date()) {
        isValid = false;
        reason = "This invite link has expired";
      }

      // Check max uses
      if (link.max_uses !== null && link.use_count >= link.max_uses) {
        isValid = false;
        reason = "This invite link has reached its maximum uses";
      }

      return {
        token: link.token,
        room: link.room as Room,
        creator: link.creator,
        isValid,
        reason,
      };
    } catch (error: any) {
      console.error("Error fetching invite link info:", error);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Join a room using an invite token
   */
  const joinRoomByToken = useCallback(
    async (token: string): Promise<Room | null> => {
      if (!currentUser) {
        Alert.alert("Error", "You must be logged in to join");
        return null;
      }

      setLoading(true);
      try {
        // Get link info
        const linkInfo = await getInviteLinkInfo(token);

        if (!linkInfo) {
          Alert.alert("Invalid Link", "This invite link does not exist");
          return null;
        }

        if (!linkInfo.isValid) {
          Alert.alert("Cannot Join", linkInfo.reason || "This invite link is no longer valid");
          return null;
        }

        // Check if already a participant
        const { data: existingParticipant } = await supabase
          .from("room_participants")
          .select("id")
          .eq("room_id", linkInfo.room.id)
          .eq("user_id", currentUser.id)
          .maybeSingle();

        if (existingParticipant) {
          // Already in room, just return the room
          return linkInfo.room;
        }

        // Check room capacity (max 10)
        const { count } = await supabase
          .from("room_participants")
          .select("id", { count: "exact", head: true })
          .eq("room_id", linkInfo.room.id);

        if (count !== null && count >= 10) {
          Alert.alert("Room Full", "This room has reached its maximum capacity of 10 members");
          return null;
        }

        // Increment use count
        const { data: incrementResult } = await supabase.rpc("increment_invite_link_use", {
          link_token: token,
        });

        if (!incrementResult) {
          Alert.alert("Error", "Failed to use invite link");
          return null;
        }

        // Add user to room
        const { error: joinError } = await supabase.from("room_participants").insert({
          room_id: linkInfo.room.id,
          user_id: currentUser.id,
          is_muted: false,
        });

        if (joinError) {
          // Handle duplicate (race condition)
          if (joinError.code === "23505") {
            return linkInfo.room;
          }
          throw joinError;
        }

        Alert.alert("Joined!", `You've joined ${linkInfo.room.name || "the room"}`);
        return linkInfo.room;
      } catch (error: any) {
        console.error("Error joining room by token:", error);
        Alert.alert("Error", "Failed to join room");
        return null;
      } finally {
        setLoading(false);
      }
    },
    [currentUser, getInviteLinkInfo],
  );

  /**
   * Copy invite link to clipboard via share sheet
   */
  const copyInviteLink = useCallback(
    async (token: string): Promise<boolean> => {
      try {
        const url = getInviteUrl(token);
        await Share.share({ message: url });
        return true;
      } catch (error) {
        console.error("Error copying link:", error);
        return false;
      }
    },
    [getInviteUrl],
  );

  /**
   * Share invite link via system share sheet
   */
  const shareInviteLink = useCallback(
    async (token: string, roomName?: string): Promise<boolean> => {
      try {
        const url = getInviteUrl(token);
        const message = roomName ? `Join my room "${roomName}" on Nūūky: ${url}` : `Join my room on Nūūky: ${url}`;

        const result = await Share.share({
          message,
          url,
        });

        return result.action === Share.sharedAction;
      } catch (error) {
        console.error("Error sharing link:", error);
        return false;
      }
    },
    [getInviteUrl],
  );

  /**
   * Get all invite links for a room
   */
  const getLinksForRoom = useCallback(async (roomId: string): Promise<RoomInviteLink[]> => {
    try {
      const { data, error } = await supabase
        .from("room_invite_links")
        .select("*")
        .eq("room_id", roomId)
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      return data as RoomInviteLink[];
    } catch (error: any) {
      console.error("Error fetching room invite links:", error);
      return [];
    }
  }, []);

  /**
   * Delete an invite link
   */
  const deleteInviteLink = useCallback(async (linkId: string): Promise<boolean> => {
    try {
      const { error } = await supabase.from("room_invite_links").delete().eq("id", linkId);

      if (error) {
        throw error;
      }

      return true;
    } catch (error: any) {
      console.error("Error deleting invite link:", error);
      Alert.alert("Error", "Failed to delete invite link");
      return false;
    }
  }, []);

  return {
    loading,
    getInviteUrl,
    createInviteLink,
    getInviteLinkInfo,
    joinRoomByToken,
    copyInviteLink,
    shareInviteLink,
    getLinksForRoom,
    deleteInviteLink,
  };
};
