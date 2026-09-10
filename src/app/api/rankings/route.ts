import { NextResponse } from 'next/server';

import { getAnalyticsSummary } from '@/lib/analytics-store';
import { db } from '@/lib/db';
import { fetchDoubanWithProxy } from '@/lib/douban-proxy';
import {
  DOUBAN_BOARDS,
  DoubanBoardConfig,
  RankingBoard,
  RankingItem,
} from '@/lib/rankings';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// 榜单聚合结果内存缓存（单实例部署下有效，避免每次请求都回源豆瓣）
const boardCache = new Map<string, { data: RankingBoard; ts: number }>();
const BOARD_CACHE_TTL = 30 * 60 * 1000; // 30 分钟

function pruneBoardCache() {
  const now = Date.now();
  for (const [key, entry] of boardCache.entries()) {
    if (now - entry.ts >= BOARD_CACHE_TTL) boardCache.delete(key);
  }
}

interface DoubanSubject {
  id?: string;
  title?: string;
  cover?: string;
  cover_url?: string;
  rate?: string;
  rating?: [string] | { value: number };
  release_date?: string;
  year?: string;
}

function yearOf(s: DoubanSubject): string {
  if (s.release_date) return s.release_date.slice(0, 4);
  if (s.year) return String(s.year).slice(0, 4);
  return '';
}

function rateOf(s: DoubanSubject): string {
  if (typeof s.rate === 'string' && s.rate) return s.rate;
  if (Array.isArray(s.rating) && s.rating[0]) return String(s.rating[0]);
  if (s.rating && typeof s.rating === 'object' && 'value' in s.rating) {
    return Number(s.rating.value).toFixed(1);
  }
  return '';
}

/** 从 subjects / 数组两种响应形状归一化 */
function toRankingItems(
  subjects: DoubanSubject[],
  type: 'movie' | 'tv',
): RankingItem[] {
  const items: RankingItem[] = [];
  for (const s of subjects) {
    const title = (s.title || '').trim();
    if (!title || /^\d+$/.test(title)) continue;
    items.push({
      id: String(s.id || ''),
      title,
      poster: s.cover || s.cover_url || '',
      rate: rateOf(s),
      year: yearOf(s),
      type,
      douban_id: s.id ? Number(s.id) || undefined : undefined,
    });
  }
  return items;
}

/** 通过豆瓣 tag 接口获取榜单 */
async function fetchDoubanTagBoard(
  board: DoubanBoardConfig,
): Promise<RankingItem[]> {
  const url = `https://movie.douban.com/j/search_subjects?type=${board.type}&tag=${encodeURIComponent(board.tag)}&sort=${board.sort}&page_limit=${board.limit}&page_start=0`;
  try {
    const { data } = await fetchDoubanWithProxy<any>(url, 6000);
    const subjects: DoubanSubject[] = Array.isArray(data?.subjects)
      ? data.subjects
      : [];
    return toRankingItems(subjects, board.type);
  } catch (e) {
    console.warn(`[rankings] 豆瓣榜单 ${board.id} 获取失败:`, e);
    return [];
  }
}

/** 豆瓣电影 Top250 图表接口（j/chart/top_list），失败回退 tag 榜单 */
async function fetchDoubanTop250(
  board: DoubanBoardConfig,
): Promise<RankingItem[]> {
  const url = `https://movie.douban.com/j/chart/top_list?type=11&interval_id=100:90&action=&start=0&limit=${board.limit}`;
  try {
    const { data } = await fetchDoubanWithProxy<any>(url, 6000);
    if (Array.isArray(data) && data.length > 0) {
      return toRankingItems(data as DoubanSubject[], board.type);
    }
  } catch (e) {
    console.warn(`[rankings] Top250 图表接口失败，回退 tag:`, e);
  }
  return fetchDoubanTagBoard(board);
}

async function getDoubanBoard(board: DoubanBoardConfig): Promise<RankingBoard> {
  const cached = boardCache.get(board.id);
  if (cached && Date.now() - cached.ts < BOARD_CACHE_TTL) {
    return cached.data;
  }

  const items = board.top250
    ? await fetchDoubanTop250(board)
    : await fetchDoubanTagBoard(board);

  const result: RankingBoard = {
    id: board.id,
    title: board.title,
    subtitle: '豆瓣榜单 · 点击可匹配站内资源',
    group: board.group,
    kind: 'douban',
    items,
  };
  boardCache.set(board.id, { data: result, ts: Date.now() });
  return result;
}

/** 站内热播榜（近 30 天播放量聚合） */
async function getSitePlayBoard(): Promise<RankingBoard> {
  const cached = boardCache.get('site-play');
  if (cached && Date.now() - cached.ts < BOARD_CACHE_TTL) return cached.data;

  let items: RankingItem[] = [];
  try {
    const summary = getAnalyticsSummary(30);
    items = summary.topVideos
      .filter((v) => v.videoId && v.title && v.videoId.includes(':'))
      .slice(0, 30)
      .map((v) => {
        const sep = v.videoId.indexOf(':');
        const source = v.videoId.slice(0, sep);
        const id = v.videoId.slice(sep + 1);
        return {
          id,
          videoId: v.videoId,
          title: v.title,
          poster: '',
          rate: '',
          year: '',
          type: 'movie' as const,
          source,
          count: v.count,
        } as RankingItem;
      });
  } catch (e) {
    console.warn('[rankings] 站内热播榜获取失败:', e);
  }

  const result: RankingBoard = {
    id: 'site-play',
    title: '站内热播榜',
    subtitle: '近 30 天全站播放热度',
    group: 'site',
    kind: 'site',
    items,
  };
  boardCache.set('site-play', { data: result, ts: Date.now() });
  return result;
}

/** 站内热搜榜（搜索词热度） */
async function getSiteSearchBoard(): Promise<RankingBoard> {
  const cached = boardCache.get('site-search');
  if (cached && Date.now() - cached.ts < BOARD_CACHE_TTL) return cached.data;

  let items: RankingItem[] = [];
  try {
    const queries = (await db.getCache('trending:queries')) as
      | Array<{ query: string; count: number }>
      | undefined;
    if (Array.isArray(queries)) {
      items = queries.slice(0, 30).map((q) => ({
        id: `q:${q.query}`,
        query: q.query,
        title: q.query,
        poster: '',
        rate: '',
        year: '',
        type: 'movie' as const,
        count: q.count,
      }));
    }
  } catch (e) {
    console.warn('[rankings] 站内热搜榜获取失败:', e);
  }

  const result: RankingBoard = {
    id: 'site-search',
    title: '站内热搜榜',
    subtitle: '全站用户搜索热度',
    group: 'site',
    kind: 'site',
    items,
  };
  boardCache.set('site-search', { data: result, ts: Date.now() });
  return result;
}

export async function GET() {
  pruneBoardCache();
  const start = Date.now();

  const [doubanBoards, sitePlay, siteSearch] = await Promise.all([
    Promise.all(DOUBAN_BOARDS.map((b) => getDoubanBoard(b))),
    getSitePlayBoard(),
    getSiteSearchBoard(),
  ]);

  // 按配置顺序排列，站内榜放最后
  const boards: RankingBoard[] = [...doubanBoards, sitePlay, siteSearch];

  return NextResponse.json(
    { success: true, boards, _ms: Date.now() - start },
    {
      headers: {
        'Cache-Control': 'public, max-age=300, s-maxage=300',
      },
    },
  );
}
