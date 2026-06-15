import { NextRequest, NextResponse } from 'next/server';

import { getAuthInfoFromCookie } from '@/lib/auth';
import { clearConfigCache, getConfig } from '@/lib/config';
import { db } from '@/lib/db';

export const runtime = 'nodejs';

function sanitizeCSS(css: string): string {
  let sanitized = css.replace(
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    '',
  );
  sanitized = sanitized.replace(
    /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
    '',
  );
  sanitized = sanitized.replace(/expression\s*\(/gi, '');
  sanitized = sanitized.replace(/javascript\s*:/gi, '');
  sanitized = sanitized.replace(/url\s*\(\s*['"]?\s*javascript:/gi, '');
  return sanitized;
}

export async function GET(_request: NextRequest) {
  try {
    const config = await getConfig();
    const customCSS = config.SiteConfig?.CustomCSS || '';

    return NextResponse.json({ CustomCSS: customCSS });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to get custom CSS' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const storageType = process.env.NEXT_PUBLIC_STORAGE_TYPE || 'localstorage';
  if (storageType === 'localstorage') {
    return NextResponse.json({ error: '不支持本地存储' }, { status: 400 });
  }

  const authInfo = await getAuthInfoFromCookie(request);
  if (!authInfo || !authInfo.username) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (authInfo.username !== process.env.USERNAME) {
    return NextResponse.json(
      { error: '只有站长可以修改主题' },
      { status: 403 },
    );
  }

  try {
    const body = await request.json();
    const { CustomCSS } = body;

    if (typeof CustomCSS !== 'string') {
      return NextResponse.json(
        { error: 'CustomCSS must be a string' },
        { status: 400 },
      );
    }

    const sanitized = sanitizeCSS(CustomCSS);

    const config = await getConfig();
    config.SiteConfig.CustomCSS = sanitized;

    await db.saveAdminConfig(config);
    clearConfigCache();

    return NextResponse.json({ success: true, CustomCSS: sanitized });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to save custom CSS' },
      { status: 500 },
    );
  }
}
