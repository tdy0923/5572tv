import { NextRequest, NextResponse } from 'next/server';

import { getEnabledSources } from '@/lib/shortdrama-sources';
import { DEFAULT_USER_AGENT } from '@/lib/user-agent';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * 短剧跨源兜底：按剧名在其他启用的采集源中搜索同名剧集，
 * 解析出各自的播放列表，并对第一集做快速存活探测，
 * 存活源排在前面，供播放器候选链直接消费。
 *
 * 背景：各短剧源的 ID 互不通用（按 ID 回退等于无效），
 * 唯一可靠的跨源匹配键是剧名。
 */
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const name = (sp.get('name') || '').trim();
  const excludeApi = sp.get('exclude') || '';

  if (!name || name.length < 2) {
    return NextResponse.json({ alternatives: [] });
  }

  const sources = getEnabledSources().filter(
    (s) => !excludeApi || s.api !== excludeApi,
  );

  const norm = (s: string) => s.replace(/\s+/g, '').toLowerCase();

  const results = await Promise.allSettled(
    sources.map(async (src) => {
      const listUrl = `${src.api}?ac=videolist&wd=${encodeURIComponent(name)}`;
      const res = await fetch(listUrl, {
        headers: {
          'User-Agent': DEFAULT_USER_AGENT,
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const list: any[] = json.list || [];
      // 剧名精确匹配优先，其次包含匹配
      const hit =
        list.find((it) => norm(it.vod_name || '') === norm(name)) ||
        list.find((it) => (it.vod_name || '').includes(name)) ||
        null;
      if (!hit) throw new Error('no match');

      // 解析 vod_play_url：格式 "第01集$url1#第02集$url2"
      const playUrl: string = hit.vod_play_url || '';
      const eps = playUrl
        .split('#')
        .map((seg) => {
          const idx = seg.lastIndexOf('$');
          return idx >= 0 ? seg.slice(idx + 1).trim() : seg.trim();
        })
        .filter((u) => /^https?:\/\//.test(u));
      if (eps.length === 0) throw new Error('no episodes');

      const titles = playUrl
        .split('#')
        .map((seg) => (seg.lastIndexOf('$') >= 0 ? seg.split('$')[0] : ''));

      // 第一集存活探测：GET + Range，4 秒超时
      let alive = false;
      try {
        const probe = await fetch(eps[0], {
          headers: {
            'User-Agent': DEFAULT_USER_AGENT,
            Referer: `https://${new URL(eps[0]).host}/`,
            Range: 'bytes=0-2047',
          },
          signal: AbortSignal.timeout(4000),
        });
        alive = probe.status === 200 || probe.status === 206;
        try {
          await probe.body?.cancel();
        } catch {}
      } catch {}

      return {
        source_name: src.name,
        episodes: eps,
        episodes_titles: titles,
        alive,
      };
    }),
  );

  const alternatives = results
    .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
    .map((r) => r.value)
    .sort((a, b) => Number(b.alive) - Number(a.alive))
    .slice(0, 4);

  return NextResponse.json(
    { alternatives },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
