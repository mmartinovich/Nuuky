-- Add username field to users table
-- Usernames are unique, lowercase, alphanumeric + underscores, 3-30 chars

-- Add username column (nullable initially for migration)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS username VARCHAR(30);

-- Function to generate a unique username from display_name or email
CREATE OR REPLACE FUNCTION generate_username(base_name TEXT, user_id UUID)
RETURNS TEXT AS $$
DECLARE
  clean_name TEXT;
  candidate TEXT;
  suffix INT := 0;
BEGIN
  -- Clean the base name: lowercase, replace spaces with underscores, remove non-alphanumeric
  clean_name := LOWER(REGEXP_REPLACE(base_name, '[^a-zA-Z0-9_]', '', 'g'));
  
  -- Ensure minimum length
  IF LENGTH(clean_name) < 3 THEN
    clean_name := 'user';
  END IF;
  
  -- Truncate to leave room for suffix
  clean_name := LEFT(clean_name, 24);
  
  -- Try the clean name first
  candidate := clean_name;
  
  -- Keep trying with incrementing suffix until we find a unique one
  WHILE EXISTS (SELECT 1 FROM users WHERE username = candidate AND id != user_id) LOOP
    suffix := suffix + 1;
    candidate := clean_name || suffix::TEXT;
  END LOOP;
  
  RETURN candidate;
END;
$$ LANGUAGE plpgsql;

-- Generate usernames for existing users who don't have one
UPDATE users
SET username = generate_username(
  COALESCE(display_name, SPLIT_PART(email, '@', 1), 'user'),
  id
)
WHERE username IS NULL;

-- Now make username NOT NULL and add constraints
ALTER TABLE users
  ALTER COLUMN username SET NOT NULL;

-- Add unique constraint
ALTER TABLE users
  ADD CONSTRAINT users_username_unique UNIQUE (username);

-- Add check constraint for valid username format
ALTER TABLE users
  ADD CONSTRAINT users_username_format 
  CHECK (username ~ '^[a-z0-9_]{3,30}$');

-- Create index for fast username lookups and prefix search
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_username_pattern ON users(username varchar_pattern_ops);

-- Update handle_new_user trigger to include username generation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  generated_username TEXT;
  base_name TEXT;
BEGIN
  -- Determine base name for username generation
  base_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'display_name',
    SPLIT_PART(COALESCE(NEW.email, 'user@example.com'), '@', 1),
    'user'
  );
  
  -- Generate unique username
  generated_username := generate_username(base_name, NEW.id);
  
  INSERT INTO public.users (id, email, phone, display_name, username, auth_provider, avatar_url, profile_completed)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.phone,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      NEW.raw_user_meta_data->>'display_name',
      SPLIT_PART(COALESCE(NEW.email, 'user@example.com'), '@', 1),
      'User'
    ),
    generated_username,
    CASE
      WHEN NEW.raw_app_meta_data->>'provider' = 'apple' THEN 'apple'
      WHEN NEW.raw_app_meta_data->>'provider' = 'google' THEN 'google'
      ELSE 'email'
    END,
    NEW.raw_user_meta_data->>'avatar_url',
    false  -- New users need to complete onboarding
  )
  ON CONFLICT (id) DO UPDATE SET
    email = COALESCE(EXCLUDED.email, users.email),
    auth_provider = EXCLUDED.auth_provider,
    avatar_url = COALESCE(EXCLUDED.avatar_url, users.avatar_url),
    username = COALESCE(users.username, EXCLUDED.username);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
