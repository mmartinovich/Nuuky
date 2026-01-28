/**
 * Formats a date string into a relative time string (e.g., "Just now", "5m ago", "2h ago")
 */
export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString();
}

/**
 * Groups notifications by time period (Today, Yesterday, Earlier)
 */
export function getNotificationTimeGroup(dateString: string): 'today' | 'yesterday' | 'earlier' {
  const date = new Date(dateString);
  const now = new Date();

  // Reset times to midnight for comparison
  const dateDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (dateDay.getTime() === today.getTime()) {
    return 'today';
  } else if (dateDay.getTime() === yesterday.getTime()) {
    return 'yesterday';
  }
  return 'earlier';
}

/**
 * Presence timeout in milliseconds.
 * Users are considered offline if last_seen_at is older than this threshold.
 * Must match the OFFLINE_TIMEOUT in usePresence hook (2 minutes).
 */
export const PRESENCE_TIMEOUT_MS = 2 * 60 * 1000; // 2 minutes

/**
 * Checks if a user is truly online by verifying both is_online flag
 * and that last_seen_at is recent (within PRESENCE_TIMEOUT_MS).
 *
 * This handles the edge case where a user force-closes the app
 * without the cleanup function running, leaving them stuck as "online".
 */
export function isUserTrulyOnline(isOnline: boolean, lastSeenAt: string | null | undefined): boolean {
  // If not marked as online, definitely offline
  if (!isOnline) return false;

  // If no last_seen_at, trust the is_online flag
  if (!lastSeenAt) return isOnline;

  // Check if last_seen_at is within the timeout window
  const lastSeenDate = new Date(lastSeenAt);
  const now = new Date();
  const diffMs = now.getTime() - lastSeenDate.getTime();

  // If last seen more than PRESENCE_TIMEOUT_MS ago, they're actually offline
  return diffMs < PRESENCE_TIMEOUT_MS;
}
