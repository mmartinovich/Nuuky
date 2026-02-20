-- Add missing notification types to the CHECK constraint
-- voice_moment, voice_moment_reaction, and photo_like were missing,
-- causing DB insert failures when edge functions tried to create these notifications.
ALTER TABLE notifications DROP CONSTRAINT notifications_type_check;

ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
  CHECK (type::text = ANY (ARRAY[
    'nudge',
    'flare',
    'friend_request',
    'friend_accepted',
    'room_invite',
    'call_me',
    'heart',
    'photo_nudge',
    'photo_like',
    'streak_fading',
    'voice_moment',
    'voice_moment_reaction'
  ]::text[]));
