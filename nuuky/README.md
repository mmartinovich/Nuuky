# Nūūky - Ambient Presence App

Feel connected without the pressure of communicating.

## Current Status: Phase 1 - Foundation ✅

### Completed

- ✅ Expo project initialized with TypeScript
- ✅ Core dependencies installed (Supabase, Zustand, Expo Router, etc.)
- ✅ Complete project structure created
- ✅ Database schema ready (10 tables with RLS)
- ✅ Phone OTP authentication implemented
- ✅ Navigation structure with Expo Router
- ✅ Basic Orbit View (home screen)
- ✅ Profile and Settings screens

### Next Steps

1. **Run Database Migration** (Required!)
   - Open [supabase/migrations/001_initial_schema.sql](supabase/migrations/001_initial_schema.sql:1-373)
   - Copy all SQL code
   - Go to https://supabase.com/dashboard/project/ezbamrqoewrbvdvbypyd
   - Click **SQL Editor** → **New Query**
   - Paste and run the migration

2. **Enable Phone Auth in Supabase**
   - Go to **Authentication** → **Providers**
   - Enable **Phone** provider
   - For testing: use built-in provider
   - For production: configure Twilio

3. **Enable Realtime**
   - Go to **Database** → **Replication**
   - Enable realtime for: `users`, `friendships`, `room_participants`, `flares`

## Project Structure

```
nooke/
├── app/                          # Expo Router
│   ├── (auth)/
│   │   ├── _layout.tsx          ✅ Auth layout
│   │   ├── login.tsx             ✅ Phone number entry
│   │   └── verify.tsx            ✅ OTP verification
│   ├── (main)/
│   │   ├── _layout.tsx          ✅ Main app layout
│   │   ├── index.tsx             ✅ Orbit View (home)
│   │   ├── profile.tsx           ✅ User profile
│   │   └── settings.tsx          ✅ App settings
│   └── _layout.tsx               ✅ Root layout with auth guard
├── components/                   (Empty - ready for components)
├── lib/
│   └── supabase.ts              ✅ Supabase client configured
├── hooks/                        (Empty - ready for hooks)
├── stores/
│   └── appStore.ts              ✅ Zustand store (auth + friends)
├── types/
│   └── index.ts                 ✅ All TypeScript types
├── supabase/
│   ├── migrations/
│   │   └── 001_initial_schema.sql ✅ Complete DB schema
│   └── README.md                 ✅ Setup instructions
├── .env                          ✅ Environment variables (configured)
├── .env.example                  ✅ Example template
└── app.config.js                 ✅ Expo config with env vars
```

## Running the App

1. **Start the development server:**
   ```bash
   npx expo start
   ```

2. **Run on iOS:**
   ```bash
   npx expo run:ios
   ```

3. **Run on Android:**
   ```bash
   npx expo run:android
   ```

## Features Implemented

### Authentication
- Phone number OTP login
- Auto-redirect based on auth state
- Session persistence
- User profile sync with Supabase

### Navigation
- Protected routes (auth guard)
- Tab-based navigation ready
- Modal presentations for profiles
- Smooth transitions

### Orbit View (Home Screen)
- Real-time friend presence
- Mood indicators with colors:
  - 😊 Green: Feeling good
  - 😐 Yellow: Neutral
  - 😔 Gray: Not great
  - 🆘 Purple: Reach out
- Online/offline status
- Pull to refresh

### Profile
- User information display
- Logout functionality

### Settings
- Privacy controls (placeholder)
- Notification settings (placeholder)
- About section

## Database Schema

### Tables Created
1. **users** - Profiles with mood and presence
2. **friendships** - Connections with visibility controls
3. **rooms** - Voice chat rooms
4. **room_participants** - Who's in each room
5. **flares** - SOS signals
6. **nudges** - Gentle notifications
7. **nudge_limits** - Rate limiting (3/day per friend)
8. **blocks** - Privacy/safety controls
9. **reports** - Safety reporting
10. **anchors** - Trusted contacts

### Security
- Row Level Security (RLS) on all tables
- Users can only access their own data and friends' data
- Silent blocks (blocked user never knows)
- Rate limiting enforced at database level

## What's Next (Phase 1 Remaining)

- [ ] Add friend by phone number
- [ ] Accept/decline friend requests
- [ ] Send nudges with haptic feedback
- [ ] Basic mood picker
- [ ] Update online presence

## Tech Stack

- **Frontend:** React Native + Expo
- **Language:** TypeScript
- **Navigation:** Expo Router
- **State:** Zustand
- **Backend:** Supabase (PostgreSQL)
- **Auth:** Supabase Auth (Phone OTP)
- **Realtime:** Supabase Realtime
- **Notifications:** Expo Notifications

## Environment Variables

Make sure your `.env` file contains:
```bash
EXPO_PUBLIC_SUPABASE_URL=https://ezbamrqoewrbvdvbypyd.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
EXPO_PUBLIC_LIVEKIT_URL=  # For Phase 3
```

## Important Notes

1. **Phone OTP won't work until you enable Phone Auth in Supabase**
2. **Database migration must be run before first login**
3. **Realtime features require enabling replication in Supabase**
4. **Test on real devices for haptics and notifications**

## Development Workflow

1. Run database migration (one-time)
2. Enable Phone Auth in Supabase
3. Start Expo dev server
4. Test login flow with your phone number
5. Build additional features incrementally

## Troubleshooting

**Can't login?**
- Check if Phone Auth is enabled in Supabase
- Verify your phone number format (+1234567890)
- Check Supabase logs for errors

**"User not found" error?**
- Run the database migration
- Check if the trigger `on_auth_user_created` exists
- Verify RLS policies are enabled

**Friends not showing?**
- Enable Realtime for `users` and `friendships` tables
- Check if friendships have `status='accepted'`
- Refresh the Orbit View (pull down)

## Contributing

Follow the [CURSOR_BUILD_PLAN.md](../CURSOR_BUILD_PLAN.md) for detailed feature specifications and implementation phases.

## Support

For issues, check:
1. [supabase/README.md](supabase/README.md) - Database setup
2. [SETUP.md](SETUP.md) - Initial setup guide
3. Supabase dashboard logs
4. Expo development console
