import { NextRequest } from 'next/server';

jest.mock('@/lib/config', () => {
  return {
    __esModule: true,
    getCacheTime: jest.fn(async () => 600),
  };
});

jest.mock('@/lib/douban', () => {
  return {
    __esModule: true,
    fetchDoubanData: jest.fn(),
  };
});

jest.mock('@/lib/performance-monitor', () => {
  return {
    __esModule: true,
    getDbQueryCount: jest.fn(() => 0),
    recordRequest: jest.fn(),
    resetDbQueryCount: jest.fn(),
  };
});

jest.mock('next/server', () => {
  return {
    __esModule: true,
    NextRequest: class {},
    NextResponse: {
      json: jest.fn((body: unknown, init?: { status?: number }) => ({
        status: init?.status ?? 200,
        body,
        headers: new Map(Object.entries(init?.headers ?? {})),
      })),
    },
  };
});

import { fetchDoubanData } from '@/lib/douban';

import { GET } from '@/app/api/douban/recommends/route';

type MockResponse = {
  status: number;
  body: unknown;
  headers: Map<string, string>;
};

const mockedFetchDoubanData = fetchDoubanData as jest.Mock;

const makeRequest = () =>
  ({
    url: 'http://localhost/api/douban/recommends?kind=movie',
    nextUrl: { searchParams: new URLSearchParams({ kind: 'movie' }) },
  }) as unknown as NextRequest;

const apiItem = {
  id: '1',
  title: 'Movie',
  type: 'movie',
  pic: { normal: 'https://example.com/pic.jpg', large: '' },
  rating: { value: 8.5 },
  year: '2026',
};

describe('douban recommends route cache', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('caches non-empty results', async () => {
    mockedFetchDoubanData.mockResolvedValue({ items: [apiItem] });

    const res = (await GET(makeRequest())) as unknown as MockResponse;

    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toContain('s-maxage=600');
  });

  it('never caches empty results', async () => {
    mockedFetchDoubanData.mockResolvedValue({ items: [] });

    const res = (await GET(makeRequest())) as unknown as MockResponse;

    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toBe('no-store');
  });
});
