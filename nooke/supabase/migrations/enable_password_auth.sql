-- Enable password-based authentication for development
-- This allows instant login without email verification

-- Note: To fully enable this, you need to update your Supabase project settings:
-- 1. Go to Authentication > Settings in your Supabase dashboard
-- 2. Under "Email Auth", disable "Confirm email"
-- 3. Under "Auth Providers", ensure "Email" provider is enabled

-- Update the handle_new_user trigger to work with password auth
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, display_name, auth_provider)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, NEW.raw_user_meta_data->>'email'),
    COALESCE(
      NEW.raw_user_meta_data->>'display_name',
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      SPLIT_PART(COALESCE(NEW.email, 'user@example.com'), '@', 1)
    ),
    COALESCE(NEW.app_metadata->>'provider', 'email')
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    display_name = COALESCE(EXCLUDED.display_name, users.display_name),
    auth_provider = COALESCE(EXCLUDED.auth_provider, users.auth_provider);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure the trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

COMMENT ON FUNCTION handle_new_user IS 'Creates user profile for all auth methods (OAuth, email/password, magic link)';
