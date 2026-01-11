# Dev Authentication Setup Guide

## ✅ What's Been Done

1. **Updated Login Screen** - Added password-based authentication with two options:
   - ⚡ **Quick Dev Login** button - One-click login with `dev@nooke.app` / `devpass123`
   - **Custom Account** - Create/login with any email/password (no verification needed)

2. **Applied Database Migration** - Updated the `handle_new_user` trigger to support password auth

## 🔧 Required: Disable Email Confirmation in Supabase

To enable instant login without email verification, you need to update your Supabase project settings:

### Steps:

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Navigate to **Authentication** → **Settings** (left sidebar)
4. Scroll down to **Email Auth** section
5. Find **"Confirm email"** toggle and **DISABLE** it
6. Click **Save** at the bottom

### Alternative: Using Supabase CLI

If you prefer using the CLI, you can also disable email confirmation with:

```bash
# This would require updating your supabase/config.toml
# But it's easier to just toggle it in the dashboard
```

## 🚀 How to Use

### Option 1: Quick Dev Login (Recommended)
1. Open the app
2. Tap **"+ Dev Login (Testing)"**
3. Tap the **"⚡ Quick Dev Login"** button
4. You're instantly logged in!

### Option 2: Custom Account
1. Open the app
2. Tap **"+ Dev Login (Testing)"**
3. Enter any email and password
4. Tap **"Sign In / Sign Up"**
5. If the account doesn't exist, it will be created automatically
6. You're logged in instantly!

## 📝 Notes

- The Quick Dev Login uses: `dev@nooke.app` / `devpass123`
- Accounts are auto-created on first login attempt
- No email verification required
- Works offline after first login (session is cached)
- For production, you'll want to re-enable email confirmation

## 🔐 Security Note

This setup is **ONLY for development**. Before deploying to production:
1. Re-enable email confirmation in Supabase
2. Consider removing the dev login UI
3. Use proper OAuth flows (Google, Apple)
