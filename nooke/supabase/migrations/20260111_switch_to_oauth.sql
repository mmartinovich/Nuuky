-- Switch from phone SMS auth to OAuth (Google/Apple)
-- Make phone column nullable (legacy field, keep for existing data)
ALTER TABLE users
  ALTER COLUMN phone DROP NOT NULL;

-- Add email column for OAuth users (required)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS email VARCHAR(255) UNIQUE;

-- Add auth_provider column to track sign-in method
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(20) DEFAULT 'google';

-- Update the unique constraint to allow null phones
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_phone_key;
CREATE UNIQUE INDEX users_phone_key ON users(phone) WHERE phone IS NOT NULL;

-- Update handle_new_user trigger for OAuth only
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, phone, display_name, auth_provider, avatar_url)
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
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = COALESCE(EXCLUDED.email, users.email),
    auth_provider = EXCLUDED.auth_provider,
    avatar_url = COALESCE(EXCLUDED.avatar_url, users.avatar_url);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
