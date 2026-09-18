import { NextRequest } from 'next/server';

jest.mock('@/lib/db', () => {
  const state = {
    storageType: 'localstorage',
    recordsByUser: {} as Record<string, Record<string, unknown>>,
    statByUser: {} as Record<string, Record<string, unknown>>,
  };
  return {
    __esModule: true,
    getStorageType: jest.fn(() => state.storageType),
    db: {
      getUserPlayStat: jest.fn(async (username: string) =>
        state.statByUser[username] ?? {},
      ),
      getAllPlayRecords: jest.fn(async (username: string) =>
        state.recordsByUser[username] ?? {},
      ),
    },
    __state: state,
  };
});

jest.mock('@/lib/auth', () => {
  const state = {
    authInfo: null as Record<string, unknown> | null,
  };
  return {
    __esModule: true,
    getAuthInfoFromCookie: jest.fn(async () => state.authInfo),
    __state: state,
  };
});

jest.mock('@/lib/config', () => {
  const state = {
    users: [] as Array<Record<string, unknown>>,
  };
  return {
    __esModule: true,
    getConfig: jest.fn(async () => ({
      UserConfig: { Users: state.users },
    })),
    __state: state,
  };
});

jest.mock('@/lib/analytics-store', () => {
  const state = {
    summary: null as Record<string, unknown> | null,
  };
  return {
    __esModule: true,
    getAnalyticsSummary: jest.fn(async () => {
      if (state.summary) return state.summary;
      throw new Error('analytics unavailable');
    }),
    normalizeVideoTitle: jest.fn((s: string) => s),
    __state: state,
  };
});

jest.mock('next/server', () => {
  const makeResponse = (
    body: unknown,
    init?: { status?: number; headers?: Record<string, string> },
  ) => {
    const status = init?.status ?? 200;
    return {
      ok: status >= 200 && status < 300,
      status,
      body,
      headers: init?.headers ?? {},
    };
  };
  return {
    __esModule: true,
    NextRequest: class {},
    NextResponse: {
      json: jest.fn(makeResponse),
    },
  };
});

import { getAuthInfoFromCookie } from '@/lib/auth';
import { getStorageType } from '@/lib/db';

import { GET } from '@/app/api/admin/play-stats/route';

type DbMockState = {
  storageType: string;
  recordsByUser: Record<string, Record<string, unknown>>;
  statByUser: Record<string, Record<string, unknown>>;
};

type AuthMockState = {
  authInfo: Record<string, unknown> | null;
};

type ConfigMockState = {
  users: Array<Record<string, unknown>>;
};

const dbState = (
  jest.requireMock('@/lib/db') as {
    __state: DbMockState;
  }
).__state;
const authState = (
  jest.requireMock('@/lib/auth') as {
    __state: AuthMockState;
  }
).__state;
const configState = (
  jest.requireMock('@/lib/config') as {
    __state: ConfigMockState;
  }
).__state;
const mockedGetStorageType = getStorageType as jest.Mock;
const mockedGetAuthInfoFromCookie = getAuthInfoFromCookie as jest.Mock;
const dbMocks = jest.requireMock('@/lib/db') as {
  db: { getUserPlayStat: jest.Mock; getAllPlayRecords: jest.Mock };
};

const makeRequest = () =>
  ({
    headers: new Map(),
    url: 'http://localhost/api/admin/play-stats',
  }) as unknown as NextRequest;

const makeRecord = (overrides: Record<string, unknown> = {}) => ({
  title: 'Video A',
  search_title: 'Video A',
  source_name: 'srcA',
  cover: 'cover-a',
  year: '2026',
  index: 1,
  total_episodes: 12,
  play_time: 600,
  total_time: 1200,
  save_time: Date.now(),
  ...overrides,
});

