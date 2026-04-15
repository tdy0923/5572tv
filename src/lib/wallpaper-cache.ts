const WALLPAPER_CACHE_KEY = 'bing-wallpaper-cache';
const WALLPAPER_CACHE_TTL_MS = 60 * 60 * 1000;

interface WallpaperCachePayload {
  url: string;
  expireAt: number;
}

export function getCachedWallpaperUrl(): string | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = sessionStorage.getItem(WALLPAPER_CACHE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as WallpaperCachePayload;
    if (!parsed?.url || !parsed?.expireAt || Date.now() > parsed.expireAt) {
      sessionStorage.removeItem(WALLPAPER_CACHE_KEY);
      return null;
    }

    return parsed.url;
  } catch {
    sessionStorage.removeItem(WALLPAPER_CACHE_KEY);
    return null;
  }
}

export function setCachedWallpaperUrl(url: string): void {
  if (typeof window === 'undefined' || !url) return;

  try {
    const payload: WallpaperCachePayload = {
      url,
      expireAt: Date.now() + WALLPAPER_CACHE_TTL_MS,
    };
    sessionStorage.setItem(WALLPAPER_CACHE_KEY, JSON.stringify(payload));
  } catch {
    // ignore cache write failures
  }
}
