/**
 * 统一广告特征库 (Ad Blocker Features)
 *
 * 集中管理所有广告识别特征，供三个层面共用：
 *  1. m3u8 层  —— 过滤播放列表中的广告分片 (filterAdsFromM3U8)
 *  2. 分片层   —— 拦截 hls.js 加载广告分片/key (CustomHlsJsLoader)
 *  3. DOM 层   —— 清理播放器/页面的文字广告浮层 (四角/漂浮/跑马灯)
 *
 * 特征来源参考：AdGuard、LibreTV、KatelyaTVLocal 及主流视频站广告形态。
 */

// ─────────────────────────────────────────────
// 1. URL 路径/查询参数特征
// ─────────────────────────────────────────────
export const AD_URL_PATTERNS: RegExp[] = [
  // 广告资源扩展名
  /ads?\.(?:m3u8|ts|mp4|m4s|aac|mpd|flv)/i,
  /ad\d+\.(?:m3u8|ts|mp4|m4s)/i,
  /advert(?:isement)?\.(?:ts|mp4|m3u8)/i,
  // 常见广告路径关键词
  /advert(?:isement)?/i,
  /adbreak/i,
  /admaster/i,
  /ad_?slot/i,
  /ad_?insert/i,
  /ad_?inject/i,
  /commercial/i,
  /\/promo\//i,
  /\/promos?\//i,
  /sponsor/i,
  /preced(?:e|ing)?/i,
  /prebid|vpaid|vast|vmap|iab/i,
  /doubleclick|googlesyndication|googletagmanager|googleadservices/i,
  /amazon-adsystem|adsystem|advertising\.com/i,
  /bytedance|pangle|snssdk|bdsalegi/i,
  /qq\.com\/ad|adqq|vmad|vqq\.com\/ad|mqqad/i,
  /ucweb|uc\.cn\/ad/i,
  // 查询参数
  /[?&](?:is_?ad|ad[_=]|adid|ad_?url|ad_?src|ad_?source|ad_?tag|ad_?flag)=/i,
  /[?&]ad=\d+/i,
  /[?&]ads=\d+/i,
  /ad_?segment|ad_?part|ad_?block|ad_?clips?/i,
  // 路径中的 ad 段
  /\/ads?\//i,
  /\/advert\//i,
  /\/ad[0-9]{1,4}\//i,
  /_ad_\d+/i,
  /-ad-?\d+\.(?:ts|mp4|m3u8)/i,
  /\.ad\.(?:ts|mp4|m3u8)/i,
];

// ─────────────────────────────────────────────
// 2. 广告域名特征
// ─────────────────────────────────────────────
export const AD_DOMAIN_PATTERNS: RegExp[] = [
  // 常见视频站广告域名
  /ffzyad/i,
  /bytegoofy/i,
  /iqiyi\.hbuioo\.com/i,
  /^ad[0-9]*\./i,
  /^ads\./i,
  /^adv\./i,
  /^ad\./i,
  /^advert/i,
  /\.ad\./i,
  /ads?\.(?:cn|com|net|org|tv|xyz|top)/i,
  /advert(?:isement)?\./i,
  /\.googlesyndication\./i,
  /\.doubleclick\./i,
  /\.adservice\.google\./i,
  /amazon-adsystem\./i,
  /adsystem\./i,
];

// ─────────────────────────────────────────────
// 3. 常见广告关键词（文本/浮层识别）
// ─────────────────────────────────────────────
export const AD_KEYWORDS: string[] = [
  // 广告类型
  '广告',
  '推广',
  '招商',
  '棋牌',
  '博彩',
  '彩票',
  '时时彩',
  '捕鱼',
  '电子游艺',
  '开元',
  '开元棋牌',
  '亚博',
  '金沙',
  '威尼斯',
  'bet365',
  'bob',
  'vip',
  'bbin',
  'ag',
  '新葡京',
  '葡京',
  '万利',
  'manbetx',
  // 功能
  'sponsor',
  'sponsored',
  'advert',
  'advertisement',
  'promo',
  'promotion',
  'commercial',
  'doubleclick',
  'googlesyndication',
  'adsystem',
  'prebid',
  'vpaid',
  'vast',
  'vmap',
  '跑马',
  'marquee',
  '滚动广告',
  '漂浮广告',
  '浮层广告',
  '角标',
  '贴片',
  'banner',
  // 站点广告
  'xcvpn',
  'vpn',
  '加速器',
  '游戏推广',
];

