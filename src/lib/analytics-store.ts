/* eslint-disable no-console */
/**
 * 文件存储版用户行为分析
 *
 * 事件以 JSONL 形式按天追加到磁盘，服务重启不丢失；
 * 统计中心通过聚合 JSONL 生成 PV/UV、趋势与 Top 榜单。
 *
 * 仅限 Node.js Runtime 使用（依赖 fs）。
 */

import fs from 'fs';
import path from 'path';

export type AnalyticsEvent =
  | {
      type: 'pageview';
      ts: number;
      uid?: string;
      anon: string;
      path: string;
      ref?: string;
      ua?: string;
    }
  | {
      type: 'search';
      ts: number;
      uid?: string;
      anon: string;
      query: string;
      results?: number;
    }
  | {
      type: 'play';
      ts: number;
      uid?: string;
      anon: string;
      videoId: string;
      title: string;
      sourceName?: string;
    }
  | {
      type: 'favorite';
      ts: number;
      uid?: string;
      anon: string;
      videoId: string;
      title?: string;
      action: 'add' | 'remove';
    }
  | {
      type: 'download';
      ts: number;
      uid?: string;
      anon: string;
      apk: string;
    }
  | { type: 'login'; ts: number; uid: string; anon: string };

interface RawEvent {
  type: string;
  ts: number;
  uid?: string;
  anon?: string;
  path?: string;
  query?: string;
  videoId?: string;
  title?: string;
  apk?: string;
  action?: string;
  ref?: string;
}

export interface DailyStat {
  date: string;
  pv: number;
  uv: number;
  plays: number;
  searches: number;
  favorites: number;
  downloads: number;
  logins: number;
}

export interface AnalyticsSummary {
  range: { from: number; to: number; days: number };
  totals: {
    pv: number;
    uv: number;
    plays: number;
    searches: number;
    favorites: number;
    downloads: number;
    logins: number;
    activeUsers: number;
  };
  daily: DailyStat[];
  topPages: { path: string; count: number }[];
  topSearches: { query: string; count: number }[];
  topVideos: { videoId: string; title: string; count: number }[];
  topDownloads: { apk: string; count: number }[];
  topReferrers: { domain: string; count: number }[];
  entryPages: { path: string; count: number }[];
  users: {
    uid: string;
    pv: number;
    plays: number;
    searches: number;
    favorites: number;
    downloads: number;
    lastActive: number;
  }[];
}

// ── 目录与文件 ──────────────────────────────────────────────
const baseDir =
  process.env.ANALYTICS_DIR || path.join(process.cwd(), '.data', 'analytics');
const eventsDir = path.join(baseDir, 'events');
const MAX_AGE_DAYS = 90; // 事件文件保留 90 天
const FLUSH_INTERVAL_MS = 1000;
const MAX_BUFFER_LINES = 200;

let buffer: string[] = [];
let flushTimer: NodeJS.Timeout | null = null;
let loaded = false;
let pruning = false;

function dayFile(ts: number): string {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return path.join(eventsDir, `${y}-${m}-${day}.jsonl`);
}

function ensureDirs(): void {
  if (loaded) return;
  loaded = true;
  try {
    fs.mkdirSync(eventsDir, { recursive: true });
  } catch (e) {
    console.error('❌ analytics store 创建目录失败:', e);
  }
}

function writeBuffer(): void {
  if (buffer.length === 0) return;
  const lines = buffer;
  buffer = [];
  try {
    ensureDirs();
    fs.appendFileSync(dayFile(Date.now()), lines.join('\n') + '\n');
  } catch (e) {
    console.error('❌ analytics store 写入失败:', e);
    // 写入失败时丢弃，避免内存无限增长
  }
}

function scheduleFlush(): void {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    writeBuffer();
  }, FLUSH_INTERVAL_MS);
}

function flushOnExit(): void {
  writeBuffer();
  flushTimer = null;
}

if (typeof process !== 'undefined' && process.on) {
  process.on('exit', flushOnExit);
  process.on('SIGINT', () => {
    flushOnExit();
    process.exit(0);
  });
  process.on('SIGTERM', () => {
    flushOnExit();
    process.exit(0);
  });
}

