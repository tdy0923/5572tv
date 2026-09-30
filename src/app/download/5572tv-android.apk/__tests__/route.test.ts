import { NextRequest } from 'next/server';

jest.mock('@/lib/analytics-store', () => {
  return {
    __esModule: true,
    trackEvent: jest.fn(),
  };
});

jest.mock('next/server', () => {
  return {
    __esModule: true,
    NextRequest: class {},
    NextResponse: {
      redirect: jest.fn((url: string | URL, init?: { status?: number }) => ({
        status: init?.status ?? 307,
        location: String(url),
      })),
    },
  };
});

import { GET } from '@/app/download/5572tv-android.apk/route';

const makeRequest = (host = '0.0.0.0:3000') =>
  ({
    url: `http://${host}/download/5572tv-android.apk`,
    headers: { get: (name: string) => (name === 'host' ? host : null) },
  }) as unknown as NextRequest;

describe('download apk route', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('prefers SITE_BASE over the container request host', async () => {
    jest.replaceProperty(process, 'env', {
      ...process.env,
      SITE_BASE: 'https://www.5572.net',
    });

    const res = (await GET(makeRequest())) as unknown as {
      status: number;
      location: string;
    };

    expect(res.status).toBe(302);
    expect(res.location).toBe(
      'https://www.5572.net/static/download/5572tv-android.apk',
    );
  });

  it('falls back to the request host without SITE_BASE', async () => {
    const env = { ...process.env };
    delete env.SITE_BASE;
    jest.replaceProperty(process, 'env', env);

    const res = (await GET(makeRequest())) as unknown as {
      status: number;
      location: string;
    };

    expect(res.status).toBe(302);
    expect(res.location).toBe(
      'http://0.0.0.0:3000/static/download/5572tv-android.apk',
    );
  });
});
