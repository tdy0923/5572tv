export interface NavItemConfig {
  label: string;
  href: string;
  iconName: string;
}

export const BASE_NAV_ITEMS: NavItemConfig[] = [
  { label: '首页', href: '/', iconName: 'Home' },
  { label: '搜索', href: '/search', iconName: 'Search' },
  { label: '源浏览器', href: '/source-browser', iconName: 'Globe' },
  { label: '电影', href: '/douban?type=movie', iconName: 'Film' },
  { label: '剧集', href: '/douban?type=tv', iconName: 'Tv' },
  { label: '短剧', href: '/shortdrama', iconName: 'PlaySquare' },
  { label: '动漫', href: '/douban?type=anime', iconName: 'Cat' },
  { label: '综艺', href: '/douban?type=show', iconName: 'Clover' },
  { label: '下载App', href: '/download', iconName: 'Download' },
];

export function getDynamicNavItems(
  runtimeConfig?: {
    ENABLE_WEB_LIVE?: boolean;
    CUSTOM_CATEGORIES?: any[];
  } | null,
  userEmbyConfig?: {
    sources?: Array<{ enabled: boolean; ServerURL: string }>;
  } | null,
  publicSourcesData?: { sources?: any[] } | null,
): NavItemConfig[] {
  const items: NavItemConfig[] = [];

  if (runtimeConfig?.ENABLE_WEB_LIVE) {
    items.push({ label: '直播', href: '/live', iconName: 'Radio' });
  }

  if (runtimeConfig?.CUSTOM_CATEGORIES?.length > 0) {
    items.push({
      label: '自定义',
      href: '/douban?type=custom',
      iconName: 'Star',
    });
  }

  const hasUserEmby = userEmbyConfig?.sources?.some(
    (s) => s.enabled && s.ServerURL,
  );
  const hasPublicEmby = (publicSourcesData?.sources?.length ?? 0) > 0;
  if (hasUserEmby || hasPublicEmby) {
    items.push({ label: 'Emby', href: '/emby', iconName: 'FolderOpen' });
  }

  return items;
}

export function getUserNavItems(
  runtimeConfig?: {
    ENABLE_WEB_LIVE?: boolean;
    CUSTOM_CATEGORIES?: any[];
  } | null,
  userEmbyConfig?: {
    sources?: Array<{ enabled: boolean; ServerURL: string }>;
  } | null,
  publicSourcesData?: { sources?: any[] } | null,
): NavItemConfig[] {
  return [
    ...BASE_NAV_ITEMS,
    ...getDynamicNavItems(runtimeConfig, userEmbyConfig, publicSourcesData),
  ];
}

export function isActive(href: string, currentActive: string): boolean {
  const typeMatch = href.match(/type=([^&]+)/)?.[1];
  const decodedActive = decodeURIComponent(currentActive);
  const decodedHref = decodeURIComponent(href);

  if (decodedActive === decodedHref) return true;

  if (href !== '/' && decodedActive.startsWith(decodedHref)) return true;

  if (
    typeMatch &&
    decodedActive.startsWith('/douban') &&
    decodedActive.includes(`type=${typeMatch}`)
  ) {
    return true;
  }

  return false;
}
