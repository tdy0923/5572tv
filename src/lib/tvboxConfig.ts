import type { NextRequest } from 'next/server';

import type { AdminConfig } from '@/lib/admin.types';

type TvboxUser = {
  username: string;
  enabledApis?: string[];
  tags?: string[];
  showAdultContent?: boolean;
  tvboxEnabledSources?: string[];
};

export interface TvboxConfig {
  spider: string;
  wallpaper: string;
  sites: TvboxSite[];
  parses: TvboxParse[];
  flags: string[];
  lives: TvboxLive[];
  ads: string[];
  ikj?: Record<string, unknown>;
  doh?: Array<{ name: string; url: string; ips: string[] }>;
}

interface TvboxSite {
  key: string;
  name: string;
  type: number;
  api: string;
  searchable: number;
  quickSearch: number;
  filterable: number;
  ext?: string;
  timeout?: number;
  categories?: string[];
}

interface TvboxParse {
  name: string;
  type: number;
  url: string;
}

interface TvboxLive {
  name: string;
  type: number;
  url: string;
}

// 默认 IJK 硬解码优化（标准/影视仓模式使用）
const IJK_CONFIG = {
  'ijk.mediacodec': 1,
  'ijk.mediacodec-auto-rotate': 1,
  'ijk.mediacodec-handle-resolution-change': 1,
  'ijk.player.opensles': 0,
  'player.retry_count': 1,
};

// 默认 DoH 配置（标准模式使用）
const DOH_CONFIG = [
  {
    name: '阿里DNS',
    url: 'https://dns.alidns.com/dns-query',
    ips: ['223.5.5.5', '223.6.6.6'],
  },
  {
    name: '腾讯DNS',
    url: 'https://doh.pub/dns-query',
    ips: ['119.29.29.29', '119.28.28.28'],
  },
  {
    name: 'Google DNS',
    url: 'https://dns.google/dns-query',
    ips: ['8.8.8.8', '8.8.4.4'],
  },
];

/**
 * 解析 TVBox 访问权限。
 * - enableAuth 关闭：开放访问，可选识别用户名做源权限裁剪。
 * - enableAuth 开启：需合法 token（全局 token 或用户 tvboxToken），否则 401。
 * - cookie 登录态兜底识别用户名。
 */
export async function resolveTvboxAccess(
  request: NextRequest,
  config: AdminConfig,
): Promise<{
  ok: boolean;
  status?: number;
  user: TvboxUser | null;
  isGlobalToken: boolean;
}> {
  const searchParams = new URL(request.url).searchParams;
  const token = searchParams.get('token');
  const sec = config.TVBoxSecurityConfig || {
    enableAuth: false,
    token: '',
    enableIpWhitelist: false,
    allowedIPs: [],
    enableRateLimit: false,
    rateLimit: 60,
  };

  // 识别 token 对应的用户
  let user: TvboxUser | null = null;
  let isGlobalToken = false;

  if (token) {
    const tokenUser = config.UserConfig.Users.find(
      (u) => u.tvboxToken === token,
    );
    if (tokenUser) {
      user = tokenUser;
    } else if (sec.enableAuth && sec.token && token === sec.token) {
      // 全局 token 通过
      isGlobalToken = true;
    }
  }

  // cookie 登录态兜底
  if (!user) {
    try {
      const { getAuthInfoFromCookie } = await import('@/lib/auth');
      const authInfo = await getAuthInfoFromCookie(request);
      if (authInfo?.username) {
        user =
          config.UserConfig.Users.find(
            (u) => u.username === authInfo.username,
          ) || null;
      }
    } catch {
      /* ignore */
    }
  }

  // IP 白名单
  if (
    sec.enableIpWhitelist &&
    Array.isArray(sec.allowedIPs) &&
    sec.allowedIPs.length > 0
  ) {
    const ip = getClientIp(request);
    const allowed = sec.allowedIPs.some((rule) => matchIp(ip, String(rule)));
    if (!allowed) {
      return { ok: false, status: 403, user: null, isGlobalToken: false };
    }
  }

  // Token 认证开关
  if (sec.enableAuth) {
    if (!user && !isGlobalToken && !token) {
      return { ok: false, status: 401, user: null, isGlobalToken: false };
    }
  }

  return { ok: true, user, isGlobalToken };
}

/**
 * 根据权限解析当前用户可用的源 key 集合。
 * null 表示无限制（全部 enabled 源）。
 */
