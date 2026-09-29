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
        categories: [],
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

import { GET } from '@/app/api/shortdrama/search/route';

type MockResponse = {
  status: number;
  body: unknown;
  headers: { get: (k: string) => string | undefined };
};

const realFetch = globalThis.fetch;

const makeRequest = (query: string) =>
  ({
    url: `http://localhost/api/shortdrama/search?query=${query}`,
    nextUrl: { searchParams: new URLSearchParams({ query }) },
  }) as unknown as NextRequest;

const item = {
  vod_id: 1,
  type_id: 30,
  vod_name: 'Drama',
  vod_pic: 'https://example.com/cover.jpg',
  vod_time: '2026-09-18 12:00:00',
};

function mockSearch(items: unknown[]) {
  globalThis.fetch = jest.fn(async (url: string) => {
    if (String(url).includes('ac=list')) {
      return {
        ok: true,
        json: async () => ({ class: [{ type_id: 30, type_name: '短剧' }] }),
      };
    }
    return { ok: true, json: async () => ({ list: items, page: 1, pagecount: 1 }) };
  }) as unknown as typeof fetch;
}

describe('shortdrama search route cache', () => {
  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  it('caches non-empty results', async () => {
    mockSearch([item]);

    const res = (await GET(makeRequest('drama'))) as unknown as MockResponse;

    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toContain('s-maxage=');
    expect(res.headers.get('Cache-Control')).not.toBe('no-store');
  });

  it('never caches empty results', async () => {
    mockSearch([]);

    const res = (await GET(makeRequest('nothing'))) as unknown as MockResponse;

    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toBe('no-store');
  });
});
