import { NextRequest } from 'next/server';

jest.mock('@/lib/performance-monitor', () => {
  return {
    __esModule: true,
    getDbQueryCount: jest.fn(() => 0),
    recordRequest: jest.fn(),
    resetDbQueryCount: jest.fn(),
  };
});

jest.mock('@/lib/shortdrama-sources', () => {
  return {
    __esModule: true,
    getAllShortDramaSources: jest.fn(async () => [
      {
        name: 'test',
        api: 'https://test.invalid/api',
        type: 'cms',
        categories: [{ id: 7, name: '短剧' }],
        enabled: true,
      },
    ]),
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

import { GET } from '@/app/api/shortdrama/list/route';

type MockResponse = {
  status: number;
  body: unknown;
  headers: { get: (k: string) => string | undefined };
};

const realFetch = globalThis.fetch;

const makeRequest = (categoryId: string) =>
  ({
    url: `http://localhost/api/shortdrama/list?categoryId=${categoryId}`,
    nextUrl: { searchParams: new URLSearchParams({ categoryId }) },
  }) as unknown as NextRequest;

const item = {
  vod_id: 1,
  vod_name: 'Drama',
  vod_pic: 'https://example.com/cover.jpg',
  vod_time: '2026-09-18 12:00:00',
};

function mockDetail(items: unknown[]) {
  globalThis.fetch = jest.fn(async () => ({
    ok: true,
    json: async () => ({ list: items }),
  })) as unknown as typeof fetch;
}

describe('shortdrama list route cache', () => {
  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  it('caches non-empty results with a shared window', async () => {
    mockDetail([item]);

    const res = (await GET(
      makeRequest('7'),
    )) as unknown as MockResponse;

    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toContain('s-maxage=');
    expect(res.headers.get('Cache-Control')).not.toBe('no-store');
  });

  it('never caches empty results', async () => {
    mockDetail([]);

    const res = (await GET(
      makeRequest('7'),
    )) as unknown as MockResponse;

    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toBe('no-store');
  });
});
