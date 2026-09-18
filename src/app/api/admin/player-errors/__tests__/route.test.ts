import { NextRequest } from 'next/server';

jest.mock('@/lib/analytics-store', () => {
  return {
    __esModule: true,
    getPlayerErrors: jest.fn(async () => ({
      days: 3,
      total: 0,
      top: [],
      recent: [],
    })),
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

import { getPlayerErrors } from '@/lib/analytics-store';

import { GET } from '@/app/api/admin/player-errors/route';

type AuthMockState = {
  authInfo: Record<string, unknown> | null;
};

type ConfigMockState = {
  users: Array<Record<string, unknown>>;
};

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
const mockedGetPlayerErrors = getPlayerErrors as jest.Mock;

const makeRequest = (days?: string) =>
  ({
    nextUrl: { searchParams: new URLSearchParams(days ? { days } : {}) },
  }) as unknown as NextRequest;

describe('admin player-errors route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.replaceProperty(process, 'env', { ...process.env, USERNAME: '' });
    authState.authInfo = null;
    configState.users = [];
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns 401 when no auth info is present', async () => {
    authState.authInfo = null;

    const res = await GET(makeRequest());

    expect(res.status).toBe(401);
    expect(mockedGetPlayerErrors).not.toHaveBeenCalled();
  });

  it('rejects a non-admin user with 401', async () => {
    authState.authInfo = { username: 'plainuser' };
    configState.users = [
      { username: 'plainuser', role: 'user', banned: false },
    ];

    const res = await GET(makeRequest());

    expect(res.status).toBe(401);
    expect(mockedGetPlayerErrors).not.toHaveBeenCalled();
  });

  it('serves the summary for an admin with default days', async () => {
    authState.authInfo = { username: 'admin1' };
    configState.users = [
      { username: 'admin1', role: 'admin', banned: false },
    ];

    const res = await GET(makeRequest());

    expect(res.status).toBe(200);
    expect(mockedGetPlayerErrors).toHaveBeenCalledWith(3);
    expect(res.body).toEqual({ days: 3, total: 0, top: [], recent: [] });
  });

  it('clamps the days param to the supported range', async () => {
    authState.authInfo = { username: 'admin1' };
    configState.users = [
      { username: 'admin1', role: 'admin', banned: false },
    ];

    await GET(makeRequest('99'));
    expect(mockedGetPlayerErrors).toHaveBeenCalledWith(14);

    jest.clearAllMocks();
    await GET(makeRequest('7'));
    expect(mockedGetPlayerErrors).toHaveBeenCalledWith(7);
  });

  it('allows the owner without a config entry', async () => {
    process.env.USERNAME = 'owner1';
    authState.authInfo = { username: 'owner1' };
    configState.users = [];

    const res = await GET(makeRequest('1'));

    expect(res.status).toBe(200);
    expect(mockedGetPlayerErrors).toHaveBeenCalledWith(1);
  });
});
