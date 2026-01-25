# Complete Notification System Setup Guide

This guide covers the deployment and configuration of the complete Expo Push Notification system for Nūūky.

## Overview

The notification system includes:
1. **Nudge Notifications** - Friend-to-friend gentle pings
2. **Flare Notifications** - SOS alerts to all friends (stronger for anchors)
3. **Room Invitations** - Invites to join voice rooms
4. **Anchor Inactivity Alerts** - Notify anchors when user is inactive 48+ hours

---

## Architecture

```
App (Client)
    ↓ writes to DB
Database (Supabase)
    ↓ triggers
Edge Functions
    ↓ calls
Expo Push Service
    ↓ delivers to
User Devices
```

**Key Points:**
- Uses **Expo Push Notification service** (free for <600/hr)
- Edge Functions run serverless on Supabase
- Notifications sent asynchronously (won't block user actions)
- Graceful failure (app works even if notifications fail)

---

## Prerequisites

1. **Supabase CLI** installed:
   ```bash
   npm install -g supabase
   ```

2. **Supabase project** set up (you already have this)

3. **Expo push tokens** being collected in the app (already done in `lib/notifications.ts`)

---

## Step 1: Deploy All Edge Functions

From your project root (`/Users/crax/DEVELOPMENT/Nuuky/nuuky/`):

```bash
# Login to Supabase (if not already)
supabase login

# Link your project
supabase link --project-ref YOUR_PROJECT_REF

# Deploy all notification functions
supabase functions deploy send-nudge-notification
supabase functions deploy send-flare-notification
supabase functions deploy send-room-invite-notification
supabase functions deploy check-anchor-notifications
```

### Verify Deployment

1. Go to Supabase Dashboard → Edge Functions
2. You should see all 4 functions listed
3. Check that each function has a green "deployed" status

---

## Step 2: Set Up Anchor Inactivity Cron Job

### Update the Migration File

Edit `supabase/migrations/setup_anchor_cron.sql`:

Replace these placeholders:
- `YOUR_PROJECT_REF` → Your Supabase project reference (e.g., `xyzabc123`)
- `YOUR_SERVICE_ROLE_KEY` → Your service role key from Supabase Dashboard

### Apply the Migration

```bash
supabase db push
```

### Verify Cron Job

```sql
-- Check cron job was created
select * from cron.job;

-- Should show:
-- jobname: check-anchor-notifications
-- schedule: 0 * * * * (every hour)
```

---

## Step 3: Test Each Notification Type

### 3.1 Test Nudge Notifications

**Via the App:**
1. Make sure you have push tokens saved (check `users.fcm_token`)
2. Send a nudge to a friend
3. Friend should receive: "👋 Nudge from [Your Name]"

**Manual Test (via cURL):**
```bash
curl -X POST \
  'https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-nudge-notification' \
  -H 'Authorization: Bearer YOUR_SERVICE_ROLE_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "receiver_id": "user-uuid-here",
    "sender_id": "sender-uuid-here"
  }'
```

### 3.2 Test Flare Notifications

**Via the App:**
1. Send a flare (tap flare button)
2. All your friends should receive: "🚨 Flare from [Your Name]"
3. Your anchors should receive stronger notification: "🚨 FLARE from [Your Name]"

**Manual Test:**
```bash
curl -X POST \
  'https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-flare-notification' \
  -H 'Authorization: Bearer YOUR_SERVICE_ROLE_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "user_id": "user-uuid-here",
    "flare_id": "flare-uuid-here"
  }'
```

### 3.3 Test Room Invitations

**Via the App:**
1. Create or join a room
2. Invite friends to the room
3. They should receive: "🎙️ Room Invite from [Your Name]"

**Manual Test:**
```bash
curl -X POST \
  'https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-room-invite-notification' \
  -H 'Authorization: Bearer YOUR_SERVICE_ROLE_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "room_id": "room-uuid-here",
    "sender_id": "sender-uuid-here",
    "receiver_ids": ["receiver-uuid-1", "receiver-uuid-2"]
  }'
```

### 3.4 Test Anchor Inactivity

**Set Up Test Scenario:**
```sql
-- Set a user's last_seen_at to 49 hours ago
update users
set last_seen_at = now() - interval '49 hours'
where id = 'test-user-uuid';

-- Verify they have anchors
select * from anchors where user_id = 'test-user-uuid';
```

**Trigger Manually:**
```bash
curl -X POST \
  'https://YOUR_PROJECT_REF.supabase.co/functions/v1/check-anchor-notifications' \
  -H 'Authorization: Bearer YOUR_SERVICE_ROLE_KEY' \
  -H 'Content-Type: application/json'
```

**Expected Result:**
- Anchors receive: "⚓ Anchor Alert: [User] has been inactive for 49 hours"

---

## Step 4: Monitor & Debug

### View Edge Function Logs

**Via Dashboard:**
1. Supabase Dashboard → Edge Functions
2. Click on function name → Logs tab
3. See real-time execution logs

**Via CLI:**
```bash
supabase functions logs send-nudge-notification --tail
supabase functions logs send-flare-notification --tail
```

### Check Notification Delivery

**Common Issues:**

1. **"No push token found"**
   - User hasn't granted notification permissions
   - Token not saved to database
   - Check: `select id, display_name, fcm_token from users;`

2. **"Invalid Expo push token"**
   - Token format is wrong (should start with `ExponentPushToken[`)
   - Token expired (regenerate on app launch)

3. **Edge Function errors**
   - Check function logs for stack traces
   - Verify environment variables are set
   - Check RLS policies allow service role access

### Debugging Queries

```sql
-- Check who has push tokens
select
  display_name,
  fcm_token is not null as has_token,
  substring(fcm_token, 1, 30) as token_preview
from users
limit 10;

-- Check recent nudges
select
  s.display_name as sender,
  r.display_name as receiver,
  n.created_at
from nudges n
join users s on s.id = n.sender_id
join users r on r.id = n.receiver_id
order by n.created_at desc
limit 10;

-- Check cron job runs
select * from cron.job_run_details
order by start_time desc
limit 10;
```

---

## Cost Analysis (for 500 users)

### Expo Push Service Pricing

**Free Tier:** 600 notifications/hour = ~432,000/month

**Estimated Usage (500 users):**
- Nudges: ~75,000/month (500 users × 5 nudges/day × 30 days)
- Flares: ~5,000/month (500 users × 0.33 flares/day × 30 days)
- Room invites: ~30,000/month
- Anchor alerts: ~2,000/month

**Total:** ~112,000/month = **FREE** (well within 432k limit)

**After Free Tier:** $0.00025/notification = ~$28/month for 112k notifications

### Supabase Edge Functions

**Free Tier:** 2 million invocations/month
**Your Usage:** ~112,000/month = **FREE**

---

## Notification Payload Reference

### Nudge
```json
{
  "title": "👋 Nudge from Alex",
  "body": "Alex is thinking of you",
  "data": {
    "type": "nudge",
    "sender_id": "uuid",
    "sender_name": "Alex"
  }
}
```

### Flare (Regular Friend)
```json
{
  "title": "🚨 Flare from Alex",
  "body": "Alex sent a flare. They might need company or support.",
  "data": {
    "type": "flare",
    "user_id": "uuid",
    "user_name": "Alex",
    "flare_id": "uuid",
    "is_anchor": "false"
  }
}
```

### Flare (Anchor)
```json
{
  "title": "🚨 FLARE from Alex",
  "body": "Alex needs support right now. They sent a flare.",
  "data": {
    "type": "flare",
    "user_id": "uuid",
    "user_name": "Alex",
    "flare_id": "uuid",
    "is_anchor": "true"
  }
}
```

### Room Invite
```json
{
  "title": "🎙️ Room Invite from Alex",
  "body": "Alex invited you to join Chill Hangout",
  "data": {
    "type": "room_invite",
    "room_id": "uuid",
    "room_name": "Chill Hangout",
    "sender_id": "uuid",
    "sender_name": "Alex"
  }
}
```

### Anchor Inactivity
```json
{
  "title": "⚓ Anchor Alert",
  "body": "Alex has been inactive for 52 hours. You might want to check in on them.",
  "data": {
    "type": "anchor_inactivity",
    "user_id": "uuid",
    "user_name": "Alex",
    "hours_inactive": "52"
  }
}
```

---

## Customization

### Change Notification Frequency (Anchor Checks)

Edit `setup_anchor_cron.sql`:
- Every hour: `'0 * * * *'` (current)
- Every 6 hours: `'0 */6 * * *'`
- Every 12 hours: `'0 */12 * * *'`
- Daily at 9 AM: `'0 9 * * *'`

Re-apply migration:
```bash
supabase db push
```

### Change Inactivity Threshold

Edit `check-anchor-notifications/index.ts`:
```typescript
const INACTIVITY_THRESHOLD_HOURS = 72; // Change from 48 to 72
```

Redeploy:
```bash
supabase functions deploy check-anchor-notifications
```

---

## Troubleshooting

### Issue: Notifications Not Sending

**Check:**
1. Edge Functions deployed? `supabase functions list`
2. Push tokens saved? `select fcm_token from users limit 5;`
3. Function logs for errors? Dashboard → Edge Functions → Logs
4. Auth session valid? (hooks call `supabase.auth.getSession()`)

### Issue: Cron Job Not Running

**Check:**
```sql
-- Is cron enabled?
select * from pg_extension where extname = 'pg_cron';

-- Job exists?
select * from cron.job;

-- Recent runs?
select * from cron.job_run_details order by start_time desc limit 5;
```

**Fix:**
```bash
# Re-apply migration
supabase db push
```

### Issue: "Invalid push token" Error

**Expo tokens must:**
- Start with `ExponentPushToken[`
- End with `]`
- Be valid (not expired)

**Fix:**
```typescript
// In app, force token refresh
import { registerForPushNotificationsAsync } from './lib/notifications';
const newToken = await registerForPushNotificationsAsync();
await savePushTokenToUser(userId, newToken);
```

---

## Next Steps

After deploying:

1. **Test all 4 notification types** in a real device
2. **Monitor Edge Function logs** for first 24 hours
3. **Check Expo delivery receipts** (optional, for production)
4. **Set up error alerts** (Supabase → Integrations → Webhooks)
5. **Consider adding** email fallback for critical notifications

---

## Support

- **Expo Push Documentation:** https://docs.expo.dev/push-notifications/overview/
- **Supabase Edge Functions:** https://supabase.com/docs/guides/functions
- **Cron Syntax:** https://crontab.guru/

---

**Status:** ✅ Complete notification system ready for deployment!
