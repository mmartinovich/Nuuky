-- WARNING: Replace YOUR_PROJECT_REF and YOUR_CRON_SECRET with actual values before uncommenting the SQL below.
-- YOUR_PROJECT_REF: Found in Supabase Dashboard -> Project Settings -> General
-- YOUR_CRON_SECRET: A dedicated secret for cron job authentication (set as an edge function secret)
--
-- Setup cron job for streak fading notifications
-- Runs every 4 hours to check for fading streaks and send push notifications
--
-- NOTE: This requires the pg_cron extension to be enabled in Supabase
-- The cron job calls the check-streak-notifications edge function
--
-- To set up manually in the Supabase Dashboard:
-- 1. Go to Database > Extensions and enable pg_cron
-- 2. Go to Database > Cron Jobs
-- 3. Create a new job with the following settings:
--    - Name: check-streak-notifications
--    - Schedule: 0 */4 * * * (every 4 hours)
--    - Command: Run the edge function via HTTP
--
-- Alternatively, use the SQL below after enabling pg_cron:

-- Enable pg_cron extension (if not already enabled)
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the job (runs every 4 hours at minute 0)
-- SELECT cron.schedule(
--   'check-streak-notifications',
--   '0 */4 * * *',
--   $$
--   SELECT net.http_post(
--     url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/check-streak-notifications',
--     headers := '{"Authorization": "Bearer YOUR_CRON_SECRET", "Content-Type": "application/json"}'::jsonb,
--     body := '{}'::jsonb
--   );
--   $$
-- );

-- To test manually, run:
-- curl -X POST https://YOUR_PROJECT_REF.supabase.co/functions/v1/check-streak-notifications \
--   -H "Authorization: Bearer YOUR_CRON_SECRET" \
--   -H "Content-Type: application/json"

COMMENT ON TABLE streaks IS 'Tracks interaction streaks between users. The check-streak-notifications edge function runs every 4 hours to notify users of fading streaks.';
