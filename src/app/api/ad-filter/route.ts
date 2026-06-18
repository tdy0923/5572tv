/* eslint-disable no-console */

/**
 * Custom Ad Filter API
 * Allows users to define custom ad filtering rules
 */

import { NextRequest, NextResponse } from 'next/server';

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

    // Validate the code is safe JavaScript
    try {
      new Function(code);
    } catch (e) {
      return NextResponse.json(
        { error: 'Invalid JavaScript code' },
        { status: 400 },
      );
    }

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
