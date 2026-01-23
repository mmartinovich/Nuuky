-- Nūūky Database Schema
-- Initial migration for Phase 1

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone VARCHAR(20) UNIQUE NOT NULL,
  display_name VARCHAR(50) NOT NULL,
  avatar_url TEXT,
  mood VARCHAR(20) DEFAULT 'neutral',
  is_online BOOLEAN DEFAULT false,
  last_seen_at TIMESTAMPTZ DEFAULT now(),
  ghost_mode_until TIMESTAMPTZ,
  take_break_until TIMESTAMPTZ,
  fcm_token TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create index on phone for faster lookups
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_is_online ON users(is_online);

-- Friendships with visibility control
CREATE TABLE friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  friend_id UUID REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'pending',
  visibility VARCHAR(20) DEFAULT 'full',
  created_at TIMESTAMPTZ DEFAULT now(),
  last_interaction_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, friend_id)
);

-- Create indexes for friendships
CREATE INDEX idx_friendships_user_id ON friendships(user_id);
CREATE INDEX idx_friendships_friend_id ON friendships(friend_id);
CREATE INDEX idx_friendships_status ON friendships(status);

-- Rooms & Participants
CREATE TABLE rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  is_private BOOLEAN DEFAULT false,
  audio_active BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  closed_at TIMESTAMPTZ
);

CREATE INDEX idx_rooms_is_active ON rooms(is_active);
CREATE INDEX idx_rooms_creator_id ON rooms(creator_id);

CREATE TABLE room_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  is_muted BOOLEAN DEFAULT true,
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(room_id, user_id)
);

CREATE INDEX idx_room_participants_room_id ON room_participants(room_id);
CREATE INDEX idx_room_participants_user_id ON room_participants(user_id);

-- Flares (SOS signals)
CREATE TABLE flares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  responded_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_flares_user_id ON flares(user_id);
CREATE INDEX idx_flares_expires_at ON flares(expires_at);

-- Nudges
CREATE TABLE nudges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
  receiver_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_nudges_sender_id ON nudges(sender_id);
CREATE INDEX idx_nudges_receiver_id ON nudges(receiver_id);
CREATE INDEX idx_nudges_created_at ON nudges(created_at);

-- Rate limiting for nudges
CREATE TABLE nudge_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID REFERENCES users(id),
  receiver_id UUID REFERENCES users(id),
  date DATE DEFAULT CURRENT_DATE,
  count INT DEFAULT 0,
  UNIQUE(sender_id, receiver_id, date)
);

CREATE INDEX idx_nudge_limits_sender_receiver_date ON nudge_limits(sender_id, receiver_id, date);

-- Blocks (silent, user never knows)
CREATE TABLE blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id UUID REFERENCES users(id) ON DELETE CASCADE,
  blocked_id UUID REFERENCES users(id) ON DELETE CASCADE,
  block_type VARCHAR(20) DEFAULT 'hard',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(blocker_id, blocked_id)
);

CREATE INDEX idx_blocks_blocker_id ON blocks(blocker_id);
CREATE INDEX idx_blocks_blocked_id ON blocks(blocked_id);

-- Reports
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID REFERENCES users(id),
  reported_id UUID REFERENCES users(id),
  report_type VARCHAR(50),
  details TEXT,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_reports_reporter_id ON reports(reporter_id);
CREATE INDEX idx_reports_reported_id ON reports(reported_id);
CREATE INDEX idx_reports_status ON reports(status);

-- Anchors (trusted safety contacts)
CREATE TABLE anchors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  anchor_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, anchor_id)
);

CREATE INDEX idx_anchors_user_id ON anchors(user_id);
CREATE INDEX idx_anchors_anchor_id ON anchors(anchor_id);

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE flares ENABLE ROW LEVEL SECURITY;
ALTER TABLE nudges ENABLE ROW LEVEL SECURITY;
ALTER TABLE nudge_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE anchors ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can view their own profile"
  ON users FOR SELECT
  USING (auth.uid()::text = id::text);

CREATE POLICY "Users can update their own profile"
  ON users FOR UPDATE
  USING (auth.uid()::text = id::text);

CREATE POLICY "Users can view friends' profiles"
  ON users FOR SELECT
  USING (
    id IN (
      SELECT friend_id FROM friendships
      WHERE user_id = auth.uid()::text AND status = 'accepted'
    )
  );

-- RLS Policies for friendships
CREATE POLICY "Users can view their own friendships"
  ON friendships FOR SELECT
  USING (user_id = auth.uid()::text OR friend_id = auth.uid()::text);

CREATE POLICY "Users can create friendships"
  ON friendships FOR INSERT
  WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "Users can update their own friendships"
  ON friendships FOR UPDATE
  USING (user_id = auth.uid()::text OR friend_id = auth.uid()::text);

CREATE POLICY "Users can delete their own friendships"
  ON friendships FOR DELETE
  USING (user_id = auth.uid()::text);

-- RLS Policies for rooms
CREATE POLICY "Users can view active rooms"
  ON rooms FOR SELECT
  USING (is_active = true);

