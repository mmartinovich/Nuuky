import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { verifyCronSecret, AuthError, authErrorResponse } from '../_shared/auth.ts';

/**
 * Cleanup expired photo nudges and their storage files.
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
      return new Response('Method not allowed', { status: 405 });
    }

    // Verify cron secret for scheduled function
    await verifyCronSecret(req);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting cleanup of expired photo nudges...');

    // Get all expired photo nudges
    const { data: expiredNudges, error: fetchError } = await supabase
      .from('photo_nudges')
      .select('id, image_url, sender_id')
      .lt('expires_at', new Date().toISOString());

    if (fetchError) {
      console.error('Error fetching expired photo nudges:', fetchError);
      throw fetchError;
    }

    if (!expiredNudges || expiredNudges.length === 0) {
      console.log('No expired photo nudges to clean up');
      return new Response(
        JSON.stringify({ message: 'No expired photo nudges', cleaned: 0 }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

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

    console.log(`✓ Cleanup complete: ${expiredNudges.length} photo nudges removed`);

    return new Response(
      JSON.stringify({
        message: 'Cleanup complete',
        cleaned: expiredNudges.length,
        storageFilesDeleted: storagePaths.length,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    if (error instanceof AuthError) {
      return authErrorResponse(error);
    }
    console.error('Cleanup function error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
