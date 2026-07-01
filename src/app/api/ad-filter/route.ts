/* eslint-disable no-console */

/**
 * Custom Ad Filter API
 * Allows users to define custom ad filtering rules
 */

import { NextRequest, NextResponse } from 'next/server';
import { NodeVM } from 'vm2';

import { getAuthInfoFromCookie } from '@/lib/auth';
import { clearConfigCache, getConfig } from '@/lib/config';
import { db } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const authInfo = await getAuthInfoFromCookie(request);
    if (!authInfo || !authInfo.username) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const config = await getConfig();
    const adFilterCode = (config.SiteConfig as any)?.AdFilterCode || '';

    return NextResponse.json({
      ok: true,
      code: adFilterCode,
    });
  } catch (error) {
    console.error('Get ad filter error:', error);
    return NextResponse.json(
      { error: 'Failed to get ad filter' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authInfo = await getAuthInfoFromCookie(request);
    if (!authInfo || !authInfo.username) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only owner can modify
    if (authInfo.username !== process.env.USERNAME) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { code } = body;

    if (typeof code !== 'string') {
      return NextResponse.json({ error: 'Invalid code' }, { status: 400 });
    }

    // Validate the code is safe JavaScript using VM2
    try {
      const vm = new NodeVM({
        timeout: 3000,
        sandbox: {},
        eval: false,
        wasm: false,
        console: 'redirect',
        require: {
          external: false,
          builtin: [],
          root: './',
          mock: null,
        },
      });
      await vm.run(`module.exports = async () => { ${code} };`, __dirname);
    } catch {
      return NextResponse.json(
        { error: 'Invalid or unsafe JavaScript code' },
        { status: 400 },
      );
    }

    // Rate limit: 10 modifications per minute per IP
    const ip =
      request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') ||
      'unknown';
    const rateLimitKey = `ad-filter:${ip}`;
    const now = Date.now();
    const WINDOW_MS = 60 * 1000;
    const MAX_REQUESTS = 10;
    const rateLimitStore =
      (globalThis as any).__rateLimitStore ||
      ((globalThis as any).__rateLimitStore = new Map());
    const entry = rateLimitStore.get(rateLimitKey);
    if (entry && now < entry.resetTime && entry.count >= MAX_REQUESTS) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 },
      );
    }
    rateLimitStore.set(rateLimitKey, {
      count: (entry?.count || 0) + 1,
      resetTime: now + WINDOW_MS,
    });

    // Save to config
    const config = await getConfig();
    if (!config.SiteConfig) {
      config.SiteConfig = {} as any;
    }
    // Use a generic approach to set the property
    (config.SiteConfig as any).AdFilterCode = code;

    await db.saveAdminConfig(config);
    clearConfigCache();

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Save ad filter error:', error);
    return NextResponse.json(
      { error: 'Failed to save ad filter' },
      { status: 500 },
    );
  }
}
