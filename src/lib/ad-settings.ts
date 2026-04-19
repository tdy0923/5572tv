export const AD_POSITIONS = [
  'home_hero',
  'search_top',
  'search_sidebar',
  'play_sidebar',
  'footer',
] as const;

export type AdPosition = (typeof AD_POSITIONS)[number];

export type AdSetting = {
  enabled: boolean;
  style: 'image' | 'text' | 'card';
  title?: string;
  content?: string;
  imageUrl?: string;
  linkUrl?: string;
  altText?: string;
  maxWidth?: number;
  maxHeight?: number;
  maxTextLength?: number;
  openInNewTab?: boolean;
};

export type AdSettings = Record<AdPosition, AdSetting>;

export const AD_POSITION_META: Record<
  AdPosition,
  {
    label: string;
    description: string;
    recommendedStyle: AdSetting['style'][];
  }
> = {
  home_hero: {
    label: '首页 Hero',
    description: '显示在首页欢迎横幅上方，适合横幅图或卡片广告。',
    recommendedStyle: ['image', 'card'],
  },
  search_top: {
    label: '搜索页顶部',
    description: '显示在搜索框上方，适合一行多个文本广告或横向图片。',
    recommendedStyle: ['text', 'image'],
  },
  search_sidebar: {
    label: '搜索页侧边',
    description: '显示在搜索结果右侧栏，适合竖向图片或卡片广告。',
    recommendedStyle: ['image', 'card'],
  },
  play_sidebar: {
    label: '播放页播放器下方',
    description: '显示在播放器与详情区之间，适合一行文本广告或横向图片。',
    recommendedStyle: ['text', 'image', 'card'],
  },
  footer: {
    label: '页脚',
    description: '显示在全站页面内容底部，适合轻量文本广告。',
    recommendedStyle: ['text', 'image'],
  },
};

export const DEFAULT_AD_SETTINGS: AdSettings = {
  home_hero: {
    enabled: false,
    style: 'card',
    title: '广告位',
    content: '',
    imageUrl: '',
    linkUrl: '',
    altText: '广告',
    maxWidth: 1200,
    maxHeight: 320,
    maxTextLength: 120,
    openInNewTab: true,
  },
  search_top: {
    enabled: false,
    style: 'text',
    title: '广告位',
    content: '',
    imageUrl: '',
    linkUrl: '',
    altText: '广告',
    maxWidth: 1200,
    maxHeight: 120,
    maxTextLength: 120,
    openInNewTab: true,
  },
  search_sidebar: {
    enabled: false,
    style: 'card',
    title: '广告位',
    content: '',
    imageUrl: '',
    linkUrl: '',
    altText: '广告',
    maxWidth: 360,
    maxHeight: 420,
    maxTextLength: 120,
    openInNewTab: true,
  },
  play_sidebar: {
    enabled: false,
    style: 'text',
    title: '广告位',
    content: '',
    imageUrl: '',
    linkUrl: '',
    altText: '广告',
    maxWidth: 1200,
    maxHeight: 120,
    maxTextLength: 120,
    openInNewTab: true,
  },
  footer: {
    enabled: false,
    style: 'text',
    title: '广告位',
    content: '',
    imageUrl: '',
    linkUrl: '',
    altText: '广告',
    maxWidth: 1200,
    maxHeight: 120,
    maxTextLength: 120,
    openInNewTab: true,
  },
};

export function mergeAdSettings(
  current: Partial<AdSettings> | undefined,
): AdSettings {
  return {
    ...DEFAULT_AD_SETTINGS,
    ...(current || {}),
    home_hero: {
      ...DEFAULT_AD_SETTINGS.home_hero,
      ...(current?.home_hero || {}),
    },
    search_top: {
      ...DEFAULT_AD_SETTINGS.search_top,
      ...(current?.search_top || {}),
    },
    search_sidebar: {
      ...DEFAULT_AD_SETTINGS.search_sidebar,
      ...(current?.search_sidebar || {}),
    },
    play_sidebar: {
      ...DEFAULT_AD_SETTINGS.play_sidebar,
      ...(current?.play_sidebar || {}),
    },
    footer: {
      ...DEFAULT_AD_SETTINGS.footer,
      ...(current?.footer || {}),
    },
  };
}

function hasMeaningfulText(value?: string) {
  return Boolean(value && value.trim());
}

export function isAdSettingRenderable(setting: AdSetting | undefined) {
  if (!setting?.enabled) return false;

  if (setting.style === 'image') {
    return hasMeaningfulText(setting.imageUrl);
  }

  if (setting.style === 'text') {
    const textAds = (setting.content || setting.title || '')
      .split('\n')
      .map((line) => line.split('|')[0]?.trim())
      .filter(Boolean);
    return textAds.length > 0;
  }

  return (
    hasMeaningfulText(setting.imageUrl) ||
    hasMeaningfulText(setting.content) ||
    ((setting.title || '').trim() !== '' &&
      (setting.title || '').trim() !== '广告位' &&
      (setting.content || '').trim() !== '')
  );
}
