# Supabase Database Setup

## Running the Migration

### Option 1: Using Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard: https://supabase.com/dashboard
2. Navigate to **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy the entire contents of `migrations/001_initial_schema.sql`
5. Paste it into the SQL editor
6. Click **Run** (or press Cmd/Ctrl + Enter)

### Option 2: Using Supabase CLI

If you have the Supabase CLI installed:

```bash
# Link to your project
supabase link --project-ref ezbamrqoewrbvdvbypyd

# Run the migration
supabase db push
```

## What This Migration Creates

### Tables
- ✅ **users** - User profiles with presence and mood
- ✅ **friendships** - Friend connections with visibility controls
- ✅ **rooms** - Voice chat rooms
- ✅ **room_participants** - Who's in each room
- ✅ **flares** - SOS signals
- ✅ **nudges** - Gentle notifications between friends
- ✅ **nudge_limits** - Rate limiting (3 per friend per day)
- ✅ **blocks** - Privacy controls (mute, soft, hard)
- ✅ **reports** - Safety reporting system
- ✅ **anchors** - Trusted safety contacts

### Security Features
- ✅ Row Level Security (RLS) enabled on all tables
- ✅ Policies to ensure users only access their own data and friends' data
- ✅ Automatic user profile creation on signup
- ✅ Rate limiting for nudges (3 per friend per day)
- ✅ Auto-cleanup of expired flares

### Triggers & Functions
- ✅ Auto-update friendship interaction timestamp on nudge
- ✅ Nudge rate limit enforcement
- ✅ Flare expiration cleanup
- ✅ User profile auto-creation from auth.users

## Next Steps After Migration

### 1. Enable Phone Authentication

1. Go to **Authentication** → **Providers** in your Supabase dashboard
2. Enable **Phone** provider
3. For testing, you can use the built-in provider
4. For production, configure Twilio:
   - Get Twilio Account SID and Auth Token
   - Add them to Supabase Auth settings

### 2. Enable Realtime

1. Go to **Database** → **Replication** in your Supabase dashboard
2. Enable realtime for these tables (click the toggle):
   - ✅ users
   - ✅ room_participants
   - ✅ flares
   - ✅ friendships

This enables real-time presence updates and live room participant tracking.

### 3. Storage Setup (Optional for now)

For user avatars later:
1. Go to **Storage** in your Supabase dashboard
2. Create a new bucket called `avatars`
3. Set it to **Public**
4. Add RLS policies for upload/delete

## Testing the Schema

You can test the schema by running some sample queries:

```sql
-- Create a test user (normally done via auth signup)
INSERT INTO users (phone, display_name, mood)
VALUES ('+1234567890', 'Test User', 'good');

-- Check if user was created
SELECT * FROM users;

-- Test friendship creation
INSERT INTO friendships (user_id, friend_id, status)
VALUES (
  (SELECT id FROM users LIMIT 1),
  (SELECT id FROM users LIMIT 1 OFFSET 1),
  'pending'
);
```

## Schema Diagram

```
users
  ├── friendships (user_id → users.id)
  ├── rooms (creator_id → users.id)
  ├── room_participants (user_id → users.id)
  ├── flares (user_id → users.id)
  ├── nudges (sender_id, receiver_id → users.id)
  ├── blocks (blocker_id, blocked_id → users.id)
  ├── reports (reporter_id, reported_id → users.id)
  └── anchors (user_id, anchor_id → users.id)
```

## Migration Status

- [x] Initial schema created
- [ ] Phone auth enabled
- [ ] Realtime enabled for key tables
- [ ] Storage bucket created for avatars
