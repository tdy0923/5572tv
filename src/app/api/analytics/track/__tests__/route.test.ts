import { NextRequest } from 'next/server';

jest.mock('@/lib/analytics-store', () => {
  return {
    __esModule: true,
    trackEvent: jest.fn(),
  };
});

jest.mock('@/lib/auth', () => {
  return {
    __esModule: true,
    getAuthInfoFromCookie: jest.fn(async () => null),
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

import { trackEvent } from '@/lib/analytics-store';

import { POST } from '@/app/api/analytics/track/route';

type TrackEventMock = jest.Mock;

const mockedTrackEvent = trackEvent as TrackEventMock;

const makeRequest = (body: Record<string, unknown>) =>
  ({
    headers: {
      get: (name: string) =>
        name.toLowerCase() === 'user-agent' ? 'Mozilla/5.0' : null,
    },
    json: async () => body,
  }) as unknown as NextRequest;

describe('analytics track route player_error', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('records a player error with context fields', async () => {
    const res = await POST(
      makeRequest({
        type: 'player_error',
        kind: 'error',
        message: 'MEDIA_ERR_DECODE',
        videoId: 'zdrama:123',
        title: 'Test Drama',
        sourceName: 'zuid',
      }),
    );

    expect(res.status).toBe(200);
    expect(mockedTrackEvent).toHaveBeenCalledTimes(1);
    expect(mockedTrackEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'player_error',
        kind: 'error',
        message: 'MEDIA_ERR_DECODE',
        videoId: 'zdrama:123',
        title: 'Test Drama',
        sourceName: 'zuid',
      }),
    );
  });

  it('normalizes unknown kind to error and accepts summary', async () => {
    const res = await POST(
      makeRequest({
        type: 'player_error',
        kind: 'weird',
        message: 'boom',
      }),
    );

    expect(res.status).toBe(200);
    expect(mockedTrackEvent).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'error', message: 'boom' }),
    );

    jest.clearAllMocks();
    const res2 = await POST(
      makeRequest({
        type: 'player_error',
        kind: 'summary',
        message: 'play 1000ms pauses 0 errors 0 switches 0',
      }),
    );

    expect(res2.status).toBe(200);
    expect(mockedTrackEvent).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'summary' }),
    );
  });

  it('rejects a player error without message', async () => {
    const res = await POST(
      makeRequest({ type: 'player_error', kind: 'error' }),
    );

    expect(res.status).toBe(400);
    expect(mockedTrackEvent).not.toHaveBeenCalled();
  });

  it('still rejects unknown types', async () => {
    const res = await POST(makeRequest({ type: 'nope' }));

    expect(res.status).toBe(400);
    expect(mockedTrackEvent).not.toHaveBeenCalled();
  });
});
