-- Enable pg_cron extension for scheduled jobs
create extension if not exists pg_cron;

-- Grant necessary permissions
grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;

-- Schedule the anchor inactivity check function to run every hour
-- NOTE: Replace YOUR_PROJECT_REF with your actual Supabase project reference
-- NOTE: Replace YOUR_SERVICE_ROLE_KEY with your actual service role key
-- You can find both in your Supabase Dashboard → Project Settings

select
  cron.schedule(
    'check-anchor-notifications',           -- Job name
    '0 * * * *',                           -- Cron schedule (every hour at minute 0)
    $$
    select
      net.http_post(
        url:='https://YOUR_PROJECT_REF.supabase.co/functions/v1/check-anchor-notifications',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb
      ) as request_id;
    $$
  );

-- To verify the cron job was created, run:
-- select * from cron.job;

-- To check recent job runs:
-- select * from cron.job_run_details order by start_time desc limit 10;

-- To remove the cron job (if needed):
-- select cron.unschedule('check-anchor-notifications');
