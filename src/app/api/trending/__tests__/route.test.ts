import { NextRequest } from 'next/server';

jest.mock('@/lib/performance-monitor', () => {
  return {
    __esModule: true,
    getDbQueryCount: jest.fn(() => 0),
    recordRequest: jest.fn(),
    resetDbQueryCount: jest.fn(),
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

import { GET } from '@/app/api/trending/route';

type MockResponse = {
  status: number;
  body: unknown;
  headers: { get: (k: string) => string | undefined };
};

const realFetch = globalThis.fetch;

const makeRequest = () => ({}) as unknown as NextRequest;

const subject = {
  id: '1',
  title: 'Movie',
  cover: 'https://img9.doubanio.com/view/photo/s_ratio_poster/public/p1.jpg',
  rate: '8.0',
  url: '',
  episodes_info: '',
};

function mockDouban(ok: boolean) {
  globalThis.fetch = jest.fn(async () => {
    if (!ok) throw new Error('network down');
    return { ok: true, json: async () => ({ subjects: [subject] }) };
  }) as unknown as typeof fetch;
}

function totalItems(res: MockResponse): number {
  const body = res.body as { results: Array<{ items: unknown[] }> };
  return body.results.reduce((s, g) => s + g.items.length, 0);
}

describe('trending route cache', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  it('does not cache empty results', async () => {
    mockDouban(false);
    const empty = (await GET(makeRequest())) as unknown as MockResponse;
    expect(empty.status).toBe(200);
    expect(totalItems(empty)).toBe(0);

    mockDouban(true);
    const filled = (await GET(makeRequest())) as unknown as MockResponse;
    expect(filled.status).toBe(200);
    expect(totalItems(filled)).toBeGreaterThan(0);
  });
});
