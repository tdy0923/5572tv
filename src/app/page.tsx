/* eslint-disable react-hooks/exhaustive-deps, no-console */

'use client';

import { queryOptions, useQuery } from '@tanstack/react-query';
import {
  Bell,
  BellOff,
  Calendar,
  ChevronRight,
  Film,
  Play,
  Sparkles,
  Trash2,
  Tv,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
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
import {
  getNotificationPermission,
  requestNotificationPermission,
} from '@/lib/reminder-notification';
import { ReleaseCalendarItem, ShortDramaItem } from '@/lib/types';
import { DoubanItem } from '@/lib/types';
import { resolveCardPosterUrl, resolvePosterUrl } from '@/lib/utils';
// 🚀 TanStack Query Mutations
import { useClearFavoritesMutation } from '@/hooks/useFavoritesMutations';
import { useHomePageQueries } from '@/hooks/useHomePageQueries';
import { useClearRemindersMutation } from '@/hooks/useRemindersMutations';

import CapsuleSwitch from '@/components/CapsuleSwitch';
import ContinueWatching from '@/components/ContinueWatching';
import HeroBanner from '@/components/HeroBanner';
import PageLayout from '@/components/PageLayout';
import ScrollableRow from '@/components/ScrollableRow';
import SectionTitle from '@/components/SectionTitle';
import { SiteAdSlot } from '@/components/SiteAdSlot';
import { useSite } from '@/components/SiteProvider';
import SkeletonCard from '@/components/SkeletonCard';

const VideoCard = dynamic(() => import('@/components/VideoCard'), {
  ssr: false,
  loading: () => <SkeletonCard />,
});
const ShortDramaCard = dynamic(() => import('@/components/ShortDramaCard'), {
  ssr: false,
  loading: () => <SkeletonCard />,
});
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

function HomeClient() {
  // 🚀 TanStack Query - 首页数据查询（替代 GlobalCache）
  const {
    data: homeData,
    isLoading: homeLoading,
    refetch: refetchHomeData,
  } = useHomePageQueries();

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

  const [hasUnreadAnnouncement, setHasUnreadAnnouncement] = useState(false);
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

  useEffect(() => {
    if (typeof window !== 'undefined' && announcement) {
      setHasUnreadAnnouncement(
        localStorage.getItem('hasSeenAnnouncement') !== announcement,
      );
    }
  }, [announcement, showAnnouncement]);

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
  const [aiRecommendations, setAiRecommendations] = useState<any[]>([]);
  const [aiRecommendLoading, setAiRecommendLoading] = useState(false);

  useEffect(() => {
    // 登录用户才加载推荐
    if (!username) return;
    const loadRecommendations = async () => {
      setAiRecommendLoading(true);
      try {
        const res = await fetch('/api/ai-recommend/personalized');
        if (res.ok) {
          const data = await res.json();
          setAiRecommendations(data.recommendations || []);
        }
      } catch {}
      setAiRecommendLoading(false);
    };
    loadRecommendations();
  }, [username]);

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
  const [greeting, setGreeting] = useState('早上好');

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('早上好');
    else if (hour < 18) setGreeting('下午好');
    else setGreeting('晚上好');
  }, []);

  // 🎯 优化：缓存今天的日期（用于上映日期计算）
  const [today, setToday] = useState('');

  useEffect(() => {
    const dateStr = new Date().toLocaleDateString('zh-CN', {
      timeZone: 'Asia/Shanghai',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    setToday(dateStr.replace(/\//g, '-'));
  }, []);

  const [requireClearConfirmation, setRequireClearConfirmation] =
    useState(false);
  const [announcementPinned, setAnnouncementPinned] = useState(false);

  // 合并初始化逻辑 - 优化性能，减少重渲染

  useEffect(() => {
    // 获取用户名
    const authInfo = getAuthInfoFromBrowserCookie();
    if (authInfo?.username) {
      dispatch({ type: 'SET_USERNAME', payload: authInfo.username });
    }

    // 读取清空确认设置
    if (typeof window !== 'undefined') {
      const savedRequireClearConfirmation = localStorage.getItem(
        'requireClearConfirmation',
      );
      if (savedRequireClearConfirmation !== null) {
        setRequireClearConfirmation(JSON.parse(savedRequireClearConfirmation));
      }
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
  >('unsupported');
  const [favoriteGroups, setFavoriteGroups] = useState<string[]>(['默认']);
  const [favoriteGroupFilter, setFavoriteGroupFilter] =
    useState<string>('全部');
  const [updateCount, setUpdateCount] = useState(0);
  const [historyTimeline, setHistoryTimeline] = useState<Record<string, any[]>>(
    {},
  );

  useEffect(() => {
    setNotifPermission(getNotificationPermission());
  }, []);

  useEffect(() => {
    if (activeTab === 'history') {
      fetch('/api/play-history/timeline')
        .then((r) => r.json())
        .then((data) => setHistoryTimeline(data.timeline || {}))
        .catch(() => {});
    }
  }, [activeTab]);

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

  // 加载收藏分组（仅在收藏tab激活时加载）

  useEffect(() => {
    if (activeTab !== 'favorites') return;
    const loadGroups = async () => {
      try {
        const res = await fetch('/api/favorites/groups');
        if (res.ok) {
          const data = await res.json();
          setFavoriteGroups(data.groups || ['默认']);
        }
      } catch {}
    };
    loadGroups();
  }, [activeTab]);

  // 加载收藏更新数（仅在收藏tab激活时加载）

  useEffect(() => {
    if (activeTab !== 'favorites') return;
    fetch('/api/favorites/updates')
      .then((r) => r.json())
      .then((data) => setUpdateCount(data.count || 0))
      .catch(() => {});
  }, [activeTab]);

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
              className='bg-white/62 dark:bg-white/6'
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
            // 想看视图
            <section className='mb-8 rounded-xl sm:rounded-[24px] border border-black/6 bg-white/34 p-4 shadow-[0_16px_44px_rgba(15,23,42,0.05)] backdrop-blur-sm dark:border-white/8 dark:bg-white/[0.03] sm:p-5'>
              <div className='mb-6 flex items-center justify-between'>
                <div className='flex items-center gap-2'>
                  <h2 className='text-xl font-bold text-gray-800 dark:text-gray-200'>
                    我想看
                  </h2>
                  {notifPermission !== 'unsupported' && (
                    <button
                      className={`rounded-full p-1.5 transition-colors ${
                        notifPermission === 'granted'
                          ? 'text-green-500'
                          : 'text-gray-400 hover:text-amber-500'
                      }`}
                      onClick={async () => {
                        const result = await requestNotificationPermission();
                        setNotifPermission(result);
                      }}
                      title={
                        notifPermission === 'granted'
                          ? '浏览器通知已开启'
                          : notifPermission === 'denied'
                            ? '浏览器通知已关闭，请在浏览器设置中开启'
                            : '点击开启浏览器通知'
                      }
                    >
                      {notifPermission === 'granted' ? (
                        <Bell className='h-4 w-4' />
                      ) : (
                        <BellOff className='h-4 w-4' />
                      )}
                    </button>
                  )}
                </div>
                {reminderItems.length > 0 && (
                  <button
                    className='ui-control flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-600 hover:text-white dark:text-red-400 dark:hover:bg-red-500 dark:hover:text-white'
                    onClick={() => {
                      if (requireClearConfirmation) {
                        setShowClearRemindersDialog(true);
                      } else {
                        clearRemindersMutation.mutate();
                      }
                    }}
                  >
                    <Trash2 className='w-4 h-4' />
                    <span>清空想看</span>
                  </button>
                )}
              </div>

              {/* 筛选标签 */}
              {reminderItems.length > 0 && (
                <div className='mb-4 flex flex-wrap gap-2'>
                  {[
                    { key: 'all' as const, label: '全部' },
                    { key: 'upcoming' as const, label: '即将上映' },
                    { key: 'today' as const, label: '今日上映' },
                    { key: 'released' as const, label: '已上映' },
                  ].map(({ key, label }) => (
                    <button
                      key={key}
                      onClick={() => setReminderFilter(key)}
                      className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-200 ${
                        reminderFilter === key
                          ? 'bg-linear-to-r from-[#f4c24d] via-[#f0b938] to-[#d89c18] text-[#171717] shadow-[0_10px_24px_rgba(244,194,77,0.28)]'
                          : 'border border-black/6 bg-white/75 text-gray-700 hover:bg-gray-100 dark:border-white/8 dark:bg-white/6 dark:text-gray-300 dark:hover:bg-white/10'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}

              <div className='justify-start grid grid-cols-2 sm:grid-cols-3 gap-x-2 gap-y-6 sm:gap-y-10 px-2 sm:px-2 sm:grid-cols-[repeat(auto-fill,_minmax(11rem,_1fr))] sm:gap-x-8'>
                {(() => {
                  // 筛选
                  let filtered = reminderItems;
                  if (reminderFilter === 'upcoming') {
                    filtered = reminderItems.filter((item) => {
                      if (!item.releaseDate) return false;
                      return item.releaseDate > today;
                    });
                  } else if (reminderFilter === 'today') {
                    filtered = reminderItems.filter((item) => {
                      if (!item.releaseDate) return false;
                      return item.releaseDate === today;
                    });
                  } else if (reminderFilter === 'released') {
                    filtered = reminderItems.filter((item) => {
                      if (!item.releaseDate) return false;
                      return item.releaseDate < today;
                    });
                  }

                  return filtered.map((item) => {
                    // 智能计算上映状态
                    let calculatedRemarks = item.remarks;

                    if (item.releaseDate) {
                      // 使用字符串比较（YYYY-MM-DD 格式可以直接比较）
                      const releaseDate = item.releaseDate; // "YYYY-MM-DD"

                      if (releaseDate < today) {
                        // 已上映：计算天数差
                        const releaseParts = releaseDate.split('-').map(Number);
                        const todayParts = today.split('-').map(Number);
                        const releaseMs = new Date(
                          releaseParts[0],
                          releaseParts[1] - 1,
                          releaseParts[2],
                        ).getTime();
                        const todayMs = new Date(
                          todayParts[0],
                          todayParts[1] - 1,
                          todayParts[2],
                        ).getTime();
                        const daysAgo = Math.floor(
                          (todayMs - releaseMs) / (1000 * 60 * 60 * 24),
                        );
                        calculatedRemarks = `已上映${daysAgo}天`;
                      } else if (releaseDate === today) {
                        calculatedRemarks = '今日上映';
                      } else {
                        // 即将上映：计算天数差
                        const releaseParts = releaseDate.split('-').map(Number);
                        const todayParts = today.split('-').map(Number);
                        const releaseMs = new Date(
                          releaseParts[0],
                          releaseParts[1] - 1,
                          releaseParts[2],
                        ).getTime();
                        const todayMs = new Date(
                          todayParts[0],
                          todayParts[1] - 1,
                          todayParts[2],
                        ).getTime();
                        const daysUntil = Math.ceil(
                          (releaseMs - todayMs) / (1000 * 60 * 60 * 24),
                        );
                        calculatedRemarks = `${daysUntil}天后上映`;
                      }
                    }

                    return (
                      <div key={item.id + item.source} className='w-full'>
                        <VideoCard
                          query={item.search_title}
                          {...item}
                          from='reminder'
                          remarks={calculatedRemarks}
                          releaseDate={item.releaseDate}
                        />
                      </div>
                    );
                  });
                })()}
                {reminderItems.length === 0 && (
                  <div className='col-span-full flex flex-col items-center justify-center py-16 px-4'>
                    <div className='mb-6 relative'>
                      <div className='absolute inset-0 bg-linear-to-r from-orange-300 to-red-300 dark:from-orange-600 dark:to-red-600 opacity-20 blur-3xl rounded-full animate-pulse'></div>
                      <svg
                        className='w-32 h-32 relative z-10'
                        viewBox='0 0 200 200'
                        fill='none'
                        xmlns='http://www.w3.org/2000/svg'
                      >
                        <path
                          d='M100 50 L100 120 M100 50 L130 80'
                          className='stroke-gray-400 dark:stroke-gray-500'
                          strokeWidth='8'
                          strokeLinecap='round'
                          strokeLinejoin='round'
                        />
                        <circle
                          cx='100'
                          cy='100'
                          r='70'
                          className='fill-gray-300 dark:fill-gray-600 stroke-gray-400 dark:stroke-gray-500'
                          strokeWidth='3'
                        />
                        <path
                          d='M100 50 L100 120 M100 50 L130 80'
                          fill='none'
                          stroke='currentColor'
                          strokeWidth='2'
                          strokeDasharray='5,5'
                          className='text-gray-400 dark:text-gray-500'
                        />
                      </svg>
                    </div>

                    <h3 className='text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2'>
                      暂无想看内容
                    </h3>
                    <p className='text-sm text-gray-500 dark:text-gray-400 text-center max-w-xs'>
                      发现即将上映的内容，点击 🔔 标记想看吧！
                    </p>
                  </div>
                )}
              </div>

              {/* 确认对话框 */}
              <ConfirmDialog
                isOpen={showClearRemindersDialog}
                title='确认清空想看'
                message={`确定要清空所有想看内容吗？\n\n这将删除 ${reminderItems.length} 项内容，此操作无法撤销。`}
                confirmText='确认清空'
                cancelText='取消'
                variant='danger'
                onConfirm={() => {
                  clearRemindersMutation.mutate();
                  setShowClearRemindersDialog(false);
                }}
                onCancel={() => setShowClearRemindersDialog(false)}
              />
            </section>
          ) : activeTab === 'favorites' ? (
            // 收藏夹视图
            <section className='mb-8 rounded-xl sm:rounded-[24px] border border-black/6 bg-white/34 p-4 shadow-[0_16px_44px_rgba(15,23,42,0.05)] backdrop-blur-sm dark:border-white/8 dark:bg-white/[0.03] sm:p-5'>
              <div className='mb-6 flex items-center justify-between'>
                <h2 className='text-xl font-bold text-gray-800 dark:text-gray-200'>
                  我的收藏
                </h2>
                {favoriteItems.length > 0 && (
                  <button
                    className='ui-control flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-600 hover:text-white dark:text-red-400 dark:hover:bg-red-500 dark:hover:text-white'
                    onClick={() => {
                      // 根据用户设置决定是否显示确认对话框
                      if (requireClearConfirmation) {
                        setShowClearFavoritesDialog(true);
                      } else {
                        // 🚀 使用 mutation.mutate() 清空收藏
                        // 特性：立即清空 UI（乐观更新），失败时自动回滚
                        clearFavoritesMutation.mutate();
                      }
                    }}
                  >
                    <Trash2 className='w-4 h-4' />
                    <span>清空收藏</span>
                  </button>
                )}
              </div>

              {/* 统计信息 */}
              {favoriteStats && (
                <div className='mb-4 flex flex-wrap gap-2 text-sm text-gray-600 dark:text-gray-400'>
                  <span className='rounded-full border border-black/6 bg-white/70 px-3 py-1 dark:border-white/8 dark:bg-white/6'>
                    共{' '}
                    <strong className='text-gray-900 dark:text-gray-100'>
                      {favoriteStats.total}
                    </strong>{' '}
                    项
                  </span>
                  {favoriteStats.movie > 0 && (
                    <span className='rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-blue-700 dark:border-blue-800/50 dark:bg-blue-900/20 dark:text-blue-300'>
                      电影 {favoriteStats.movie}
                    </span>
                  )}
                  {favoriteStats.tv > 0 && (
                    <span className='rounded-full border border-purple-200 bg-purple-50 px-3 py-1 text-purple-700 dark:border-purple-800/50 dark:bg-purple-900/20 dark:text-purple-300'>
                      剧集 {favoriteStats.tv}
                    </span>
                  )}
                  {favoriteStats.anime > 0 && (
                    <span className='rounded-full border border-pink-200 bg-pink-50 px-3 py-1 text-pink-700 dark:border-pink-800/50 dark:bg-pink-900/20 dark:text-pink-300'>
                      动漫 {favoriteStats.anime}
                    </span>
                  )}
                  {favoriteStats.shortdrama > 0 && (
                    <span className='rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-rose-700 dark:border-rose-800/50 dark:bg-rose-900/20 dark:text-rose-300'>
                      短剧 {favoriteStats.shortdrama}
                    </span>
                  )}
                  {favoriteStats.live > 0 && (
                    <span className='rounded-full border border-red-200 bg-red-50 px-3 py-1 text-red-700 dark:border-red-800/50 dark:bg-red-900/20 dark:text-red-300'>
                      直播 {favoriteStats.live}
                    </span>
                  )}
                  {favoriteStats.variety > 0 && (
                    <span className='rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-orange-700 dark:border-orange-800/50 dark:bg-orange-900/20 dark:text-orange-300'>
                      综艺 {favoriteStats.variety}
                    </span>
                  )}
                </div>
              )}

              {/* 分组筛选 */}
              {favoriteItems.length > 0 && (
                <div className='mb-4 flex flex-wrap gap-2'>
                  <button
                    onClick={() => setFavoriteGroupFilter('全部')}
                    className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-200 ${
                      favoriteGroupFilter === '全部'
                        ? 'bg-linear-to-r from-[#a78bfa] via-[#8b5cf6] to-[#7c3aed] text-white shadow-[0_10px_24px_rgba(139,92,246,0.28)]'
                        : 'border border-black/6 bg-white/75 text-gray-700 hover:bg-gray-100 dark:border-white/8 dark:bg-white/6 dark:text-gray-300 dark:hover:bg-white/10'
                    }`}
                  >
                    全部
                  </button>
                  {favoriteGroups.map((g) => (
                    <button
                      key={g}
                      onClick={() => setFavoriteGroupFilter(g)}
                      className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-200 ${
                        favoriteGroupFilter === g
                          ? 'bg-linear-to-r from-[#a78bfa] via-[#8b5cf6] to-[#7c3aed] text-white shadow-[0_10px_24px_rgba(139,92,246,0.28)]'
                          : 'border border-black/6 bg-white/75 text-gray-700 hover:bg-gray-100 dark:border-white/8 dark:bg-white/6 dark:text-gray-300 dark:hover:bg-white/10'
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              )}

              {/* 筛选标签 */}
              {favoriteItems.length > 0 && (
                <div className='mb-4 flex flex-wrap gap-2'>
                  {[
                    { key: 'all' as const, label: '全部' },
                    { key: 'movie' as const, label: '电影' },
                    { key: 'tv' as const, label: '剧集' },
                    { key: 'anime' as const, label: '动漫' },
                    { key: 'shortdrama' as const, label: '短剧' },
                    { key: 'live' as const, label: '直播' },
                    { key: 'variety' as const, label: '综艺' },
                  ].map(({ key, label }) => (
                    <button
                      key={key}
                      onClick={() => setFavoriteFilter(key)}
                      className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-200 ${
                        favoriteFilter === key
                          ? 'bg-linear-to-r from-[#f4c24d] via-[#f0b938] to-[#d89c18] text-[#171717] shadow-[0_10px_24px_rgba(244,194,77,0.28)]'
                          : 'border border-black/6 bg-white/75 text-gray-700 hover:bg-gray-100 dark:border-white/8 dark:bg-white/6 dark:text-gray-300 dark:hover:bg-white/10'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}

              {/* 排序选项 */}
              {favoriteItems.length > 0 && (
                <div className='mb-4 flex flex-wrap items-center gap-2 text-sm'>
                  <span className='text-gray-600 dark:text-gray-400'>
                    排序：
                  </span>
                  <div className='flex gap-2'>
                    {[
                      { key: 'recent' as const, label: '最近添加' },
                      { key: 'title' as const, label: '标题 A-Z' },
                    ].map(({ key, label }) => (
                      <button
                        key={key}
                        onClick={() => setFavoriteSortBy(key)}
                        className={`rounded-full px-3 py-1.5 transition-colors ${
                          favoriteSortBy === key
                            ? 'bg-linear-to-r from-[#f4c24d] via-[#f0b938] to-[#d89c18] text-[#171717] shadow-[0_10px_24px_rgba(244,194,77,0.28)]'
                            : 'border border-black/6 bg-white/75 text-gray-700 hover:bg-gray-100 dark:border-white/8 dark:bg-white/6 dark:text-gray-300 dark:hover:bg-white/10'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className='justify-start grid grid-cols-2 sm:grid-cols-3 gap-x-2 gap-y-6 sm:gap-y-10 px-2 sm:px-2 sm:grid-cols-[repeat(auto-fill,_minmax(11rem,_1fr))] sm:gap-x-8'>
                {favoritesLoading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <SkeletonCard key={i} />
                  ))
                ) : (
                  <>
                    {(() => {
                      // 筛选
                      let filtered = favoriteItems;
                      // 分组筛选
                      if (favoriteGroupFilter !== '全部') {
                        filtered = filtered.filter(
                          (item) =>
                            (item.group || '默认') === favoriteGroupFilter,
                        );
                      }
                      if (favoriteFilter === 'movie') {
                        filtered = favoriteItems.filter((item) => {
                          // 优先用 type 字段判断
                          if (item.type) return item.type === 'movie';
                          // 向后兼容：没有 type 时用 episodes 判断
                          if (
                            item.source === 'shortdrama' ||
                            item.source_name === '短剧'
                          )
                            return false;
                          if (item.source === 'bangumi') return false; // 排除动漫
                          if (item.origin === 'live') return false; // 排除直播
                          // vod 来源：按集数判断
                          return item.episodes === 1;
                        });
                      } else if (favoriteFilter === 'tv') {
                        filtered = favoriteItems.filter((item) => {
                          // 优先用 type 字段判断
                          if (item.type) return item.type === 'tv';
                          // 向后兼容：没有 type 时用 episodes 判断
                          if (
                            item.source === 'shortdrama' ||
                            item.source_name === '短剧'
                          )
                            return false;
                          if (item.source === 'bangumi') return false; // 排除动漫
                          if (item.origin === 'live') return false; // 排除直播
                          // vod 来源：按集数判断
                          return item.episodes > 1;
                        });
                      } else if (favoriteFilter === 'anime') {
                        filtered = favoriteItems.filter((item) => {
                          // 优先用 type 字段判断
                          if (item.type) return item.type === 'anime';
                          // 向后兼容：用 source 判断
                          return item.source === 'bangumi';
                        });
                      } else if (favoriteFilter === 'shortdrama') {
                        filtered = favoriteItems.filter((item) => {
                          // 优先用 type 字段判断
                          if (item.type) return item.type === 'shortdrama';
                          // 向后兼容：用 source 判断
                          return (
                            item.source === 'shortdrama' ||
                            item.source_name === '短剧'
                          );
                        });
                      } else if (favoriteFilter === 'live') {
                        filtered = favoriteItems.filter(
                          (item) => item.origin === 'live',
                        );
                      } else if (favoriteFilter === 'variety') {
                        filtered = favoriteItems.filter((item) => {
                          // 优先用 type 字段判断
                          if (item.type) return item.type === 'variety';
                          // 向后兼容：暂无 fallback
                          return false;
                        });
                      }

                      // 排序
                      if (favoriteSortBy === 'title') {
                        filtered = [...filtered].sort((a, b) =>
                          a.title.localeCompare(b.title, 'zh-CN'),
                        );
                      }
                      // 'recent' 已经在 updateFavoriteItems 中按 save_time 排序了

                      return filtered.map((item) => {
                        // 智能计算即将上映状态
                        let calculatedRemarks = item.remarks;

                        if (item.releaseDate) {
                          // 使用字符串比较（YYYY-MM-DD 格式可以直接比较）
                          const releaseDate = item.releaseDate; // "YYYY-MM-DD"

                          if (releaseDate < today) {
                            // 已上映：计算天数差
                            const releaseParts = releaseDate
                              .split('-')
                              .map(Number);
                            const todayParts = today.split('-').map(Number);
                            const releaseMs = new Date(
                              releaseParts[0],
                              releaseParts[1] - 1,
                              releaseParts[2],
                            ).getTime();
                            const todayMs = new Date(
                              todayParts[0],
                              todayParts[1] - 1,
                              todayParts[2],
                            ).getTime();
                            const daysAgo = Math.floor(
                              (todayMs - releaseMs) / (1000 * 60 * 60 * 24),
                            );
                            calculatedRemarks = `已上映${daysAgo}天`;
                          } else if (releaseDate === today) {
                            calculatedRemarks = '今日上映';
                          } else {
                            // 即将上映：计算天数差
                            const releaseParts = releaseDate
                              .split('-')
                              .map(Number);
                            const todayParts = today.split('-').map(Number);
                            const releaseMs = new Date(
                              releaseParts[0],
                              releaseParts[1] - 1,
                              releaseParts[2],
                            ).getTime();
                            const todayMs = new Date(
                              todayParts[0],
                              todayParts[1] - 1,
                              todayParts[2],
                            ).getTime();
                            const daysUntil = Math.ceil(
                              (releaseMs - todayMs) / (1000 * 60 * 60 * 24),
                            );
                            calculatedRemarks = `${daysUntil}天后上映`;
                          }
                        }

                        return (
                          <div key={item.id + item.source} className='w-full'>
                            <VideoCard
                              query={item.search_title}
                              {...item}
                              from='favorite'
                              remarks={calculatedRemarks}
                            />
                          </div>
                        );
                      });
                    })()}
                    {favoriteItems.length === 0 && (
                      <div className='col-span-full flex flex-col items-center justify-center py-16 px-4'>
                        {/* SVG 插画 - 空收藏夹 */}
                        <div className='mb-6 relative'>
                          <div className='absolute inset-0 bg-linear-to-r from-pink-300 to-purple-300 dark:from-pink-600 dark:to-purple-600 opacity-20 blur-3xl rounded-full animate-pulse'></div>
                          <svg
                            className='w-32 h-32 relative z-10'
                            viewBox='0 0 200 200'
                            fill='none'
                            xmlns='http://www.w3.org/2000/svg'
                          >
                            {/* 心形主体 */}
                            <path
                              d='M100 170C100 170 30 130 30 80C30 50 50 30 70 30C85 30 95 40 100 50C105 40 115 30 130 30C150 30 170 50 170 80C170 130 100 170 100 170Z'
                              className='fill-gray-300 dark:fill-gray-600 stroke-gray-400 dark:stroke-gray-500 transition-colors duration-300'
                              strokeWidth='3'
                            />
                            {/* 虚线边框 */}
                            <path
                              d='M100 170C100 170 30 130 30 80C30 50 50 30 70 30C85 30 95 40 100 50C105 40 115 30 130 30C150 30 170 50 170 80C170 130 100 170 100 170Z'
                              fill='none'
                              stroke='currentColor'
                              strokeWidth='2'
                              strokeDasharray='5,5'
                              className='text-gray-400 dark:text-gray-500'
                            />
                          </svg>
                        </div>

                        {/* 文字提示 */}
                        <h3 className='text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2'>
                          收藏夹空空如也
                        </h3>
                        <p className='text-sm text-gray-500 dark:text-gray-400 text-center max-w-xs'>
                          快去发现喜欢的影视作品，点击 ❤️ 添加到收藏吧！
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* 确认对话框 */}
              <ConfirmDialog
                isOpen={showClearFavoritesDialog}
                title='确认清空收藏'
                message={`确定要清空所有收藏吗？\n\n这将删除 ${favoriteItems.length} 项收藏，此操作无法撤销。`}
                confirmText='确认清空'
                cancelText='取消'
                variant='danger'
                onConfirm={() => {
                  // 🚀 使用 mutation.mutate() 清空收藏
                  // 特性：立即清空 UI（乐观更新），失败时自动回滚
                  clearFavoritesMutation.mutate();
                  setShowClearFavoritesDialog(false);
                }}
                onCancel={() => setShowClearFavoritesDialog(false)}
              />
            </section>
          ) : activeTab === 'history' ? (
            // 播放历史时间线
            <section className='mb-8 rounded-xl sm:rounded-[24px] border border-black/6 bg-white/34 p-4 shadow-[0_16px_44px_rgba(15,23,42,0.05)] backdrop-blur-sm dark:border-white/8 dark:bg-white/[0.03] sm:p-5'>
              <div className='mb-6 flex items-center justify-between'>
                <h2 className='text-xl font-bold text-gray-800 dark:text-gray-200'>
                  观看历史
                </h2>
              </div>
              <div className='space-y-6'>
                {Object.entries(historyTimeline).length === 0 ? (
                  <div className='text-center py-12 text-gray-500 dark:text-gray-400'>
                    暂无播放记录
                  </div>
                ) : (
                  Object.entries(historyTimeline).map(([date, items]) => (
                    <div key={date}>
                      <div className='flex items-center gap-2 mb-3'>
                        <div className='w-2 h-2 rounded-full bg-[#f4c24d]' />
                        <h3 className='text-sm font-medium text-gray-500 dark:text-gray-400'>
                          {date}
                        </h3>
                      </div>
                      <div className='grid grid-cols-3 gap-x-2 gap-y-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6'>
                        {items.map((item) => (
                          <a
                            key={item.key}
                            href={`/play?source=${encodeURIComponent(item.source || item.key.split('+')[0])}&id=${encodeURIComponent(item.id || item.key.split('+').slice(1).join('+'))}&title=${encodeURIComponent(item.title || '')}`}
                            className='group'
                          >
                            <div className='aspect-[2/3] overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800'>
                              {item.cover ? (
                                <img
                                  src={item.cover}
                                  alt={item.title}
                                  loading='lazy'
                                  className='w-full h-full object-cover group-hover:scale-105 transition-transform'
                                />
                              ) : (
                                <div className='w-full h-full flex items-center justify-center text-gray-400 text-2xl'>
                                  🎬
                                </div>
                              )}
                            </div>
                            <p className='mt-1 text-xs text-gray-700 dark:text-gray-300 line-clamp-1'>
                              {item.title}
                            </p>
                          </a>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          ) : (
            // 首页视图
            <>
              {/* Hero Banner 轮播 - 只要有数据就渲染 */}
              {(hotMovies.length > 0 ||
                hotTvShows.length > 0 ||
                hotVarietyShows.length > 0 ||
                hotShortDramas.length > 0) && (
                <section className='mb-8 md:mb-10'>
                  <HeroBanner
                    items={[
                      // 豆瓣电影
                      ...hotMovies.slice(0, 2).map((movie) => ({
                        id: movie.id,
                        title: movie.title,
                        poster: resolveCardPosterUrl(movie.poster),
                        // backdrop: movie.backdrop,
                        // trailerUrl: movie.trailerUrl,
                        // description: movie.plot_summary,
                        year: movie.year,
                        // rate: movie.rate,
                        douban_id: Number(movie.id),
                        type: 'movie',
                      })),
                      // 豆瓣电视剧
                      ...hotTvShows.slice(0, 2).map((show) => ({
                        id: show.id,
                        title: show.title,
                        poster: resolveCardPosterUrl(show.poster),
                        // backdrop: show.backdrop,
                        // trailerUrl: show.trailerUrl,
                        // description: show.plot_summary,
                        year: show.year,
                        // rate: show.rate,
                        douban_id: Number(show.id),
                        type: 'tv',
                      })),
                      // 豆瓣综艺
                      ...hotVarietyShows.slice(0, 1).map((show) => ({
                        id: show.id,
                        title: show.title,
                        poster: resolveCardPosterUrl(show.poster),
                        // backdrop: show.backdrop,
                        // trailerUrl: show.trailerUrl,
                        // description: show.plot_summary,
                        year: show.year,
                        // rate: show.rate,
                        douban_id: Number(show.id),
                        type: 'variety',
                      })),
                      // 豆瓣动漫
                      ...hotAnime.slice(0, 1).map((anime) => ({
                        id: anime.id,
                        title: anime.title,
                        poster: resolveCardPosterUrl(anime.poster),
                        // backdrop: anime.backdrop,
                        // trailerUrl: anime.trailerUrl,
                        // description: anime.plot_summary,
                        year: anime.year,
                        // rate: anime.rate,
                        douban_id: Number(anime.id),
                        type: 'anime',
                      })),
                    ]}
                    autoPlayInterval={8000}
                    showControls={true}
                    showIndicators={true}
                    enableVideo={
                      !(window as any).RUNTIME_CONFIG?.DISABLE_HERO_TRAILER
                    }
                  />
                </section>
              )}

              {/* 下载APP入口 */}
              <a
                href='/download'
                className='mb-6 flex items-center justify-between rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 p-4 text-white shadow-lg transition-transform hover:scale-[1.02] sm:mb-8 sm:rounded-2xl sm:p-5'
              >
                <div className='flex items-center gap-3'>
                  <div className='flex h-10 w-10 items-center justify-center rounded-lg bg-white/20'>
                    <Film className='h-5 w-5' />
                  </div>
                  <div>
                    <h3 className='text-sm font-bold sm:text-base'>
                      下载 5572 影视 APP
                    </h3>
                    <p className='text-xs text-white/80'>
                      更好的观影体验，支持离线缓存
                    </p>
                  </div>
                </div>
                <ChevronRight className='h-5 w-5' />
              </a>

              {/* 继续观看 */}
              <div className='relative mb-6 sm:mb-10' id='continue-watching'>
                <div className='pointer-events-none absolute inset-x-8 -top-5 h-12 rounded-full bg-linear-to-r from-transparent via-primary-400/10 to-transparent blur-2xl dark:via-primary-300/10' />
                <ContinueWatching className='mb-0' />
              </div>

              {/* 猜你想看 - 有数据或有用户名都显示 */}
              {username && (
                <section className='mb-8 md:mb-10'>
                  <div className='mb-4 flex items-center justify-between'>
                    <SectionTitle
                      title='猜你想看'
                      icon={Sparkles}
                      iconColor='text-purple-500'
                    />
                    <span className='text-xs text-gray-400 dark:text-gray-500'>
                      AI 推荐
                    </span>
                  </div>
                  {aiRecommendLoading ? (
                    <ScrollableRow>
                      {[1, 2, 3, 4].map((i) => (
                        <div key={i} className='min-w-[100px] w-[100px] sm:min-w-[180px] sm:w-44'>
                          <div className='aspect-[2/3] rounded-xl bg-gray-200 dark:bg-gray-700 animate-pulse' />
                          <div className='mt-2 h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-3/4' />
                        </div>
                      ))}
                    </ScrollableRow>
                  ) : aiRecommendations.length > 0 ? (
                    <ScrollableRow>
                      {aiRecommendations.map((item: any, index: number) => (
                        <div
                          key={index}
                          className='min-w-[100px] w-[100px] sm:min-w-[180px] sm:w-44'
                        >
                          <VideoCard
                            title={item.title || item}
                            poster={item.poster || ''}
                            year={item.year || ''}
                            rate={item.rate || ''}
                            from='douban'
                            source={item.source || 'douban'}
                            id={item.id || ''}
                            type={item.type || 'movie'}
                          />
                        </div>
                      ))}
                    </ScrollableRow>
                  ) : (
                    <div className='rounded-xl border border-dashed border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-8 text-center'>
                      <Sparkles className='mx-auto mb-3 w-8 h-8 text-purple-400/50' />
                      <p className='text-sm text-gray-500 dark:text-gray-400'>
                        多看几部影片，AI 就会为你推荐
                      </p>
                    </div>
                  )}
                </section>
              )}

              {/* 即将上映 - 只要有数据就渲染 */}
              {upcomingReleases.length > 0 && (
                <section className='mb-8 md:mb-10'>
                  <div className='mb-4 flex items-center justify-between'>
                    <SectionTitle
                      title='即将上映'
                      icon={Calendar}
                      iconColor='text-orange-500'
                    />
                    <Link
                      href='/release-calendar'
                      className='flex items-center text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors'
                    >
                      更多内容
                      <ChevronRight className='w-4 h-4 ml-1' />
                    </Link>
                  </div>

                  {/* Tab 切换 */}
                  <div className='mb-4 flex flex-wrap gap-2'>
                    {[
                      {
                        key: 'all',
                        label: '全部',
                        count: upcomingReleases.length,
                      },
                      {
                        key: 'movie',
                        label: '电影',
                        count: upcomingReleases.filter(
                          (r) => r.type === 'movie',
                        ).length,
                      },
                      {
                        key: 'tv',
                        label: '电视剧',
                        count: upcomingReleases.filter((r) => r.type === 'tv')
                          .length,
                      },
                    ].map(({ key, label, count }) => (
                      <button
                        key={key}
                        onClick={() =>
                          setUpcomingFilter(key as 'all' | 'movie' | 'tv')
                        }
                        className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-200 ${
                          upcomingFilter === key
                            ? 'bg-linear-to-r from-[#f4c24d] via-[#f0b938] to-[#d89c18] text-[#171717] shadow-[0_10px_24px_rgba(244,194,77,0.28)]'
                            : 'border border-black/6 bg-white/75 text-gray-700 hover:bg-gray-100 dark:border-white/8 dark:bg-white/6 dark:text-gray-300 dark:hover:bg-white/10'
                        }`}
                      >
                        {label}
                        {count > 0 && (
                          <span
                            className={`ml-1.5 text-xs ${
                              upcomingFilter === key
                                ? 'text-white/80'
                                : 'text-gray-500 dark:text-gray-400'
                            }`}
                          >
                            ({count})
                          </span>
                        )}
                      </button>
                    ))}
                  </div>

                  <ScrollableRow enableVirtualization={true}>
                    {upcomingReleases
                      .filter(
                        (release) =>
                          upcomingFilter === 'all' ||
                          release.type === upcomingFilter,
                      )
                      .map((release, index) => {
                        // 计算距离上映还有几天（使用字符串比较）
                        const releaseDate = release.releaseDate; // "YYYY-MM-DD"

                        let remarksText;
                        if (releaseDate < today) {
                          // 已上映：计算天数差
                          const releaseParts = releaseDate
                            .split('-')
                            .map(Number);
                          const todayParts = today.split('-').map(Number);
                          const releaseMs = new Date(
                            releaseParts[0],
                            releaseParts[1] - 1,
                            releaseParts[2],
                          ).getTime();
                          const todayMs = new Date(
                            todayParts[0],
                            todayParts[1] - 1,
                            todayParts[2],
                          ).getTime();
                          const daysAgo = Math.floor(
                            (todayMs - releaseMs) / (1000 * 60 * 60 * 24),
                          );
                          remarksText = `已上映${daysAgo}天`;
                        } else if (releaseDate === today) {
                          remarksText = '今日上映';
                        } else {
                          // 即将上映：计算天数差
                          const releaseParts = releaseDate
                            .split('-')
                            .map(Number);
                          const todayParts = today.split('-').map(Number);
                          const releaseMs = new Date(
                            releaseParts[0],
                            releaseParts[1] - 1,
                            releaseParts[2],
                          ).getTime();
                          const todayMs = new Date(
                            todayParts[0],
                            todayParts[1] - 1,
                            todayParts[2],
                          ).getTime();
                          const daysUntil = Math.ceil(
                            (releaseMs - todayMs) / (1000 * 60 * 60 * 24),
                          );
                          remarksText = `${daysUntil}天后上映`;
                        }

                        return (
                          <div
                            key={`${release.id}-${index}`}
                            className='min-w-[100px] w-[100px] sm:min-w-[180px] sm:w-44'
                          >
                            <VideoCard
                              source='upcoming_release'
                              id={release.id}
                              source_name='即将上映'
                              from='douban'
                              title={release.title}
                              poster={resolvePosterUrl(
                                release.cover,
                                '/placeholder-poster.jpg',
                              )}
                              year={release.releaseDate.split('-')[0]}
                              type={release.type}
                              remarks={remarksText}
                              releaseDate={release.releaseDate}
                              query={release.title}
                              episodes={
                                release.episodes ||
                                (release.type === 'tv' ? undefined : 1)
                              }
                            />
                          </div>
                        );
                      })}
                  </ScrollableRow>
                </section>
              )}

              {/* 热门电影 */}
              <section className='mb-8 md:mb-10 home-section'>
                <div className='mb-4 flex items-center justify-between'>
                  <SectionTitle
                    title='热门电影'
                    icon={Film}
                    iconColor='text-red-500'
                  />
                  <Link
                    href='/douban?type=movie'
                    className='flex items-center text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors'
                  >
                    更多内容
                    <ChevronRight className='w-4 h-4 ml-1' />
                  </Link>
                </div>
                <ScrollableRow enableVirtualization={true}>
                  {loading
                    ? // 加载状态显示灰色占位数据
                      Array.from({ length: 4 }).map((_, index) => (
                        <SkeletonCard key={index} />
                      ))
                    : // 显示真实数据
                      hotMovies.map((movie, index) => (
                        <div
                          key={index}
                          className='min-w-[100px] w-[100px] sm:min-w-[180px] sm:w-44'
                        >
                          <VideoCard
                            from='douban'
                            source='douban'
                            id={movie.id}
                            source_name='豆瓣'
                            title={movie.title}
                            poster={resolveCardPosterUrl(movie.poster)}
                            douban_id={Number(movie.id)}
                            year={movie.year}
                            type='movie'
                            priority={index < 3}
                          />
                        </div>
                      ))}
                </ScrollableRow>
              </section>

              {/* 热门剧集 */}
              <section className='mb-8 md:mb-10 home-section'>
                <div className='mb-4 flex items-center justify-between'>
                  <SectionTitle
                    title='热门剧集'
                    icon={Tv}
                    iconColor='text-blue-500'
                  />
                  <Link
                    href='/douban?type=tv'
                    className='flex items-center text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors'
                  >
                    更多内容
                    <ChevronRight className='w-4 h-4 ml-1' />
                  </Link>
                </div>
                <ScrollableRow enableVirtualization={true}>
                  {loading
                    ? // 加载状态显示灰色占位数据
                      Array.from({ length: 4 }).map((_, index) => (
                        <SkeletonCard key={index} />
                      ))
                    : // 显示真实数据
                      hotTvShows.map((show, index) => (
                        <div
                          key={index}
                          className='min-w-[100px] w-[100px] sm:min-w-[180px] sm:w-44'
                        >
                          <VideoCard
                            from='douban'
                            source='douban'
                            id={show.id}
                            source_name='豆瓣'
                            title={show.title}
                            poster={resolveCardPosterUrl(show.poster)}
                            douban_id={Number(show.id)}
                            year={show.year}
                            type='tv'
                            priority={index < 3}
                          />
                        </div>
                      ))}
                </ScrollableRow>
              </section>

              {/* 每日新番放送 */}
              <section className='mb-8 md:mb-10 home-section'>
                <div className='mb-4 flex items-center justify-between'>
                  <SectionTitle
                    title='新番放送'
                    icon={Calendar}
                    iconColor='text-purple-500'
                  />
                  <Link
                    href='/douban?type=anime'
                    className='flex items-center text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors'
                  >
                    更多内容
                    <ChevronRight className='w-4 h-4 ml-1' />
                  </Link>
                </div>
                <ScrollableRow enableVirtualization={true}>
                  {loading
                    ? // 加载状态显示灰色占位数据
                      Array.from({ length: 4 }).map((_, index) => (
                        <SkeletonCard key={index} />
                      ))
                    : // 展示动漫推荐
                      hotAnime.map((anime, index) => (
                        <div
                          key={`${anime.id}-${index}`}
                          className='min-w-[100px] w-[100px] sm:min-w-[180px] sm:w-44'
                        >
                          <VideoCard
                            from='douban'
                            source='douban'
                            id={anime.id}
                            source_name='豆瓣'
                            title={anime.title}
                            poster={resolveCardPosterUrl(anime.poster)}
                            douban_id={Number(anime.id)}
                            rate={(anime as any).rate || ''}
                            year={anime.year}
                            type='movie'
                          />
                        </div>
                      ))}
                </ScrollableRow>
              </section>

              {/* 热门综艺 */}
              <section className='mb-8 md:mb-10 home-section'>
                <div className='mb-4 flex items-center justify-between'>
                  <SectionTitle
                    title='热门综艺'
                    icon={Sparkles}
                    iconColor='text-pink-500'
                  />
                  <Link
                    href='/douban?type=show'
                    className='flex items-center text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors'
                  >
                    更多内容
                    <ChevronRight className='w-4 h-4 ml-1' />
                  </Link>
                </div>
                <ScrollableRow enableVirtualization={true}>
                  {loading
                    ? // 加载状态显示灰色占位数据
                      Array.from({ length: 4 }).map((_, index) => (
                        <SkeletonCard key={index} />
                      ))
                    : // 显示真实数据
                      hotVarietyShows.map((show, index) => (
                        <div
                          key={index}
                          className='min-w-[100px] w-[100px] sm:min-w-[180px] sm:w-44'
                        >
                          <VideoCard
                            from='douban'
                            source='douban'
                            id={show.id}
                            source_name='豆瓣'
                            title={show.title}
                            poster={resolveCardPosterUrl(show.poster)}
                            douban_id={Number(show.id)}
                            year={show.year}
                            type='variety'
                            priority={index < 3}
                          />
                        </div>
                      ))}
                </ScrollableRow>
              </section>

              {/* 热门短剧 */}
              <section className='mb-8 home-section'>
                <div className='mb-4 flex items-center justify-between'>
                  <SectionTitle
                    title='热门短剧'
                    icon={Play}
                    iconColor='text-orange-500'
                  />
                  <Link
                    href='/shortdrama'
                    className='flex items-center text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors'
                  >
                    更多内容
                    <ChevronRight className='w-4 h-4 ml-1' />
                  </Link>
                </div>
                <ScrollableRow enableVirtualization={true}>
                  {loading
                    ? // 加载状态显示灰色占位数据
                      Array.from({ length: 4 }).map((_, index) => (
                        <SkeletonCard key={index} />
                      ))
                    : // 显示真实数据
                      hotShortDramas.map((drama, index) => (
                        <ShortDramaCard
                          key={index}
                          drama={drama}
                          className='min-w-[100px] w-[100px] sm:min-w-[180px] sm:w-44'
                          disableEpisodeFetch
                          priority={index < 3}
                        />
                      ))}
                </ScrollableRow>
              </section>
            </>
          )}
        </div>
      </div>
      {typeof document !== 'undefined' &&
        announcement &&
        (showAnnouncement || announcementPinned) &&
        createPortal(
          <div
            className={`fixed inset-0 z-[9999] flex items-start justify-center bg-black/50 backdrop-blur-sm dark:bg-black/70 p-4 pt-20 sm:items-center sm:pt-4 transition-opacity duration-300 ${
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
              className='w-full max-w-md max-h-[calc(100vh-6rem)] overflow-y-auto rounded-2xl bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.24)] dark:bg-gray-900 transform transition-all duration-300 hover:shadow-2xl'
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

      {/* "继续观看"浮动按钮 */}
      {showContinueWatching && activeTab === 'home' && (
        <button
          onClick={() => {
            document
              .getElementById('continue-watching')
              ?.scrollIntoView({ behavior: 'smooth' });
          }}
          className='fixed bottom-24 md:bottom-6 right-6 z-[600] flex items-center gap-2 px-4 py-2.5 bg-green-500 text-white rounded-full shadow-lg hover:bg-green-600 transition-all duration-300 hover:scale-105'
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
