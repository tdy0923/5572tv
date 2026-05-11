type Locale = 'zh' | 'en';

const translations: Record<Locale, Record<string, string>> = {
  zh: {
    'home': '首页',
    'search': '搜索',
    'favorites': '收藏夹',
    'history': '历史',
    'settings': '设置',
    'login': '登录',
    'register': '注册',
    'logout': '退出登录',
    'dark_mode': '深色模式',
    'language': '语言',
    'about': '关于',
    'share': '分享',
    'download': '下载',
    'play': '播放',
    'pause': '暂停',
    'fullscreen': '全屏',
    'volume': '音量',
    'loading': '加载中...',
    'no_results': '暂无结果',
    'error': '出错了',
    'retry': '重试',
    'save': '保存',
    'cancel': '取消',
    'confirm': '确认',
    'delete': '删除',
    'edit': '编辑',
    'add': '添加',
    'search_placeholder': '搜索影片、演员...',
    'trending': '热门搜索',
    'similar': '相似推荐',
    'episode': '集',
    'movie': '电影',
    'tv': '剧集',
    'anime': '动漫',
    'variety': '综艺',
    'live': '直播',
    'short_drama': '短剧',
    'app_download': '客户端下载',
    'mobile_app': '手机端',
    'tv_app': '电视端',
  },
  en: {
    'home': 'Home',
    'search': 'Search',
    'favorites': 'Favorites',
    'history': 'History',
    'settings': 'Settings',
    'login': 'Login',
    'register': 'Register',
    'logout': 'Logout',
    'dark_mode': 'Dark Mode',
    'language': 'Language',
    'about': 'About',
    'share': 'Share',
    'download': 'Download',
    'play': 'Play',
    'pause': 'Pause',
    'fullscreen': 'Fullscreen',
    'volume': 'Volume',
    'loading': 'Loading...',
    'no_results': 'No results',
    'error': 'Error',
    'retry': 'Retry',
    'save': 'Save',
    'cancel': 'Cancel',
    'confirm': 'Confirm',
    'delete': 'Delete',
    'edit': 'Edit',
    'add': 'Add',
    'search_placeholder': 'Search movies, actors...',
    'trending': 'Trending',
    'similar': 'Similar',
    'episode': 'Ep',
    'movie': 'Movie',
    'tv': 'TV Series',
    'anime': 'Anime',
    'variety': 'Variety',
    'live': 'Live',
    'short_drama': 'Short Drama',
    'app_download': 'Download Apps',
    'mobile_app': 'Mobile',
    'tv_app': 'TV',
  },
};

let currentLocale: Locale = 'zh';

export function setLocale(locale: Locale) {
  currentLocale = locale;
  if (typeof window !== 'undefined') {
    localStorage.setItem('locale', locale);
  }
}

export function getLocale(): Locale {
  if (typeof window !== 'undefined') {
    return (localStorage.getItem('locale') as Locale) || 'zh';
  }
  return currentLocale;
}

export function t(key: string): string {
  const locale = getLocale();
  return translations[locale]?.[key] || translations['zh']?.[key] || key;
}
