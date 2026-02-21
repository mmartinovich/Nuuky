-- Add profile_completed field to users table
-- This tracks whether a user has completed the first-time onboarding flow

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS profile_completed BOOLEAN DEFAULT false;

-- Set existing users to completed (they've already been using the app)
UPDATE users
  SET profile_completed = true
  WHERE profile_completed IS NULL OR profile_completed = false;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_profile_completed ON users(profile_completed);

-- Update handle_new_user trigger to set profile_completed to false for new users
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, phone, display_name, auth_provider, avatar_url, profile_completed)
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
    profile_completed = COALESCE(EXCLUDED.profile_completed, users.profile_completed);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
