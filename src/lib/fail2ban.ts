/* eslint-disable no-console */

interface Fail2BanEntry {
  attempts: number;
  firstAttempt: number;
  lastAttempt: number;
  banUntil: number | null;
  banLevel: number; // 0=none, 1=10min, 2=1hour, 3=24hour
}

const entries = new Map<string, Fail2BanEntry>();

const BAN_LEVELS = [
  { threshold: 5, window: 5 * 60 * 1000, banDuration: 10 * 60 * 1000 },
  { threshold: 10, window: 30 * 60 * 1000, banDuration: 60 * 60 * 1000 },
  { threshold: 20, window: 60 * 60 * 1000, banDuration: 24 * 60 * 60 * 1000 },
];

function getEntry(ip: string): Fail2BanEntry {
  let entry = entries.get(ip);
  if (!entry) {
    entry = {
      attempts: 0,
      firstAttempt: Date.now(),
      lastAttempt: Date.now(),
      banUntil: null,
      banLevel: 0,
    };
    entries.set(ip, entry);
  }
  return entry;
}

export function checkFail2Ban(ip: string): {
  blocked: boolean;
  retryAfter?: number;
} {
  const entry = entries.get(ip);
  if (!entry) return { blocked: false };

  if (entry.banUntil && entry.banUntil > Date.now()) {
    return {
      blocked: true,
      retryAfter: Math.ceil((entry.banUntil - Date.now()) / 1000),
    };
  }

  if (entry.banUntil && entry.banUntil <= Date.now()) {
    entry.banUntil = null;
    entry.banLevel = 0;
    entry.attempts = 0;
    entry.firstAttempt = Date.now();
  }

  return { blocked: false };
}

export function recordFailedAttempt(ip: string): void {
  const entry = getEntry(ip);
  const now = Date.now();
  entry.attempts++;
  entry.lastAttempt = now;

  for (let i = BAN_LEVELS.length - 1; i >= 0; i--) {
    const { threshold, window, banDuration } = BAN_LEVELS[i];
    if (entry.attempts >= threshold && now - entry.firstAttempt <= window) {
      if (entry.banLevel < i + 1) {
        entry.banLevel = i + 1;
        entry.banUntil = now + banDuration;
        console.log(
          `[Fail2Ban] IP ${ip} banned for ${banDuration / 1000}s (level ${i + 1}) after ${entry.attempts} attempts`,
        );
      }
      return;
    }
  }
}

export function recordSuccessfulLogin(ip: string): void {
  entries.delete(ip);
}

export function cleanup(): void {
  const now = Date.now();
  for (const [ip, entry] of entries) {
    if (entry.banUntil && entry.banUntil <= now) {
      entries.delete(ip);
    } else if (!entry.banUntil && now - entry.lastAttempt > 60 * 60 * 1000) {
      entries.delete(ip);
    }
  }
}

// Periodic cleanup every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(cleanup, 5 * 60 * 1000);
}
