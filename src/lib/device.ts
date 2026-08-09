'use client';

const TV_UA_PATTERNS = [
  /android\s+tv/i,
  /google\s+tv/i,
  /smart-?tv/i,
  /\btizen/i,
  /web0s/i,
  /\bhbbtv/i,
  /\broku/i,
  /chromecast/i,
  /appletv/i,
  /\bdunehd/i,
  /\bxbox/i,
  /\bplaystation/i,
];

/**
 * 电视端（10 尺 UI）检测。
 * 主要依据 UA（Android TV / Tizen / webOS / HbbTV / Roku 等），
 * 非电视设备一律返回 false，不影响正常用户。
 */
export function detectTV(ua?: string): boolean {
  if (typeof navigator === 'undefined') return false;
  const agent = (ua ?? navigator.userAgent).toLowerCase();
  return TV_UA_PATTERNS.some((re) => re.test(agent));
}

/** 粗指针（触屏/遥控器）检测，用于放大触达区。 */
export function isCoarsePointer(): boolean {
  if (
    typeof window === 'undefined' ||
    typeof window.matchMedia !== 'function'
  ) {
    return false;
  }
  return window.matchMedia('(any-pointer: coarse)').matches;
}
