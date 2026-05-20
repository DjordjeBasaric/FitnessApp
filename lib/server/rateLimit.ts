/**
 * Jednostavan sliding-window rate limiter u procesnoj memoriji.
 * Dovoljan za MVP single-instance deploy. Za Vercel/horizontal scaling
 * prebaciti na Upstash Redis ili Postgres-based limiter (kasnije).
 *
 * IP-based dok ne uvedemo auth — u Fazi 1 prelazi na userId-based.
 */

type Bucket = { hits: number[]; lastSeen: number };

const STORE = new Map<string, Bucket>();
const STORE_MAX_KEYS = 5_000;
const GC_INTERVAL_MS = 60_000;
let lastGc = Date.now();

function gcIfNeeded(now: number) {
  if (now - lastGc < GC_INTERVAL_MS) return;
  lastGc = now;
  const stale = now - 60 * 60 * 1000;
  for (const [k, b] of STORE) {
    if (b.lastSeen < stale) STORE.delete(k);
  }
  if (STORE.size > STORE_MAX_KEYS) {
    const overflow = STORE.size - STORE_MAX_KEYS;
    let n = 0;
    for (const k of STORE.keys()) {
      STORE.delete(k);
      if (++n >= overflow) break;
    }
  }
}

export type RateLimitOptions = {
  /** Identifikator (IP, userId itd.) */
  key: string;
  /** Maksimalan broj zahtjeva u prozoru */
  limit: number;
  /** Veličina prozora u milisekundama */
  windowMs: number;
};

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetMs: number;
};

export function checkRateLimit(opts: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  gcIfNeeded(now);

  const cutoff = now - opts.windowMs;
  const bucket = STORE.get(opts.key) ?? { hits: [], lastSeen: now };
  bucket.hits = bucket.hits.filter((t) => t > cutoff);
  bucket.lastSeen = now;

  if (bucket.hits.length >= opts.limit) {
    const oldest = bucket.hits[0] ?? now;
    STORE.set(opts.key, bucket);
    return {
      allowed: false,
      remaining: 0,
      resetMs: Math.max(0, oldest + opts.windowMs - now),
    };
  }

  bucket.hits.push(now);
  STORE.set(opts.key, bucket);
  return {
    allowed: true,
    remaining: opts.limit - bucket.hits.length,
    resetMs: opts.windowMs,
  };
}

/** Iz Request headera izvuci najbolju heuristiku IP-a. */
export function clientIpFromHeaders(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const real = req.headers.get("x-real-ip");
  if (real) return real.trim();
  return "unknown";
}
