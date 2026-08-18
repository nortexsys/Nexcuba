/** Minimal structural view of next/headers — avoids importing Next internals. */
export interface RateLimitHeaders {
  get(name: string): string | null;
}

/**
 * In-memory fixed-window rate limiter (H10, 10.2). design.md §8 calls for
 * Upstash Redis / Vercel KV in production; this module is the single-process
 * fallback (and the reference implementation that prod swaps out). It defends
 * the signup, login, password-reset and networking-request actions against
 * brute force, signup spam and inbox flooding.
 *
 * Caveat: state lives in the process, so a multi-instance deployment must
 * replace these limiters with a shared store (the window/limits stay the
 * same — only the backing store changes). Supabase REST itself adds a second
 * layer (Postgres grants) and the signup flow validates credentials, so this
 * is defense-in-depth, not the only wall.
 */

export interface RateLimitConfig {
  /** Window length in milliseconds. */
  windowMs: number;
  /** Max allowed events per key per window. */
  max: number;
  /** Injectable clock for tests. */
  now?: () => number;
}

export interface RateLimitResult {
  ok: boolean;
  /** How long the caller must wait before retrying (0 when ok). */
  retryAfterMs: number;
}

export interface RateLimiter {
  check(key: string): RateLimitResult;
  /** Clear a single key or (without args) every bucket — mainly for tests. */
  reset(key?: string): void;
}

interface Bucket {
  count: number;
  windowStart: number;
}

export function createRateLimiter(config: RateLimitConfig): RateLimiter {
  const now = config.now ?? Date.now;
  const buckets = new Map<string, Bucket>();

  function prune(nowMs: number): void {
    for (const [key, bucket] of buckets) {
      if (nowMs - bucket.windowStart >= config.windowMs) buckets.delete(key);
    }
  }

  return {
    check(key: string): RateLimitResult {
      const t = now();
      prune(t);
      const bucket = buckets.get(key);
      if (!bucket || t - bucket.windowStart >= config.windowMs) {
        buckets.set(key, { count: 1, windowStart: t });
        return { ok: true, retryAfterMs: 0 };
      }
      if (bucket.count >= config.max) {
        return { ok: false, retryAfterMs: config.windowMs - (t - bucket.windowStart) };
      }
      bucket.count += 1;
      return { ok: true, retryAfterMs: 0 };
    },
    reset(key?: string): void {
      if (key === undefined) buckets.clear();
      else buckets.delete(key);
    },
  };
}

/**
 * Best-effort client IP for rate-limit keys: first entry of X-Forwarded-For
 * (what hosting platforms set), then X-Real-IP, then null. When null the
 * caller falls back to a shared key so the limiter still engages.
 */
export function clientIp(headers: RateLimitHeaders): string | null {
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }
  return headers.get('x-real-ip');
}

export const RATE_LIMIT_MESSAGE = 'Demasiados intentos. Espera un momento e inténtalo de nuevo.';

// ── shared limiters ──────────────────────────────────────────────────────────

/** Signup attempts per IP (spam mitigation). */
export const signupLimiter = createRateLimiter({ windowMs: 60_000, max: 5 });

/** Password login attempts per IP (brute force). */
export const loginLimiter = createRateLimiter({ windowMs: 60_000, max: 10 });

/** Password reset requests per IP. */
export const resetLimiter = createRateLimiter({ windowMs: 60_000, max: 5 });

/** Networking contact-request submissions per IP (inbox flooding). */
export const contactLimiter = createRateLimiter({ windowMs: 60_000, max: 20 });
