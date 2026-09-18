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

import { db, getStorageType } from './db';

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
      // 以下为跨线路归并与下钻用字段（新事件携带，老事件缺失时回退解析 videoId/title）
      source?: string; // 线路 key（如 zuida）
      vid?: string; // 线路内影片 id
      searchTitle?: string; // 归并用标题（优先于 title）
      year?: string;
      cover?: string;
      doubanId?: number;
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
  | { type: 'login'; ts: number; uid: string; anon: string }
  | {
      type: 'player_error';
      ts: number;
      uid?: string;
      anon: string;
      kind: 'error' | 'source_switch' | 'summary';
      message: string;
      videoId?: string;
      title?: string;
      sourceName?: string;
    };

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
  kind?: string;
  message?: string;
  ref?: string;
  sourceName?: string;
  source?: string;
  vid?: string;
  searchTitle?: string;
  year?: string;
  cover?: string;
  doubanId?: number;
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
  topVideos: {
    videoId: string;
    title: string;
    count: number;
    // 跨线路归并：同一部片不同来源合并为一条
    year: string;
    cover: string;
    uniqueUsers: number;
    lastPlayed: number;
    sources: { source: string; name: string; count: number }[];
    users: { uid: string; count: number; lastPlayed: number }[];
  }[];
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
    // 用户→影片下钻：该用户看过的影片
    videos: {
      videoId: string;
      title: string;
      count: number;
      lastPlayed: number;
    }[];
  }[];
}

// ── 跨线路归并 ────────────────────────────────────────────────
// 同一部影片在不同线路/片源上点播时 videoId 不同（source:id），
// 按归并键合并为一条：优先豆瓣ID，其次归一化标题+年份。
function normalizeMergeTitle(s: string): string {
  return (s || '').trim().replace(/\s+/g, '').toLowerCase();
}

export function videoMergeKey(ev: {
  searchTitle?: string;
  title?: string;
  videoId?: string;
  year?: string;
  doubanId?: number;
}): string {
  if (ev.doubanId) return `douban:${ev.doubanId}`;
  const t = normalizeMergeTitle(ev.searchTitle || ev.title || ev.videoId || '');
  const y = (ev.year || '').trim();
  return `title:${t}__${y}`;
}

/** 仅按标题归一化（不含年份），用于与播放记录时长数据对齐 */
export function normalizeVideoTitle(s: string): string {
  return normalizeMergeTitle(s);
}

/** 从 `source:id` 格式的 videoId 拆出线路 key（兼容老事件） */
export function splitVideoId(videoId: string): { source: string; vid: string } {
  const i = (videoId || '').indexOf(':');
  if (i <= 0) return { source: '', vid: videoId || '' };
  return { source: videoId.slice(0, i), vid: videoId.slice(i + 1) };
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

function dayKeyFromDate(ts: number): string {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Redis 兼容存储（redis/upstash/kvrocks）时事件持久化到按天 List，
// 部署重启不丢数据；localstorage 模式回退本地文件
function isRedisMode(): boolean {
  return getStorageType() !== 'localstorage';
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
  if (isRedisMode()) {
    db.appendAnalyticsEvents(dayKeyFromDate(Date.now()), lines).catch((e) => {
      console.error('❌ analytics store 写入 Redis 失败，回退本地文件:', e);
      fallbackWriteLines(lines);
    });
    return;
  }
  fallbackWriteLines(lines);
}

function fallbackWriteLines(lines: string[]): void {
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
  if (!isRedisMode()) {
    ensureDirs();
  }
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
  if (!isRedisMode()) {
    pruneOldFiles();
  }
}

// ── 聚合 ────────────────────────────────────────────────────

function parseLines(lines: string[]): RawEvent[] {
  return lines
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line) as RawEvent;
      } catch {
        return null;
      }
    })
    .filter((e): e is RawEvent => e !== null);
}