// ─────────────────────────────────────────────
// 4. DOM 浮层广告特征（class/id 关键词）
//    四角、上下漂浮、跑马灯等文字广告的常见 class/id
// ─────────────────────────────────────────────
export const AD_FLOAT_CLASS_PATTERNS: RegExp[] = [
  /\bad[-_ ]?(?:float|overlay|banner|frame|advert|layer|bar|text|scroll|marquee|popup|tip)\b/i,
  /\b(?:float|overlay|banner|marquee|scroll)[-_ ]?ad\b/i,
  /\badv?[-_ ]?(?:float|banner|overlay|layer|text)\b/i,
  /\b(?:ad|adv|ads)[-_]?(?:container|wrapper|holder|box|div|panel|slot)\b/i,
  /\b(?:promo|sponsor|advert)[-_]?(?:banner|bar|layer|text|float|overlay)\b/i,
  /\bqm[-_ ]?ad\b/i, // 全民广告
  /\b(?:ad|adv)vip\b/i,
  /\b(?:top|bottom|left|right)[-_]?(?:ad|advert|banner|float)\b/i,
  /\b(?:fixed|sticky)[-_]?(?:ad|banner)\b/i,
  /\bhead[-_ ]?ad\b/i,
  /\bfoot[-_ ]?ad\b/i,
];

// 广告浮层的 id 精确匹配
export const AD_FLOAT_IDS: string[] = [
  'ad',
  'ads',
  'ad-box',
  'ad-box1',
  'adBox',
  'ad_1',
  'advertise',
  'advertisement',
  'banner-ad',
  'floating-ad',
  'float-ad',
  'marquee-ad',
  'scroll-ad',
  'top-ad',
  'bottom-ad',
  'left-ad',
  'right-ad',
  'qm-ad',
];

// ─────────────────────────────────────────────
// 5. 广告分片时长特征（秒）— 仅在疑似广告组内作为次要信号
// ─────────────────────────────────────────────
export const KNOWN_AD_SEGMENT_DURATIONS: Array<{
  min: number;
  max: number;
  label: string;
}> = [
  { min: 1.2, max: 1.9, label: '2s' },
  { min: 2.3, max: 3.5, label: '3s' },
  { min: 4.5, max: 6.5, label: '6s' },
  { min: 12.5, max: 17.0, label: '15s' },
  { min: 18.0, max: 22.0, label: '20s' },
  { min: 25.0, max: 35.0, label: '30s' },
  { min: 40.0, max: 50.0, label: '45s' },
  { min: 55.0, max: 65.0, label: '60s' },
  { min: 85.0, max: 95.0, label: '90s' },
];

// ─────────────────────────────────────────────
// 辅助函数
// ─────────────────────────────────────────────
/** URL 是否命中广告特征（路径 + 域名） */
export function isAdUrl(url: string): boolean {
  if (!url) return false;
  if (AD_URL_PATTERNS.some((p) => p.test(url))) return true;
  try {
    const hostname = new URL(url).hostname;
    return AD_DOMAIN_PATTERNS.some((p) => p.test(hostname));
  } catch {
    return false;
  }
}

/** 文本/元素是否含广告关键词 */
export function textContainsAdKeyword(text: string): boolean {
  if (!text) return false;
  const lower = text.toLowerCase();
  return AD_KEYWORDS.some((k) => lower.includes(k.toLowerCase()));
}

/** 元素 class/id 是否命中浮层广告特征 */
export function isFloatAdElement(
  className: string,
  id: string,
  _text: string,
): boolean {
  if (AD_FLOAT_IDS.some((fid) => id === fid)) return true;
  if (AD_FLOAT_CLASS_PATTERNS.some((p) => p.test(className))) return true;
  return false;
}

/**
 * 分片时长是否命中广告时长特征
 */
export function isAdDuration(duration: number): {
  hit: boolean;
  label: string;
} {
  for (const p of KNOWN_AD_SEGMENT_DURATIONS) {
    if (duration >= p.min && duration <= p.max) {
      return { hit: true, label: p.label };
    }
  }
  return { hit: false, label: '' };
}
