jest.mock('@/lib/db', () => {
  return {
    __esModule: true,
    getStorageType: jest.fn(() => 'redis'),
    db: {
      readAnalyticsEvents: jest.fn(async () => [] as string[]),
      appendAnalyticsEvents: jest.fn(async () => {}),
    },
  };
});

import { getAnalyticsSummary } from '@/lib/analytics-store';

type DbMock = {
  db: { readAnalyticsEvents: jest.Mock; appendAnalyticsEvents: jest.Mock };
};

const dbMock = jest.requireMock('@/lib/db') as DbMock;

describe('getAnalyticsSummary cache', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('serves repeated calls from cache without re-reading', async () => {
    const first = await getAnalyticsSummary(30);
    const reads = dbMock.db.readAnalyticsEvents.mock.calls.length;
    expect(reads).toBeGreaterThan(0);
    const second = await getAnalyticsSummary(30);
    expect(second).toBe(first);
    expect(dbMock.db.readAnalyticsEvents.mock.calls.length).toBe(reads);
  });

  it('recomputes after TTL expiry', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-09-18T12:00:00Z'));
    await getAnalyticsSummary(31);
    const reads = dbMock.db.readAnalyticsEvents.mock.calls.length;
    expect(reads).toBeGreaterThan(0);
    jest.setSystemTime(new Date('2026-09-18T12:06:00Z'));
    await getAnalyticsSummary(31);
    expect(dbMock.db.readAnalyticsEvents.mock.calls.length).toBeGreaterThan(
      reads,
    );
  });

  it('clamps out-of-range days', async () => {
    const big = await getAnalyticsSummary(9999);
    expect(big.range.days).toBe(95);
    const zero = await getAnalyticsSummary(0);
    expect(zero.range.days).toBe(30);
  });
});
