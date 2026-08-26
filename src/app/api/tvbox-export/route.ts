/**
 * TVBox Compatibility Export API（别名端点，逻辑复用 /api/tvbox 共享模块）
 */

import { NextRequest, NextResponse } from 'next/server';

import { getConfig } from '@/lib/config';
import {
  buildTvboxConfig,
  getSiteBase,
  resolveTvboxAccess,
} from '@/lib/tvboxConfig';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const format = searchParams.get('format') || 'json';

    const config = await getConfig();
    const baseUrl = getSiteBase(request);

    const access = await resolveTvboxAccess(request, config);
    if (!access.ok) {
      return NextResponse.json(
        { error: access.status === 403 ? 'Forbidden' : 'Unauthorized' },
        { status: access.status || 401 },
      );
    }

    const rawMode = searchParams.get('mode') || 'standard';
    const mode = (
      rawMode === 'safe' || rawMode === 'fast' || rawMode === 'yingshicang'
        ? rawMode
        : 'standard'
    ) as 'standard' | 'safe' | 'fast' | 'yingshicang';

    const filterParam = searchParams.get('filter');
    const adultParam = searchParams.get('adult');
    const includeAdult =
      filterParam === 'off' ||
      filterParam === 'disable' ||
      adultParam === '1' ||
      adultParam === 'true';

    const tvboxConfig = buildTvboxConfig(config, baseUrl, {
      mode,
      includeAdult,
      user: access.user,
      isGlobalToken: access.isGlobalToken,
    });

    if (format === 'base64') {
      return new NextResponse(
        Buffer.from(JSON.stringify(tvboxConfig)).toString('base64'),
        {
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'no-store',
          },
        },
      );
    }

    return NextResponse.json(tvboxConfig, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('TVBox export error:', error);
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': '*',
    },
  });
}
