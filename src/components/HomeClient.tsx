/* eslint-disable no-console */

'use client';

import { queryOptions, useQuery } from '@tanstack/react-query';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import {
  Suspense,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  useTransition,
} from 'react';
import { createPortal } from 'react-dom';

import { getAuthInfoFromBrowserCookie } from '@/lib/auth';
import { BangumiCalendarData } from '@/lib/bangumi.client';
// 客户端收藏 API
import {
  getAllFavorites,
  getAllPlayRecords,
  getAllReminders,
} from '@/lib/db.client';
import { getDoubanDetails } from '@/lib/douban.client';
import { getNotificationPermission } from '@/lib/reminder-notification';
import { ReleaseCalendarItem, ShortDramaItem } from '@/lib/types';
import { DoubanItem } from '@/lib/types';
import { resolveCardPosterUrl } from '@/lib/utils';
// 🚀 TanStack Query Mutations
import { useClearFavoritesMutation } from '@/hooks/useFavoritesMutations';
import { HomePageData, useHomePageQueries } from '@/hooks/useHomePageQueries';
import { useClearRemindersMutation } from '@/hooks/useRemindersMutations';

import CapsuleSwitch from '@/components/CapsuleSwitch';
import FavoritesView from '@/components/home/FavoritesView';
import HistoryView from '@/components/home/HistoryView';
import HomeContentView from '@/components/home/HomeContentView';
import RemindersView from '@/components/home/RemindersView';
import PageLayout from '@/components/PageLayout';
import PullToRefresh from '@/components/PullToRefresh';
import { SiteAdSlot } from '@/components/SiteAdSlot';
import { useSite } from '@/components/SiteProvider';

const ConfirmDialog = dynamic(() =>
  import('@/components/ConfirmDialog').then((m) => ({
    default: m.ConfirmDialog,
  })),
);
const TelegramWelcomeModal = dynamic(() =>
  import('@/components/TelegramWelcomeModal').then((m) => ({
    default: m.TelegramWelcomeModal,
  })),
);

// 🎯 优化：合并状态管理 - 使用 useReducer 减少重渲染
interface HomeState {
  activeTab: 'home' | 'favorites' | 'reminders' | 'history';
  hotMovies: DoubanItem[];
  hotTvShows: DoubanItem[];
  hotVarietyShows: DoubanItem[];
  hotAnime: DoubanItem[];
  hotShortDramas: ShortDramaItem[];
  bangumiCalendarData: BangumiCalendarData[];
  upcomingReleases: ReleaseCalendarItem[];
  loading: boolean;
  username: string;
  showAnnouncement: boolean;
}

type HomeAction =
  | {
      type: 'SET_ACTIVE_TAB';
      payload: 'home' | 'favorites' | 'reminders' | 'history';
    }
  | { type: 'SET_HOT_MOVIES'; payload: DoubanItem[] }
  | { type: 'SET_HOT_TV_SHOWS'; payload: DoubanItem[] }
  | { type: 'SET_HOT_VARIETY_SHOWS'; payload: DoubanItem[] }
  | { type: 'SET_HOT_ANIME'; payload: DoubanItem[] }
  | { type: 'SET_HOT_SHORT_DRAMAS'; payload: ShortDramaItem[] }
  | { type: 'SET_BANGUMI_CALENDAR_DATA'; payload: BangumiCalendarData[] }
  | { type: 'SET_UPCOMING_RELEASES'; payload: ReleaseCalendarItem[] }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_USERNAME'; payload: string }
  | { type: 'SET_SHOW_ANNOUNCEMENT'; payload: boolean }
  | { type: 'UPDATE_HOT_MOVIES'; payload: (prev: DoubanItem[]) => DoubanItem[] }
  | {
      type: 'UPDATE_HOT_TV_SHOWS';
      payload: (prev: DoubanItem[]) => DoubanItem[];
    }
  | {
      type: 'UPDATE_HOT_VARIETY_SHOWS';
      payload: (prev: DoubanItem[]) => DoubanItem[];
    }
  | { type: 'UPDATE_HOT_ANIME'; payload: (prev: DoubanItem[]) => DoubanItem[] }
  | {
      type: 'UPDATE_HOT_SHORT_DRAMAS';
      payload: (prev: ShortDramaItem[]) => ShortDramaItem[];
    };

