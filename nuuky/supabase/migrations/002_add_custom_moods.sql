-- Create custom_moods table for user-created custom mood statuses
CREATE TABLE custom_moods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  text VARCHAR(50) NOT NULL,
  color VARCHAR(7) DEFAULT '#3B82F6',
  created_at TIMESTAMPTZ DEFAULT now(),
  last_used_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT emoji_max_length CHECK (length(emoji) <= 10),
  CONSTRAINT text_max_length CHECK (length(text) <= 50),
  CONSTRAINT text_min_length CHECK (length(text) >= 1)
);

-- Create indexes for efficient queries
CREATE INDEX idx_custom_moods_user_id ON custom_moods(user_id);
CREATE INDEX idx_custom_moods_last_used ON custom_moods(user_id, last_used_at DESC);

-- Add custom_mood_id column to users table
ALTER TABLE users ADD COLUMN custom_mood_id UUID REFERENCES custom_moods(id) ON DELETE SET NULL;
CREATE INDEX idx_users_custom_mood_id ON users(custom_mood_id);

-- Enable Row Level Security
ALTER TABLE custom_moods ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their own custom moods
CREATE POLICY "Users can view their own custom moods"
  ON custom_moods FOR SELECT
  USING (user_id = auth.uid()::text);

-- RLS Policy: Users can view friends' custom moods
CREATE POLICY "Users can view friends' custom moods"
  ON custom_moods FOR SELECT
  USING (
    user_id IN (
      SELECT friend_id FROM friendships
      WHERE user_id = auth.uid()::text AND status = 'accepted'
      UNION
      SELECT user_id FROM friendships
      WHERE friend_id = auth.uid()::text AND status = 'accepted'
    )
  );

-- RLS Policy: Users can create their own custom moods
CREATE POLICY "Users can create their own custom moods"
  ON custom_moods FOR INSERT
  WITH CHECK (user_id = auth.uid()::text);

-- RLS Policy: Users can update their own custom moods
CREATE POLICY "Users can update their own custom moods"
  ON custom_moods FOR UPDATE
  USING (user_id = auth.uid()::text);

-- RLS Policy: Users can delete their own custom moods
CREATE POLICY "Users can delete their own custom moods"
  ON custom_moods FOR DELETE
  USING (user_id = auth.uid()::text);

-- Trigger function to enforce 5 custom moods limit per user
CREATE OR REPLACE FUNCTION check_custom_mood_limit()
RETURNS TRIGGER AS $$
DECLARE
  mood_count INT;
BEGIN
  SELECT COUNT(*) INTO mood_count
  FROM custom_moods
  WHERE user_id = NEW.user_id;

  IF mood_count >= 5 THEN
    RAISE EXCEPTION 'Maximum 5 custom moods allowed per user';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_custom_mood_limit_trigger
  BEFORE INSERT ON custom_moods
  FOR EACH ROW
  EXECUTE FUNCTION check_custom_mood_limit();

-- Trigger function to update last_used_at when custom mood is set on user
CREATE OR REPLACE FUNCTION update_custom_mood_usage()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.custom_mood_id IS NOT NULL AND (OLD.custom_mood_id IS NULL OR OLD.custom_mood_id != NEW.custom_mood_id) THEN
    UPDATE custom_moods
    SET last_used_at = now()
    WHERE id = NEW.custom_mood_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_custom_mood_usage_trigger
  AFTER UPDATE OF custom_mood_id ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_custom_mood_usage();
