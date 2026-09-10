/**
 * 榜单（评分/排行页）共享类型与配置
 *
 * 数据来源：
 * - douban：豆瓣 tag 搜索（j/search_subjects）+ Top250 图表接口（j/chart/top_list）
 * - site：站内自有数据（用户评分 / 播放热度 / 搜索热度）
 */

export type RankingGroup = 'movie' | 'tv' | 'anime' | 'variety' | 'site';

export type RankingItemType = 'movie' | 'tv' | 'variety' | 'anime';

export interface RankingItem {
  /** 豆瓣 id / 站内源视频 id / 搜索词（作为唯一 key） */
  id: string;
  title: string;
  poster: string;
  rate: string;
  year: string;
  type: RankingItemType;
  /** 豆瓣 id（用于播放页精确匹配） */
  douban_id?: number;
  /** 站内源 key（站内热播榜直达播放用） */
  source?: string;
  /** 站内 source:id（站内热播榜原始记录） */
  videoId?: string;
  /** 票数 / 播放量 / 搜索次数 */
  count?: number;
  /** 热搜榜搜索词 */
  query?: string;
}

export interface RankingBoard {
  id: string;
  title: string;
  subtitle: string;
  group: RankingGroup;
  kind: 'douban' | 'site';
  items: RankingItem[];
}

export interface DoubanBoardConfig {
  id: string;
  title: string;
  /** 豆瓣 tag，用于 j/search_subjects */
  tag: string;
  sort: 'recommend' | 'time' | 'rank';
  type: 'movie' | 'tv';
  group: RankingGroup;
  limit: number;
  /** 使用 Top250 图表接口（j/chart/top_list） */
  top250?: boolean;
}

export const DOUBAN_BOARDS: DoubanBoardConfig[] = [
  // ── 电影 ──
  {
    id: 'douban-movie-top250',
    title: '豆瓣电影 Top250',
    tag: '经典',
    sort: 'rank',
    type: 'movie',
    group: 'movie',
    limit: 50,
    top250: true,
  },
  {
    id: 'douban-movie-high',
    title: '豆瓣高分电影',
    tag: '豆瓣高分',
    sort: 'recommend',
    type: 'movie',
    group: 'movie',
    limit: 20,
  },
  {
    id: 'douban-movie-hot',
    title: '热门电影',
    tag: '热门',
    sort: 'recommend',
    type: 'movie',
    group: 'movie',
    limit: 20,
  },
  {
    id: 'douban-movie-new',
    title: '最新电影',
    tag: '最新',
    sort: 'time',
    type: 'movie',
    group: 'movie',
    limit: 20,
  },
  {
    id: 'douban-movie-cold',
    title: '冷门佳片',
    tag: '冷门佳片',
    sort: 'recommend',
    type: 'movie',
    group: 'movie',
    limit: 20,
  },
  {
    id: 'douban-movie-cn',
    title: '华语电影',
    tag: '华语',
    sort: 'recommend',
    type: 'movie',
    group: 'movie',
    limit: 20,
  },
  {
    id: 'douban-movie-west',
    title: '欧美电影',
    tag: '欧美',
    sort: 'recommend',
    type: 'movie',
    group: 'movie',
    limit: 20,
  },
  {
    id: 'douban-movie-jp',
    title: '日本电影',
    tag: '日本',
    sort: 'recommend',
    type: 'movie',
    group: 'movie',
    limit: 20,
  },
  {
    id: 'douban-movie-kr',
    title: '韩国电影',
    tag: '韩国',
    sort: 'recommend',
    type: 'movie',
    group: 'movie',
    limit: 20,
  },
  {
    id: 'douban-movie-scifi',
    title: '科幻电影',
    tag: '科幻',
    sort: 'recommend',
    type: 'movie',
    group: 'movie',
    limit: 20,
  },
  {
    id: 'douban-movie-action',
    title: '动作电影',
    tag: '动作',
    sort: 'recommend',
    type: 'movie',
    group: 'movie',
    limit: 20,
  },
  {
    id: 'douban-movie-comedy',
    title: '喜剧电影',
    tag: '喜剧',
    sort: 'recommend',
    type: 'movie',
    group: 'movie',
    limit: 20,
  },
  {
    id: 'douban-movie-mystery',
    title: '悬疑电影',
    tag: '悬疑',
    sort: 'recommend',
    type: 'movie',
    group: 'movie',
    limit: 20,
  },

  // ── 剧集 ──
  {
    id: 'douban-tv-hot',
    title: '热门剧集',
    tag: '热门',
    sort: 'recommend',
    type: 'tv',
    group: 'tv',
    limit: 20,
  },
  {
    id: 'douban-tv-cn',
    title: '国产剧',
    tag: '国产剧',
    sort: 'recommend',
    type: 'tv',
    group: 'tv',
    limit: 20,
  },
  {
    id: 'douban-tv-us',
    title: '美剧',
    tag: '美剧',
    sort: 'recommend',
    type: 'tv',
    group: 'tv',
    limit: 20,
  },
  {
    id: 'douban-tv-kr',
    title: '韩剧',
    tag: '韩剧',
    sort: 'recommend',
    type: 'tv',
    group: 'tv',
    limit: 20,
  },
  {
    id: 'douban-tv-jp',
    title: '日剧',
    tag: '日剧',
    sort: 'recommend',
    type: 'tv',
    group: 'tv',
    limit: 20,
  },
  {
    id: 'douban-tv-hk',
    title: '港剧',
    tag: '港剧',
    sort: 'recommend',
    type: 'tv',
    group: 'tv',
    limit: 20,
  },

  // ── 动漫（日本动画，douban 动画标签走 movie 通道）──
  {
    id: 'douban-anime',
    title: '日本动画',
    tag: '动画',
    sort: 'recommend',
    type: 'movie',
    group: 'anime',
    limit: 20,
  },

  // ── 综艺 ──
  {
    id: 'douban-variety',
    title: '热门综艺',
    tag: '综艺',
    sort: 'recommend',
    type: 'tv',
    group: 'variety',
    limit: 20,
  },
];

/** 榜单分组导航（电影 / 剧集 / 动漫 / 综艺 / 站内） */
export const RANKING_GROUPS: Array<{
  id: RankingGroup;
  label: string;
}> = [
  { id: 'movie', label: '电影' },
  { id: 'tv', label: '剧集' },
  { id: 'anime', label: '动漫' },
  { id: 'variety', label: '综艺' },
  { id: 'site', label: '站内' },
];
