import { NextRequest } from 'next/server';

jest.mock('@/lib/performance-monitor', () => {
  return {
    __esModule: true,
    getDbQueryCount: jest.fn(() => 0),
    recordRequest: jest.fn(),
    resetDbQueryCount: jest.fn(),
  };
});

jest.mock('@/lib/shortdrama-dead-registry', () => {
  return {
    __esModule: true,
    sinkDeadDramas: jest.fn((items: unknown) => items),
  };
});

jest.mock('@/lib/shortdrama-sources', () => {
  return {
    __esModule: true,
    getEnabledSources: jest.fn(() => []),
  };
});

jest.mock('@/lib/user-agent', () => {
  return {
    __esModule: true,
    DEFAULT_USER_AGENT: 'test-agent',
  };
});

jest.mock('next/server', () => {
  const makeHeaders = (init?: Record<string, string>) => {
    const store = new Map(Object.entries(init ?? {}));
    return {
      set: (k: string, v: string) => {
        store.set(k, v);
      },
      get: (k: string) => store.get(k),
    };
  };
  return {
    __esModule: true,
    NextRequest: class {},
    NextResponse: {
      json: jest.fn((body: unknown, init?: { status?: number }) => ({
        status: init?.status ?? 200,
        body,
        headers: makeHeaders(),
      })),
    },
  };
});

import { GET } from '@/app/api/shortdrama/recommend/route';

type MockResponse = {
  status: number;
  body: unknown;
  headers: { get: (k: string) => string | undefined };
};

const realFetch = globalThis.fetch;

const makeRequest = (size?: string) =>
  ({
    url: `http://localhost/api/shortdrama/recommend${size ? `?size=${size}` : ''}`,
    nextUrl: {
      searchParams: new URLSearchParams(size ? { size } : {}),
    },
  }) as unknown as NextRequest;

const categoryList = {
  class: [{ type_id: 30, type_name: '短剧' }],
};

const item = {
  vod_id: 1,
  vod_name: 'Drama',
  vod_pic: 'https://example.com/cover.jpg',
  vod_time: '2026-09-18 12:00:00',
  vod_score: '8.0',
  vod_remarks: '全20集',
};

function mockUpstream(items: unknown[]) {
  globalThis.fetch = jest.fn(async (url: string) => {
    if (String(url).includes('ac=list')) {
      return { ok: true, json: async () => categoryList };
    }
    return { ok: true, json: async () => ({ list: items }) };
  }) as unknown as typeof fetch;
}

describe('shortdrama recommend route cache', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  it('serves data with a short shared cache window', async () => {
    mockUpstream([item]);

    const res = (await GET(makeRequest('20'))) as unknown as MockResponse;

    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toContain('s-maxage=300');
    expect(
      (res.body as Array<Record<string, unknown>>).length,
    ).toBeGreaterThan(0);
    expect(res.headers.get('X-Upstream')).toContain('hongniuzy2=1');
  });

  it('never caches empty results', async () => {
    mockUpstream([]);

    const res = (await GET(makeRequest('7'))) as unknown as MockResponse;

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
    expect(res.headers.get('Cache-Control')).toBe('no-store');
  });
});
