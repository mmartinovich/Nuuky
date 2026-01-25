# Anchor Inactivity Notification Setup

**⚠️ NOTE:** This guide is now superseded by [NOTIFICATION_SYSTEM_SETUP.md](NOTIFICATION_SYSTEM_SETUP.md) which covers ALL notification types.

This guide explains how to deploy and configure the anchor inactivity notification system that alerts users' safety anchors when they've been inactive for 48+ hours.

## Overview

The system consists of:
1. **Supabase Edge Function** - Checks for inactive users and sends notifications
2. **Expo Push Helper** - Sends push notifications via Expo Push Service (NOT FCM)
3. **Cron Trigger** - Runs the check automatically every hour

---

## Prerequisites

- Supabase CLI installed: `npm install -g supabase`
- ~~Firebase project with FCM enabled~~ **No longer needed! Using Expo Push Service**
- ~~FCM Server Key from Firebase Console~~ **No longer needed!**

---

## Step 1: Configure Environment Variables

**No additional environment variables needed!** Expo Push Service works without API keys.

The Edge Function only needs the standard Supabase environment variables which are automatically set:
- `SUPABASE_URL` (auto-set)
- `SUPABASE_SERVICE_ROLE_KEY` (auto-set)

---

## Step 2: Deploy the Edge Function

From your project root:

```bash
# Login to Supabase (if not already logged in)
supabase login

# Link your project
supabase link --project-ref YOUR_PROJECT_REF

# Deploy the function
supabase functions deploy check-anchor-notifications
```

---

## Step 3: Set Up Cron Trigger

You have two options for scheduling the function:

### Option A: Using Supabase Cron (Recommended)

Create a database migration to set up pg_cron:

```sql
-- File: supabase/migrations/setup_anchor_cron.sql

-- Enable pg_cron extension
create extension if not exists pg_cron;

-- Grant usage
grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;

-- Schedule the function to run every hour
select
  cron.schedule(
    'check-anchor-notifications',
    '0 * * * *', -- Every hour at minute 0
    $$
    select
      net.http_post(
        url:='https://YOUR_PROJECT_REF.supabase.co/functions/v1/check-anchor-notifications',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb
      ) as request_id;
    $$
  );
```

Apply the migration:
```bash
supabase db push
```

### Option B: Using External Cron Service

Use a service like [cron-job.org](https://cron-job.org) or GitHub Actions:

**Example with GitHub Actions:**

Create `.github/workflows/anchor-check.yml`:

```yaml
name: Check Anchor Notifications

on:
  schedule:
    - cron: '0 * * * *'  # Every hour
  workflow_dispatch:  # Allow manual trigger

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - name: Call Edge Function
        run: |
          curl -X POST \
            https://YOUR_PROJECT_REF.supabase.co/functions/v1/check-anchor-notifications \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_SERVICE_KEY }}" \
            -H "Content-Type: application/json"
```

---

## Step 4: Test the Function

### Manual Test via CLI:

```bash
# Test locally
supabase functions serve check-anchor-notifications

# In another terminal, trigger it
curl -i --location --request POST 'http://localhost:54321/functions/v1/check-anchor-notifications' \
  --header 'Authorization: Bearer YOUR_SERVICE_KEY' \
  --header 'Content-Type: application/json'
```

### Test in Production:

```bash
curl -i --location --request POST 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/check-anchor-notifications' \
  --header 'Authorization: Bearer YOUR_SERVICE_ROLE_KEY' \
  --header 'Content-Type: application/json'
```

---

## Step 5: Verify the Setup

1. **Check Function Logs:**
   - Go to Supabase Dashboard → Edge Functions → check-anchor-notifications → Logs
   - Look for messages like:
     ```
     Found X inactive users
     ✓ Notified anchor John about Jane
     ```

2. **Create a Test Scenario:**
   - Set a test user's `last_seen_at` to 49 hours ago:
     ```sql
     update users
     set last_seen_at = now() - interval '49 hours'
     where id = 'test-user-id';
     ```
   - Manually trigger the function
   - Check if the anchor receives a push notification

---

## Monitoring & Troubleshooting

### Check Cron Jobs:
```sql
select * from cron.job;
select * from cron.job_run_details order by start_time desc limit 10;
```

### Function Logs:
- Supabase Dashboard → Edge Functions → Logs
- Look for errors or success messages

### Common Issues:

1. **No notifications sent:**
   - Verify FCM_SERVER_KEY is set correctly
   - Check that users have `fcm_token` in database
   - Verify FCM tokens are valid

2. **Function not running on schedule:**
   - Check cron job is created: `select * from cron.job;`
   - Verify cron extension is enabled
   - Check for errors in `cron.job_run_details`

3. **Database errors:**
   - Ensure service role key has proper permissions
   - Check RLS policies don't block the service role

---

## Notification Format

When a user is inactive for 48+ hours, their anchors receive:

```
Title: ⚓ Anchor Alert
Body: [User Name] has been inactive for X hours. You might want to check in on them.
Data:
  - type: anchor_inactivity
  - user_id: [inactive user's ID]
  - user_name: [inactive user's name]
  - hours_inactive: [number of hours]
```

---

## Customization

### Change Check Frequency:

Edit the cron schedule in the migration:
- Every hour: `'0 * * * *'`
- Every 6 hours: `'0 */6 * * *'`
- Every 12 hours: `'0 */12 * * *'`
- Daily at 9 AM: `'0 9 * * *'`

### Change Inactivity Threshold:

Edit `check-anchor-notifications/index.ts`:
```typescript
const INACTIVITY_THRESHOLD_HOURS = 72; // Change to 72 hours
```

Redeploy:
```bash
supabase functions deploy check-anchor-notifications
```

---

## Security Considerations

- ✅ Service role key is kept in Supabase secrets (not in code)
- ✅ FCM server key is stored as a secret
- ✅ Function uses service role to bypass RLS (required for batch operations)
- ✅ Notifications only sent to designated anchors
- ⚠️ Consider adding rate limiting to prevent notification spam

---

## Next Steps

- [ ] Deploy the function to production
- [ ] Set up cron trigger
- [ ] Test with real users
- [ ] Monitor function logs for first 24 hours
- [ ] Consider adding email notifications as backup
- [ ] Add notification preferences (allow users to configure frequency)
