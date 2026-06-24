import { getAllFavorites, getAllPlayRecords } from '@/lib/db.client';

// ---------------------------------------------------------------------------
// Cached IndexedDB reads (5-second TTL)
// ---------------------------------------------------------------------------
let _playRecordsCache: any = null;
let _playRecordsCacheTime = 0;
let _favoritesCache: any = null;
let _favoritesCacheTime = 0;
const CACHE_TTL = 5000;

export async function cachedGetAllPlayRecords() {
  const now = Date.now();
  if (_playRecordsCache && now - _playRecordsCacheTime < CACHE_TTL) {
    return _playRecordsCache;
  }
  const data = await getAllPlayRecords();
  _playRecordsCache = data;
  _playRecordsCacheTime = now;
  return data;
}

export async function cachedGetAllFavorites() {
  const now = Date.now();
  if (_favoritesCache && now - _favoritesCacheTime < CACHE_TTL) {
    return _favoritesCache;
  }
  const data = await getAllFavorites();
  _favoritesCache = data;
  _favoritesCacheTime = now;
  return data;
}

export function invalidatePlayRecordsCache() {
  _playRecordsCache = null;
  _playRecordsCacheTime = 0;
}

export function invalidateFavoritesCache() {
  _favoritesCache = null;
  _favoritesCacheTime = 0;
}

// ---------------------------------------------------------------------------
// Playback rate persistence
// ---------------------------------------------------------------------------
const PLAYER_PLAYBACK_RATE_KEY = '5572tv_player_playback_rate';
const LEGACY_PLAYER_PLAYBACK_RATE_KEY = 'moontv_player_playback_rate';

export function sanitizePlaybackRate(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 1.0;
  const allowedRates = [0.5, 0.75, 1, 1.25, 1.5, 2, 3];
  return allowedRates.includes(value) ? value : 1.0;
}

export function loadPlaybackRate(): number {
  if (typeof window === 'undefined') return 1.0;
  try {
    const raw =
      localStorage.getItem(PLAYER_PLAYBACK_RATE_KEY) ||
      localStorage.getItem(LEGACY_PLAYER_PLAYBACK_RATE_KEY);
    if (!raw) return 1.0;
    return sanitizePlaybackRate(Number(raw));
  } catch {
    return 1.0;
  }
}

// ---------------------------------------------------------------------------
// Storage key helpers
// ---------------------------------------------------------------------------
export function parseStorageKey(key: string) {
  const separatorIndex = key.indexOf('+');
  if (separatorIndex === -1) {
    return { source: '', id: key };
  }
  return {
    source: key.slice(0, separatorIndex),
    id: key.slice(separatorIndex + 1),
  };
}

// ---------------------------------------------------------------------------
// URL helpers
// ---------------------------------------------------------------------------
export function replacePlaybackUrlParams(
  updates: Record<string, string | null>,
) {
  const newUrl = new URL(window.location.href);
  Object.entries(updates).forEach(([key, value]) => {
    if (!value) {
      newUrl.searchParams.delete(key);
    } else {
      newUrl.searchParams.set(key, value);
    }
  });
  window.history.replaceState({ __NA: true }, '', newUrl.toString());
}

// ---------------------------------------------------------------------------
// Audio track helpers
// ---------------------------------------------------------------------------
const PREFERRED_AUDIO_LANG_KEY = 'preferred_audio_lang';

export function normalizeAudioLang(rawLang?: string): string {
  if (!rawLang) return '';
  return rawLang.trim().toLowerCase();
}

export function mapAudioLanguageLabel(rawLang?: string): string {
  const lang = normalizeAudioLang(rawLang);
  if (!lang) return '';
  if (['zh-cn', 'cmn', 'zh-hans', 'chi', 'zho'].includes(lang)) return '中文';
  if (['zh-tw', 'zh-hk', 'yue', 'zh-hant'].includes(lang)) return '粤语';
  if (['en', 'eng'].includes(lang)) return 'English';
  if (['ja', 'jpn'].includes(lang)) return '日语';
  if (['ko', 'kor'].includes(lang)) return '韩语';
  return rawLang || lang;
}

export function resolveAudioTrackName(
  rawName: string | undefined,
  rawLang: string | undefined,
  index: number,
): string {
  if (
    rawName &&
    rawName.trim() &&
    !/^\d+$/.test(rawName.trim()) &&
    !/^audio\s*\d+$/i.test(rawName.trim())
  ) {
    return rawName.trim();
  }
  const mappedLanguage = mapAudioLanguageLabel(rawLang);
  if (mappedLanguage) return mappedLanguage;
  return `音轨 ${index + 1}`;
}

export function loadPreferredAudioLang(): string {
  if (typeof window === 'undefined') return '';
  try {
    return normalizeAudioLang(
      localStorage.getItem(PREFERRED_AUDIO_LANG_KEY) || '',
    );
  } catch {
    return '';
  }
}

export function savePreferredAudioLang(rawLang?: string) {
  if (typeof window === 'undefined') return;
  const normalized = normalizeAudioLang(rawLang);
  if (!normalized) return;
  try {
    localStorage.setItem(PREFERRED_AUDIO_LANG_KEY, normalized);
  } catch {}
}

export function escapeAudioTrackHtml(rawValue: string): string {
  return rawValue
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function appendAudioStreamIndex(
  url: string,
  audioStreamIndex: number,
): string {
  if (!url) return url;
  try {
    const base =
      typeof window !== 'undefined'
        ? window.location.origin
        : 'http://localhost';
    const parsed = new URL(url, base);
    parsed.searchParams.set('AudioStreamIndex', String(audioStreamIndex));
    if (/^https?:\/\//i.test(url)) return parsed.toString();
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}AudioStreamIndex=${encodeURIComponent(String(audioStreamIndex))}`;
  }
}

export function parseAudioStreamIndexFromUrl(url: string): number {
  if (!url) return -1;
  try {
    const base =
      typeof window !== 'undefined'
        ? window.location.origin
        : 'http://localhost';
    const parsed = new URL(url, base);
    const rawValue = parsed.searchParams.get('AudioStreamIndex');
    if (!rawValue || !/^\d+$/.test(rawValue)) return -1;
    return Number(rawValue);
  } catch {
    return -1;
  }
}

// ---------------------------------------------------------------------------
// Type declarations
// ---------------------------------------------------------------------------
declare global {
  interface HTMLVideoElement {
    hls?: any;
  }
}

export interface WakeLockSentinel {
  released: boolean;
  release(): Promise<void>;
  addEventListener(type: 'release', listener: () => void): void;
  removeEventListener(type: 'release', listener: () => void): void;
}

// ---------------------------------------------------------------------------
// Lazy-load hls.js (~600KB)
// ---------------------------------------------------------------------------
let _hlsModule: any = null;
let _hlsLoading = false;
let _hlsLoadPromise: Promise<any> | null = null;

export async function getHlsModule(): Promise<any> {
  if (_hlsModule) return _hlsModule;
  if (_hlsLoadPromise) return _hlsLoadPromise;
  _hlsLoading = true;
  _hlsLoadPromise = import('hls.js').then((mod) => {
    _hlsModule = mod.default || mod;
    _hlsLoading = false;
    return _hlsModule;
  });
  return _hlsLoadPromise;
}