const homeReducer = (state: HomeState, action: HomeAction): HomeState => {
  switch (action.type) {
    case 'SET_ACTIVE_TAB':
      return { ...state, activeTab: action.payload };
    case 'SET_HOT_MOVIES':
      return { ...state, hotMovies: action.payload };
    case 'SET_HOT_TV_SHOWS':
      return { ...state, hotTvShows: action.payload };
    case 'SET_HOT_VARIETY_SHOWS':
      return { ...state, hotVarietyShows: action.payload };
    case 'SET_HOT_ANIME':
      return { ...state, hotAnime: action.payload };
    case 'SET_HOT_SHORT_DRAMAS':
      return { ...state, hotShortDramas: action.payload };
    case 'SET_BANGUMI_CALENDAR_DATA':
      return { ...state, bangumiCalendarData: action.payload };
    case 'SET_UPCOMING_RELEASES':
      return { ...state, upcomingReleases: action.payload };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_USERNAME':
      return { ...state, username: action.payload };
    case 'SET_SHOW_ANNOUNCEMENT':
      return { ...state, showAnnouncement: action.payload };
    case 'UPDATE_HOT_MOVIES':
      return { ...state, hotMovies: action.payload(state.hotMovies) };
    case 'UPDATE_HOT_TV_SHOWS':
      return { ...state, hotTvShows: action.payload(state.hotTvShows) };
    case 'UPDATE_HOT_VARIETY_SHOWS':
      return {
        ...state,
        hotVarietyShows: action.payload(state.hotVarietyShows),
      };
    case 'UPDATE_HOT_ANIME':
      return { ...state, hotAnime: action.payload(state.hotAnime) };
    case 'UPDATE_HOT_SHORT_DRAMAS':
      return { ...state, hotShortDramas: action.payload(state.hotShortDramas) };
    default:
      return state;
  }
};

