/* eslint-disable no-console */

/**
 * CMS Proxy - Proxies CMS API responses and rewrites m3u8 URLs
 * Based on MoonTVPlus implementation
 *
 * Key features:
 * - Proxies CMS API requests to bypass CORS
 * - Rewrites m3u8 play URLs to go through local proxy
 * - Adds auth token for proxy authentication
 * - Handles multiple source formats
 */

import { NextRequest, NextResponse } from 'next/server';

import { DEFAULT_USER_AGENT } from '@/lib/user-agent';

export const runtime = 'nodejs';

interface CmsSource {
  key: string;
  name: string;
  api: string;
  detail?: string;
}

/**
 * Parse play URL string from CMS format
 * Format: "第01集$url1#第02集$url2" or "title1$url1$$$title2$url2"
 */
function parsePlayUrls(playUrl: string): Array<{ title: string; url: string }> {
  const results: Array<{ title: string; url: string }> = [];

  // Split by $$$ for multiple sources, then by # for episodes
  const sources = playUrl.split('$$$');

  for (const source of sources) {
    const episodes = source.split('#');
    for (const ep of episodes) {
      const parts = ep.split('$');
      if (parts.length >= 2) {
        results.push({
          title: parts[0].trim(),
          url: parts.slice(1).join('$').trim(),
        });
      }
    }
  }

  return results;
}

/**
 * Rewrite m3u8 URLs to go through proxy
 */
function rewriteM3u8Urls(
  playUrl: string,
  proxyOrigin: string,
  sourceKey: string,
  token?: string,
): string {
  const episodes = parsePlayUrls(playUrl);

  const rewritten = episodes.map((ep) => {
    let url = ep.url;

    // Only rewrite m3u8 URLs
    if (url.includes('.m3u8')) {
      const proxyUrl = new URL(`${proxyOrigin}/api/proxy/m3u8`);
      proxyUrl.searchParams.set('url', url);
      proxyUrl.searchParams.set('source', sourceKey);
      if (token) {
        proxyUrl.searchParams.set('token', token);
      }
      url = proxyUrl.toString();
    }

    return `${ep.title}$${url}`;
  });

  return rewritten.join('#');
}

/**
 * Process CMS API response to rewrite play URLs
 */
function processCmsResponse(
  data: any,
  proxyOrigin: string,
  sourceKey: string,
  token?: string,
): any {
  if (!data || !data.list) return data;

  // Process each item in the list
  for (const item of data.list) {
    if (item.vod_play_url) {
      item.vod_play_url = rewriteM3u8Urls(
        item.vod_play_url,
        proxyOrigin,
        sourceKey,
        token,
      );
    }
  }

  return data;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const apiUrl = searchParams.get('api');
    const sourceKey = searchParams.get('source') || 'unknown';
    const token = process.env.NEXT_PUBLIC_PROXY_M3U8_TOKEN;

    if (!apiUrl) {
      return NextResponse.json(
        { error: 'Missing api parameter' },
        { status: 400 },
      );
    }

    // Validate URL
    let targetUrl: URL;
    try {
      targetUrl = new URL(apiUrl);
    } catch {
      return NextResponse.json({ error: 'Invalid API URL' }, { status: 400 });
    }

    // Forward all query parameters except api and source
    const forwardParams = new URLSearchParams();
    searchParams.forEach((value, key) => {
      if (key !== 'api' && key !== 'source') {
        forwardParams.set(key, value);
      }
    });

    const fullUrl = `${targetUrl.origin}${targetUrl.pathname}${forwardParams.toString() ? '?' + forwardParams.toString() : ''}`;

    // Fetch from CMS API
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(fullUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': DEFAULT_USER_AGENT,
        Accept: 'application/json',
      },
    });
    clearTimeout(timer);

    if (!response.ok) {
      return NextResponse.json(
        { error: `Upstream error: ${response.status}` },
        { status: response.status },
      );
    }

    const data = await response.json();

    // Get proxy origin for URL rewriting
    const proxyOrigin = request.nextUrl.origin;

    // Process response to rewrite m3u8 URLs
    const processedData = processCmsResponse(
      data,
      proxyOrigin,
      sourceKey,
      token,
    );

    // Return with CORS headers
    return NextResponse.json(processedData, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  } catch (error) {
    console.error('CMS proxy error:', error);
    return NextResponse.json(
      { error: 'Proxy request failed' },
      { status: 500 },
    );
  }
}
