/**
 * PPT Generator – Rate Limiting Tests
 *
 * Two rate limiters exist in this codebase:
 *
 *   1. `validation.ts` → RateLimiter (sliding-window with per-user timestamps)
 *         isAllowed(id, maxRequests, windowMs) → boolean
 *         getRemainingRequests(id, maxRequests, windowMs) → number
 *         Used by: /api/presentation/generate (3 req/min), /outline (5 req/min)
 *
 *   2. `security.ts` → RateLimiter (fixed-window counter in shared Map)
 *         check(identifier) → { allowed, remaining, resetTime }
 *         reset(identifier)
 *         Used by: middleware for IP-level gate-keeping
 *
 * These tests exercise both classes in isolation (no HTTP layer) so they run
 * fast and deterministically via fake timers.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ─────────────────────────────────────────────────────────────────────────────
// Validation-layer RateLimiter (sliding window)
// ─────────────────────────────────────────────────────────────────────────────

// Import directly – constructor starts a setInterval.  We spy on it so the
// GC doesn't leave dangling timers in the test process.
vi.useFakeTimers();

import { RateLimiter as ValidationRateLimiter } from "@/lib/validation";

describe("ValidationRateLimiter – basic allow/deny", () => {
  let limiter: ValidationRateLimiter;

  beforeEach(() => {
    limiter = new ValidationRateLimiter();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  it("allows the first request", () => {
    expect(limiter.isAllowed("user-1", 3, 60_000)).toBe(true);
  });

  it("allows requests up to the limit", () => {
    for (let i = 0; i < 3; i++) {
      expect(limiter.isAllowed("user-2", 3, 60_000)).toBe(true);
    }
  });

  it("blocks the request that exceeds the limit", () => {
    for (let i = 0; i < 3; i++) limiter.isAllowed("user-3", 3, 60_000);
    expect(limiter.isAllowed("user-3", 3, 60_000)).toBe(false);
  });

  it("continues to block while still within the window", () => {
    for (let i = 0; i < 5; i++) limiter.isAllowed("user-4", 3, 60_000);
    // Still within the window – every subsequent call is denied
    for (let i = 0; i < 5; i++) {
      expect(limiter.isAllowed("user-4", 3, 60_000)).toBe(false);
    }
  });

  it("unblocks after the window expires", () => {
    for (let i = 0; i < 3; i++) limiter.isAllowed("user-5", 3, 60_000);
    expect(limiter.isAllowed("user-5", 3, 60_000)).toBe(false);

    // Advance time beyond the window
    vi.advanceTimersByTime(61_000);

    expect(limiter.isAllowed("user-5", 3, 60_000)).toBe(true);
  });
});

describe("ValidationRateLimiter – per-user isolation", () => {
  let limiter: ValidationRateLimiter;

  beforeEach(() => {
    limiter = new ValidationRateLimiter();
  });

  afterEach(() => vi.clearAllTimers());

  it("rate limit buckets are independent per user", () => {
    // Exhaust user-A
    for (let i = 0; i < 3; i++) limiter.isAllowed("user-A", 3, 60_000);
    expect(limiter.isAllowed("user-A", 3, 60_000)).toBe(false);

    // user-B is unaffected
    expect(limiter.isAllowed("user-B", 3, 60_000)).toBe(true);
  });

  it("10 users can each make 3 requests independently", () => {
    for (let u = 0; u < 10; u++) {
      const id = `user-${u}`;
      for (let r = 0; r < 3; r++) {
        expect(limiter.isAllowed(id, 3, 60_000)).toBe(true);
      }
    }
  });

  it("IP-level identifiers map independently from user-level identifiers", () => {
    const ipId = "ip:1.2.3.4";
    const userId = "user:abc-123";

    for (let i = 0; i < 3; i++) limiter.isAllowed(ipId, 3, 60_000);
    expect(limiter.isAllowed(ipId, 3, 60_000)).toBe(false);

    // user: bucket untouched
    expect(limiter.isAllowed(userId, 3, 60_000)).toBe(true);
  });
});

describe("ValidationRateLimiter – PPT-specific limits", () => {
  let limiter: ValidationRateLimiter;

  beforeEach(() => {
    limiter = new ValidationRateLimiter();
  });

  afterEach(() => vi.clearAllTimers());

  it("generate endpoint: 3 requests per minute allowed", () => {
    const userId = "gen-user-1";
    // 3 generate requests – all pass
    for (let i = 0; i < 3; i++) {
      expect(limiter.isAllowed(userId, 3, 60_000)).toBe(true);
    }
    // 4th – denied
    expect(limiter.isAllowed(userId, 3, 60_000)).toBe(false);
  });

  it("outline endpoint: 5 requests per minute allowed", () => {
    const userId = "outline-user-1";
    for (let i = 0; i < 5; i++) {
      expect(limiter.isAllowed(userId, 5, 60_000)).toBe(true);
    }
    expect(limiter.isAllowed(userId, 5, 60_000)).toBe(false);
  });

  it("different windows: outline resets in 60 s, generate resets in 60 s", () => {
    const genId = "gen-user-reset";
    const outId = "out-user-reset";

    // Exhaust both
    for (let i = 0; i < 3; i++) limiter.isAllowed(genId, 3, 60_000);
    for (let i = 0; i < 5; i++) limiter.isAllowed(outId, 5, 60_000);

    expect(limiter.isAllowed(genId, 3, 60_000)).toBe(false);
    expect(limiter.isAllowed(outId, 5, 60_000)).toBe(false);

    vi.advanceTimersByTime(61_000);

    expect(limiter.isAllowed(genId, 3, 60_000)).toBe(true);
    expect(limiter.isAllowed(outId, 5, 60_000)).toBe(true);
  });
});

describe("ValidationRateLimiter – getRemainingRequests", () => {
  let limiter: ValidationRateLimiter;

  beforeEach(() => {
    limiter = new ValidationRateLimiter();
  });

  afterEach(() => vi.clearAllTimers());

  it("starts at max", () => {
    expect(limiter.getRemainingRequests("fresh-user", 5, 60_000)).toBe(5);
  });

  it("decrements as requests are made", () => {
    for (let i = 0; i < 3; i++) limiter.isAllowed("dec-user", 5, 60_000);
    expect(limiter.getRemainingRequests("dec-user", 5, 60_000)).toBe(2);
  });

  it("returns 0 when exhausted", () => {
    for (let i = 0; i < 5; i++) limiter.isAllowed("zero-user", 5, 60_000);
    expect(limiter.getRemainingRequests("zero-user", 5, 60_000)).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Security-layer RateLimiter (fixed window, shared Map)
// ─────────────────────────────────────────────────────────────────────────────

import { RateLimiter as SecurityRateLimiter } from "@/lib/security";

describe("SecurityRateLimiter – basic allow/deny", () => {
  let limiter: SecurityRateLimiter;

  beforeEach(() => {
    limiter = new SecurityRateLimiter({ windowMs: 60_000, max: 5 });
  });

  afterEach(() => vi.clearAllTimers());

  it("allows the first request", async () => {
    const result = await limiter.check("ip-a");
    expect(result.allowed).toBe(true);
  });

  it("tracks remaining count correctly", async () => {
    await limiter.check("ip-b"); // 1
    const result = await limiter.check("ip-b"); // 2
    expect(result.remaining).toBe(3);
  });

  it("blocks after exceeding max", async () => {
    for (let i = 0; i < 5; i++) await limiter.check("ip-c");
    const result = await limiter.check("ip-c");
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("returns a resetTime in the future while window is active", async () => {
    const now = Date.now();
    const result = await limiter.check("ip-d");
    expect(result.resetTime).toBeGreaterThan(now);
  });

  it("resets after window expires", async () => {
    for (let i = 0; i < 5; i++) await limiter.check("ip-e");
    expect((await limiter.check("ip-e")).allowed).toBe(false);

    vi.advanceTimersByTime(61_000);

    const result = await limiter.check("ip-e");
    expect(result.allowed).toBe(true);
  });
});

describe("SecurityRateLimiter – manual reset", () => {
  let limiter: SecurityRateLimiter;

  beforeEach(() => {
    limiter = new SecurityRateLimiter({ windowMs: 60_000, max: 3 });
  });

  afterEach(() => vi.clearAllTimers());

  it("reset() clears the counter for an identifier", async () => {
    for (let i = 0; i < 3; i++) await limiter.check("ip-reset");
    expect((await limiter.check("ip-reset")).allowed).toBe(false);

    limiter.reset("ip-reset");

    const result = await limiter.check("ip-reset");
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(2);
  });

  it("reset() does not affect other identifiers", async () => {
    for (let i = 0; i < 3; i++) await limiter.check("ip-x");
    for (let i = 0; i < 3; i++) await limiter.check("ip-y");

    limiter.reset("ip-x");

    expect((await limiter.check("ip-x")).allowed).toBe(true);
    expect((await limiter.check("ip-y")).allowed).toBe(false);
  });
});

describe("SecurityRateLimiter – per-user isolation", () => {
  let limiter: SecurityRateLimiter;

  beforeEach(() => {
    limiter = new SecurityRateLimiter({ windowMs: 60_000, max: 2 });
  });

  afterEach(() => vi.clearAllTimers());

  it("different IPs have separate counters", async () => {
    for (let i = 0; i < 2; i++) await limiter.check("ip-1");
    expect((await limiter.check("ip-1")).allowed).toBe(false);
    expect((await limiter.check("ip-2")).allowed).toBe(true);
  });

  it("IPv4 and IPv6 versions of same request are separate buckets", async () => {
    const v4 = "192.168.0.1";
    const v6 = "::ffff:192.168.0.1";
    for (let i = 0; i < 2; i++) await limiter.check(v4);
    expect((await limiter.check(v4)).allowed).toBe(false);
    expect((await limiter.check(v6)).allowed).toBe(true);
  });
});

describe("SecurityRateLimiter – custom limits", () => {
  afterEach(() => vi.clearAllTimers());

  it("respects custom max value", async () => {
    const limiter = new SecurityRateLimiter({ windowMs: 60_000, max: 1 });
    expect((await limiter.check("id-1")).allowed).toBe(true);
    expect((await limiter.check("id-1")).allowed).toBe(false);
  });

  it("respects custom windowMs", async () => {
    const limiter = new SecurityRateLimiter({ windowMs: 5_000, max: 1 });
    await limiter.check("id-2");
    expect((await limiter.check("id-2")).allowed).toBe(false);

    vi.advanceTimersByTime(6_000);

    expect((await limiter.check("id-2")).allowed).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Edge cases
// ─────────────────────────────────────────────────────────────────────────────

describe("Rate limiter edge cases", () => {
  afterEach(() => vi.clearAllTimers());

  it("handles empty-string identifier gracefully", async () => {
    const limiter = new SecurityRateLimiter({ windowMs: 60_000, max: 10 });
    const result = await limiter.check("");
    expect(result.allowed).toBe(true);
  });

  it("handles very long identifier string", async () => {
    const limiter = new ValidationRateLimiter();
    const longId = "a".repeat(512);
    expect(limiter.isAllowed(longId, 5, 60_000)).toBe(true);
  });

  it("handles concurrent requests without going below 0 remaining", async () => {
    const limiter = new SecurityRateLimiter({ windowMs: 60_000, max: 3 });
    const results = await Promise.all([
      limiter.check("concurrent"),
      limiter.check("concurrent"),
      limiter.check("concurrent"),
    ]);
    const remainings = results.map((r) => r.remaining);
    for (const r of remainings) {
      expect(r).toBeGreaterThanOrEqual(0);
    }
  });

  it("ValidationRateLimiter – 5-minute cleanup does not throw", () => {
    const limiter = new ValidationRateLimiter();
    limiter.isAllowed("cleanup-test", 5, 60_000);
    // Trigger the monthly cleanup interval
    expect(() => vi.advanceTimersByTime(300_000)).not.toThrow();
  });
});
