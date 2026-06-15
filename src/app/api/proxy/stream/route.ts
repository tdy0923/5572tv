import { NextResponse } from 'next/server';

import { fetchWithRetry, getSourceUserAgent } from '@/lib/proxy';
import { isUrlSafe } from '@/lib/ssrf-protection';

export const runtime = 'nodejs';

function withCorsHeaders(headers: Headers) {
  headers.set('Access-Control-Allow-Origin', '*');
  headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  headers.set(
    'Access-Control-Allow-Headers',
    'Content-Type, Range, Origin, Accept',
  );
  headers.set(
    'Access-Control-Expose-Headers',
    'Content-Length, Content-Range, Accept-Ranges, Content-Type',
  );
}

function copyHeader(
  from: Headers,
  to: Headers,
  sourceKey: string,
  targetKey = sourceKey,
) {
  const value = from.get(sourceKey);
  if (value) {
    to.set(targetKey, value);
  }
}

export async function OPTIONS() {
  const headers = new Headers();
  withCorsHeaders(headers);
  return new Response(null, { status: 204, headers });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');
  const source =
    searchParams.get('5572tv-source') ||
    searchParams.get('moontv-source') ||
    searchParams.get('decotv-source');

  if (!url) {
    return NextResponse.json({ error: 'Missing url' }, { status: 400 });
  }

  // SSRF protection: block internal/private IPs
  const decodedUrl = decodeURIComponent(url);
  if (!isUrlSafe(decodedUrl)) {
    return NextResponse.json({ error: '禁止访问内部地址' }, { status: 403 });
  }

  const ua = await getSourceUserAgent(source);

  try {
    const targetUrl = new URL(decodedUrl);
    const requestHeaders: Record<string, string> = {
      Accept: '*/*',
      Referer: `${targetUrl.protocol}//${targetUrl.host}${targetUrl.pathname}`,
      Origin: `${targetUrl.protocol}//${targetUrl.host}`,
    };

    const range = request.headers.get('range');
    if (range) {
      requestHeaders.Range = range;
    }

    const response = await fetchWithRetry(
      decodedUrl,
      {
        cache: 'no-cache',
        redirect: 'follow',
        headers: requestHeaders,
      },
      ua,
    );

    if (!response.ok && response.status !== 206) {
      return NextResponse.json(
        { error: 'Failed to fetch stream' },
        { status: response.status || 500 },
      );
    }

    const headers = new Headers();
    withCorsHeaders(headers);
    headers.set('Cache-Control', 'no-cache');

    copyHeader(response.headers, headers, 'content-type', 'Content-Type');
    copyHeader(response.headers, headers, 'content-length', 'Content-Length');
    copyHeader(response.headers, headers, 'content-range', 'Content-Range');
    copyHeader(response.headers, headers, 'accept-ranges', 'Accept-Ranges');
    copyHeader(
      response.headers,
      headers,
      'content-disposition',
      'Content-Disposition',
    );

    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/octet-stream');
    }
    if (!headers.has('Accept-Ranges')) {
      headers.set('Accept-Ranges', 'bytes');
    }

    return new Response(response.body, {
      status: response.status,
      headers,
    });
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch stream' },
      { status: 500 },
    );
  }
}
