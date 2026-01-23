# Nūūky Setup Guide

## Current Status

✅ Expo project initialized with TypeScript
✅ Core dependencies installed
✅ Project structure created
✅ App configuration set up
⏳ Waiting for Supabase credentials

## Next Steps

### 1. Create Supabase Project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Select your **CRAX** organization
3. Click **"New Project"**
4. Project name: **Nūūky**
5. Choose a strong database password (save it!)
6. Select region (choose closest to target users)
7. Click **"Create new project"**

### 2. Get Supabase Credentials

Once your project is created:

1. Go to **Project Settings** → **API**
2. Copy the following:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **Anon/Public Key** (the `anon` `public` key)

### 3. Configure Environment Variables

1. Copy the example file:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and add your Supabase credentials:
   ```bash
   EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   EXPO_PUBLIC_LIVEKIT_URL=  # Leave empty for now
   ```

### 4. Set Up Database Schema

Once you provide the credentials, we'll create all the necessary tables:
- `users` - User profiles and presence
- `friendships` - Friend connections with visibility controls
- `rooms` - Voice chat rooms
- `room_participants` - Who's in each room
- `flares` - SOS signals
- `nudges` - Gentle notifications
- `nudge_limits` - Rate limiting
- `blocks` - Privacy controls
- `reports` - Safety reporting
- `anchors` - Trusted contacts

### 5. Enable Supabase Auth

In your Supabase dashboard:
1. Go to **Authentication** → **Providers**
2. Enable **Phone** provider
3. Configure Twilio or another SMS provider for OTP

### 6. Enable Realtime

In your Supabase dashboard:
1. Go to **Database** → **Replication**
2. Enable realtime for these tables:
   - `users`
   - `room_participants`
   - `flares`

## Project Structure

```
nooke/
├── app/                    # Expo Router pages
│   ├── auth/              # Login & verification screens
│   └── main/              # Main app screens
├── components/            # Reusable components
├── lib/                   # Core utilities
│   └── supabase.ts       # Supabase client (configured)
├── hooks/                # Custom React hooks
├── stores/               # Zustand state management
│   └── appStore.ts       # Main app store (configured)
├── types/                # TypeScript types
│   └── index.ts          # All types defined
└── app.config.js         # Expo config with env vars
```

## What's Already Done

- ✅ TypeScript types for all database entities
- ✅ Zustand store with auth and friends state
- ✅ Supabase client configuration
- ✅ Environment variable setup
- ✅ App configuration with Expo Router

## Ready to Continue?

Once you provide your Supabase URL and Anon Key, we can:
1. Create the database schema
2. Implement phone OTP authentication
3. Build the navigation structure
4. Create the Orbit View UI
5. Add real-time presence

Let me know when you have the credentials!
