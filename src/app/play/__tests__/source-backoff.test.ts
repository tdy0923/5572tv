import {
  backoffDurationFor,
  isRetryWindowElapsed,
  isRetryWindowExpired,
  MAX_RETRIES,
  nextFailCount,
  RETRY_BACKOFFS,
} from '../source-backoff';

describe('source-backoff', () => {
  describe('backoffDurationFor', () => {
    it('maps each failure to its cooldown tier', () => {
      expect(backoffDurationFor(1)).toBe(30_000);
      expect(backoffDurationFor(2)).toBe(120_000);
      expect(backoffDurationFor(3)).toBe(300_000);
      expect(backoffDurationFor(4)).toBe(600_000);
    });
    it('caps at the longest tier beyond MAX_RETRIES', () => {
      expect(backoffDurationFor(MAX_RETRIES)).toBe(
        RETRY_BACKOFFS[RETRY_BACKOFFS.length - 1],
      );
      expect(backoffDurationFor(99)).toBe(600_000);
    });
    it('does not go negative for failCount 0', () => {
      expect(backoffDurationFor(0)).toBe(30_000);
    });
  });

  describe('nextFailCount', () => {
    it('increments and caps at MAX_RETRIES', () => {
      expect(nextFailCount(undefined)).toBe(1);
      expect(nextFailCount(1)).toBe(2);
      expect(nextFailCount(MAX_RETRIES)).toBe(MAX_RETRIES);
      expect(nextFailCount(MAX_RETRIES + 5)).toBe(MAX_RETRIES);
    });
  });

  describe('isRetryWindowElapsed (>= semantics)', () => {
    it('available when no prior failure', () => {
      expect(isRetryWindowElapsed(undefined, 1000)).toBe(true);
    });
    it('blocked within cooldown, allowed at/after boundary', () => {
      const state = { failCount: 1, lastFailTime: 1000 }; // cooldown 30s
      expect(isRetryWindowElapsed(state, 1000 + 29_999)).toBe(false);
      expect(isRetryWindowElapsed(state, 1000 + 30_000)).toBe(true);
    });
  });

  describe('isRetryWindowExpired (> semantics)', () => {
    it('available when no prior failure', () => {
      expect(isRetryWindowExpired(undefined, 1000)).toBe(true);
    });
    it('strictly requires exceeding the cooldown', () => {
      const state = { failCount: 2, lastFailTime: 1000 }; // cooldown 120s
      expect(isRetryWindowExpired(state, 1000 + 120_000)).toBe(false); // == not >
      expect(isRetryWindowExpired(state, 1000 + 120_001)).toBe(true);
    });
  });
});
