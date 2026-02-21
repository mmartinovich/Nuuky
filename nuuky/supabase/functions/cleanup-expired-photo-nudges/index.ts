import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { verifyCronSecret, AuthError, authErrorResponse } from '../_shared/auth.ts';

/**
 * Cleanup expired photo nudges, voice moments, and their storage files.
 * This function should be run hourly via cron.
 *
 * To set up cron, add to Supabase dashboard or use:
 * SELECT cron.schedule(
 *   'cleanup-expired-photo-nudges',
 *   '0 * * * *',  -- Every hour
 *   $$
 *   SELECT net.http_post(
 *     url := '<your-supabase-url>/functions/v1/cleanup-expired-photo-nudges',
 *     headers := '{"Authorization": "Bearer <CRON_SECRET>", "Content-Type": "application/json"}'::jsonb,
 *     body := '{}'::jsonb
 *   ) AS request_id;
 *   $$
 * );
 */

serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405, headers: { 'X-Content-Type-Options': 'nosniff' } });
    }

    // Verify cron secret for scheduled function
    await verifyCronSecret(req);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting cleanup of expired photo nudges and voice moments...');

    // Get all expired photo nudges
    const { data: expiredNudges, error: fetchError } = await supabase
      .from('photo_nudges')
      .select('id, image_url, sender_id')
      .lt('expires_at', new Date().toISOString());

    if (fetchError) {
      console.error('Error fetching expired photo nudges:', fetchError);
      throw fetchError;
    }

    // Get all expired voice moments
    const { data: expiredVoiceMoments, error: vmFetchError } = await supabase
      .from('voice_moments')
      .select('id, audio_url, sender_id')
      .lt('expires_at', new Date().toISOString());

    if (vmFetchError) {
      console.error('Error fetching expired voice moments:', vmFetchError);
    }

    const hasExpiredNudges = expiredNudges && expiredNudges.length > 0;
    const hasExpiredVoiceMoments = expiredVoiceMoments && expiredVoiceMoments.length > 0;

    if (!hasExpiredNudges && !hasExpiredVoiceMoments) {
      console.log('No expired items to clean up');
      return new Response(
        JSON.stringify({ message: 'No expired items', cleaned: 0 }),
        { status: 200, headers: { 'Content-Type': 'application/json', 'X-Content-Type-Options': 'nosniff' } }
      );
    }

    let photosCleaned = 0;
    let voiceMomentsCleaned = 0;

    if (hasExpiredNudges) {
    console.log(`Found ${expiredNudges.length} expired photo nudges to clean up`);

    // Extract storage paths from image URLs
    const storagePaths: string[] = [];
    for (const nudge of expiredNudges) {
      try {
        // Extract the path from the URL
        // URL format: https://<project>.supabase.co/storage/v1/object/public/photo-nudges/<sender_id>/<filename>
        const url = new URL(nudge.image_url);
        const pathParts = url.pathname.split('/');
        // Find 'photo-nudges' in the path and get everything after it
        const bucketIndex = pathParts.indexOf('photo-nudges');
        if (bucketIndex !== -1 && bucketIndex < pathParts.length - 1) {
          const filePath = pathParts.slice(bucketIndex + 1).join('/');
          storagePaths.push(filePath);
        }
      } catch (e) {
        console.error(`Failed to parse URL for nudge ${nudge.id}:`, e);
      }
    }

    // Delete storage files
    if (storagePaths.length > 0) {
      console.log(`Deleting ${storagePaths.length} storage files...`);
      const { error: storageError } = await supabase.storage
        .from('photo-nudges')
        .remove(storagePaths);

      if (storageError) {
        console.error('Error deleting storage files:', storageError);
        // Continue with database cleanup even if storage fails
      } else {
        console.log(`Successfully deleted ${storagePaths.length} storage files`);
      }
    }

    // Delete expired photo nudge records
    const expiredIds = expiredNudges.map(n => n.id);
    const { error: deleteError } = await supabase
      .from('photo_nudges')
      .delete()
      .in('id', expiredIds);

    if (deleteError) {
      console.error('Error deleting expired photo nudges:', deleteError);
      throw deleteError;
    }

    // Also clean up related notifications
    const { error: notifDeleteError } = await supabase
      .from('notifications')
      .delete()
      .eq('type', 'photo_nudge')
      .in('source_id', expiredIds);

    if (notifDeleteError) {
      console.error('Error deleting related notifications:', notifDeleteError);
      // Don't fail the entire operation for notification cleanup
    }

    // Clean up old rate limit records (older than 2 days)
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    const { error: rateLimitError } = await supabase
      .from('photo_nudge_limits')
      .delete()
      .lt('date', twoDaysAgo.toISOString().split('T')[0]);

    if (rateLimitError) {
      console.error('Error cleaning up rate limits:', rateLimitError);
    }

    photosCleaned = expiredNudges.length;
    console.log(`✓ Photo nudges cleanup: ${photosCleaned} removed`);
    } // end hasExpiredNudges

    // --- Voice moments cleanup ---
    if (hasExpiredVoiceMoments) {
      console.log(`Found ${expiredVoiceMoments.length} expired voice moments to clean up`);

      const voiceStoragePaths: string[] = [];
      for (const vm of expiredVoiceMoments) {
        try {
          const url = new URL(vm.audio_url);
          const pathParts = url.pathname.split('/');
          const bucketIndex = pathParts.indexOf('voice-moments');
          if (bucketIndex !== -1 && bucketIndex < pathParts.length - 1) {
            const filePath = pathParts.slice(bucketIndex + 1).join('/');
            voiceStoragePaths.push(filePath);
          }
        } catch (e) {
          console.error(`Failed to parse URL for voice moment ${vm.id}:`, e);
        }
      }

      if (voiceStoragePaths.length > 0) {
        const { error: vmStorageError } = await supabase.storage
          .from('voice-moments')
          .remove(voiceStoragePaths);

        if (vmStorageError) {
          console.error('Error deleting voice moment storage files:', vmStorageError);
        } else {
          console.log(`Successfully deleted ${voiceStoragePaths.length} voice moment files`);
        }
      }

      const vmExpiredIds = expiredVoiceMoments.map(vm => vm.id);
      const { error: vmDeleteError } = await supabase
        .from('voice_moments')
        .delete()
        .in('id', vmExpiredIds);

      if (vmDeleteError) {
        console.error('Error deleting expired voice moments:', vmDeleteError);
      }

      // Clean up voice moment notifications
      const { error: vmNotifError } = await supabase
        .from('notifications')
        .delete()
        .in('type', ['voice_moment', 'voice_moment_reaction'])
        .in('source_id', vmExpiredIds);

      if (vmNotifError) {
        console.error('Error deleting voice moment notifications:', vmNotifError);
      }

      voiceMomentsCleaned = expiredVoiceMoments.length;
      console.log(`✓ Voice moments cleanup: ${voiceMomentsCleaned} removed`);
    }

    console.log(`✓ Cleanup complete: ${photosCleaned} photo nudges, ${voiceMomentsCleaned} voice moments removed`);

    return new Response(
      JSON.stringify({
        message: 'Cleanup complete',
        photosCleaned,
        voiceMomentsCleaned,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json', 'X-Content-Type-Options': 'nosniff' } }
    );

  } catch (error) {
    if (error instanceof AuthError) {
      return authErrorResponse(error);
    }
    console.error('Cleanup function error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json', 'X-Content-Type-Options': 'nosniff' } }
    );
  }
});
