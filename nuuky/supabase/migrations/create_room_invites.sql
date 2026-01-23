-- Room Invites Table Migration
-- Run this in your Supabase SQL Editor

-- Create room_invites table
CREATE TABLE IF NOT EXISTS room_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '1 day'),
  responded_at TIMESTAMPTZ,

  -- Prevent duplicate pending invites
  CONSTRAINT unique_pending_invite UNIQUE (room_id, receiver_id, status)
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_room_invites_receiver ON room_invites(receiver_id, status);
CREATE INDEX IF NOT EXISTS idx_room_invites_room ON room_invites(room_id, status);
CREATE INDEX IF NOT EXISTS idx_room_invites_sender ON room_invites(sender_id);
CREATE INDEX IF NOT EXISTS idx_room_invites_expires ON room_invites(expires_at) WHERE status = 'pending';

-- Enable Row Level Security
ALTER TABLE room_invites ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users can view invites they sent or received
CREATE POLICY "Users can view their invites"
  ON room_invites FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Room creators can send invites
CREATE POLICY "Room creators can send invites"
  ON room_invites FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM rooms
      WHERE rooms.id = room_id
      AND rooms.creator_id = auth.uid()
    )
  );

-- Receivers can update their own invites (accept/decline)
CREATE POLICY "Receivers can respond to invites"
  ON room_invites FOR UPDATE
  USING (auth.uid() = receiver_id)
  WITH CHECK (auth.uid() = receiver_id);

-- Senders can delete invites they sent (cancel invite)
CREATE POLICY "Senders can cancel invites"
  ON room_invites FOR DELETE
  USING (auth.uid() = sender_id);

-- Enable realtime for room_invites
ALTER PUBLICATION supabase_realtime ADD TABLE room_invites;

-- Function to auto-expire old invites (optional - can be called via cron)
CREATE OR REPLACE FUNCTION expire_old_invites()
RETURNS void AS $$
BEGIN
  UPDATE room_invites
  SET status = 'declined', responded_at = NOW()
  WHERE status = 'pending' AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update rooms table: all rooms are private now
ALTER TABLE rooms ALTER COLUMN is_private SET DEFAULT true;

-- Optional: If you want to completely remove is_public column (uncomment below)
-- ALTER TABLE rooms DROP COLUMN IF EXISTS is_public;

COMMENT ON TABLE room_invites IS 'Stores room invitations with 24-hour expiry';
COMMENT ON FUNCTION expire_old_invites IS 'Call this function periodically to expire old pending invites';
