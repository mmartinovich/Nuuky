-- Add last_streak_notification_at column to streaks table
-- Used to track when the last fading streak notification was sent
-- Prevents spam by enforcing a 12-hour cooldown between notifications

ALTER TABLE streaks
ADD COLUMN IF NOT EXISTS last_streak_notification_at TIMESTAMPTZ;

-- Add index for efficient querying of streaks that need notifications
CREATE INDEX IF NOT EXISTS idx_streaks_notification_tracking
ON streaks (last_streak_notification_at)
WHERE consecutive_days > 0;

COMMENT ON COLUMN streaks.last_streak_notification_at IS 'Timestamp of last streak fading notification sent for this streak. Used to enforce 12-hour cooldown.';
