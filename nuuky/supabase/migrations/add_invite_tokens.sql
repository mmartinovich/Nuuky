-- Add room_invite_links table for shareable room invite links
-- These are token-based links that don't require a specific receiver

-- Create the room invite links table
CREATE TABLE room_invite_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token VARCHAR(12) NOT NULL UNIQUE,
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  max_uses INTEGER DEFAULT NULL,  -- NULL means unlimited
  use_count INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ DEFAULT NULL,  -- NULL means never expires
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for fast lookups
CREATE INDEX idx_room_invite_links_token ON room_invite_links(token);
CREATE INDEX idx_room_invite_links_room ON room_invite_links(room_id);
CREATE INDEX idx_room_invite_links_creator ON room_invite_links(created_by);
CREATE INDEX idx_room_invite_links_expires ON room_invite_links(expires_at) WHERE expires_at IS NOT NULL;

-- Function to generate a random alphanumeric token
CREATE OR REPLACE FUNCTION generate_invite_token()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || SUBSTR(chars, FLOOR(RANDOM() * LENGTH(chars) + 1)::INTEGER, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate token if not provided
CREATE OR REPLACE FUNCTION set_invite_token()
RETURNS TRIGGER AS $$
DECLARE
  new_token TEXT;
  attempts INTEGER := 0;
BEGIN
  IF NEW.token IS NULL OR NEW.token = '' THEN
    LOOP
      new_token := generate_invite_token();
      -- Check if token already exists
      IF NOT EXISTS (SELECT 1 FROM room_invite_links WHERE token = new_token) THEN
        NEW.token := new_token;
        EXIT;
      END IF;
      attempts := attempts + 1;
      IF attempts > 10 THEN
        RAISE EXCEPTION 'Could not generate unique token after 10 attempts';
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_invite_token
  BEFORE INSERT ON room_invite_links
  FOR EACH ROW
  EXECUTE FUNCTION set_invite_token();

-- Enable RLS
ALTER TABLE room_invite_links ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Anyone can read invite links (needed for joining)
CREATE POLICY "Anyone can read invite links" ON room_invite_links
  FOR SELECT USING (true);

-- Only room creator can create invite links
CREATE POLICY "Room creator can create invite links" ON room_invite_links
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM rooms 
      WHERE rooms.id = room_id 
      AND rooms.creator_id = auth.uid()
    )
  );

-- Only link creator can update their links
CREATE POLICY "Link creator can update their links" ON room_invite_links
  FOR UPDATE USING (created_by = auth.uid());

-- Only link creator can delete their links
CREATE POLICY "Link creator can delete their links" ON room_invite_links
  FOR DELETE USING (created_by = auth.uid());

-- Function to increment use count (called when someone joins via link)
CREATE OR REPLACE FUNCTION increment_invite_link_use(link_token TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  link_record room_invite_links;
BEGIN
  -- Get the link with lock
  SELECT * INTO link_record
  FROM room_invite_links
  WHERE token = link_token
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Check if expired
  IF link_record.expires_at IS NOT NULL AND link_record.expires_at < NOW() THEN
    RETURN FALSE;
  END IF;
  
  -- Check if max uses reached
  IF link_record.max_uses IS NOT NULL AND link_record.use_count >= link_record.max_uses THEN
    RETURN FALSE;
  END IF;
  
  -- Increment use count
  UPDATE room_invite_links
  SET use_count = use_count + 1
  WHERE id = link_record.id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
