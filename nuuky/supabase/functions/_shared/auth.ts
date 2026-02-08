import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// In-memory rate limiting (per function instance)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX = 10;
const MAX_ARRAY_SIZE = 50;

export interface AuthResult {
  userId: string;
  supabase: ReturnType<typeof createClient>;
}

/**
 * Verify Bearer JWT from Authorization header and return authenticated user ID.
 * Also initializes a service-role Supabase client.
 */
export async function authenticateRequest(req: Request): Promise<AuthResult> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AuthError('Missing or invalid Authorization header', 401);
  }

  const token = authHeader.replace('Bearer ', '');

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) {
    throw new AuthError('Invalid or expired token', 401);
  }

  return { userId: user.id, supabase };
}

/**
 * Verify that the sender_id in the request body matches the authenticated user.
 */
export function verifySender(authenticatedUserId: string, senderId: string): void {
  if (authenticatedUserId !== senderId) {
    throw new AuthError('sender_id does not match authenticated user', 403);
  }
}

/**
 * Simple in-memory rate limiter. Returns true if allowed, throws if rate limited.
 * Periodically cleans up expired entries to prevent unbounded memory growth.
 */
export function rateLimit(userId: string): void {
  const now = Date.now();

  // Periodic cleanup: if map grows beyond 1000 entries, purge expired ones
  if (rateLimitMap.size > 1000) {
    for (const [key, val] of rateLimitMap) {
      if (now >= val.resetAt) rateLimitMap.delete(key);
    }
  }

  const entry = rateLimitMap.get(userId);

  if (!entry || now >= entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return;
  }

  entry.count++;
  if (entry.count > RATE_LIMIT_MAX) {
    throw new AuthError('Rate limit exceeded. Try again later.', 429);
  }
}

/**
 * Validate that an array field doesn't exceed the maximum allowed size.
 */
export function validateArraySize(arr: unknown[], fieldName: string): void {
  if (arr.length > MAX_ARRAY_SIZE) {
    throw new AuthError(`${fieldName} exceeds maximum size of ${MAX_ARRAY_SIZE}`, 400);
  }
}

/**
 * Verify cron secret for scheduled functions.
 * Uses constant-time comparison to prevent timing attacks.
 */
export async function verifyCronSecret(req: Request): Promise<void> {
  const secret = req.headers.get('Authorization')?.replace('Bearer ', '') || '';
  const expectedSecret = Deno.env.get('CRON_SECRET');
  if (!expectedSecret) {
    throw new AuthError('Unauthorized', 401);
  }
  const encoder = new TextEncoder();
  const secretBytes = encoder.encode(expectedSecret);
  const providedBytes = encoder.encode(secret);
  if (secretBytes.length !== providedBytes.length ||
      !(await crypto.subtle.timingSafeEqual(secretBytes, providedBytes))) {
    throw new AuthError('Unauthorized', 401);
  }
}

export class AuthError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

/**
 * Helper to create a JSON error response from an AuthError.
 */
export function authErrorResponse(error: AuthError): Response {
  return new Response(
    JSON.stringify({ error: error.message }),
    { status: error.status, headers: { 'Content-Type': 'application/json' } }
  );
}
