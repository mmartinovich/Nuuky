# How to Disable Email Confirmation in Supabase

## 🎯 The Issue
You're seeing "Email Confirmation Required" because Supabase still requires email verification.

## 📍 Where to Find the Setting (Updated for Modern Supabase)

The setting location depends on your Supabase dashboard version:

### Option 1: Check Under "Email Templates"
1. Go to **Authentication** → **Email Templates** (left sidebar)
2. Look at the top of the page for auth flow settings
3. There might be a "Confirm email" toggle there

### Option 2: Check Under "URL Configuration" 
1. Go to **Authentication** → **URL Configuration**
2. Look for email confirmation settings
3. There might be a "Double confirm email changes" or similar toggle

### Option 3: Auth Settings (Main Location)
1. Go to **Authentication** → **Settings**
2. Scroll to the **"User Signups"** or **"Email Auth"** section
3. Look for one of these settings:
   - **"Confirm email"**
   - **"Enable email confirmations"**  
   - **"Require email verification"**
4. **Disable it** and click **Save**

### Option 4: Providers Tab
1. Go to **Authentication** → **Providers**
2. Click on **"Email"**
3. Look for **"Confirm email"** toggle in the modal/panel that opens
4. Disable it and save

## 🔧 Alternative: Use Auto-Confirm for Dev Domain

If you can't find the toggle, we can auto-confirm emails for development:

1. Go to **SQL Editor** in your Supabase dashboard
2. Run this SQL:

```sql
-- Auto-confirm dev@nooke.app emails
CREATE OR REPLACE FUNCTION auto_confirm_dev_emails()
RETURNS TRIGGER AS $$
BEGIN
  -- Auto-confirm for dev emails
  IF NEW.email LIKE '%@nooke.app' OR NEW.email LIKE '%@test.com' THEN
    NEW.email_confirmed_at = NOW();
    NEW.confirmed_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to auto-confirm
DROP TRIGGER IF EXISTS auto_confirm_dev_trigger ON auth.users;
CREATE TRIGGER auto_confirm_dev_trigger
  BEFORE INSERT ON auth.users
  FOR EACH ROW
  WHEN (NEW.email_confirmed_at IS NULL)
  EXECUTE FUNCTION auto_confirm_dev_emails();
```

This will automatically confirm any email ending in `@nooke.app` or `@test.com`.

## 🚀 After Applying the Fix

Restart your app and try Quick Dev Login again!