describe('admin play-stats route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-09-18T12:00:00Z'));
    jest.replaceProperty(process, 'env', { ...process.env, USERNAME: '' });
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    delete process.env.NEXT_PUBLIC_STORAGE_TYPE;
    dbState.storageType = 'localstorage';
    dbState.recordsByUser = {};
    dbState.statByUser = {};
    authState.authInfo = null;
    configState.users = [];
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('returns 400 for localstorage storage type', async () => {
    dbState.storageType = 'localstorage';
    authState.authInfo = { username: 'admin1' };

    const res = await GET(makeRequest());

    expect(mockedGetStorageType).toHaveBeenCalled();
    expect(res.status).toBe(400);
    expect((res.body as { error: string }).error).toContain('不支持本地存储');
  });

  it.each([
    ['redis', 'missing'],
    ['redis', 'localstorage'],
    ['kvrocks', 'missing'],
    ['kvrocks', 'localstorage'],
    ['upstash', 'missing'],
    ['upstash', 'localstorage'],
  ])(
    'serves aggregated stats from the real GET for %s when NEXT_PUBLIC_STORAGE_TYPE is %s',
    async (storageType, publicStorageType) => {
      if (publicStorageType !== 'missing') {
        process.env.NEXT_PUBLIC_STORAGE_TYPE = publicStorageType;
      }
      dbState.storageType = storageType;
      authState.authInfo = { username: 'admin1' };
      configState.users = [
        { username: 'admin1', role: 'admin', createdAt: Date.now() },
      ];
      dbState.recordsByUser['admin1'] = { key1: makeRecord() };
      dbState.statByUser['admin1'] = {
        lastLoginTime: Date.now(),
        loginCount: 3,
      };

      const res = await GET(makeRequest());

      expect(mockedGetStorageType).toHaveBeenCalled();
      expect(mockedGetAuthInfoFromCookie).toHaveBeenCalledWith(
        expect.anything(),
      );
      expect(res.status).toBe(200);
      const body = res.body as Record<string, unknown>;
      expect(body.totalUsers).toBe(1);
      expect(body.totalPlays).toBe(1);
      expect(body.totalWatchTime).toBe(600);
      const userStats = body.userStats as Array<Record<string, unknown>>;
      expect(userStats).toHaveLength(1);
      expect(userStats[0].username).toBe('admin1');
      expect(userStats[0].totalPlays).toBe(1);
      expect(userStats[0].mostWatchedSource).toBe('srcA');
      expect(userStats[0].loginCount).toBe(3);
      const topSources = body.topSources as Array<Record<string, unknown>>;
      expect(topSources[0]).toEqual({ source: 'srcA', count: 1 });
      const dailyStats = body.dailyStats as Array<Record<string, unknown>>;
      expect(dailyStats).toHaveLength(7);
      expect(dailyStats[6].plays).toBe(1);
      expect(dailyStats[6].watchTime).toBe(600);
      const registrationStats = body.registrationStats as Record<
        string,
        unknown
      >;
      expect(registrationStats.totalRegisteredUsers).toBe(1);
      expect(registrationStats.todayNewUsers).toBe(1);
    },
  );

  it('falls back to play-record aggregation when the analytics stream is unavailable', async () => {
    dbState.storageType = 'redis';
    authState.authInfo = { username: 'admin1' };
    configState.users = [
      { username: 'admin1', role: 'admin', createdAt: Date.now() },
    ];
    dbState.recordsByUser['admin1'] = {
      key1: makeRecord({ title: 'Video B', source_name: 'srcB', play_time: 120 }),
    };

    const res = await GET(makeRequest());

    expect(res.status).toBe(200);
    const topVideos = (res.body as Record<string, unknown>)
      .topVideos as Array<Record<string, unknown>>;
    expect(topVideos[0].title).toBe('Video B');
    expect(topVideos[0].playCount).toBe(1);
    expect(topVideos[0].uniqueUsers).toBe(1);
  });

  it('returns 401 when no auth info is present', async () => {
    dbState.storageType = 'redis';
    authState.authInfo = null;

    const res = await GET(makeRequest());

    expect(mockedGetAuthInfoFromCookie).toHaveBeenCalledWith(
      expect.anything(),
    );
    expect(res.status).toBe(401);
    expect((res.body as { error: string }).error).toBe('Unauthorized');
  });

  it('rejects a non-admin user with 401', async () => {
    dbState.storageType = 'upstash';
    authState.authInfo = { username: 'plainuser' };
    configState.users = [
      { username: 'plainuser', role: 'user', banned: false },
    ];

    const res = await GET(makeRequest());

    expect(res.status).toBe(401);
    expect((res.body as { error: string }).error).toBe('权限不足');
  });

  it('rejects a banned admin with 401', async () => {
    dbState.storageType = 'upstash';
    authState.authInfo = { username: 'bannedadmin' };
    configState.users = [
      { username: 'bannedadmin', role: 'admin', banned: true },
    ];

    const res = await GET(makeRequest());

    expect(res.status).toBe(401);
    expect((res.body as { error: string }).error).toBe('权限不足');
  });

  it('returns an empty successful payload for an admin with no data', async () => {
    dbState.storageType = 'kvrocks';
    authState.authInfo = { username: 'admin1' };
    configState.users = [
      { username: 'admin1', role: 'admin', createdAt: Date.now() },
    ];

    const res = await GET(makeRequest());

    expect(res.status).toBe(200);
    const body = res.body as Record<string, unknown>;
    expect(body.totalUsers).toBe(1);
    expect(body.totalPlays).toBe(0);
    expect(body.totalWatchTime).toBe(0);
    const userStats = body.userStats as Array<Record<string, unknown>>;
    expect(userStats).toHaveLength(1);
    expect(userStats[0].totalPlays).toBe(0);
    expect(userStats[0].recentRecords).toEqual([]);
    expect(body.topSources).toEqual([]);
    expect((body.topVideos as unknown[]).length).toBe(0);
    expect((body.dailyStats as unknown[]).length).toBe(7);
  });

  it('allows the owner without a config entry', async () => {
    dbState.storageType = 'redis';
    process.env.USERNAME = 'owner1';
    authState.authInfo = { username: 'owner1' };
    configState.users = [];

    const res = await GET(makeRequest());

    expect(res.status).toBe(200);
    const body = res.body as Record<string, unknown>;
    expect(body.totalUsers).toBe(0);
    expect(body.userStats).toEqual([]);
  });

  it('returns empty stats for a user whose play records fail to load', async () => {
    dbState.storageType = 'redis';
    authState.authInfo = { username: 'admin1' };
    configState.users = [
      { username: 'baduser', role: 'user', createdAt: Date.now() },
      { username: 'admin1', role: 'admin', createdAt: Date.now() },
    ];
    dbState.recordsByUser['admin1'] = { key1: makeRecord() };
    dbMocks.db.getAllPlayRecords.mockRejectedValueOnce(
      new Error('storage boom'),
    );

    const res = await GET(makeRequest());

    expect(res.status).toBe(200);
    const body = res.body as Record<string, unknown>;
    const userStats = body.userStats as Array<Record<string, unknown>>;
    expect(userStats).toHaveLength(2);
    const bad = userStats.find((u) => u.username === 'baduser');
    expect(bad).toMatchObject({
      totalPlays: 0,
      totalWatchTime: 0,
      recentRecords: [],
      mostWatchedSource: '',
      loginCount: 0,
    });
    const good = userStats.find((u) => u.username === 'admin1');
    expect(good?.totalPlays).toBe(1);
  });
});
