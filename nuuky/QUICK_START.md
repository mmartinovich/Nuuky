# Quick Start Guide

## 🚀 Get Nūūky Running in 5 Minutes

### Step 1: Run Database Migration (REQUIRED)

1. Go to https://supabase.com/dashboard/project/ezbamrqoewrbvdvbypyd/sql/new
2. Open `supabase/migrations/001_initial_schema.sql` in your editor
3. Copy ALL the SQL code (Cmd/Ctrl + A, then Cmd/Ctrl + C)
4. Paste into Supabase SQL Editor
5. Click **Run** or press Cmd/Ctrl + Enter
6. Wait for success message

### Step 2: Enable Phone Authentication

1. Go to https://supabase.com/dashboard/project/ezbamrqoewrbvdvbypyd/auth/providers
2. Find **Phone** in the providers list
3. Toggle it **ON**
4. Click **Save**

For testing, the built-in SMS provider works fine. For production, you'll need Twilio.

### Step 3: Enable Realtime (Optional but Recommended)

1. Go to https://supabase.com/dashboard/project/ezbamrqoewrbvdvbypyd/database/replication
2. Find these tables and toggle realtime **ON**:
   - ✅ `users`
   - ✅ `friendships`
   - ✅ `room_participants`
   - ✅ `flares`

### Step 4: Start the App

```bash
cd /Users/crax/DEVELOPMENT/Nūūky/nooke
npx expo start
```

Press:
- `i` for iOS Simulator
- `a` for Android Emulator
- Scan QR code with Expo Go app on your phone

### Step 5: Test Login

1. Enter your phone number (format: +1234567890)
2. Check your phone for SMS code
3. Enter the 6-digit code
4. You're in!

## ✅ What You Should See

**On First Launch:**
1. Login screen asking for phone number
2. Verify screen after you enter your number
3. Orbit View (home screen) after successful login
4. "No friends yet" empty state

**What Works:**
- ✅ Phone OTP login
- ✅ Session persistence (stays logged in)
- ✅ Profile screen (tap "Profile" button)
- ✅ Settings screen (tap "Settings" button)
- ✅ Logout functionality
- ✅ Automatic auth state management

## ⚠️ Troubleshooting

### "Failed to send OTP"
- Check if Phone Auth is enabled in Supabase
- Verify phone number format starts with `+`
- Check Supabase logs for errors

### "Failed to verify code"
- Make sure you entered the correct 6-digit code
- Try resending the code
- Check if SMS was received

### "User not found" / Can't load profile
- Run the database migration (Step 1)
- Check if migration was successful in Supabase
- Try logging out and back in

### App crashes on startup
- Make sure `package.json` has `"main": "expo-router/entry"`
- Clear Metro cache: `npx expo start -c`
- Restart Expo Go app

### Friends list not updating
- Enable Realtime for tables (Step 3)
- Check your internet connection
- Try pull-to-refresh on Orbit View

## 📱 Testing Flow

1. **Login** → Enter phone → Receive code → Verify → See Orbit View
2. **Profile** → Tap Profile button → See your info → Logout works
3. **Settings** → Tap Settings button → See settings options
4. **Persistence** → Close app → Reopen → Still logged in

## 🎯 Next Steps

Now that the foundation is working, you can:

1. **Add Friends** - Implement friend request flow
2. **Send Nudges** - Add haptic feedback
3. **Mood Picker** - Let users change their mood
4. **Real-time Updates** - See friends come online/offline
5. **Flares** - SOS signal to all friends
6. **Rooms** - Voice chat (Phase 3)

## 📚 Documentation

- [README.md](README.md) - Full project overview
- [supabase/README.md](supabase/README.md) - Database setup details
- [SETUP.md](SETUP.md) - Initial setup guide
- [../CURSOR_BUILD_PLAN.md](../CURSOR_BUILD_PLAN.md) - Complete feature spec

## 🆘 Need Help?

Check:
1. Supabase dashboard logs
2. Expo development console (Metro bundler)
3. React Native debugger (shake device → "Debug")

## 🎉 Success!

If you can login and see the Orbit View, Phase 1 foundation is complete!

Time to build the fun stuff. 🚀