function resolveAllowedSourceKeys(
  user: TvboxUser | null,
  config: AdminConfig,
): Set<string> | null {
  if (!user) return null;
  if (user.tvboxEnabledSources && user.tvboxEnabledSources.length > 0) {
    return new Set(user.tvboxEnabledSources);
  }
  if (user.enabledApis && user.enabledApis.length > 0) {
    return new Set(user.enabledApis.filter((k) => k !== 'ai-recommend'));
  }
  if (user.tags && user.tags.length > 0 && config.UserConfig.Tags) {
    const inherited = new Set<string>();
    user.tags.forEach((tagName) => {
      const tag = config.UserConfig.Tags?.find((t) => t.name === tagName);
      tag?.enabledApis?.forEach((k) => {
        if (k !== 'ai-recommend') inherited.add(k);
      });
    });
    if (inherited.size > 0) return inherited;
  }
  return null;
}

/**
 * 生成 TVBox 标准配置。
 */
export function buildTvboxConfig(
  config: AdminConfig,
  baseUrl: string,
  options: {
    mode: 'standard' | 'safe' | 'fast' | 'yingshicang';
    includeAdult: boolean;
    user: TvboxUser | null;
    isGlobalToken: boolean;
  },
): TvboxConfig {
  const { mode, includeAdult, user, isGlobalToken } = options;

  const allowedKeys = resolveAllowedSourceKeys(user, config);

  let sites = config.SourceConfig.filter((s) => !s.disabled);

  // 按用户源权限裁剪
  if (allowedKeys) {
    sites = sites.filter((s) => allowedKeys.has(s.key));
  }

  // 成人内容过滤：默认（非 global token、非 showAdultContent 用户）过滤 is_adult 源
  const showAdult =
    isGlobalToken ||
    (includeAdult && !(user && user.showAdultContent === false)) ||
    user?.showAdultContent === true;

  if (!showAdult) {
    sites = sites.filter((s) => !s.is_adult);
  }

  const wallpaper = `${baseUrl}/screenshot1.png`;

  // Spider jar 必须非空（TVBox 依赖 jar 解析部分源）
  const spiderPath = `${baseUrl}/api/proxy/spider.jar`;

  const siteConfigs: TvboxSite[] = sites.map((s) => ({
    key: s.key,
    name: s.name,
    type: s.type === 'shortdrama' ? 3 : 0,
    api: s.api,
    searchable: 1,
    quickSearch: 1,
    filterable: 1,
    ext: s.detail,
    timeout: mode === 'fast' ? undefined : 30,
    categories: ['电影', '电视剧', '综艺', '动漫', '纪录片', '短剧'],
  }));

  const tvboxConfig: TvboxConfig = {
    spider: spiderPath,
    wallpaper,
    sites: siteConfigs,
    parses:
      mode === 'safe'
        ? [{ name: '内置解析', type: 1, url: `${baseUrl}/api/parse?url=` }]
        : mode === 'fast'
          ? [
              { name: 'Json并发', type: 2, url: 'Parallel' },
              { name: '内置解析', type: 1, url: `${baseUrl}/api/parse?url=` },
            ]
          : [
              { name: 'Json并发', type: 2, url: 'Parallel' },
              { name: 'Json轮询', type: 2, url: 'Sequence' },
              { name: '内置解析', type: 1, url: `${baseUrl}/api/parse?url=` },
            ],
    flags: [
      'youku',
      'qq',
      'iqiyi',
      'qiyi',
      'letv',
      'sohu',
      'tudou',
      'pptv',
      'mgtv',
      'wasu',
      'bilibili',
      '优酷',
      '爱奇艺',
      '腾讯',
      '搜狐',
      '乐视',
      '芒果',
      '哔哩哔哩',
    ],
    lives: [{ name: '直播', type: 0, url: `${baseUrl}/api/live/channels` }],
    ads: [
      'mimg.0c1q0l.cn',
      'www.googletagmanager.com',
      'static.criteo.net',
      'ad.doubleclick.net',
      'pagead2.googlesyndication.com',
    ],
  };

  // IJK 硬解码（标准/影视仓）
  if (mode === 'standard' || mode === 'yingshicang') {
    tvboxConfig.ikj = IJK_CONFIG;
  }

  // DoH（仅标准模式）
  if (mode === 'standard') {
    tvboxConfig.doh = DOH_CONFIG;
  }

  return tvboxConfig;
}

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip')?.trim() ||
    'unknown'
  );
}

// 匹配 IP（CIDR 或精确）
function matchIp(ip: string, rule: string): boolean {
  if (!ip || ip === 'unknown') return false;
  const trimmed = rule.trim();
  if (trimmed.includes('/')) {
    const [base, prefixStr] = trimmed.split('/');
    const prefix = parseInt(prefixStr, 10);
    if (isNaN(prefix)) return false;
    try {
      return ipInCidr(ip, base, prefix);
    } catch {
      return false;
    }
  }
  return ip === trimmed;
}

function ipToInt(ip: string): number {
  return (
    ip
      .split('.')
      .reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0
  );
}

function ipInCidr(ip: string, base: string, prefix: number): boolean {
  const ipInt = ipToInt(ip);
  const baseInt = ipToInt(base);
  const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;
  return (ipInt & mask) === (baseInt & mask);
}
