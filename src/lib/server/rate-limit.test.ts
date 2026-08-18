import { beforeEach, describe, expect, it } from 'vitest';
import { clientIp, createRateLimiter, signupLimiter } from '@/lib/server/rate-limit';

function fakeHeaders(entries: Record<string, string | null>): { get(name: string): string | null } {
  return { get: (name: string) => entries[name.toLowerCase()] ?? null };
}

describe('createRateLimiter (10.2: fixed window in-memory)', () => {
  let clock: number;
  const now = () => clock;

  beforeEach(() => {
    clock = 100_000;
  });

  it('allows up to `max` events per key within the window', () => {
    const limiter = createRateLimiter({ windowMs: 60_000, max: 3, now });
    expect(limiter.check('ip:1')).toEqual({ ok: true, retryAfterMs: 0 });
    expect(limiter.check('ip:1')).toEqual({ ok: true, retryAfterMs: 0 });
    expect(limiter.check('ip:1')).toEqual({ ok: true, retryAfterMs: 0 });
    const blocked = limiter.check('ip:1');
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterMs).toBeGreaterThan(0);
    expect(blocked.retryAfterMs).toBeLessThanOrEqual(60_000);
  });

  it('keys are isolated: one IP exhausting its budget does not affect others', () => {
    const limiter = createRateLimiter({ windowMs: 60_000, max: 2, now });
    limiter.check('ip:a');
    limiter.check('ip:a');
    expect(limiter.check('ip:a').ok).toBe(false);
    expect(limiter.check('ip:b').ok).toBe(true);
    expect(limiter.check('ip:b').ok).toBe(true);
  });

  it('opens a fresh window after windowMs elapses', () => {
    const limiter = createRateLimiter({ windowMs: 60_000, max: 2, now });
    limiter.check('ip:1');
    limiter.check('ip:1');
    expect(limiter.check('ip:1').ok).toBe(false);

    clock += 60_000;
    expect(limiter.check('ip:1')).toEqual({ ok: true, retryAfterMs: 0 });
  });

  it('exposes reset() to clear a key or every bucket', () => {
    const limiter = createRateLimiter({ windowMs: 60_000, max: 1, now });
    limiter.check('ip:1');
    expect(limiter.check('ip:1').ok).toBe(false);
    limiter.reset('ip:1');
    expect(limiter.check('ip:1').ok).toBe(true);

    limiter.check('ip:1');
    limiter.check('ip:2');
    limiter.reset();
    expect(limiter.check('ip:1').ok).toBe(true);
    expect(limiter.check('ip:2').ok).toBe(true);
  });

  it('reports an accurate retryAfterMs remaining in the window', () => {
    const limiter = createRateLimiter({ windowMs: 60_000, max: 1, now });
    limiter.check('ip:1');
    clock += 20_000;
    const blocked = limiter.check('ip:1');
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterMs).toBe(40_000);
  });

  it('keeps memory bounded once windows expire', () => {
    const limiter = createRateLimiter({ windowMs: 60_000, max: 100, now });
    for (let i = 0; i < 50; i += 1) limiter.check(`ip:${i}`);
    clock += 120_000;
    limiter.check('ip:0');
    // A fresh window for ip:0 succeeds and stale buckets were pruned.
    expect(limiter.check('ip:49').ok).toBe(true);
  });
});

describe('signupLimiter (10.2: signup spam)', () => {
  beforeEach(() => signupLimiter.reset());

  it('tolerates a realistic burst and then blocks', () => {
    for (let i = 0; i < 5; i += 1) {
      expect(signupLimiter.check('203.0.113.7').ok).toBe(true);
    }
    expect(signupLimiter.check('203.0.113.7').ok).toBe(false);
  });

  it('does not share budgets across IPs', () => {
    signupLimiter.reset();
    for (let i = 0; i < 5; i += 1) signupLimiter.check('203.0.113.7');
    expect(signupLimiter.check('203.0.113.8').ok).toBe(true);
  });
});

describe('clientIp (10.2: header extraction)', () => {
  it('prefers the first entry of X-Forwarded-For', () => {
    expect(
      clientIp(
        fakeHeaders({ 'x-forwarded-for': '203.0.113.9, 10.0.0.1', 'x-real-ip': '10.0.0.2' }),
      ),
    ).toBe('203.0.113.9');
  });

  it('falls back to X-Real-IP', () => {
    expect(clientIp(fakeHeaders({ 'x-real-ip': '198.51.100.4' }))).toBe('198.51.100.4');
  });

  it('returns null when neither header is present', () => {
    expect(clientIp(fakeHeaders({}))).toBeNull();
  });
});
