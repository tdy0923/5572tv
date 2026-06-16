/* eslint-disable no-console */

/**
 * Bilibili WBI Signature - Anti-crawler bypass
 * Based on LunaTV implementation
 *
 * Uses WBI signature to authenticate Bilibili API requests
 */

import { DEFAULT_USER_AGENT } from './user-agent';

// WBI mixin key permutation table
const MIXIN_KEY_ENC_TAB = [
  46, 47, 18, 2, 53, 8, 23, 32, 15, 50, 10, 31, 58, 3, 45, 35, 27, 43, 5, 49,
  33, 9, 42, 19, 29, 28, 14, 39, 12, 38, 41, 13, 37, 48, 7, 16, 24, 55, 40, 61,
  26, 17, 0, 1, 60, 51, 30, 4, 22, 25, 54, 21, 56, 59, 6, 63, 57, 62, 11, 36,
  20, 34, 44, 52,
];

// Cached keys
let cachedImgKey = '';
let cachedSubKey = '';
let cachedKeyExpiry = 0;
let cachedBuvid3 = '';

/**
 * Get WBI keys from Bilibili API
 */
async function getWbiKeys(): Promise<{ imgKey: string; subKey: string }> {
  const now = Date.now();

  // Use cached keys if valid (24 hours)
  if (cachedImgKey && cachedSubKey && now < cachedKeyExpiry) {
    return { imgKey: cachedImgKey, subKey: cachedSubKey };
  }

  try {
    const response = await fetch(
      'https://api.bilibili.com/x/web-interface/nav',
      {
        headers: {
          'User-Agent': DEFAULT_USER_AGENT,
          Referer: 'https://www.bilibili.com/',
        },
        signal: AbortSignal.timeout(5000),
      },
    );

    const data = await response.json();

    if (data.data?.wbi_img) {
      const imgUrl = data.data.wbi_img.img_url;
      const subUrl = data.data.wbi_img.sub_url;

      // Extract key from URL filename (remove extension)
      cachedImgKey = imgUrl.split('/').pop()?.split('.')[0] || '';
      cachedSubKey = subUrl.split('/').pop()?.split('.')[0] || '';
      cachedKeyExpiry = now + 24 * 60 * 60 * 1000; // 24 hours

      return { imgKey: cachedImgKey, subKey: cachedSubKey };
    }
  } catch (e) {
    console.error('Failed to get WBI keys:', e);
  }

  return { imgKey: '', subKey: '' };
}

/**
 * Get buvid3 device identifier
 */
async function getBuvid3(): Promise<string> {
  if (cachedBuvid3) return cachedBuvid3;

  try {
    const response = await fetch(
      'https://api.bilibili.com/x/frontend/finger/spi',
      {
        headers: {
          'User-Agent': DEFAULT_USER_AGENT,
        },
        signal: AbortSignal.timeout(3000),
      },
    );

    const data = await response.json();
    if (data.data?.b_3) {
      cachedBuvid3 = data.data.b_3;
      return cachedBuvid3;
    }
  } catch (e) {
    console.error('Failed to get buvid3:', e);
  }

  // Fallback to random UUID
  cachedBuvid3 = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(
    /[xy]/g,
    (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    },
  );

  return cachedBuvid3;
}

/**
 * Generate mixin key from img_key + sub_key
 */
function getMixinKey(imgKey: string, subKey: string): string {
  const raw = imgKey + subKey;
  return MIXIN_KEY_ENC_TAB.map((n) => raw[n])
    .join('')
    .slice(0, 32);
}

/**
 * Sign parameters with WBI
 */
async function signParams(
  params: Record<string, string>,
): Promise<Record<string, string>> {
  const { imgKey, subKey } = await getWbiKeys();

  if (!imgKey || !subKey) {
    // Fallback: return unsigned params
    return params;
  }

  const mixinKey = getMixinKey(imgKey, subKey);
  const wts = Math.floor(Date.now() / 1000);

  // Add wts timestamp
  const signedParams = { ...params, wts: wts.toString() };

  // Sort params by key
  const sortedKeys = Object.keys(signedParams).sort();

  // Filter and encode
  const query = sortedKeys
    .map((key) => {
      const value = signedParams[key]
        .replace(/[!'()*]/g, '')
        .replace(/%20/g, '+');
      return `${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
    })
    .join('&');

  // Generate w_rid = md5(query + mixin_key)
  const encoder = new TextEncoder();
  const data = encoder.encode(query + mixinKey);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const wRid = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

  return { ...signedParams, w_rid: wRid };
}

/**
 * Build Bilibili request headers
 */
export async function getBilibiliHeaders(): Promise<Record<string, string>> {
  const buvid3 = await getBuvid3();

  return {
    'User-Agent': DEFAULT_USER_AGENT,
    Referer: 'https://www.bilibili.com/',
    Origin: 'https://www.bilibili.com',
    Accept: 'application/json, text/plain, */*',
    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
    Cookie: `buvid3=${buvid3}`,
    'Sec-Ch-Ua':
      '"Not A(Brand";v="99", "Google Chrome";v="121", "Chromium";v="121"',
    'Sec-Ch-Ua-Mobile': '?0',
    'Sec-Ch-Ua-Platform': '"Windows"',
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'same-site',
  };
}

/**
 * Search Bilibili with WBI signature
 */
export async function searchBilibili(
  keyword: string,
  page: number = 1,
  pageSize: number = 20,
): Promise<any> {
  const params = {
    keyword,
    page: page.toString(),
    page_size: pageSize.toString(),
    search_type: 'video',
    order: 'totalrank',
  };

  const signedParams = await signParams(params);
  const queryString = new URLSearchParams(signedParams).toString();

  const headers = await getBilibiliHeaders();

  const response = await fetch(
    `https://api.bilibili.com/x/web-interface/wbi/search/all/v2?${queryString}`,
    {
      headers,
      signal: AbortSignal.timeout(10000),
    },
  );

  if (!response.ok) {
    throw new Error(`Bilibili API error: ${response.status}`);
  }

  const data = await response.json();

  if (data.code !== 0) {
    throw new Error(`Bilibili API error: ${data.message}`);
  }

  return data;
}

/**
 * Get Bilibili video info
 */
export async function getBilibiliVideoInfo(bvid: string): Promise<any> {
  const params = { bvid };
  const signedParams = await signParams(params);
  const queryString = new URLSearchParams(signedParams).toString();

  const headers = await getBilibiliHeaders();

  const response = await fetch(
    `https://api.bilibili.com/x/web-interface/view?${queryString}`,
    {
      headers,
      signal: AbortSignal.timeout(5000),
    },
  );

  if (!response.ok) {
    throw new Error(`Bilibili API error: ${response.status}`);
  }

  const data = await response.json();

  if (data.code !== 0) {
    throw new Error(`Bilibili API error: ${data.message}`);
  }

  return data.data;
}