// Query Options 工厂函数
const allFavoritesOptions = () =>
  queryOptions({
    queryKey: ['favorites'],
    queryFn: () => getAllFavorites(),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

const allPlayRecordsOptions = () =>
  queryOptions({
    queryKey: ['playRecords'],
    queryFn: () => getAllPlayRecords(),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

const allRemindersOptions = () =>
  queryOptions({
    queryKey: ['reminders'],
    queryFn: () => getAllReminders(),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

const aiRecommendOptions = (enabled: boolean) =>
  queryOptions({
    queryKey: ['ai-recommendations'],
    queryFn: async () => {
      const res = await fetch('/api/ai-recommend/personalized');
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      return data.recommendations || [];
    },
    enabled,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

const historyTimelineOptions = (enabled: boolean) =>
  queryOptions({
    queryKey: ['history-timeline'],
    queryFn: async () => {
      const res = await fetch('/api/play-history/timeline');
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      return data.timeline || {};
    },
    enabled,
    staleTime: 2 * 60 * 1000,
  });

const favoriteGroupsOptions = (enabled: boolean) =>
  queryOptions({
    queryKey: ['favorite-groups'],
    queryFn: async () => {
      const res = await fetch('/api/favorites/groups');
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      return data.groups || ['默认'];
    },
    enabled,
    staleTime: 5 * 60 * 1000,
  });

const favoriteUpdatesOptions = (enabled: boolean) =>
  queryOptions({
    queryKey: ['favorite-updates'],
    queryFn: async () => {
      const res = await fetch('/api/favorites/updates');
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      return data.count || 0;
    },
    enabled,
    staleTime: 2 * 60 * 1000,
  });

export interface HomeClientProps {
  initialTrendingData?: HomePageData;
}

export function HomeClient({ initialTrendingData }: HomeClientProps) {
  // 🚀 TanStack Query - 首页数据查询（替代 GlobalCache）
  const {
    data: homeData,
    isLoading: homeLoading,
    refetch: refetchHomeData,
  } = useHomePageQueries(initialTrendingData);

  // 🎯 优化：使用 useTransition 让 tab 切换不阻塞 UI
  const [isPending, startTransition] = useTransition();

  // 🎯 优化：使用 useReducer 合并本地状态
  const [state, dispatch] = useReducer(homeReducer, {
    activeTab: 'home',
    hotMovies: [],
    hotTvShows: [],
    hotVarietyShows: [],
    hotAnime: [],
    hotShortDramas: [],
    bangumiCalendarData: [],
    upcomingReleases: [],
    loading: true,
    username: '',
    showAnnouncement: false,
  });

  const { announcement, announcementTitle } = useSite();
  const searchParams = useSearchParams();

  // 解构状态以便使用
  const { activeTab, upcomingReleases, username, showAnnouncement } = state;

  const [showContinueWatching, setShowContinueWatching] = useState(false);

  // 🎯 处理URL查询参数，支持从其他页面跳转到特定tab
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && ['favorites', 'history', 'profile', 'reminders'].includes(tab)) {
      startTransition(() => {
        dispatch({ type: 'SET_ACTIVE_TAB', payload: tab as any });
      });
    }
  }, [searchParams]);

  const hasUnreadAnnouncement =
    typeof window !== 'undefined' &&
    announcement !== undefined &&
    localStorage.getItem('hasSeenAnnouncement') !== announcement;

  // 滚动检测 - 显示"继续观看"浮动按钮
  useEffect(() => {
    const handleScroll = () => {
      // 当滚动超过 Hero Banner 高度（约 50vh）时显示按钮
      setShowContinueWatching(window.scrollY > window.innerHeight * 0.5);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // AI 个性化推荐
  const { data: aiRecommendations = [], isLoading: aiRecommendLoading } =
    useQuery(aiRecommendOptions(!!username));

  // 🚀 从 TanStack Query 获取首页数据，本地状态作为详情增强
  const hotMovies = useMemo(() => {
    const cached = homeData?.hotMovies || [];
    // 合并本地详情数据
    if (state.hotMovies.length > 0 && cached.length > 0) {
      return cached.map((m) => {
        const local = state.hotMovies.find((lm) => lm.id === m.id);
        return local ? { ...m, ...local } : m;
      });
    }
    return cached;
  }, [homeData?.hotMovies, state.hotMovies]);

  const hotTvShows = useMemo(() => {
    const cached = homeData?.hotTvShows || [];
    if (state.hotTvShows.length > 0 && cached.length > 0) {
      return cached.map((s) => {
        const local = state.hotTvShows.find((ls) => ls.id === s.id);
        return local ? { ...s, ...local } : s;
      });
    }
    return cached;
  }, [homeData?.hotTvShows, state.hotTvShows]);

  const hotVarietyShows = useMemo(() => {
    const cached = homeData?.hotVarietyShows || [];
    if (state.hotVarietyShows.length > 0 && cached.length > 0) {
      return cached.map((s) => {
        const local = state.hotVarietyShows.find((ls) => ls.id === s.id);
        return local ? { ...s, ...local } : s;
      });
    }
    return cached;
  }, [homeData?.hotVarietyShows, state.hotVarietyShows]);

  const hotAnime = useMemo(() => {
    const cached = homeData?.hotAnime || [];
    if (state.hotAnime.length > 0 && cached.length > 0) {
      return cached.map((a) => {
        const local = state.hotAnime.find((la) => la.id === a.id);
        return local ? { ...a, ...local } : a;
      });
    }
    return cached;
  }, [homeData?.hotAnime, state.hotAnime]);

  const hotShortDramas = useMemo(() => {
    const cached = homeData?.hotShortDramas || [];
    if (state.hotShortDramas.length > 0 && cached.length > 0) {
      return cached.map((d) => {
        const local = state.hotShortDramas.find((ld) => ld.id === d.id);
        return local ? { ...d, ...local } : d;
      });
    }
    return cached;
  }, [homeData?.hotShortDramas, state.hotShortDramas]);

  // 🚀 计算 loading 状态：首次加载时显示 loading
  const loading = homeLoading;

  // 🚀 Web Worker引用
  const workerRef = useRef<Worker | null>(null);

  // 🎯 优化：缓存问候语计算
  const [greeting] = useState(() => {
    const hour = new Date().getHours();
    if (hour < 12) return '早上好';
    if (hour < 18) return '下午好';
    return '晚上好';
  });

  // 🎯 优化：缓存今天的日期（用于上映日期计算）
  const [today] = useState(() => {
    const dateStr = new Date().toLocaleDateString('zh-CN', {
      timeZone: 'Asia/Shanghai',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return dateStr.replace(/\//g, '-');
  });

  const [requireClearConfirmation] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('requireClearConfirmation');
      if (saved !== null) return JSON.parse(saved);
    }
    return false;
  });
  const [announcementPinned, setAnnouncementPinned] = useState(false);

  // 合并初始化逻辑 - 优化性能，减少重渲染

  useEffect(() => {
    // 获取用户名
    const authInfo = getAuthInfoFromBrowserCookie();
    if (authInfo?.username) {
      dispatch({ type: 'SET_USERNAME', payload: authInfo.username });
    }

    // 检查公告弹窗状态
    if (typeof window !== 'undefined' && announcement) {
      const hasSeenAnnouncement = localStorage.getItem('hasSeenAnnouncement');
      if (hasSeenAnnouncement !== announcement) {
        dispatch({ type: 'SET_SHOW_ANNOUNCEMENT', payload: true });
      } else {
        dispatch({
          type: 'SET_SHOW_ANNOUNCEMENT',
          payload: Boolean(!hasSeenAnnouncement && announcement),
        });
      }
    }
  }, [announcement]);

  // 🚀 TanStack Query - 使用 useQuery 获取收藏数据（自动缓存，跨页面持久化）
  const { data: allFavorites = {}, isLoading: favoritesLoading } = useQuery(
    allFavoritesOptions(),
  );

  // 🚀 TanStack Query - 使用 useQuery 获取播放记录（自动缓存，跨页面持久化）
  const { data: allPlayRecords = {} } = useQuery(allPlayRecordsOptions());

  // 🚀 TanStack Query - 使用 useQuery 获取提醒数据（自动缓存，跨页面持久化）
  const { data: allReminders = {} } = useQuery(allRemindersOptions());

  // 收藏夹数据
  type FavoriteItem = {
    id: string;
    source: string;
    title: string;
    poster: string;
    episodes: number;
    source_name: string;
    currentEpisode?: number;
    search_title?: string;
    origin?: 'vod' | 'live';
    type?: string;
    releaseDate?: string;
    remarks?: string;
    group?: string;
  };

  // 🚀 TanStack Query - 使用 useMemo 计算收藏列表（自动响应数据变化）
  const favoriteItems = useMemo(() => {
    // 根据保存时间排序（从近到远）
    return Object.entries(allFavorites)
      .sort(([, a], [, b]) => b.save_time - a.save_time)
      .map(([key, fav]) => {
        const plusIndex = key.indexOf('+');
        const source = key.slice(0, plusIndex);
        const id = key.slice(plusIndex + 1);

        // 查找对应的播放记录，获取当前集数
        const playRecord = allPlayRecords[key];
        const currentEpisode = playRecord?.index;

        return {
          id,
          source,
          title: fav.title,
          year: fav.year,
          poster: resolveCardPosterUrl(fav.cover),
          episodes: fav.total_episodes,
          source_name: fav.source_name,
          currentEpisode,
          search_title: fav?.search_title,
          origin: fav?.origin,
          type: fav?.type,
          releaseDate: fav?.releaseDate,
          remarks: fav?.remarks,
          group: fav?.group,
        } as FavoriteItem;
      });
  }, [allFavorites, allPlayRecords]);

  // 🚀 TanStack Query - 使用 useMemo 计算提醒列表（自动响应数据变化）
  const reminderItems = useMemo(() => {
    // 根据保存时间排序（从近到远）
    return Object.entries(allReminders)
      .sort(([, a], [, b]) => b.save_time - a.save_time)
      .map(([key, reminder]) => {
        const plusIndex = key.indexOf('+');
        const source = key.slice(0, plusIndex);
        const id = key.slice(plusIndex + 1);

        return {
          id,
          source,
          title: reminder.title,
          year: reminder.year,
          poster: resolveCardPosterUrl(reminder.cover),
          episodes: reminder.total_episodes,
          source_name: reminder.source_name,
          search_title: reminder?.search_title,
          origin: reminder?.origin,
          type: reminder?.type,
          releaseDate: reminder.releaseDate,
          remarks: reminder?.remarks,
        };
      });
  }, [allReminders]);

  const [favoriteFilter, setFavoriteFilter] = useState<
    'all' | 'movie' | 'tv' | 'anime' | 'shortdrama' | 'live' | 'variety'
  >('all');
  const [favoriteSortBy, setFavoriteSortBy] = useState<
    'recent' | 'title' | 'rating'
  >('recent');
  const [upcomingFilter, setUpcomingFilter] = useState<'all' | 'movie' | 'tv'>(
    'all',
  );
  const [reminderFilter, setReminderFilter] = useState<
    'all' | 'upcoming' | 'today' | 'released'
  >('all');
  const [showClearFavoritesDialog, setShowClearFavoritesDialog] =
    useState(false);
  const [showClearRemindersDialog, setShowClearRemindersDialog] =
    useState(false);
  const [notifPermission, setNotifPermission] = useState<
    NotificationPermission | 'unsupported'
  >(() => getNotificationPermission());
  const [favoriteGroupFilter, setFavoriteGroupFilter] =
    useState<string>('全部');

  const { data: historyTimeline = {} } = useQuery(
    historyTimelineOptions(activeTab === 'history'),
  );

  // 🎯 优化：缓存收藏夹统计信息计算
  const favoriteStats = useMemo(() => {
    if (favoriteItems.length === 0) return null;

    return {
      total: favoriteItems.length,
      movie: favoriteItems.filter((item) => {
        if (item.type) return item.type === 'movie';
        if (item.source === 'shortdrama' || item.source_name === '短剧')
          return false;
        if (item.source === 'bangumi') return false;
        if (item.origin === 'live') return false;
        return item.episodes === 1;
      }).length,
      tv: favoriteItems.filter((item) => {
        if (item.type) return item.type === 'tv';
        if (item.source === 'shortdrama' || item.source_name === '短剧')
          return false;
        if (item.source === 'bangumi') return false;
        if (item.origin === 'live') return false;
        return item.episodes > 1;
      }).length,
      anime: favoriteItems.filter((item) => {
        if (item.type) return item.type === 'anime';
        return item.source === 'bangumi';
      }).length,
      shortdrama: favoriteItems.filter((item) => {
        if (item.type) return item.type === 'shortdrama';
        return item.source === 'shortdrama' || item.source_name === '短剧';
      }).length,
      live: favoriteItems.filter((item) => item.origin === 'live').length,
      variety: favoriteItems.filter((item) => {
        if (item.type) return item.type === 'variety';
        return false;
      }).length,
    };
  }, [favoriteItems]);

  useEffect(() => {
    // Don't aggressively clear recommend cache on mount - let it expire naturally
    // This was causing request storms by clearing valid cache and forcing refetches

    // 🚀 TanStack Query 会自动加载数据，无需手动调用

    // 🚀 清理Web Worker
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, []);

  // 收藏分组和更新数（TanStack Query）
  const { data: favoriteGroups = ['默认'] } = useQuery(
    favoriteGroupsOptions(activeTab === 'favorites'),
  );
  const { data: updateCount = 0 } = useQuery(
    favoriteUpdatesOptions(activeTab === 'favorites'),
  );

  // 如果首页数据加载完成但热门短剧为空，强制刷新（可能之前缓存了空数据）
  // Only refetch once, not repeatedly - track if we've already tried
  const hasRetriedShortDramaRef = useRef(false);
  useEffect(() => {
    if (
      homeData &&
      homeData.hotShortDramas.length === 0 &&
      !homeLoading &&
      !hasRetriedShortDramaRef.current
    ) {
      hasRetriedShortDramaRef.current = true;
      // Delay to avoid immediate refetch storm
      const timer = setTimeout(() => {
        refetchHomeData();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [homeData, homeLoading, refetchHomeData]);

  // 🚀 当 GlobalCache 数据加载完成后，延迟加载详情数据
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!homeData) return;

    // 取消上一次的请求
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    // 延迟1秒后并行加载所有详情数据（让首屏先渲染）
    const timer = setTimeout(() => {
      if (controller.signal.aborted) return;

      // 收集所有需要加载的ID
      const movieIds = homeData.hotMovies.slice(0, 2).map((m) => m.id);
      const tvShowIds = homeData.hotTvShows.slice(0, 2).map((s) => s.id);
      const animeId = homeData.hotAnime[0]?.id;
      const varietyId = homeData.hotVarietyShows[0]?.id;

      // 并行请求所有详情
      const allIds = [
        ...new Set(
          [...movieIds, ...tvShowIds, animeId, varietyId].filter(Boolean),
        ),
      ];

      if (allIds.length > 0) {
        Promise.all(
          allIds.map(async (id) => {
            try {
              const res = await getDoubanDetails(id as string);
              if (res.code === 200 && res.data) {
                return {
                  id,
                  plot_summary: res.data.plot_summary,
                  backdrop: res.data.backdrop,
                  trailerUrl: res.data.trailerUrl,
                };
              }
            } catch (error) {
              // 忽略单个请求失败
            }
            return null;
          }),
        ).then((results) => {
          if (controller.signal.aborted) return;

          const detailsMap = new Map(
            results.filter(Boolean).map((r) => [r!.id, r]),
          );

          // 更新电影
          if (movieIds.length > 0) {
            dispatch({
              type: 'UPDATE_HOT_MOVIES',
              payload: (prev) => {
                const base = prev.length > 0 ? prev : homeData.hotMovies;
                return base.map((m) => {
                  const detail = detailsMap.get(m.id);
                  return detail ? { ...m, ...detail } : m;
                });
              },
            });
          }

          // 更新剧集
          if (tvShowIds.length > 0) {
            dispatch({
              type: 'UPDATE_HOT_TV_SHOWS',
              payload: (prev) => {
                const base = prev.length > 0 ? prev : homeData.hotTvShows;
                return base.map((s) => {
                  const detail = detailsMap.get(s.id);
                  return detail ? { ...s, ...detail } : s;
                });
              },
            });
          }

          // 更新动漫
          if (animeId && detailsMap.has(animeId)) {
            dispatch({
              type: 'UPDATE_HOT_ANIME',
              payload: (prev) => {
                const base = prev.length > 0 ? prev : homeData.hotAnime;
                return base.map((a) =>
                  a.id === animeId ? { ...a, ...detailsMap.get(animeId) } : a,
                );
              },
            });
          }

          // 更新综艺
          if (varietyId && detailsMap.has(varietyId)) {
            dispatch({
              type: 'UPDATE_HOT_VARIETY_SHOWS',
              payload: (prev) => {
                const base = prev.length > 0 ? prev : homeData.hotVarietyShows;
                return base.map((s) =>
                  s.id === varietyId
                    ? { ...s, ...detailsMap.get(varietyId) }
                    : s,
                );
              },
            });
          }
        });
      }
    }, 1000);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [homeData]);

  // 🔄 异步加载即将上映数据
  useEffect(() => {
    if (!homeData) return;

    const controller = new AbortController();

    fetch('/api/release-calendar?limit=100', { signal: controller.signal })
      .then((res) => {
        if (!res.ok) {
          console.error('获取即将上映数据失败，状态码:', res.status);
          return { items: [] };
        }
        return res.json();
      })
      .then((upcomingData) => {
        if (controller.signal.aborted) return;

        if (upcomingData?.items) {
          const releases = upcomingData.items;
          // 初始化Web Worker
          if (
            !workerRef.current &&
            typeof window !== 'undefined' &&
            window.Worker
          ) {
            try {
              workerRef.current = new Worker(
                new URL(
                  '../workers/releaseCalendar.worker.ts',
                  import.meta.url,
                ),
              );

              workerRef.current.onmessage = (e: MessageEvent) => {
                const { selectedItems, error } = e.data;

                if (error) {
                  console.error('📅 [Worker] 处理失败:', error);
                  dispatch({ type: 'SET_UPCOMING_RELEASES', payload: [] });
                  return;
                }

                dispatch({
                  type: 'SET_UPCOMING_RELEASES',
                  payload: selectedItems,
                });
              };

              workerRef.current.onerror = () => {
                dispatch({ type: 'SET_UPCOMING_RELEASES', payload: [] });
              };
            } catch {
              dispatch({ type: 'SET_UPCOMING_RELEASES', payload: [] });
            }
          }

          if (workerRef.current) {
            const todayStr = new Date()
              .toLocaleDateString('zh-CN', {
                timeZone: 'Asia/Shanghai',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
              })
              .replace(/\//g, '-');

            workerRef.current.postMessage({
              releases,
              today: todayStr,
            });
          }
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          dispatch({ type: 'SET_UPCOMING_RELEASES', payload: [] });
        }
      });

    return () => controller.abort();
  }, [homeData]);

  // 🚀 TanStack Query - 使用 useMutation 管理清空收藏操作
  const clearFavoritesMutation = useClearFavoritesMutation();

  // 🚀 TanStack Query - 使用 useMutation 管理清空提醒操作
  const clearRemindersMutation = useClearRemindersMutation();

  const handleCloseAnnouncement = (announcement: string) => {
    dispatch({ type: 'SET_SHOW_ANNOUNCEMENT', payload: false });
    localStorage.setItem('hasSeenAnnouncement', announcement);
  };

  const handleOpenAnnouncement = () => {
    dispatch({ type: 'SET_SHOW_ANNOUNCEMENT', payload: true });
    setAnnouncementPinned(true);
  };

  return (
    <PageLayout
      onAnnouncementClick={handleOpenAnnouncement}
      hasUnreadAnnouncement={hasUnreadAnnouncement}
    >
      {/* Telegram 新用户欢迎弹窗 */}
      <TelegramWelcomeModal />

      <PullToRefresh
        onRefresh={async () => {
          refetchHomeData();
        }}
        threshold={100}
      >
        <div className='overflow-visible mt-0 pb-20 md:pb-safe-bottom'>
          <div className='mb-8 space-y-4'>
            <SiteAdSlot position='home_hero' />
            {/* 欢迎横幅 - 现代化精简设计 */}
            <div className='flex flex-wrap items-center gap-3 py-1 sm:gap-4'>
              <h2 className='flex flex-wrap items-center gap-2 text-xl font-semibold text-gray-900 dark:text-white sm:text-2xl'>
                <span>
                  {greeting}
                  {username && '，'}
                </span>
                {username && (
                  <span className='font-bold text-[#dba52b] dark:text-[#f4c24d]'>
                    {username}
                  </span>
                )}
              </h2>
            </div>

            {/* 顶部 Tab 切换 - AI 按钮已移至右上角导航栏 */}
            <div className='flex items-center justify-start'>
              <CapsuleSwitch
                className='bg-white dark:bg-gray-800'
                options={[
                  { label: '首页', value: 'home' },
                  {
                    label: `收藏夹${updateCount > 0 ? ` (${updateCount})` : ''}`,
                    value: 'favorites',
                  },
                  { label: '想看', value: 'reminders' },
                  { label: '历史', value: 'history' },
                ]}
                active={activeTab}
                onChange={(value) =>
                  startTransition(() =>
                    dispatch({
                      type: 'SET_ACTIVE_TAB',
                      payload: value as
                        | 'home'
                        | 'favorites'
                        | 'reminders'
                        | 'history',
                    }),
                  )
                }
              />
            </div>
          </div>

          <div
            className={`w-full mx-auto ${isPending ? 'opacity-70 transition-opacity duration-150' : ''}`}
          >
            {activeTab === 'reminders' ? (
              <RemindersView
                reminderItems={reminderItems}
                reminderFilter={reminderFilter}
                setReminderFilter={setReminderFilter}
                today={today}
                notifPermission={notifPermission}
                clearRemindersMutation={clearRemindersMutation.mutate}
                showClearRemindersDialog={showClearRemindersDialog}
                setShowClearRemindersDialog={setShowClearRemindersDialog}
                requireClearConfirmation={requireClearConfirmation}
              />
            ) : activeTab === 'favorites' ? (
              <FavoritesView
                favoriteItems={favoriteItems}
                favoriteFilter={favoriteFilter}
                setFavoriteFilter={setFavoriteFilter}
                favoriteSortBy={favoriteSortBy}
                setFavoriteSortBy={setFavoriteSortBy}
                favoriteGroupFilter={favoriteGroupFilter}
                setFavoriteGroupFilter={setFavoriteGroupFilter}
                favoriteGroups={favoriteGroups}
                favoriteStats={favoriteStats}
                today={today}
                clearFavoritesMutation={clearFavoritesMutation.mutate}
                showClearFavoritesDialog={showClearFavoritesDialog}
                setShowClearFavoritesDialog={setShowClearFavoritesDialog}
                requireClearConfirmation={requireClearConfirmation}
                favoritesLoading={favoritesLoading}
              />
            ) : activeTab === 'history' ? (
              <HistoryView historyTimeline={historyTimeline} />
            ) : (
              <HomeContentView
                hotMovies={hotMovies as DoubanItem[]}
                hotTvShows={hotTvShows as DoubanItem[]}
                hotVarietyShows={hotVarietyShows as DoubanItem[]}
                hotAnime={hotAnime as DoubanItem[]}
                hotShortDramas={hotShortDramas as ShortDramaItem[]}
                upcomingReleases={upcomingReleases}
                loading={loading}
                username={username}
                aiRecommendations={aiRecommendations}
                aiRecommendLoading={aiRecommendLoading}
                upcomingFilter={upcomingFilter}
                setUpcomingFilter={setUpcomingFilter}
                today={today}
              />
            )}
          </div>
        </div>
        {typeof document !== 'undefined' &&
          announcement &&
          (showAnnouncement || announcementPinned) &&
          createPortal(
            <div
              className={`fixed inset-0 z-50 flex items-start justify-center bg-black/50 backdrop-blur-sm dark:bg-black/70 p-4 pt-20 sm:items-center sm:pt-4 transition-opacity duration-300 ${
                showAnnouncement ? '' : 'opacity-0 pointer-events-none'
              }`}
              onTouchStart={(e) => {
                if (e.target === e.currentTarget) {
                  e.preventDefault();
                }
              }}
              onTouchMove={(e) => {
                if (e.target === e.currentTarget) {
                  e.preventDefault();
                  e.stopPropagation();
                }
              }}
              onTouchEnd={(e) => {
                if (e.target === e.currentTarget) {
                  e.preventDefault();
                }
              }}
              style={{
                touchAction: 'none',
              }}
            >
              <div
                className='w-full max-w-md max-h-[calc(100vh-6rem)] overflow-y-auto rounded-2xl bg-white p-6 shadow-lg dark:bg-gray-900 transform transition-all duration-300 hover:shadow-2xl'
                onTouchMove={(e) => {
                  e.stopPropagation();
                }}
                style={{
                  touchAction: 'auto',
                }}
              >
                <div className='mb-4'>
                  <h3 className='border-b border-green-500 pb-1 text-2xl font-bold tracking-tight text-gray-800 dark:text-white'>
                    {announcementTitle || '站点公告'}
                  </h3>
                </div>
                <div className='mb-6'>
                  <div className='relative mb-4 overflow-hidden rounded-lg bg-green-50 dark:bg-green-900/20'>
                    <div className='absolute inset-y-0 left-0 w-1.5 bg-green-500 dark:bg-green-400'></div>
                    <p className='ml-4 leading-relaxed text-gray-600 dark:text-gray-300'>
                      {announcement}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleCloseAnnouncement(announcement)}
                  className='w-full rounded-lg bg-linear-to-r from-green-600 to-green-700 px-4 py-3 text-white font-medium shadow-md transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:from-green-700 hover:to-green-800 dark:from-green-600 dark:to-green-700 dark:hover:from-green-700 dark:hover:to-green-800'
                >
                  我知道了
                </button>
              </div>
            </div>,
            document.body,
          )}
      </PullToRefresh>

      {/* "继续观看"浮动按钮 */}
      {showContinueWatching && activeTab === 'home' && (
        <button
          onClick={() => {
            document
              .getElementById('continue-watching')
              ?.scrollIntoView({ behavior: 'smooth' });
          }}
          className='fixed bottom-[calc(96px+env(safe-area-inset-bottom))] md:bottom-6 right-6 z-70 flex items-center gap-2 px-4 py-2.5 bg-green-500 text-white rounded-full shadow-lg hover:bg-green-600 transition-all duration-300 hover:scale-105'
        >
          <span className='text-sm font-medium'>继续观看</span>
          <span className='text-xs'>↓</span>
        </button>
      )}
    </PageLayout>
  );
}

export default function Home() {
  return (
    <Suspense>
      <HomeClient />
    </Suspense>
  );
}