function pruneOldFiles(): void {
  if (pruning) return;
  pruning = true;
  try {
    if (!fs.existsSync(eventsDir)) return;
    const cutoff = Date.now() - MAX_AGE_DAYS * 24 * 3600 * 1000;
    for (const file of fs.readdirSync(eventsDir)) {
      const m = /^(\d{4}-\d{2}-\d{2})\.jsonl$/.exec(file);
      if (!m) continue;
      const t = new Date(m[1] + 'T00:00:00').getTime();
      if (t < cutoff) {
        fs.unlinkSync(path.join(eventsDir, file));
      }
    }
  } catch {
    // 静默，保留失败不阻塞
  } finally {
    pruning = false;
  }
}

/**
 * 记录一条行为事件（立即入内存缓冲，定时落盘）
 */
export function trackEvent(event: AnalyticsEvent): void {
  ensureDirs();
  try {
    buffer.push(JSON.stringify(event));
  } catch (e) {
    console.error('❌ analytics store 序列化失败:', e);
    return;
  }
  scheduleFlush();
  if (buffer.length >= MAX_BUFFER_LINES) {
    writeBuffer();
  }
  pruneOldFiles();
}

// ── 聚合 ────────────────────────────────────────────────────

function readDayEvents(file: string): RawEvent[] {
  try {
    const content = fs.readFileSync(file, 'utf8');
    if (!content.trim()) return [];
    return content
      .split('\n')
      .filter(Boolean)
      .map((line) => {
        try {
          return JSON.parse(line) as RawEvent;
        } catch {
          return null;
        }
      })
      .filter((e): e is RawEvent => e !== null);
  } catch {
    return [];
  }
}

function dateKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * 聚合最近 N 天的行为数据
 */
