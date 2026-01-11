-- Fix RLS Policies for Rooms Feature
-- Run this migration to fix authentication issues

-- ============================================
-- 1. Fix room_invites INSERT policy
-- ============================================

-- Drop old restrictive policy (only creators could invite)
DROP POLICY IF EXISTS "Room creators can send invites" ON room_invites;

-- New policy: Room PARTICIPANTS can send invites (not just creators)
CREATE POLICY "Room participants can send invites"
  ON room_invites FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM room_participants
      WHERE room_participants.room_id = room_invites.room_id
      AND room_participants.user_id = auth.uid()
    )
  );

-- ============================================
-- 2. Fix users SELECT policy for room participants
-- ============================================

-- Allow users to view profiles of people in the same rooms
CREATE POLICY "Users can view room participants' profiles"
  ON users FOR SELECT
  USING (
    id IN (
      SELECT rp.user_id
      FROM room_participants rp
      WHERE rp.room_id IN (
        SELECT room_id FROM room_participants
        WHERE user_id = auth.uid()
      )
    )
  );

-- ============================================
-- 3. Fix rooms SELECT policy
-- ============================================

-- Drop old policy that showed all active rooms
DROP POLICY IF EXISTS "Users can view active rooms" ON rooms;

-- New policy: Users can only view rooms they're in or created
CREATE POLICY "Users can view their rooms"
  ON rooms FOR SELECT
  USING (
    creator_id = auth.uid()
    OR id IN (
      SELECT room_id FROM room_participants
      WHERE user_id = auth.uid()
    )
  );

-- ============================================
-- 4. Add policy for room creators to delete
-- ============================================

CREATE POLICY "Room creators can delete rooms"
  ON rooms FOR DELETE
  USING (creator_id = auth.uid());

-- ============================================
-- 5. Add policy for room creators to manage participants
-- ============================================

-- Allow room creators to remove participants
CREATE POLICY "Room creators can remove participants"
  ON room_participants FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM rooms
      WHERE rooms.id = room_participants.room_id
      AND rooms.creator_id = auth.uid()
    )
  );

COMMENT ON POLICY "Room participants can send invites" ON room_invites IS 'Allows any room participant to invite friends, not just the creator';
COMMENT ON POLICY "Users can view room participants' profiles" ON users IS 'Allows viewing profiles of users in the same rooms';
COMMENT ON POLICY "Users can view their rooms" ON rooms IS 'Users can only see rooms they created or joined';
