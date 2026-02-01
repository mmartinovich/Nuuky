import { formatRelativeTime, getNotificationTimeGroup, isUserTrulyOnline, PRESENCE_TIMEOUT_MS } from '../../lib/utils';

describe('formatRelativeTime', () => {
  test('returns "Just now" for less than 1 minute ago', () => {
    const now = new Date().toISOString();
    expect(formatRelativeTime(now)).toBe('Just now');
  });

  test('returns minutes ago', () => {
    const date = new Date(Date.now() - 5 * 60000).toISOString();
    expect(formatRelativeTime(date)).toBe('5m ago');
  });

  test('returns hours ago', () => {
    const date = new Date(Date.now() - 3 * 3600000).toISOString();
    expect(formatRelativeTime(date)).toBe('3h ago');
  });

  test('returns days ago', () => {
    const date = new Date(Date.now() - 2 * 86400000).toISOString();
    expect(formatRelativeTime(date)).toBe('2d ago');
  });

  test('returns formatted date for older than a week', () => {
    const date = new Date(Date.now() - 10 * 86400000).toISOString();
    const result = formatRelativeTime(date);
    // Should be a locale date string, not "Xd ago"
    expect(result).not.toContain('ago');
  });
});

describe('getNotificationTimeGroup', () => {
  test('returns "today" for today', () => {
    expect(getNotificationTimeGroup(new Date().toISOString())).toBe('today');
  });

  test('returns "yesterday" for yesterday', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(12, 0, 0, 0);
    expect(getNotificationTimeGroup(yesterday.toISOString())).toBe('yesterday');
  });

  test('returns "earlier" for older dates', () => {
    const old = new Date(Date.now() - 5 * 86400000).toISOString();
    expect(getNotificationTimeGroup(old)).toBe('earlier');
  });
});

describe('isUserTrulyOnline', () => {
  test('returns false when is_online is false', () => {
    expect(isUserTrulyOnline(false, new Date().toISOString())).toBe(false);
  });

  test('returns true when online and last_seen is null', () => {
    expect(isUserTrulyOnline(true, null)).toBe(true);
  });

  test('returns true when online and last_seen is recent', () => {
    const recent = new Date(Date.now() - 30000).toISOString();
    expect(isUserTrulyOnline(true, recent)).toBe(true);
  });

  test('returns false when online but last_seen is stale', () => {
    const stale = new Date(Date.now() - PRESENCE_TIMEOUT_MS - 10000).toISOString();
    expect(isUserTrulyOnline(true, stale)).toBe(false);
  });

  test('returns true when online and last_seen is undefined', () => {
    expect(isUserTrulyOnline(true, undefined)).toBe(true);
  });

  test('PRESENCE_TIMEOUT_MS is 2 minutes', () => {
    expect(PRESENCE_TIMEOUT_MS).toBe(120000);
  });
});
