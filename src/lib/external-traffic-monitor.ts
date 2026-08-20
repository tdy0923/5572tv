/* eslint-disable no-console */
/**
 * 外部流量监控模块
 * 统计应用调用外部 API 的流量
 *
 * 流量数据按天 JSONL 落盘（默认 .data/performance/external），
 * 服务重启不丢失；仅保留最近 48 小时。
 */

import fs from 'fs';
import path from 'path';

interface ExternalTrafficMetrics {
  timestamp: number;
  url: string;
  method: string;
  requestSize: number;
  responseSize: number;
  duration: number;
  statusCode: number;
}

// 内存中的外部流量缓存
const externalTrafficCache: ExternalTrafficMetrics[] = [];
const MAX_CACHE_SIZE = 1000;
const MAX_CACHE_AGE = 48 * 60 * 60 * 1000; // 48小时（与性能监控保持一致）

// 文件持久化
const externalDataDir =
  process.env.PERF_DATA_DIR || path.join(process.cwd(), '.data', 'performance');
const externalEventsDir = path.join(externalDataDir, 'external');
const externalBuffer: ExternalTrafficMetrics[] = [];
const EXTERNAL_FLUSH_INTERVAL_MS = 5000;
let externalFlushTimer: NodeJS.Timeout | null = null;
let externalLoaded = false;

function externalDayFile(ts: number): string {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return path.join(externalEventsDir, `${y}-${m}-${day}.jsonl`);
}

function ensureExternalDirs(): void {
  try {
    fs.mkdirSync(externalEventsDir, { recursive: true });
  } catch (e) {
    console.error('❌ 外部流量目录创建失败:', e);
  }
}

function flushExternalBuffer(): void {
  if (externalBuffer.length === 0) return;
  const items = externalBuffer.slice();
  externalBuffer.length = 0;
  try {
    ensureExternalDirs();
    const lines = items.map((r) => JSON.stringify(r));
    fs.appendFileSync(externalDayFile(Date.now()), lines.join('\n') + '\n');
  } catch (e) {
    console.error('❌ 外部流量写入失败:', e);
  }
}

function scheduleExternalFlush(): void {
  if (externalFlushTimer) return;
  externalFlushTimer = setTimeout(() => {
    externalFlushTimer = null;
    flushExternalBuffer();
  }, EXTERNAL_FLUSH_INTERVAL_MS);
}

function loadExternalHistory(): void {
  if (externalLoaded) return;
  externalLoaded = true;
  try {
    if (!fs.existsSync(externalEventsDir)) return;
    const now = Date.now();
    const cutoff = now - MAX_CACHE_AGE;
    const loaded: ExternalTrafficMetrics[] = [];
    for (const file of fs.readdirSync(externalEventsDir)) {
      if (!file.endsWith('.jsonl')) continue;
      let content = '';
      try {
        content = fs.readFileSync(path.join(externalEventsDir, file), 'utf8');
      } catch {
        continue;
      }
      for (const line of content.split('\n')) {
        if (!line.trim()) continue;
        try {
          const rec = JSON.parse(line) as ExternalTrafficMetrics;
          if (
            rec &&
            typeof rec.timestamp === 'number' &&
            rec.timestamp >= cutoff
          ) {
            loaded.push(rec);
          }
        } catch {
          // 忽略损坏行
        }
      }
    }
    loaded.sort((a, b) => a.timestamp - b.timestamp);
    externalTrafficCache.push(...loaded.slice(-MAX_CACHE_SIZE));
  } catch (e) {
    console.error('❌ 加载外部流量历史失败:', e);
  }
}

if (typeof process !== 'undefined' && process.on) {
  process.on('exit', () => {
    flushExternalBuffer();
    externalFlushTimer = null;
  });
  process.on('SIGINT', () => {
    flushExternalBuffer();
    process.exit(0);
  });
  process.on('SIGTERM', () => {
    flushExternalBuffer();
    process.exit(0);
  });
}

// 数据加载标志
let dataLoaded = false;

/**
 * 记录外部请求流量
 */
export function recordExternalTraffic(metrics: ExternalTrafficMetrics): void {
  if (!dataLoaded) {
    dataLoaded = true;
  }

  // 添加到内存缓存
  externalTrafficCache.push(metrics);
  externalBuffer.push(metrics);
  scheduleExternalFlush();

  // 清理超过48小时的旧数据
  const now = Date.now();
  const cutoffTime = now - MAX_CACHE_AGE;
  while (
    externalTrafficCache.length > 0 &&
    externalTrafficCache[0].timestamp < cutoffTime
  ) {
    externalTrafficCache.shift();
  }

  // 限制缓存大小
  while (externalTrafficCache.length > MAX_CACHE_SIZE) {
    externalTrafficCache.shift();
  }
}

/**
 * 获取外部流量统计（按时间范围）
 */
export async function getExternalTrafficStats(hours: number = 1) {
  loadExternalHistory();

  const now = Date.now();
  const startTime = now - hours * 60 * 60 * 1000;

  // 过滤时间范围内的数据
  const filteredData = externalTrafficCache.filter(
    (item) => item.timestamp >= startTime,
  );

  if (filteredData.length === 0) {
    return {
      totalRequests: 0,
      totalTraffic: 0,
      requestTraffic: 0,
      responseTraffic: 0,
      avgDuration: 0,
      byDomain: {},
    };
  }

  // 计算总流量
  const totalTraffic = filteredData.reduce(
    (sum, item) => sum + item.requestSize + item.responseSize,
    0,
  );
  const requestTraffic = filteredData.reduce(
    (sum, item) => sum + item.requestSize,
    0,
  );
  const responseTraffic = filteredData.reduce(
    (sum, item) => sum + item.responseSize,
    0,
  );

  // 计算平均响应时间
  const avgDuration = Math.round(
    filteredData.reduce((sum, item) => sum + item.duration, 0) /
      filteredData.length,
  );

  // 按域名分组统计
  const byDomain: Record<string, { requests: number; traffic: number }> = {};
  filteredData.forEach((item) => {
    try {
      const domain = new URL(item.url).hostname;
      if (!byDomain[domain]) {
        byDomain[domain] = { requests: 0, traffic: 0 };
      }
      byDomain[domain].requests++;
      byDomain[domain].traffic += item.requestSize + item.responseSize;
    } catch {
      // 忽略无效 URL
    }
  });

  return {
    totalRequests: filteredData.length,
    totalTraffic,
    requestTraffic,
    responseTraffic,
    avgDuration,
    byDomain,
  };
}
