import { NextRequest, NextResponse } from 'next/server';

import { trackEvent } from '@/lib/analytics-store';
import { getAuthInfoFromCookie } from '@/lib/auth';

export const runtime = 'nodejs';

// 简单的内存限流：每个 IP 每分钟最多 120 个事件
const RATE_LIMIT = 120;
const RATE_WINDOW_MS = 60 * 1000;
const ipCounters = new Map<string, { count: number; resetAt: number }>();

// 页面访问去重：同一身份 3 秒内相同路径只记一次（避免重复挂载/刷新竞态）
const lastPageview = new Map<string, { path: string; ts: number }>();
const PAGEVIEW_DEDUPE_MS = 3000;

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = ipCounters.get(ip);
  if (!entry || entry.resetAt < now) {
    ipCounters.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  entry.count++;
  return entry.count > RATE_LIMIT;
}

function getClientIp(request: NextRequest): string {
  const fwd = request.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return (
    request.headers.get('x-real-ip') ||
    request.headers.get('cf-connecting-ip') ||
    'unknown'
  );
}

/**
 * POST /api/analytics/track
 * 客户端行为埋点上报（无需登录，匿名采集）
 */
export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  if (rateLimited(ip)) {
    return NextResponse.json({ ok: false }, { status: 429 });
  }

  const ua = request.headers.get('user-agent') || '';

  // 明显非浏览器请求忽略（爬虫/脚本）
  if (!ua) {
    return NextResponse.json({ ok: true }, { status: 200 });
  }
  if (/bot|spider|crawl|curl|wget|python|node|http-client/i.test(ua)) {
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const type = typeof body.type === 'string' ? body.type : '';
  const anon = (typeof body.anon === 'string' && body.anon.slice(0, 64)) || ip;

  let authInfo: { username?: string } | null = null;
  try {
    authInfo = await getAuthInfoFromCookie(request);
  } catch {
    authInfo = null;
  }
  const uid = authInfo?.username || undefined;

  const ts = Date.now();

  // 页面访问去重
  if (type === 'pageview') {
    const path = typeof body.path === 'string' ? body.path.slice(0, 200) : '/';
    const identity = uid || anon;
    const last = lastPageview.get(identity);
    if (last && last.path === path && ts - last.ts < PAGEVIEW_DEDUPE_MS) {
      return NextResponse.json({ ok: true }, { status: 200 });
    }
    lastPageview.set(identity, { path, ts });
    trackEvent({
      type: 'pageview',
      ts,
      uid,
      anon,
      path,
      ref: typeof body.ref === 'string' ? body.ref.slice(0, 300) : undefined,
      ua: ua.slice(0, 200),
    });
    return NextResponse.json({ ok: true });
  }

  if (type === 'search') {
    const query =
      typeof body.query === 'string' ? body.query.slice(0, 100) : '';
    if (!query.trim()) return NextResponse.json({ ok: true });
    trackEvent({
      type: 'search',
      ts,
      uid,
      anon,
      query,
      results: typeof body.results === 'number' ? body.results : undefined,
    });
    return NextResponse.json({ ok: true });
  }

  if (type === 'play') {
    const videoId =
      typeof body.videoId === 'string' ? body.videoId.slice(0, 200) : '';
    if (!videoId) return NextResponse.json({ ok: true });
    trackEvent({
      type: 'play',
      ts,
      uid,
      anon,
      videoId,
      title: typeof body.title === 'string' ? body.title.slice(0, 200) : '',
      sourceName:
        typeof body.sourceName === 'string'
          ? body.sourceName.slice(0, 100)
          : undefined,
    });
    return NextResponse.json({ ok: true });
  }

  if (type === 'favorite') {
    const videoId =
      typeof body.videoId === 'string' ? body.videoId.slice(0, 200) : '';
    if (!videoId) return NextResponse.json({ ok: true });
    trackEvent({
      type: 'favorite',
      ts,
      uid,
      anon,
      videoId,
      title:
        typeof body.title === 'string' ? body.title.slice(0, 200) : undefined,
      action: body.action === 'remove' ? 'remove' : 'add',
    });
    return NextResponse.json({ ok: true });
  }

  if (type === 'download') {
    trackEvent({
      type: 'download',
      ts,
      uid,
      anon,
      apk: typeof body.apk === 'string' ? body.apk.slice(0, 100) : 'apk',
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: false }, { status: 400 });
}