export function getAnalyticsSummary(days: number): AnalyticsSummary {
  ensureDirs();
  const now = Date.now();
  const from = now - days * 24 * 3600 * 1000;

  const dailyMap = new Map<
    string,
    {
      pv: number;
      uv: Set<string>;
      plays: number;
      searches: number;
      favorites: number;
      downloads: number;
      logins: number;
    }
  >();
  const topPages = new Map<string, number>();
  const topSearches = new Map<string, number>();
  const topVideos = new Map<string, { title: string; count: number }>();
  const topDownloads = new Map<string, number>();
  const topReferrers = new Map<string, number>();
  // 每个身份第一次进入的页面（入口页）
  const entryPaths = new Map<string, { path: string; ts: number }>();
  const users = new Map<
    string,
    {
      pv: number;
      plays: number;
      searches: number;
      favorites: number;
      downloads: number;
      lastActive: number;
    }
  >();
  const totalUv = new Set<string>();

  let files: string[] = [];
  try {
    if (fs.existsSync(eventsDir)) {
      files = fs.readdirSync(eventsDir);
    }
  } catch {
    files = [];
  }

  for (const file of files) {
    const filePath = path.join(eventsDir, file);
    const stat = fs.statSync(filePath);
    if (stat.mtimeMs < from) continue;

    for (const ev of readDayEvents(filePath)) {
      if (!ev.ts || ev.ts < from || ev.ts > now) continue;
      const day = dateKey(ev.ts);
      const identity = ev.uid || ev.anon || 'unknown';

      let d = dailyMap.get(day);
      if (!d) {
        d = {
          pv: 0,
          uv: new Set(),
          plays: 0,
          searches: 0,
          favorites: 0,
          downloads: 0,
          logins: 0,
        };
        dailyMap.set(day, d);
      }

      switch (ev.type) {
        case 'pageview':
          d.pv++;
          d.uv.add(identity);
          totalUv.add(identity);
          if (ev.path) {
            topPages.set(ev.path, (topPages.get(ev.path) || 0) + 1);
          }
          // 访客来源：解析 referrer 域名（空/同站视为直接访问）
          if (ev.ref) {
            let domain = '直接访问';
            try {
              const host = new URL(ev.ref).hostname;
              if (host && host !== 'www.5572.net' && host !== '5572.net') {
                domain = host.replace(/^www\./, '');
              }
            } catch {
              domain = '直接访问';
            }
            topReferrers.set(domain, (topReferrers.get(domain) || 0) + 1);
          } else {
            topReferrers.set(
              '直接访问',
              (topReferrers.get('直接访问') || 0) + 1,
            );
          }
          // 入口页：每个身份最早访问的页面
          const existingEntry = entryPaths.get(identity);
          if (!existingEntry || ev.ts < existingEntry.ts) {
            entryPaths.set(identity, { path: ev.path || '/', ts: ev.ts });
          }
          addUser(users, identity, 'pv');
          break;
        case 'search':
          d.searches++;
          if (ev.query) {
            const q = ev.query.trim().slice(0, 60);
            if (q) topSearches.set(q, (topSearches.get(q) || 0) + 1);
          }
          addUser(users, identity, 'search');
          break;
        case 'play':
          d.plays++;
          if (ev.videoId) {
            const cur = topVideos.get(ev.videoId) || {
              title: ev.title || '',
              count: 0,
            };
            cur.count++;
            if (ev.title) cur.title = ev.title;
            topVideos.set(ev.videoId, cur);
          }
          addUser(users, identity, 'play');
          break;
        case 'favorite':
          if (ev.action === 'add') {
            d.favorites++;
            addUser(users, identity, 'favorite');
          }
          break;
        case 'download':
          d.downloads++;
          if (ev.apk)
            topDownloads.set(ev.apk, (topDownloads.get(ev.apk) || 0) + 1);
          addUser(users, identity, 'download');
          break;
        case 'login':
          d.logins++;
          addUser(users, identity, 'login');
          break;
      }
    }
  }

  // 补齐缺失日期，按日期升序
  const daily: DailyStat[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const ts = now - i * 24 * 3600 * 1000;
    const key = dateKey(ts);
    const d = dailyMap.get(key);
    daily.push({
      date: key,
      pv: d?.pv ?? 0,
      uv: d?.uv.size ?? 0,
      plays: d?.plays ?? 0,
      searches: d?.searches ?? 0,
      favorites: d?.favorites ?? 0,
      downloads: d?.downloads ?? 0,
      logins: d?.logins ?? 0,
    });
  }

  const sortTop = <T extends { count: number }>(
    items: T[],
    take: number,
  ): T[] => [...items].sort((a, b) => b.count - a.count).slice(0, take);

  const userList = Array.from(users.entries())
    .map(([uid, v]) => ({ uid, ...v }))
    .sort((a, b) => b.pv - a.pv || b.lastActive - a.lastActive)
    .slice(0, 50);

  return {
    range: { from, to: now, days },
    totals: {
      pv: daily.reduce((s, d) => s + d.pv, 0),
      uv: totalUv.size,
      plays: daily.reduce((s, d) => s + d.plays, 0),
      searches: daily.reduce((s, d) => s + d.searches, 0),
      favorites: daily.reduce((s, d) => s + d.favorites, 0),
      downloads: daily.reduce((s, d) => s + d.downloads, 0),
      logins: daily.reduce((s, d) => s + d.logins, 0),
      activeUsers: users.size,
    },
    daily,
    topPages: sortTop(
      Array.from(topPages.entries()).map(([path, count]) => ({ path, count })),
      10,
    ),
    topSearches: sortTop(
      Array.from(topSearches.entries()).map(([query, count]) => ({
        query,
        count,
      })),
      10,
    ),
    topVideos: sortTop(
      Array.from(topVideos.entries()).map(([videoId, v]) => ({
        videoId,
        title: v.title,
        count: v.count,
      })),
      10,
    ),
    topDownloads: sortTop(
      Array.from(topDownloads.entries()).map(([apk, count]) => ({
        apk,
        count,
      })),
      10,
    ),
    topReferrers: sortTop(
      Array.from(topReferrers.entries()).map(([domain, count]) => ({
        domain,
        count,
      })),
      10,
    ),
    entryPages: (() => {
      const counts = new Map<string, number>();
      for (const e of entryPaths.values()) {
        counts.set(e.path, (counts.get(e.path) || 0) + 1);
      }
      return sortTop(
        Array.from(counts.entries()).map(([path, count]) => ({ path, count })),
        5,
      );
    })(),
    users: userList,
  };
}

function addUser(
  users: Map<
    string,
    {
      pv: number;
      plays: number;
      searches: number;
      favorites: number;
      downloads: number;
      lastActive: number;
    }
  >,
  identity: string,
  key: 'pv' | 'play' | 'search' | 'favorite' | 'download' | 'login',
): void {
  if (!identity || identity === 'unknown') return;
  let u = users.get(identity);
  if (!u) {
    u = {
      pv: 0,
      plays: 0,
      searches: 0,
      favorites: 0,
      downloads: 0,
      lastActive: 0,
    };
    users.set(identity, u);
  }
  if (key === 'pv') u.pv++;
  else if (key === 'play') u.plays++;
  else if (key === 'search') u.searches++;
  else if (key === 'favorite') u.favorites++;
  else if (key === 'download') u.downloads++;
  u.lastActive = Math.max(u.lastActive, Date.now());
}