CREATE POLICY "Users can create rooms"
  ON rooms FOR INSERT
  WITH CHECK (creator_id = auth.uid()::text);

CREATE POLICY "Room creators can update their rooms"
  ON rooms FOR UPDATE
  USING (creator_id = auth.uid()::text);

-- RLS Policies for room_participants
CREATE POLICY "Users can view room participants"
  ON room_participants FOR SELECT
  USING (true);

CREATE POLICY "Users can join rooms"
  ON room_participants FOR INSERT
  WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "Users can update their own participation"
  ON room_participants FOR UPDATE
  USING (user_id = auth.uid()::text);

CREATE POLICY "Users can leave rooms"
  ON room_participants FOR DELETE
  USING (user_id = auth.uid()::text);

-- RLS Policies for flares
CREATE POLICY "Users can view flares from friends"
  ON flares FOR SELECT
  USING (
    user_id IN (
      SELECT friend_id FROM friendships
      WHERE user_id = auth.uid()::text AND status = 'accepted'
    )
  );

CREATE POLICY "Users can create their own flares"
  ON flares FOR INSERT
  WITH CHECK (user_id = auth.uid()::text);

-- RLS Policies for nudges
CREATE POLICY "Users can view nudges they sent or received"
  ON nudges FOR SELECT
  USING (sender_id = auth.uid()::text OR receiver_id = auth.uid()::text);

CREATE POLICY "Users can send nudges"
  ON nudges FOR INSERT
  WITH CHECK (sender_id = auth.uid()::text);

-- RLS Policies for blocks
CREATE POLICY "Users can view their own blocks"
  ON blocks FOR SELECT
  USING (blocker_id = auth.uid()::text);

CREATE POLICY "Users can create blocks"
  ON blocks FOR INSERT
  WITH CHECK (blocker_id = auth.uid()::text);

CREATE POLICY "Users can delete their own blocks"
  ON blocks FOR DELETE
  USING (blocker_id = auth.uid()::text);

-- RLS Policies for reports
CREATE POLICY "Users can view their own reports"
  ON reports FOR SELECT
  USING (reporter_id = auth.uid()::text);

CREATE POLICY "Users can create reports"
  ON reports FOR INSERT
  WITH CHECK (reporter_id = auth.uid()::text);

-- RLS Policies for anchors
CREATE POLICY "Users can view their own anchors"
  ON anchors FOR SELECT
  USING (user_id = auth.uid()::text);

CREATE POLICY "Users can create anchors"
  ON anchors FOR INSERT
  WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "Users can delete their own anchors"
  ON anchors FOR DELETE
  USING (user_id = auth.uid()::text);

-- Function to automatically update last_interaction_at on friendships
CREATE OR REPLACE FUNCTION update_friendship_interaction()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE friendships
  SET last_interaction_at = now()
  WHERE (user_id = NEW.sender_id AND friend_id = NEW.receiver_id)
     OR (user_id = NEW.receiver_id AND friend_id = NEW.sender_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update friendship interaction when nudge is sent
CREATE TRIGGER nudge_updates_friendship
  AFTER INSERT ON nudges
  FOR EACH ROW
  EXECUTE FUNCTION update_friendship_interaction();

-- Function to handle nudge rate limiting
CREATE OR REPLACE FUNCTION check_nudge_limit()
RETURNS TRIGGER AS $$
DECLARE
  current_count INT;
BEGIN
  -- Get current nudge count for today
  SELECT count INTO current_count
  FROM nudge_limits
  WHERE sender_id = NEW.sender_id
    AND receiver_id = NEW.receiver_id
    AND date = CURRENT_DATE;

  -- If no record exists, create one
  IF current_count IS NULL THEN
    INSERT INTO nudge_limits (sender_id, receiver_id, date, count)
    VALUES (NEW.sender_id, NEW.receiver_id, CURRENT_DATE, 1);
    RETURN NEW;
  END IF;

  -- Check if limit exceeded (3 nudges per friend per day)
  IF current_count >= 3 THEN
    RAISE EXCEPTION 'Nudge limit exceeded for today';
  END IF;

  -- Increment count
  UPDATE nudge_limits
  SET count = count + 1
  WHERE sender_id = NEW.sender_id
    AND receiver_id = NEW.receiver_id
    AND date = CURRENT_DATE;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to check nudge limit before inserting
CREATE TRIGGER check_nudge_limit_trigger
  BEFORE INSERT ON nudges
  FOR EACH ROW
  EXECUTE FUNCTION check_nudge_limit();

-- Function to auto-expire flares
CREATE OR REPLACE FUNCTION cleanup_expired_flares()
RETURNS void AS $$
BEGIN
  DELETE FROM flares
  WHERE expires_at < now();
END;
$$ LANGUAGE plpgsql;

-- Create a function to sync auth.users with public.users
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, phone, display_name)
  VALUES (
    NEW.id,
    NEW.phone,
    COALESCE(NEW.raw_user_meta_data->>'display_name', 'User')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create user profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();
