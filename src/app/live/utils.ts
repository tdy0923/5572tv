import type { ChannelHealthStatus, LiveStreamType } from './types';

export function parseStoredStringArray(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === 'string');
  } catch {
    return [];
  }
}

export function normalizeStreamType(type: unknown): LiveStreamType {
  if (type === 'm3u8' || type === 'mp4' || type === 'flv') {
    return type;
  }
  return 'unknown';
}

export function detectTypeFromUrl(rawUrl: string): LiveStreamType {
  const lowerUrl = rawUrl.toLowerCase();
  if (lowerUrl.includes('.m3u8')) return 'm3u8';
  if (lowerUrl.includes('.mp4')) return 'mp4';
  if (lowerUrl.includes('.flv')) return 'flv';
  return 'unknown';
}

export function deriveHealthStatus(
  isReachable: boolean,
  latencyMs?: number,
): ChannelHealthStatus {
  if (!isReachable) return 'unreachable';
  if (typeof latencyMs === 'number' && latencyMs > 3500) return 'slow';
  return 'healthy';
}

export function getTypeBadgeStyle(type: LiveStreamType) {
  if (type === 'm3u8') {
    return 'bg-blue-100 dark:bg-blue-900/35 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800';
  }
  if (type === 'flv') {
    return 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800';
  }
  if (type === 'mp4') {
    return 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800';
  }
  return 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700';
}

export function getHealthBadgeStyle(status: ChannelHealthStatus) {
  if (status === 'healthy') {
    return 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
  }
  if (status === 'slow') {
    return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800';
  }
  if (status === 'unreachable') {
    return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800';
  }
  if (status === 'checking') {
    return 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800';
  }
  return 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700';
}
