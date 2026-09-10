import { NextRequest, NextResponse } from 'next/server';

import { getAuthInfoFromCookie } from '@/lib/auth';
import { ApiSite, getAvailableApiSites } from '@/lib/config';
import { db } from '@/lib/db';
import { generateSearchVariants, searchFromApi } from '@/lib/downstream';
import { SearchResult } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const AVAIL_TTL = 6 * 60 * 60; // 6 小时
const SEARCH_TIMEOUT_MS = 2500;
const MAX_ITEMS = 80;
const CONCURRENCY = 6;
const MAX_SITES = 4;

// 内存缓存，避免同一实例内重复回源
const memCache = new Map<string, { value: AvailabilityResult; ts: number }>();

function normalize(s: string): string {
  return (s || '').toLowerCase().replace(/[^\w\u4e00-\u9fff]/g, '');
}

interface AvailabilityResult {
  available: boolean;
  source?: string;
  id?: string;
  matchedTitle?: string;
}

function titleMatches(queryTitle: string, candidateTitle: string): boolean {
  const q = normalize(queryTitle);
  const c = normalize(candidateTitle);
  if (!q || !c) return false;
  if (q === c) return true;
  // 标题互相包含（去标点后）也视为匹配
  return q.includes(c) || c.includes(q);
}

/**
 * 单个标题的站内可用性检查：并行搜索前若干源，任一源返回结果即结束。
 * 有 douban_id 时，命中相同 douban_id 的结果优先视为可播。
 */
async function checkTitle(
  title: string,
  doubanId: number | undefined,
  sites: ApiSite[],
): Promise<AvailabilityResult> {
  const variants = generateSearchVariants(title);
  // 只探测前 MAX_SITES 个源，避免一次匹配打爆下游所有源
  const targetSites = sites.slice(0, MAX_SITES);

  const searchPromise = new Promise<SearchResult[]>((resolve) => {
    let settled = false;
    let pending = targetSites.length;
    const collected: SearchResult[] = [];

    if (pending === 0) {
      resolve(collected);
      return;
    }

    for (const site of targetSites) {
      searchFromApi(site, title, variants)
        .then((r) => {
          if (settled) return;
          if (Array.isArray(r) && r.length > 0) {
            collected.push(...r);
            settled = true;
            resolve(collected);
          } else {
            pending--;
            if (pending === 0) {
              settled = true;
              resolve(collected);
            }
          }
        })
        .catch(() => {
          if (settled) return;
          pending--;
          if (pending === 0) {
            settled = true;
            resolve(collected);
          }
        });
    }
  });

  const timeout = new Promise<SearchResult[]>((resolve) =>
    setTimeout(() => resolve([]), SEARCH_TIMEOUT_MS),
  );

  const results = await Promise.race([searchPromise, timeout]);

  if (results.length === 0) {
    return { available: false };
  }

  // 优先按 douban_id 精确匹配
  if (doubanId && doubanId > 0) {
    const byDouban = results.find((r) => r.douban_id === doubanId);
    if (byDouban) {
      return {
        available: true,
        source: byDouban.source,
        id: byDouban.id,
        matchedTitle: byDouban.title,
      };
    }
  }

  // 其次按标题归一化匹配
  const byTitle = results.find((r) => titleMatches(title, r.title));
  if (byTitle) {
    return {
      available: true,
      source: byTitle.source,
      id: byTitle.id,
      matchedTitle: byTitle.title,
    };
  }

  return { available: false };
}

async function getCached(key: string): Promise<AvailabilityResult | null> {
  const mem = memCache.get(key);
  if (mem && Date.now() - mem.ts < AVAIL_TTL * 1000) return mem.value;
  try {
    const dbVal = (await db.getCache(key)) as AvailabilityResult | null;
    if (dbVal && typeof dbVal === 'object') {
      memCache.set(key, { value: dbVal, ts: Date.now() });
      return dbVal;
    }
  } catch {
    // 缓存读取失败继续回源
  }
  return null;
}

async function setCached(
  key: string,
  value: AvailabilityResult,
): Promise<void> {
  memCache.set(key, { value, ts: Date.now() });
  await db.setCache(key, value, AVAIL_TTL).catch(() => {});
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => null)) as {
      items?: Array<{ title?: string; douban_id?: number }>;
    } | null;

    if (!body?.items || !Array.isArray(body.items)) {
      return NextResponse.json(
        { success: false, error: 'items 参数缺失' },
        { status: 400 },
      );
    }

    const items = body.items
      .filter((it) => typeof it?.title === 'string' && it.title.trim())
      .slice(0, MAX_ITEMS);

    const authInfo = await getAuthInfoFromCookie(request);
    const sites = await getAvailableApiSites(authInfo?.username);

    const results: Array<{ key: string; title: string } & AvailabilityResult> =
      [];

    // 有界并发处理，避免一次请求打爆下游源
    let idx = 0;
    const workers = Array.from(
      { length: Math.min(CONCURRENCY, Math.max(1, items.length)) },
      async () => {
        while (idx < items.length) {
          const it = items[idx++];
          const title = it.title!.trim();
          const key = normalize(title) || title;
          const cacheKey = `rankings:avail:${key}`;

          const cached = await getCached(cacheKey);
          if (cached) {
            results.push({ key, title, ...cached });
            continue;
          }

          const res = await checkTitle(title, it.douban_id, sites);
          await setCached(cacheKey, res);
          results.push({ key, title, ...res });
        }
      },
    );
    await Promise.all(workers);

    return NextResponse.json({ success: true, results });
  } catch (e) {
    console.error('[rankings/availability] 失败:', e);
    return NextResponse.json({ success: false, results: [] }, { status: 500 });
  }
}