function readDayEvents(file: string): RawEvent[] {
  try {
    const content = fs.readFileSync(file, 'utf8');
    if (!content.trim()) return [];
    return parseLines(content.split('\n'));
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
export async function getAnalyticsSummary(
  days: number,
): Promise<AnalyticsSummary> {
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
  // 影片归并组：mergeKey -> 聚合（跨线路合并）
  const videoGroups = new Map<
    string,
    {
      title: string;
      year: string;
      cover: string;
      videoId: string;
      count: number;
      lastPlayed: number;
      sources: Map<string, { name: string; count: number }>;
      users: Map<string, { count: number; lastPlayed: number }>;
    }
  >();
  // 用户→影片：uid -> mergeKey -> 明细
  const userVideos = new Map<
    string,
    Map<
      string,
      { videoId: string; title: string; count: number; lastPlayed: number }
    >
  >();
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

  // 按天读取：Redis List 优先（持久化，部署重启不丢），本地文件回退；
  // 多读一天兜底跨零点写入的事件
  for (let i = days; i >= 0; i--) {
    const ts = now - i * 86400000;
    const dKey = dateKey(ts);

    let events: RawEvent[] | null = null;
    if (isRedisMode()) {
      const lines = await db.readAnalyticsEvents(dKey).catch(() => null);
      events = lines ? parseLines(lines) : null;
      if (events && events.length === 0) {
        // Redis 当天无数据，补读本地文件（迁移期兼容）
        const fileEvents = readDayEvents(path.join(eventsDir, dayFile(ts)));
        if (fileEvents.length > 0) events = fileEvents;
      }
    }
    if (!events) {
      events = readDayEvents(path.join(eventsDir, dayFile(ts)));
    }

    for (const ev of events) {
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
          addUser(users, identity, 'pv', ev.ts);
          break;
        case 'search':
          d.searches++;
          if (ev.query) {
            const q = ev.query.trim().slice(0, 60);
            if (q) topSearches.set(q, (topSearches.get(q) || 0) + 1);
          }
          addUser(users, identity, 'search', ev.ts);
          break;
        case 'play': {
          d.plays++;
          const mergeKey = videoMergeKey(ev);
          let g = videoGroups.get(mergeKey);
          if (!g) {
            g = {
              title: ev.title || '',
              year: ev.year || '',
              cover: ev.cover || '',
              videoId: ev.videoId || '',
              count: 0,
              lastPlayed: 0,
              sources: new Map(),
              users: new Map(),
            };
            videoGroups.set(mergeKey, g);
          }
          g.count++;
          g.lastPlayed = Math.max(g.lastPlayed, ev.ts);
          if (!g.title && ev.title) g.title = ev.title;
          if (!g.year && ev.year) g.year = ev.year;
          if (!g.cover && ev.cover) g.cover = ev.cover;
          if (!g.videoId && ev.videoId) g.videoId = ev.videoId;
          // 线路明细（新事件用 source 字段，老事件从 videoId 解析）
          const srcKey =
            ev.source || splitVideoId(ev.videoId || '').source || '未知线路';
          const srcEntry = g.sources.get(srcKey) || {
            name: ev.sourceName || srcKey,
            count: 0,
          };
          srcEntry.count++;
          if (srcEntry.name === srcKey && ev.sourceName) {
            srcEntry.name = ev.sourceName;
          }
          g.sources.set(srcKey, srcEntry);
          // 影片→用户下钻（跳过匿名 unknown）
          if (identity && identity !== 'unknown') {
            const vu = g.users.get(identity) || { count: 0, lastPlayed: 0 };
            vu.count++;
            vu.lastPlayed = Math.max(vu.lastPlayed, ev.ts);
            g.users.set(identity, vu);
            // 用户→影片下钻
            let uv = userVideos.get(identity);
            if (!uv) {
              uv = new Map();
              userVideos.set(identity, uv);
            }
            const ve = uv.get(mergeKey) || {
              videoId: ev.videoId || '',
              title: ev.title || '',
              count: 0,
              lastPlayed: 0,
            };
            ve.count++;
            ve.lastPlayed = Math.max(ve.lastPlayed, ev.ts);
            if (!ve.title && ev.title) ve.title = ev.title;
            if (!ve.videoId && ev.videoId) ve.videoId = ev.videoId;
            uv.set(mergeKey, ve);
          }
          addUser(users, identity, 'play', ev.ts);
          break;
        }
        case 'favorite':
          if (ev.action === 'add') {
            d.favorites++;
            addUser(users, identity, 'favorite', ev.ts);
          }
          break;
        case 'download':
          d.downloads++;
          if (ev.apk)
            topDownloads.set(ev.apk, (topDownloads.get(ev.apk) || 0) + 1);
          addUser(users, identity, 'download', ev.ts);
          break;
        case 'login':
          d.logins++;
          addUser(users, identity, 'login', ev.ts);
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
    .map(([uid, v]) => {
      const played = Array.from(userVideos.get(uid)?.values() ?? []);
      played.sort((a, b) => b.count - a.count || b.lastPlayed - a.lastPlayed);
      return { uid, ...v, videos: played.slice(0, 50) };
    })
    .sort((a, b) => b.pv - a.pv || b.lastActive - a.lastActive)
    .slice(0, 50);

  const mergedVideos = Array.from(videoGroups.values()).map((g) => {
    const srcList = Array.from(g.sources.entries())
      .map(([source, s]) => ({ source, name: s.name, count: s.count }))
      .sort((a, b) => b.count - a.count);
    const userListOfVideo = Array.from(g.users.entries())
      .map(([uid, u]) => ({ uid, count: u.count, lastPlayed: u.lastPlayed }))
      .sort((a, b) => b.count - a.count || b.lastPlayed - a.lastPlayed)
      .slice(0, 50);
    return {
      videoId: g.videoId,
      title: g.title,
      count: g.count,
      year: g.year,
      cover: g.cover,
      uniqueUsers: g.users.size,
      lastPlayed: g.lastPlayed,
      sources: srcList,
      users: userListOfVideo,
    };
  });

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
    topVideos: sortTop(mergedVideos, 30),
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
export interface PlayerErrorGroup {
  kind: string;
  message: string;
  count: number;
  lastTs: number;
  videoId?: string;
  title?: string;
  sourceName?: string;
}

export interface PlayerErrorSample {
  ts: number;
  kind: string;
  message: string;
  videoId?: string;
  title?: string;
  sourceName?: string;
}

export interface PlayerErrorSummary {
  days: number;
  total: number;
  top: PlayerErrorGroup[];
  recent: PlayerErrorSample[];
}

export async function getPlayerErrors(days: number): Promise<PlayerErrorSummary> {
  const safeDays = Math.min(Math.max(Math.floor(days) || 3, 1), 14);
  const now = Date.now();
  const groups = new Map<string, PlayerErrorGroup>();
  const samples: PlayerErrorSample[] = [];
  let total = 0;

  for (let i = safeDays; i >= 0; i--) {
    const ts = now - i * 86400000;
    const dKey = dateKey(ts);
    let events: RawEvent[] | null = null;
    if (isRedisMode()) {
      const lines = await withRedisTimeout(db.readAnalyticsEvents(dKey), 5000)
        .catch(() => null);
      events = lines ? parseLines(lines) : null;
      if (events && events.length === 0) {
        const fileEvents = readDayEvents(path.join(eventsDir, dayFile(ts)));
        if (fileEvents.length > 0) events = fileEvents;
      }
    } else {
      ensureDirs();
      events = readDayEvents(path.join(eventsDir, dayFile(ts)));
    }
    if (!events) continue;
    for (const ev of events) {
      if (ev.type !== 'player_error' || !ev.message) continue;
      total++;
      const kind = ev.kind || 'error';
      const key = `${kind}::${ev.message}`;
      let g = groups.get(key);
      if (!g) {
        g = {
          kind,
          message: ev.message,
          count: 0,
          lastTs: 0,
          videoId: ev.videoId,
          title: ev.title,
          sourceName: ev.sourceName,
        };
        groups.set(key, g);
      }
      g.count++;
      g.lastTs = Math.max(g.lastTs, ev.ts);
      samples.push({
        ts: ev.ts,
        kind,
        message: ev.message,
        videoId: ev.videoId,
        title: ev.title,
        sourceName: ev.sourceName,
      });
    }
  }

  const top = [...groups.values()]
    .sort((a, b) => b.count - a.count || b.lastTs - a.lastTs)
    .slice(0, 20);
  const recent = samples
    .sort((a, b) => b.ts - a.ts)
    .slice(0, 50);

  return { days: safeDays, total, top, recent };
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
  ts: number,
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
  u.lastActive = Math.max(u.lastActive, ts);
}
