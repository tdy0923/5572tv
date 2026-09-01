import {
  CACHE_EXPIRE_TIME,
  CACHE_VERSION,
  isCacheEntryValid,
  PLAY_RECORDS_CACHE_EXPIRE_TIME,
} from '../cache-expiry';

describe('isCacheEntryValid', () => {
  const now = 1_000_000_000_000;

  it('valid when version matches and within generic TTL', () => {
    expect(
      isCacheEntryValid({
        version: CACHE_VERSION,
        timestamp: now - 1000,
        now,
      }),
    ).toBe(true);
  });

  it('invalid when version mismatches', () => {
    expect(
      isCacheEntryValid({
        version: '0.0.1',
        timestamp: now - 1000,
        now,
      }),
    ).toBe(false);
  });

  it('invalid when generic TTL elapsed', () => {
    expect(
      isCacheEntryValid({
        version: CACHE_VERSION,
        timestamp: now - CACHE_EXPIRE_TIME - 1,
        now,
      }),
    ).toBe(false);
  });

  it('playRecords uses the shorter 5-minute TTL', () => {
    // 6 minutes old: valid for generic, expired for playRecords
    const sixMinAgo = now - 6 * 60 * 1000;
    expect(
      isCacheEntryValid({
        version: CACHE_VERSION,
        timestamp: sixMinAgo,
        now,
      }),
    ).toBe(true);
    expect(
      isCacheEntryValid({
        version: CACHE_VERSION,
        timestamp: sixMinAgo,
        now,
        cacheType: 'playRecords',
      }),
    ).toBe(false);
  });

  it('boundary: exactly at TTL is invalid (strict <)', () => {
    expect(
      isCacheEntryValid({
        version: CACHE_VERSION,
        timestamp: now - PLAY_RECORDS_CACHE_EXPIRE_TIME,
        now,
        cacheType: 'playRecords',
      }),
    ).toBe(false);
  });
});
