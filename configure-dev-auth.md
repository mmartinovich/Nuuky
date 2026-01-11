# Quick Configuration: Disable Email Confirmation

## 🎯 Goal
Allow instant login without email verification for development.

## ⚠️ IMPORTANT: This is Required!
The error "Database error saving new user" means email confirmation is still enabled. Follow these steps to fix it:

## ⚡ Quick Steps (2 minutes)

### Step 1: Open Supabase Dashboard
- Go to: https://supabase.com/dashboard
- Select your **Nooke** project
- Navigate to **Authentication** (left sidebar)
- Click **Settings**

Or direct link: `https://supabase.com/dashboard/project/YOUR_PROJECT_ID/auth/settings`

### Step 2: Disable Email Confirmation ⭐ CRITICAL
- Scroll down to the **"Email Auth"** section
- Find the **"Confirm email"** toggle switch
- **Turn it OFF** (toggle should move to the left and appear grey/disabled)
- **IMPORTANT**: Click the **"Save"** button at the bottom of the page
- Wait for the success message

### Step 3: Verify Email Provider is Enabled
- Still on the same settings page
- Scroll to **"Auth Providers"** section  
- Find **"Email"** in the list
- Make sure the toggle is **ON** (green/enabled)
- If it's off, turn it on and click **"Save"**

### Step 4: Test It
```bash
# Run your app
npm start

# In the app:
# 1. Tap "+ Dev Login (Testing)"
# 2. Tap "⚡ Quick Dev Login"
# 3. You should be logged in instantly!
```

## ✅ What This Does

- Users can sign up with email/password instantly
- No email verification step required
- Auto-creates accounts on first login
- Perfect for development and testing

## 🔄 Already Applied

✅ Database migration applied
✅ Login screen updated with Quick Dev Login
✅ Auto-signup functionality added
✅ Improved error handling with setup instructions

## 🎉 You're Done!

After disabling email confirmation in the dashboard, you can:
- Use **Quick Dev Login** for instant access (dev@nooke.app / devpass123)
- Create test accounts with any email/password
- No more waiting for email links!

## 🔧 Troubleshooting

### Error: "Database error saving new user"
- **Cause**: Email confirmation is still enabled
- **Fix**: Follow Step 2 above and make sure you clicked "Save"
- **Verify**: Try creating an account again after saving

### Error: "Email confirmation required"  
- **Cause**: The setting didn't save properly
- **Fix**: Go back to the dashboard, verify the toggle is OFF, and save again
- **Note**: Sometimes you need to refresh the dashboard page

### Quick Dev Login doesn't work
1. Make sure you completed all 3 steps above
2. Try restarting your app: `npm start`
3. Check the error message - it will guide you to the fix
4. If still stuck, check the Supabase logs in the dashboard

### Can't find the "Confirm email" toggle
- Make sure you're in: **Authentication** → **Settings** (not Providers)
- Scroll down to the "Email Auth" section (not at the top)
- It should be in a section with other email-related settings
