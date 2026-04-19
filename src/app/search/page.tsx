/* eslint-disable react-hooks/exhaustive-deps */
'use client';

import {
  experimental_streamedQuery as streamedQuery,
  useQuery,
} from '@tanstack/react-query';
import { ChevronUp, Grid2x2, List, Play, Search, X } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';

import { isAdSettingRenderable } from '@/lib/ad-settings';
import {
  addSearchHistory,
  clearSearchHistory,
  deleteSearchHistory,
  getSearchHistory,
  subscribeToDataUpdates,
} from '@/lib/db.client';
import { SearchResult } from '@/lib/types';
import { resolvePosterUrl } from '@/lib/utils';

import { useSite } from '@/components/SiteProvider';

// ─── streamedQuery 类型 ───────────────────────────────────────────────────────

type SSEChunk =
  | { type: 'start'; totalSources: number }
  | { type: 'source_result'; results: SearchResult[] } // 80ms 批量
  | { type: 'source_progress' } // 进度 +1（无数据）
  | { type: 'source_error' }
  | { type: 'complete'; completedSources: number };

type StreamedState = {
  results: SearchResult[];
  totalSources: number;
  completedSources: number;
};

const STREAMED_INITIAL: StreamedState = {
  results: [],
  totalSources: 0,
  completedSources: 0,
};

/**
 * 将 EventSource 包装为 AsyncIterable<SSEChunk>
 *
 * 缓冲策略：
 * - source_result 数据积入 pending，每 80ms 批量 yield 一次
 * - complete 到达时同步 flush pending，确保数据不丢失
 * - 进度（completedSources）通过独立的 source_progress chunk 实时更新
 */
function eventSourceIterable(
  url: string,
  signal?: AbortSignal,
): AsyncIterable<SSEChunk> {
  return {
    [Symbol.asyncIterator]() {
      type Item =
        | { value: SSEChunk; done: false }
        | { value: undefined; done: true };
      const queue: Item[] = [];
      let waiting: ((item: Item) => void) | null = null;
      let closed = false;

      let pending: SearchResult[] = [];
      let flushTimer: ReturnType<typeof setTimeout> | null = null;

      const enqueue = (chunk: SSEChunk) => {
        if (closed) return;
        const item: Item = { value: chunk, done: false };
        if (waiting) {
          const w = waiting;
          waiting = null;
          w(item);
        } else queue.push(item);
      };

      const flushPending = () => {
        flushTimer = null;
        if (pending.length === 0) return;
        enqueue({ type: 'source_result', results: pending });
        pending = [];
      };

      const close = (completedSources?: number) => {
        if (closed) return;
        // 同步 flush 剩余缓冲
        if (flushTimer !== null) {
          clearTimeout(flushTimer);
          flushTimer = null;
        }
        if (pending.length > 0) {
          enqueue({ type: 'source_result', results: pending });
          pending = [];
        }
        if (completedSources !== undefined) {
          enqueue({ type: 'complete', completedSources });
        }
        closed = true;
        const done: Item = { value: undefined, done: true };
        if (waiting) {
          const w = waiting;
          waiting = null;
          w(done);
        } else queue.push(done);
      };

      const es = new EventSource(url);

      es.onmessage = (event) => {
        if (!event.data || closed) return;
        try {
          const payload = JSON.parse(event.data);
          switch (payload.type) {
            case 'start':
              enqueue({
                type: 'start',
                totalSources: payload.totalSources || 0,
              });
              break;
            case 'source_result':
              // 进度立即更新
              enqueue({ type: 'source_progress' });
              // 数据缓冲 80ms 批量
              if (
                Array.isArray(payload.results) &&
                payload.results.length > 0
              ) {
                pending.push(...(payload.results as SearchResult[]));
                if (flushTimer === null) {
                  flushTimer = setTimeout(flushPending, 80);
                }
              }
              break;
            case 'source_error':
              enqueue({ type: 'source_error' });
              break;
            case 'complete':
              try {
                es.close();
              } catch {}
              close(payload.completedSources ?? 0);
              break;
          }
        } catch {}
      };

      es.onerror = () => {
        try {
          es.close();
        } catch {}
        close();
      };

      signal?.addEventListener('abort', () => {
        try {
          es.close();
        } catch {}
        close();
      });

      return {
        next(): Promise<IteratorResult<SSEChunk>> {
          if (queue.length > 0) return Promise.resolve(queue.shift()!);
          if (closed) return Promise.resolve({ value: undefined, done: true });
          return new Promise((resolve) => {
            waiting = resolve;
          });
        },
      };
    },
  };
}

function pickGroupPoster(group: SearchResult[]): string {
  return resolvePosterUrl(...group.map((item) => item.poster));
}

import stcasc from 'switch-chinese';

import AcgSearch from '@/components/AcgSearch';
import ImageViewer from '@/components/ImageViewer';
import NetDiskSearchResults from '@/components/NetDiskSearchResults';
import PageLayout from '@/components/PageLayout';
import SearchResultFilter, {
  SearchFilterCategory,
} from '@/components/SearchResultFilter';
import SearchSuggestions from '@/components/SearchSuggestions';
import { SiteAdSlot } from '@/components/SiteAdSlot';
import TMDBFilterPanel, { TMDBFilterState } from '@/components/TMDBFilterPanel';
import {
  GlassPanel,
  PanelField,
  PillButton,
  PillGroup,
} from '@/components/ui-surface';
import VideoCard, { VideoCardHandle } from '@/components/VideoCard';
import VirtualGrid from '@/components/VirtualGrid';

const chineseConverter = stcasc();

function SearchPageClient() {
  // 根据 type_name 推断内容类型的辅助函数
  const inferTypeFromName = (
    typeName?: string,
    episodeCount?: number,
  ): string => {
    if (!typeName) {
      // 如果没有 type_name，使用集数判断（向后兼容）
      return episodeCount && episodeCount > 1 ? 'tv' : 'movie';
    }
    const lowerType = typeName.toLowerCase();
    if (lowerType.includes('综艺') || lowerType.includes('variety'))
      return 'variety';
    if (lowerType.includes('电影') || lowerType.includes('movie'))
      return 'movie';
    if (
      lowerType.includes('电视剧') ||
      lowerType.includes('剧集') ||
      lowerType.includes('tv') ||
      lowerType.includes('series')
    )
      return 'tv';
    if (
      lowerType.includes('动漫') ||
      lowerType.includes('动画') ||
      lowerType.includes('anime')
    )
      return 'anime';
    if (lowerType.includes('纪录片') || lowerType.includes('documentary'))
      return 'documentary';
    // 默认根据集数判断
    return episodeCount && episodeCount > 1 ? 'tv' : 'movie';
  };

  const getSearchResultUrl = (params: {
    title: string;
    year?: string;
    type?: string;
    source?: string;
    id?: string;
    query?: string;
    isAggregate?: boolean;
    doubanId?: number;
  }) => {
    const yearParam =
      params.year && params.year !== 'unknown' ? `&year=${params.year}` : '';
    const queryParam = params.query
      ? `&stitle=${encodeURIComponent(params.query.trim())}`
      : '';
    const typeParam = params.type ? `&stype=${params.type}` : '';
    const preferParam = params.isAggregate ? '&prefer=true' : '';
    const doubanParam =
      params.doubanId && params.doubanId > 0
        ? `&douban_id=${params.doubanId}`
        : '';
    if (params.isAggregate || !params.source || !params.id) {
      return `/play?title=${encodeURIComponent(params.title.trim())}${yearParam}${typeParam}${preferParam}${queryParam}${doubanParam}`;
    }
    return `/play?source=${params.source}&id=${params.id}&title=${encodeURIComponent(params.title.trim())}${yearParam}${preferParam}${queryParam}${typeParam}${doubanParam}`;
  };

  const renderTag = (label: string, className: string) => (
    <span
      className={`inline-flex items-center rounded-full px-2 py-1 text-[11px] font-medium ${className}`}
    >
      {label}
    </span>
  );

  const renderListItem = (item: {
    key: string;
    title: string;
    poster: string;
    year?: string;
    type: 'movie' | 'tv';
    episodes?: number;
    sourceName?: string;
    sourceNames?: string[];
    doubanId?: number;
    desc?: string;
    vodRemarks?: string;
    isAggregate?: boolean;
    source?: string;
    id?: string;
    query?: string;
  }) => {
    const yearText = item.year && item.year !== 'unknown' ? item.year : '';
    const sourceTags = item.isAggregate
      ? Array.from(new Set(item.sourceNames || []))
      : item.sourceName
        ? [item.sourceName]
        : [];
    const isExpanded = !!expandedSourceTags[item.key];
    const maxVisibleSourceTags = 3;
    const visibleSourceTags = isExpanded
      ? sourceTags
      : sourceTags.slice(0, maxVisibleSourceTags);
    const hiddenSourceCount = Math.max(
      0,
      sourceTags.length - visibleSourceTags.length,
    );
    const description = (item.desc || '').trim();
    const itemUrl = getSearchResultUrl({
      title: item.title,
      year: item.year,
      type: item.type,
      source: item.source,
      id: item.id,
      query: item.query,
      isAggregate: item.isAggregate,
      doubanId: item.doubanId,
    });

    return (
      <button
        key={item.key}
        type='button'
        onClick={() => router.push(itemUrl)}
        className='group w-full rounded-2xl border border-gray-200/80 bg-white/90 p-3 text-left shadow-sm transition-all hover:border-green-300 hover:shadow-md dark:border-gray-700 dark:bg-gray-900/70 dark:hover:border-green-700'
      >
        <div className='flex items-start gap-4'>
          <div className='relative h-32 w-24 shrink-0 overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-800'>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.poster}
              alt={item.title}
              className='h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]'
              loading='lazy'
              onClick={(e) => {
                e.stopPropagation();
                setPreviewImage({ url: item.poster, alt: item.title });
              }}
            />
          </div>
          <div className='min-w-0 flex-1'>
            <div className='flex items-start justify-between gap-3'>
              <div className='min-w-0 flex-1'>
                <h3 className='line-clamp-2 text-base font-semibold text-gray-900 dark:text-gray-100'>
                  {item.title}
                </h3>
                <div className='mt-2 flex flex-wrap gap-2'>
                  {renderTag(
                    item.type === 'movie' ? '电影' : '剧集',
                    'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300',
                  )}
                  {yearText &&
                    renderTag(
                      yearText,
                      'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
                    )}
                  {item.episodes &&
                    item.episodes > 0 &&
                    renderTag(
                      `${item.episodes}集`,
                      'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
                    )}
                  {item.vodRemarks &&
                    renderTag(
                      item.vodRemarks,
                      'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
                    )}
                  {item.doubanId &&
                    item.doubanId > 0 &&
                    renderTag(
                      '豆瓣',
                      'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
                    )}
                </div>
                {description && (
                  <p className='mt-3 line-clamp-3 text-sm leading-6 text-gray-600 dark:text-gray-400'>
                    {description}
                  </p>
                )}
              </div>
              <div className='shrink-0 self-center'>
                <div className='flex h-10 w-10 items-center justify-center rounded-full bg-green-500 text-white shadow-md transition-transform group-hover:scale-110 group-hover:bg-green-600'>
                  <Play
                    className='h-4 w-4 translate-x-0.5'
                    fill='currentColor'
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
        {sourceTags.length > 0 && (
          <div
            className={`mt-3 flex gap-2 ${isExpanded ? 'flex-wrap' : 'flex-nowrap overflow-hidden'}`}
          >
            {visibleSourceTags.map((sourceName) => (
              <span
                key={`${item.key}-${sourceName}`}
                className='inline-flex max-w-full shrink-0 items-center truncate rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300'
                title={sourceName}
              >
                {sourceName}
              </span>
            ))}
            {hiddenSourceCount > 0 && (
              <button
                type='button'
                onClick={(e) => {
                  e.stopPropagation();
                  setExpandedSourceTags((prev) => ({
                    ...prev,
                    [item.key]: true,
                  }));
                }}
                className='inline-flex shrink-0 items-center rounded-full border border-green-200 bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700 transition-colors hover:bg-green-100 dark:border-green-800 dark:bg-green-900/30 dark:text-green-300 dark:hover:bg-green-900/50'
              >
                +{hiddenSourceCount}
              </button>
            )}
          </div>
        )}
      </button>
    );
  };

  // 搜索历史
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  // 返回顶部按钮显示状态
  const [showBackToTop, setShowBackToTop] = useState(false);
  const { adSettings } = useSite();

  const router = useRouter();
  const searchParams = useSearchParams();
  const currentQueryRef = useRef<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [useFluidSearch, setUseFluidSearch] = useState(true);
  // 虚拟化开关状态
  const [useVirtualization, setUseVirtualization] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('useVirtualization');
      return saved !== null ? JSON.parse(saved) : true; // 默认启用
    }
    return true;
  });

  const [searchPrefsLoaded, setSearchPrefsLoaded] = useState(false);

  const hasSearchSidebarAd = isAdSettingRenderable(adSettings?.search_sidebar);
  // 精确搜索开关
  const [exactSearch, setExactSearch] = useState(true);

  // 网盘搜索相关状态
  const [searchType, setSearchType] = useState<
    'video' | 'netdisk' | 'tmdb-actor'
  >('video');
  const [netdiskResourceType, setNetdiskResourceType] = useState<
    'netdisk' | 'acg'
  >('netdisk'); // 网盘资源类型：普通网盘或动漫磁力
  const [netdiskResults, setNetdiskResults] = useState<{
    [key: string]: any[];
  } | null>(null);
  const [netdiskLoading, setNetdiskLoading] = useState(false);
  const [netdiskError, setNetdiskError] = useState<string | null>(null);
  const [netdiskTotal, setNetdiskTotal] = useState(0);

  // ACG动漫磁力搜索相关状态
  const [acgTriggerSearch, setAcgTriggerSearch] = useState<boolean>();
  const [acgError, setAcgError] = useState<string | null>(null);

  // TMDB演员搜索相关状态
  const [tmdbActorResults, setTmdbActorResults] = useState<any[] | null>(null);
  const [tmdbActorLoading, setTmdbActorLoading] = useState(false);
  const [tmdbActorError, setTmdbActorError] = useState<string | null>(null);
  const [tmdbActorType, setTmdbActorType] = useState<'movie' | 'tv'>('movie');

  // TMDB筛选状态
  const [tmdbFilterState, setTmdbFilterState] = useState<TMDBFilterState>({
    startYear: undefined,
    endYear: undefined,
    minRating: undefined,
    maxRating: undefined,
    minPopularity: undefined,
    maxPopularity: undefined,
    minVoteCount: undefined,
    minEpisodeCount: undefined,
    genreIds: [],
    languages: [],
    onlyRated: false,
    sortBy: 'popularity',
    sortOrder: 'desc',
    limit: undefined, // 移除默认限制，显示所有结果
  });

  // TMDB筛选面板显示状态
  const [tmdbFilterVisible, setTmdbFilterVisible] = useState(false);
  // 聚合卡片 refs 与聚合统计缓存
  const groupRefs = useRef<Map<string, React.RefObject<VideoCardHandle>>>(
    new Map(),
  );
  const groupStatsRef = useRef<
    Map<
      string,
      { douban_id?: number; episodes?: number; source_names: string[] }
    >
  >(new Map());

  const getGroupRef = (key: string) => {
    let ref = groupRefs.current.get(key);
    if (!ref) {
      ref = React.createRef<VideoCardHandle>();
      groupRefs.current.set(key, ref);
    }
    return ref;
  };

  const computeGroupStats = (group: SearchResult[]) => {
    const episodes = (() => {
      const countMap = new Map<number, number>();
      group.forEach((g) => {
        const len = g.episodes?.length || 0;
        if (len > 0) countMap.set(len, (countMap.get(len) || 0) + 1);
      });
      let max = 0;
      let res = 0;
      countMap.forEach((v, k) => {
        if (v > max) {
          max = v;
          res = k;
        }
      });
      return res;
    })();
    const source_names = Array.from(
      new Set(group.map((g) => g.source_name).filter(Boolean)),
    ) as string[];

    const douban_id = (() => {
      const countMap = new Map<number, number>();
      group.forEach((g) => {
        if (g.douban_id && g.douban_id > 0) {
          countMap.set(g.douban_id, (countMap.get(g.douban_id) || 0) + 1);
        }
      });
      let max = 0;
      let res: number | undefined;
      countMap.forEach((v, k) => {
        if (v > max) {
          max = v;
          res = k;
        }
      });
      return res;
    })();

    return { episodes, source_names, douban_id };
  };
  // 过滤器：非聚合与聚合
  const [filterAll, setFilterAll] = useState<{
    source: string;
    title: string;
    year: string;
    yearOrder: 'none' | 'asc' | 'desc';
  }>({
    source: 'all',
    title: 'all',
    year: 'all',
    yearOrder: 'none',
  });
  const [filterAgg, setFilterAgg] = useState<{
    source: string;
    title: string;
    year: string;
    yearOrder: 'none' | 'asc' | 'desc';
  }>({
    source: 'all',
    title: 'all',
    year: 'all',
    yearOrder: 'none',
  });

  // 获取默认聚合设置：只读取用户本地设置，默认为 true
  const getDefaultAggregate = () => {
    if (typeof window !== 'undefined') {
      const userSetting = localStorage.getItem('defaultAggregateSearch');
      if (userSetting !== null) {
        return JSON.parse(userSetting);
      }
    }
    return true; // 默认启用聚合
  };

  const [viewMode, setViewMode] = useState<'agg' | 'all'>(() => {
    return getDefaultAggregate() ? 'agg' : 'all';
  });
  const [resultDisplayMode, setResultDisplayMode] = useState<'card' | 'list'>(
    () => {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('searchResultDisplayMode');
        if (saved === 'card' || saved === 'list') return saved;
      }
      return 'card';
    },
  );
  const [expandedSourceTags, setExpandedSourceTags] = useState<
    Record<string, boolean>
  >({});
  const [previewImage, setPreviewImage] = useState<{
    url: string;
    alt: string;
  } | null>(null);

  // 保存虚拟化设置
  const toggleVirtualization = () => {
    const newValue = !useVirtualization;
    setUseVirtualization(newValue);
    if (typeof window !== 'undefined') {
      localStorage.setItem('useVirtualization', JSON.stringify(newValue));
    }
  };

  // 简化的年份排序：unknown/空值始终在最后
  const compareYear = (
    aYear: string,
    bYear: string,
    order: 'none' | 'asc' | 'desc',
  ) => {
    // 如果是无排序状态，返回0（保持原顺序）
    if (order === 'none') return 0;

    // 处理空值和unknown
    const aIsEmpty = !aYear || aYear === 'unknown';
    const bIsEmpty = !bYear || bYear === 'unknown';

    if (aIsEmpty && bIsEmpty) return 0;
    if (aIsEmpty) return 1; // a 在后
    if (bIsEmpty) return -1; // b 在后

    // 都是有效年份，按数字比较
    const aNum = parseInt(aYear, 10);
    const bNum = parseInt(bYear, 10);

    return order === 'asc' ? aNum - bNum : bNum - aNum;
  };

  // 辅助函数：检查标题是否包含搜索词（用于精确搜索）
  const titleContainsQuery = (title: string, query: string): boolean => {
    if (!exactSearch) return true;
    if (!query || !title) return true;

    const normalizedTitle = title.toLowerCase();
    const normalizedQuery = query.toLowerCase();

    if (normalizedTitle.includes(normalizedQuery)) return true;

    // 繁简互转匹配：仅当输入为繁体时，转换为简体再匹配
    if (chineseConverter.detect(normalizedQuery) === 1) {
      const simplifiedQuery = chineseConverter.simplized(normalizedQuery);
      return normalizedTitle.includes(simplifiedQuery);
    }

    return false;
  };

  // ─── TanStack Query 驱动搜索 ────────────────────────────────────────────────
  const trimmedQuery = useMemo(
    () => (searchParams.get('q') || '').trim(),
    [searchParams],
  );

  // 流式搜索
  const streamedSearchQuery = useQuery<StreamedState>({
    queryKey: ['search', 'streamed', trimmedQuery],
    queryFn: streamedQuery<SSEChunk, StreamedState>({
      streamFn: (ctx) =>
        eventSourceIterable(
          `/api/search/ws?q=${encodeURIComponent(trimmedQuery)}`,
          ctx.signal,
        ),
      refetchMode: 'reset',
      reducer: (acc: StreamedState, chunk: SSEChunk): StreamedState => {
        switch (chunk.type) {
          case 'start':
            return {
              results: [],
              totalSources: chunk.totalSources,
              completedSources: 0,
            };
          case 'source_result':
            return { ...acc, results: acc.results.concat(chunk.results) };
          case 'source_progress':
            return { ...acc, completedSources: acc.completedSources + 1 };
          case 'source_error':
            return { ...acc, completedSources: acc.completedSources + 1 };
          case 'complete':
            return {
              ...acc,
              completedSources: chunk.completedSources || acc.totalSources,
            };
        }
      },
      initialValue: STREAMED_INITIAL,
    }),
    enabled: !!trimmedQuery && useFluidSearch,
    staleTime: 0,
    gcTime: 0,
  });

  // 传统搜索
  const traditionalSearchQuery = useQuery<SearchResult[]>({
    queryKey: ['search', 'traditional', trimmedQuery],
    queryFn: async () => {
      const res = await fetch(
        `/api/search?q=${encodeURIComponent(trimmedQuery)}`,
      );
      const data = await res.json();
      return Array.isArray(data.results)
        ? (data.results as SearchResult[])
        : [];
    },
    enabled: !!trimmedQuery && !useFluidSearch,
    staleTime: 0,
    gcTime: 0,
  });

  // 派生统一搜索状态
  const searchResults: SearchResult[] = useFluidSearch
    ? (streamedSearchQuery.data?.results ?? [])
    : (traditionalSearchQuery.data ?? []);
  const totalSources = useFluidSearch
    ? (streamedSearchQuery.data?.totalSources ?? 0)
    : 1;
  const completedSources = useFluidSearch
    ? (streamedSearchQuery.data?.completedSources ?? 0)
    : traditionalSearchQuery.isSuccess
      ? 1
      : 0;
  const isLoading = useFluidSearch
    ? streamedSearchQuery.isFetching
    : traditionalSearchQuery.isFetching;
  const traditionalSearchError =
    traditionalSearchQuery.error instanceof Error
      ? traditionalSearchQuery.error.message
      : null;

  // 聚合后的结果（按标题和年份分组）
  const aggregatedResults = useMemo(() => {
    // 首先应用精确搜索过滤
    const filteredResults = exactSearch
      ? searchResults.filter((item) =>
          titleContainsQuery(item.title, currentQueryRef.current),
        )
      : searchResults;

    const map = new Map<string, SearchResult[]>();
    const keyOrder: string[] = []; // 记录键出现的顺序

    filteredResults.forEach((item) => {
      // 使用 title + year + type 作为键，year 必然存在，但依然兜底 'unknown'
      const key = `${item.title.replaceAll(' ', '')}-${
        item.year || 'unknown'
      }-${item.episodes.length === 1 ? 'movie' : 'tv'}`;
      const arr = map.get(key) || [];

      // 如果是新的键，记录其顺序
      if (arr.length === 0) {
        keyOrder.push(key);
      }

      arr.push(item);
      map.set(key, arr);
    });

    // 按出现顺序返回聚合结果
    return keyOrder.map(
      (key) => [key, map.get(key)!] as [string, SearchResult[]],
    );
  }, [searchResults, exactSearch]);

  // 当聚合结果变化时，如果某个聚合已存在，则调用其卡片 ref 的 set 方法增量更新
  useEffect(() => {
    aggregatedResults.forEach(([mapKey, group]) => {
      const stats = computeGroupStats(group);
      const prev = groupStatsRef.current.get(mapKey);
      if (!prev) {
        // 第一次出现，记录初始值，不调用 ref（由初始 props 渲染）
        groupStatsRef.current.set(mapKey, stats);
        return;
      }
      // 对比变化并调用对应的 set 方法
      const ref = groupRefs.current.get(mapKey);
      if (ref && ref.current) {
        if (prev.episodes !== stats.episodes) {
          ref.current.setEpisodes(stats.episodes);
        }
        const prevNames = (prev.source_names || []).join('|');
        const nextNames = (stats.source_names || []).join('|');
        if (prevNames !== nextNames) {
          ref.current.setSourceNames(stats.source_names);
        }
        if (prev.douban_id !== stats.douban_id) {
          ref.current.setDoubanId(stats.douban_id);
        }
        groupStatsRef.current.set(mapKey, stats);
      }
    });
  }, [aggregatedResults]);

  // 构建筛选选项
  const filterOptions = useMemo(() => {
    const sourcesSet = new Map<string, string>();
    const titlesSet = new Set<string>();
    const yearsSet = new Set<string>();

    searchResults.forEach((item) => {
      if (item.source && item.source_name) {
        sourcesSet.set(item.source, item.source_name);
      }
      if (item.title) titlesSet.add(item.title);
      if (item.year) yearsSet.add(item.year);
    });

    const sourceOptions: { label: string; value: string }[] = [
      { label: '全部来源', value: 'all' },
      ...Array.from(sourcesSet.entries())
        .sort((a, b) => a[1].localeCompare(b[1]))
        .map(([value, label]) => ({ label, value })),
    ];

    const titleOptions: { label: string; value: string }[] = [
      { label: '全部标题', value: 'all' },
      ...Array.from(titlesSet.values())
        .sort((a, b) => a.localeCompare(b))
        .map((t) => ({ label: t, value: t })),
    ];

    // 年份: 将 unknown 放末尾
    const years = Array.from(yearsSet.values());
    const knownYears = years
      .filter((y) => y !== 'unknown')
      .sort((a, b) => parseInt(b) - parseInt(a));
    const hasUnknown = years.includes('unknown');
    const yearOptions: { label: string; value: string }[] = [
      { label: '全部年份', value: 'all' },
      ...knownYears.map((y) => ({ label: y, value: y })),
      ...(hasUnknown ? [{ label: '未知', value: 'unknown' }] : []),
    ];

    const categoriesAll: SearchFilterCategory[] = [
      { key: 'source', label: '来源', options: sourceOptions },
      { key: 'title', label: '标题', options: titleOptions },
      { key: 'year', label: '年份', options: yearOptions },
    ];

    const categoriesAgg: SearchFilterCategory[] = [
      { key: 'source', label: '来源', options: sourceOptions },
      { key: 'title', label: '标题', options: titleOptions },
      { key: 'year', label: '年份', options: yearOptions },
    ];

    return { categoriesAll, categoriesAgg };
  }, [searchResults]);

  // 非聚合：应用筛选与排序
  const filteredAllResults = useMemo(() => {
    const { source, title, year, yearOrder } = filterAll;

    // 首先应用精确搜索过滤
    const exactSearchFiltered = exactSearch
      ? searchResults.filter((item) =>
          titleContainsQuery(item.title, currentQueryRef.current),
        )
      : searchResults;

    const filtered = exactSearchFiltered.filter((item) => {
      if (source !== 'all' && item.source !== source) return false;
      if (title !== 'all' && item.title !== title) return false;
      if (year !== 'all' && item.year !== year) return false;
      return true;
    });

    // 如果是无排序状态，按精确匹配优先+年份倒序排列（保留来源到达顺序的相对位置）
    if (yearOrder === 'none') {
      const q = currentQueryRef.current.trim();
      return filtered.slice().sort((a, b) => {
        const aExact = (a.title || '').trim() === q;
        const bExact = (b.title || '').trim() === q;
        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;
        const aNum = Number.parseInt(a.year as any, 10);
        const bNum = Number.parseInt(b.year as any, 10);
        const aValid = !Number.isNaN(aNum);
        const bValid = !Number.isNaN(bNum);
        if (aValid && !bValid) return -1;
        if (!aValid && bValid) return 1;
        if (aValid && bValid) return bNum - aNum;
        return 0;
      });
    }

    // 简化排序：1. 年份排序，2. 年份相同时精确匹配在前，3. 标题排序
    return filtered.sort((a, b) => {
      // 首先按年份排序
      const yearComp = compareYear(a.year, b.year, yearOrder);
      if (yearComp !== 0) return yearComp;

      // 年份相同时，精确匹配在前
      const aExactMatch = a.title === searchQuery.trim();
      const bExactMatch = b.title === searchQuery.trim();
      if (aExactMatch && !bExactMatch) return -1;
      if (!aExactMatch && bExactMatch) return 1;

      // 最后按标题排序，正序时字母序，倒序时反字母序
      return yearOrder === 'asc'
        ? a.title.localeCompare(b.title)
        : b.title.localeCompare(a.title);
    });
  }, [searchResults, filterAll, searchQuery, exactSearch]);

  // 聚合：应用筛选与排序
  const filteredAggResults = useMemo(() => {
    const { source, title, year, yearOrder } = filterAgg as any;
    const filtered = aggregatedResults.filter(([_, group]) => {
      const gTitle = group[0]?.title ?? '';
      const gYear = group[0]?.year ?? 'unknown';
      const hasSource =
        source === 'all' ? true : group.some((item) => item.source === source);
      if (!hasSource) return false;
      if (title !== 'all' && gTitle !== title) return false;
      if (year !== 'all' && gYear !== year) return false;
      return true;
    });

    // 如果是无排序状态，按精确匹配优先+年份倒序排列
    if (yearOrder === 'none') {
      const q = currentQueryRef.current.trim();
      return filtered.slice().sort((a, b) => {
        const aTitle = (a[1][0]?.title || '').trim();
        const bTitle = (b[1][0]?.title || '').trim();
        const aExact = aTitle === q;
        const bExact = bTitle === q;
        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;
        const aNum = Number.parseInt(a[1][0]?.year as any, 10);
        const bNum = Number.parseInt(b[1][0]?.year as any, 10);
        const aValid = !Number.isNaN(aNum);
        const bValid = !Number.isNaN(bNum);
        if (aValid && !bValid) return -1;
        if (!aValid && bValid) return 1;
        if (aValid && bValid) return bNum - aNum;
        return 0;
      });
    }

    // 简化排序：1. 年份排序，2. 年份相同时精确匹配在前，3. 标题排序
    return filtered.sort((a, b) => {
      // 首先按年份排序
      const aYear = a[1][0].year;
      const bYear = b[1][0].year;
      const yearComp = compareYear(aYear, bYear, yearOrder);
      if (yearComp !== 0) return yearComp;

      // 年份相同时，精确匹配在前
      const aExactMatch = a[1][0].title === searchQuery.trim();
      const bExactMatch = b[1][0].title === searchQuery.trim();
      if (aExactMatch && !bExactMatch) return -1;
      if (!aExactMatch && bExactMatch) return 1;

      // 最后按标题排序，正序时字母序，倒序时反字母序
      const aTitle = a[1][0].title;
      const bTitle = b[1][0].title;
      return yearOrder === 'asc'
        ? aTitle.localeCompare(bTitle)
        : bTitle.localeCompare(aTitle);
    });
  }, [aggregatedResults, filterAgg, searchQuery]);

  useEffect(() => {
    // 无搜索参数时聚焦搜索框
    !searchParams.get('q') && document.getElementById('searchInput')?.focus();

    // 初始加载搜索历史
    getSearchHistory().then(setSearchHistory);

    // 检查URL参数并处理初始搜索
    const initialQuery = searchParams.get('q');
    if (initialQuery) {
      setSearchQuery(initialQuery);
      setShowResults(true);
      // 如果当前是网盘搜索模式，触发网盘搜索
      if (searchType === 'netdisk') {
        handleNetDiskSearch(initialQuery);
      }
    }

    // 读取搜索偏好设置（仅初始化一次）
    if (typeof window !== 'undefined' && !searchPrefsLoaded) {
      const savedFluidSearch = localStorage.getItem('fluidSearch');
      const defaultFluidSearch =
        (window as any).RUNTIME_CONFIG?.FLUID_SEARCH !== false;
      if (savedFluidSearch !== null) {
        setUseFluidSearch(JSON.parse(savedFluidSearch));
      } else if (defaultFluidSearch !== undefined) {
        setUseFluidSearch(defaultFluidSearch);
      }

      const savedExactSearch = localStorage.getItem('exactSearch');
      if (savedExactSearch !== null) {
        setExactSearch(savedExactSearch === 'true');
      }

      setSearchPrefsLoaded(true);
    }

    // 监听搜索历史更新事件
    const unsubscribe = subscribeToDataUpdates(
      'searchHistoryUpdated',
      (newHistory: string[]) => {
        setSearchHistory(newHistory);
      },
    );

    const handleScroll = () => {
      const scrollTop =
        window.scrollY || document.documentElement.scrollTop || 0;
      setShowBackToTop(scrollTop > 300);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => {
      unsubscribe();
      window.removeEventListener('scroll', handleScroll);
    };
  }, [searchPrefsLoaded]);

  // 监听搜索类型变化，如果切换到网盘/TMDB演员搜索且有搜索词，立即搜索
  useEffect(() => {
    if (
      (searchType === 'netdisk' || searchType === 'tmdb-actor') &&
      showResults
    ) {
      const currentQuery = searchQuery.trim() || searchParams.get('q');
      if (currentQuery) {
        if (
          searchType === 'netdisk' &&
          netdiskResourceType === 'netdisk' &&
          !netdiskLoading &&
          !netdiskResults &&
          !netdiskError
        ) {
          handleNetDiskSearch(currentQuery);
        } else if (searchType === 'netdisk' && netdiskResourceType === 'acg') {
          // ACG 搜索：触发 AcgSearch 组件搜索
          setAcgTriggerSearch((prev) => !prev);
        } else if (
          searchType === 'tmdb-actor' &&
          !tmdbActorLoading &&
          !tmdbActorResults &&
          !tmdbActorError
        ) {
          handleTmdbActorSearch(currentQuery, tmdbActorType, tmdbFilterState);
        }
      }
    }
  }, [
    searchType,
    netdiskResourceType,
    showResults,
    searchQuery,
    searchParams,
    netdiskLoading,
    netdiskResults,
    netdiskError,
    tmdbActorLoading,
    tmdbActorResults,
    tmdbActorError,
  ]);

  useEffect(() => {
    // 当搜索参数变化时更新 UI 状态（数据获取由 TanStack Query 驱动）
    const query = searchParams.get('q') || '';
    currentQueryRef.current = query.trim();

    if (query) {
      setSearchQuery(query);
      setShowResults(true);
      setShowSuggestions(false);

      addSearchHistory(query);
    } else {
      setShowResults(false);
      setShowSuggestions(false);
    }
  }, [searchParams]);

  // 输入框内容变化时触发，显示搜索建议
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);

    // 如果输入框为空，隐藏搜索结果，显示搜索历史
    if (!value.trim()) {
      setShowResults(false);
    }

    // 无论输入框是否为空，都显示建议（空时显示搜索历史）
    setShowSuggestions(true);
  };

  // 搜索框聚焦时触发，显示搜索建议
  const handleInputFocus = () => {
    // 聚焦时始终显示建议（空时显示搜索历史）
    setShowSuggestions(true);
  };

  // 网盘搜索函数
  const handleNetDiskSearch = async (query: string) => {
    if (!query.trim()) return;

    setNetdiskLoading(true);
    setNetdiskError(null);
    setNetdiskResults(null);
    setNetdiskTotal(0);

    try {
      const response = await fetch(
        `/api/netdisk/search?q=${encodeURIComponent(query.trim())}`,
      );
      const data = await response.json();

      // 检查响应状态和success字段
      if (response.ok && data.success) {
        setNetdiskResults(data.data.merged_by_type || {});
        setNetdiskTotal(data.data.total || 0);
      } else {
        // 处理错误情况（包括功能关闭、配置错误等）
        setNetdiskError(data.error || '网盘搜索失败');
      }
    } catch (error: any) {
      console.error('网盘搜索请求失败:', error);
      setNetdiskError('网盘搜索请求失败，请稍后重试');
    } finally {
      setNetdiskLoading(false);
    }
  };

  // TMDB演员搜索函数
  const handleTmdbActorSearch = async (
    query: string,
    type = tmdbActorType,
    filterState = tmdbFilterState,
  ) => {
    if (!query.trim()) return;

    console.log(`🚀 [前端TMDB] 开始搜索: ${query}, type=${type}`);

    setTmdbActorLoading(true);
    setTmdbActorError(null);
    setTmdbActorResults(null);

    try {
      // 构建筛选参数
      const params = new URLSearchParams({
        actor: query.trim(),
        type: type,
      });

      // 只有设置了limit且大于0时才添加limit参数
      if (filterState.limit && filterState.limit > 0) {
        params.append('limit', filterState.limit.toString());
      }

      // 添加筛选参数
      if (filterState.startYear)
        params.append('startYear', filterState.startYear.toString());
      if (filterState.endYear)
        params.append('endYear', filterState.endYear.toString());
      if (filterState.minRating)
        params.append('minRating', filterState.minRating.toString());
      if (filterState.maxRating)
        params.append('maxRating', filterState.maxRating.toString());
      if (filterState.minPopularity)
        params.append('minPopularity', filterState.minPopularity.toString());
      if (filterState.maxPopularity)
        params.append('maxPopularity', filterState.maxPopularity.toString());
      if (filterState.minVoteCount)
        params.append('minVoteCount', filterState.minVoteCount.toString());
      if (filterState.minEpisodeCount)
        params.append(
          'minEpisodeCount',
          filterState.minEpisodeCount.toString(),
        );
      if (filterState.genreIds && filterState.genreIds.length > 0)
        params.append('genreIds', filterState.genreIds.join(','));
      if (filterState.languages && filterState.languages.length > 0)
        params.append('languages', filterState.languages.join(','));
      if (filterState.onlyRated) params.append('onlyRated', 'true');
      if (filterState.sortBy) params.append('sortBy', filterState.sortBy);
      if (filterState.sortOrder)
        params.append('sortOrder', filterState.sortOrder);

      // 调用TMDB API端点
      const response = await fetch(`/api/tmdb/actor?${params.toString()}`);
      const data = await response.json();

      if (response.ok && data.code === 200) {
        setTmdbActorResults(data.list || []);
      } else {
        setTmdbActorError(data.error || data.message || '搜索演员失败');
      }
    } catch (error: any) {
      console.error('TMDB演员搜索请求失败:', error);
      setTmdbActorError('搜索演员失败，请稍后重试');
    } finally {
      setTmdbActorLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = searchQuery.trim().replace(/\s+/g, ' ');
    if (!trimmed) return;

    // 回显搜索框
    setSearchQuery(trimmed);
    setShowSuggestions(false);
    setShowResults(true);

    if (searchType === 'netdisk') {
      // 网盘搜索 - 也更新URL保持一致性
      router.push(`/search?q=${encodeURIComponent(trimmed)}`);
      if (netdiskResourceType === 'netdisk') {
        handleNetDiskSearch(trimmed);
      } else {
        // ACG 搜索：触发 AcgSearch 组件搜索
        setAcgTriggerSearch((prev) => !prev);
      }
    } else if (searchType === 'tmdb-actor') {
      // TMDB演员搜索
      router.push(`/search?q=${encodeURIComponent(trimmed)}`);
      handleTmdbActorSearch(trimmed, tmdbActorType, tmdbFilterState);
    } else {
      // 原有的影视搜索逻辑
      router.push(`/search?q=${encodeURIComponent(trimmed)}`);
      // 其余由 searchParams 变化的 effect 处理
    }
  };

  const handleSuggestionSelect = (suggestion: string) => {
    setSearchQuery(suggestion);
    setShowSuggestions(false);

    // 自动执行搜索
    setShowResults(true);

    router.push(`/search?q=${encodeURIComponent(suggestion)}`);
    // 其余由 searchParams 变化的 effect 处理
  };

  // 返回顶部功能 - 同时滚动页面和重置虚拟列表
  const scrollToTop = () => {
    try {
      // 1. 滚动页面到顶部
      document.body.scrollTo({
        top: 0,
        behavior: 'smooth',
      });
    } catch (error) {
      // 如果平滑滚动完全失败，使用立即滚动
      document.body.scrollTop = 0;
    }
  };

  return (
    <PageLayout activePath='/search'>
      <div className='mb-10 overflow-visible -mt-6 md:mt-0'>
        {/* 搜索工作区 */}
        <div className='mb-8'>
          <div className='mx-auto max-w-5xl px-3 sm:px-0'>
            <div className='space-y-3'>
              <SiteAdSlot position='search_top' />

              {/* 搜索类型选项卡 */}
              <div className='overflow-x-auto scrollbar-hide'>
                <PillGroup className='min-w-max sm:min-w-0'>
                  <PillButton
                    type='button'
                    onClick={() => {
                      setSearchType('video');
                      // 切换到影视搜索时，清除网盘和TMDB演员搜索状态
                      setNetdiskResults(null);
                      setNetdiskError(null);
                      setNetdiskTotal(0);
                      setTmdbActorResults(null);
                      setTmdbActorError(null);
                      // 如果有搜索词且当前显示结果，触发影视搜索
                      const currentQuery =
                        searchQuery.trim() || searchParams?.get('q');
                      if (currentQuery && showResults) {
                        router.push(
                          `/search?q=${encodeURIComponent(currentQuery)}`,
                        );
                      }
                    }}
                    active={searchType === 'video'}
                    className='min-w-[110px] flex-shrink-0 whitespace-nowrap px-4 py-2.5 font-semibold sm:min-w-0 sm:px-6 sm:text-base'
                  >
                    影视资源
                  </PillButton>
                  <PillButton
                    type='button'
                    onClick={() => {
                      setSearchType('netdisk');
                      // 清除之前的网盘搜索状态，确保重新开始
                      setNetdiskError(null);
                      setNetdiskResults(null);
                      setTmdbActorResults(null);
                      setTmdbActorError(null);
                      // 如果当前有搜索词，立即触发网盘搜索
                      const currentQuery =
                        searchQuery.trim() || searchParams?.get('q');
                      if (currentQuery && showResults) {
                        handleNetDiskSearch(currentQuery);
                      }
                    }}
                    active={searchType === 'netdisk'}
                    className='min-w-[110px] flex-shrink-0 whitespace-nowrap px-4 py-2.5 font-semibold sm:min-w-0 sm:px-6 sm:text-base'
                  >
                    网盘资源
                  </PillButton>
                  <PillButton
                    type='button'
                    onClick={() => {
                      setSearchType('tmdb-actor');
                      // 清除之前的搜索状态
                      setTmdbActorError(null);
                      setTmdbActorResults(null);
                      setNetdiskResults(null);
                      setNetdiskError(null);
                      setNetdiskTotal(0);
                      // 如果当前有搜索词，立即触发TMDB演员搜索
                      const currentQuery =
                        searchQuery.trim() || searchParams?.get('q');
                      if (currentQuery && showResults) {
                        handleTmdbActorSearch(
                          currentQuery,
                          tmdbActorType,
                          tmdbFilterState,
                        );
                      }
                    }}
                    active={searchType === 'tmdb-actor'}
                    className='min-w-[110px] flex-shrink-0 whitespace-nowrap px-4 py-2.5 font-semibold sm:min-w-0 sm:px-6 sm:text-base'
                  >
                    TMDB演员
                  </PillButton>
                </PillGroup>
              </div>

              <form onSubmit={handleSearch} className='w-full'>
                <div className='relative group'>
                  <Search className='absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400 dark:text-gray-500 transition-all duration-300 group-focus-within:text-green-500 dark:group-focus-within:text-green-400 group-focus-within:scale-110' />

                  <PanelField
                    id='searchInput'
                    type='text'
                    value={searchQuery}
                    onChange={handleInputChange}
                    onFocus={handleInputFocus}
                    placeholder={
                      searchType === 'video'
                        ? '搜索电影、电视剧...'
                        : searchType === 'netdisk'
                          ? '搜索网盘资源...'
                          : '搜索演员姓名...'
                    }
                    autoComplete='off'
                    className='h-12 py-3 pl-12 pr-14 text-sm sm:text-base'
                  />

                  {searchQuery && (
                    <button
                      type='button'
                      onClick={() => {
                        setSearchQuery('');
                        setShowResults(false);
                        setShowSuggestions(true);
                        document.getElementById('searchInput')?.focus();
                      }}
                      className='absolute right-4 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-gray-200/80 text-gray-500 shadow-sm transition-all duration-300 hover:bg-red-500 hover:text-white dark:bg-gray-700/80 dark:text-gray-400 dark:hover:bg-red-600'
                      aria-label='清除搜索内容'
                    >
                      <X className='h-4 w-4' />
                    </button>
                  )}

                  <SearchSuggestions
                    query={searchQuery}
                    isVisible={showSuggestions}
                    onSelect={handleSuggestionSelect}
                    onClose={() => setShowSuggestions(false)}
                    onEnterKey={() => {
                      const trimmed = searchQuery.trim().replace(/\s+/g, ' ');
                      if (!trimmed) return;

                      setSearchQuery(trimmed);
                      setShowResults(true);
                      setShowSuggestions(false);

                      router.push(`/search?q=${encodeURIComponent(trimmed)}`);
                    }}
                  />
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* 搜索结果或搜索历史 */}
        <div className='mx-auto mt-12 max-w-[2560px] overflow-visible px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16 2xl:px-20'>
          {showResults ? (
            <section className='mb-12 space-y-6'>
              {searchType === 'netdisk' ? (
                /* 网盘搜索结果 */
                <>
                  <GlassPanel className='p-4 sm:p-5'>
                    <div className='flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between'>
                      <div>
                        <h2 className='text-xl font-bold text-gray-800 dark:text-gray-200'>
                          资源搜索
                          {netdiskLoading &&
                            netdiskResourceType === 'netdisk' && (
                              <span className='ml-2 inline-block align-middle'>
                                <span className='inline-block h-3 w-3 animate-spin rounded-full border-2 border-gray-300 border-t-green-500'></span>
                              </span>
                            )}
                        </h2>
                        <div className='mt-2 text-xs text-gray-500 dark:text-gray-400'>
                          {searchQuery.trim() || searchParams?.get('q')
                            ? `关键词：${searchQuery.trim() || searchParams?.get('q')}`
                            : '按资源类型筛选当前搜索结果'}
                        </div>
                      </div>
                      <div className='flex flex-wrap items-center gap-2'>
                        <span className='text-sm text-gray-600 dark:text-gray-400'>
                          资源类型：
                        </span>
                        <PillGroup>
                          <PillButton
                            onClick={() => {
                              setNetdiskResourceType('netdisk');
                              setAcgError(null);
                              const currentQuery =
                                searchQuery.trim() || searchParams?.get('q');
                              if (currentQuery) {
                                handleNetDiskSearch(currentQuery);
                              }
                            }}
                            active={netdiskResourceType === 'netdisk'}
                            className='px-3 py-1.5'
                          >
                            网盘资源
                          </PillButton>
                          <PillButton
                            onClick={() => {
                              setNetdiskResourceType('acg');
                              setNetdiskResults(null);
                              setNetdiskError(null);
                              const currentQuery =
                                searchQuery.trim() || searchParams?.get('q');
                              if (currentQuery) {
                                setAcgTriggerSearch((prev) => !prev);
                              }
                            }}
                            active={netdiskResourceType === 'acg'}
                            className='px-3 py-1.5'
                          >
                            动漫磁力
                          </PillButton>
                        </PillGroup>
                      </div>
                    </div>
                  </GlassPanel>

                  {/* 根据资源类型显示不同的搜索结果 */}
                  {netdiskResourceType === 'netdisk' ? (
                    <NetDiskSearchResults
                      results={netdiskResults}
                      loading={netdiskLoading}
                      error={netdiskError}
                      total={netdiskTotal}
                    />
                  ) : (
                    <AcgSearch
                      keyword={
                        searchQuery.trim() || searchParams?.get('q') || ''
                      }
                      triggerSearch={acgTriggerSearch}
                      onError={(error) => setAcgError(error)}
                    />
                  )}
                </>
              ) : searchType === 'tmdb-actor' ? (
                /* TMDB演员搜索结果 */
                <>
                  <GlassPanel className='p-4 sm:p-5'>
                    <div className='flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between'>
                      <div>
                        <h2 className='text-xl font-bold text-gray-800 dark:text-gray-200'>
                          TMDB演员搜索结果
                          {tmdbActorLoading && (
                            <span className='ml-2 inline-block align-middle'>
                              <span className='inline-block h-3 w-3 animate-spin rounded-full border-2 border-gray-300 border-t-blue-500'></span>
                            </span>
                          )}
                        </h2>
                        <div className='mt-2 text-xs text-gray-500 dark:text-gray-400'>
                          {searchQuery.trim() || searchParams?.get('q')
                            ? `演员关键词：${searchQuery.trim() || searchParams?.get('q')}`
                            : '按电影或电视剧筛选演员作品'}
                        </div>
                      </div>
                      <div className='flex flex-wrap items-center gap-2'>
                        <span className='text-sm text-gray-600 dark:text-gray-400'>
                          类型：
                        </span>
                        <PillGroup>
                          {[
                            { key: 'movie', label: '电影' },
                            { key: 'tv', label: '电视剧' },
                          ].map((type) => (
                            <PillButton
                              key={type.key}
                              onClick={() => {
                                setTmdbActorType(type.key as 'movie' | 'tv');
                                const currentQuery =
                                  searchQuery.trim() || searchParams?.get('q');
                                if (currentQuery) {
                                  handleTmdbActorSearch(
                                    currentQuery,
                                    type.key as 'movie' | 'tv',
                                    tmdbFilterState,
                                  );
                                }
                              }}
                              active={tmdbActorType === type.key}
                              className='px-3 py-1'
                              disabled={tmdbActorLoading}
                            >
                              {type.label}
                            </PillButton>
                          ))}
                        </PillGroup>
                      </div>
                    </div>

                    <div className='mt-4'>
                      <TMDBFilterPanel
                        contentType={tmdbActorType}
                        filters={tmdbFilterState}
                        onFiltersChange={(newFilterState) => {
                          setTmdbFilterState(newFilterState);
                          const currentQuery =
                            searchQuery.trim() || searchParams?.get('q');
                          if (currentQuery) {
                            handleTmdbActorSearch(
                              currentQuery,
                              tmdbActorType,
                              newFilterState,
                            );
                          }
                        }}
                        isVisible={tmdbFilterVisible}
                        onToggleVisible={() =>
                          setTmdbFilterVisible(!tmdbFilterVisible)
                        }
                        resultCount={tmdbActorResults?.length || 0}
                      />
                    </div>
                  </GlassPanel>

                  {tmdbActorError ? (
                    <div className='rounded-[28px] border border-red-200 bg-red-50/90 p-8 text-center shadow-[0_12px_30px_rgba(15,23,42,0.05)] dark:border-red-800/50 dark:bg-red-900/20'>
                      <div className='mb-2 text-red-500'>{tmdbActorError}</div>
                      <p className='mb-4 text-sm text-red-400 dark:text-red-300'>
                        可以重试一次，或切换筛选条件后重新搜索。
                      </p>
                      <button
                        onClick={() => {
                          const currentQuery =
                            searchQuery.trim() || searchParams?.get('q');
                          if (currentQuery) {
                            handleTmdbActorSearch(
                              currentQuery,
                              tmdbActorType,
                              tmdbFilterState,
                            );
                          }
                        }}
                        className='ui-control rounded-full px-4 py-2 text-red-700 hover:bg-red-100 dark:text-red-300 dark:hover:bg-red-950/20'
                      >
                        重试
                      </button>
                    </div>
                  ) : tmdbActorResults && tmdbActorResults.length > 0 ? (
                    <div className='grid grid-cols-3 gap-x-2 gap-y-14 sm:gap-y-20 px-0 sm:px-2 sm:grid-cols-[repeat(auto-fill,_minmax(11rem,_1fr))] sm:gap-x-8'>
                      {tmdbActorResults.map((item, index) => (
                        <div key={item.id || index} className='w-full'>
                          <VideoCard
                            title={item.title}
                            poster={item.poster}
                            year={item.year}
                            rate={item.rate}
                            from='douban'
                            type={tmdbActorType}
                          />
                        </div>
                      ))}
                    </div>
                  ) : !tmdbActorLoading ? (
                    <div className='rounded-[28px] border border-dashed border-black/10 bg-black/[0.02] p-8 text-center dark:border-white/10 dark:bg-white/[0.03]'>
                      <div className='text-gray-500 dark:text-gray-400'>
                        未找到相关演员作品
                      </div>
                      <p className='mt-2 text-sm text-gray-400 dark:text-gray-500'>
                        换个演员名字，或切换电影 / 电视剧后再试一次。
                      </p>
                    </div>
                  ) : null}
                </>
              ) : (
                /* 原有的影视搜索结果 */
                <>
                  <div className='grid gap-8'>
                    <div className='min-w-0 space-y-6'>
                      <div className='rounded-[28px] border border-black/6 bg-white/65 p-4 shadow-[0_14px_34px_rgba(15,23,42,0.05)] backdrop-blur-sm dark:border-white/8 dark:bg-white/[0.04] sm:p-5'>
                        <div className='flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between'>
                          <div className='min-w-0 flex-1'>
                            <h2 className='text-xl font-bold text-gray-800 dark:text-gray-200'>
                              搜索结果
                              {totalSources > 0 && useFluidSearch && (
                                <span className='ml-2 text-sm font-normal text-gray-500 dark:text-gray-400'>
                                  {completedSources}/{totalSources}
                                </span>
                              )}
                              {isLoading && useFluidSearch && (
                                <span className='ml-2 inline-block align-middle'>
                                  <span className='inline-block h-3 w-3 animate-spin rounded-full border-2 border-gray-300 border-t-green-500'></span>
                                </span>
                              )}
                            </h2>
                            <div className='mt-3'>
                              {viewMode === 'agg' ? (
                                <SearchResultFilter
                                  categories={filterOptions.categoriesAgg}
                                  values={filterAgg}
                                  onChange={(v) => setFilterAgg(v as any)}
                                />
                              ) : (
                                <SearchResultFilter
                                  categories={filterOptions.categoriesAll}
                                  values={filterAll}
                                  onChange={(v) => setFilterAll(v as any)}
                                />
                              )}
                            </div>
                            <div className='mt-3 text-xs text-gray-500 dark:text-gray-400'>
                              {searchQuery.trim() || searchParams?.get('q')
                                ? `关键词：${searchQuery.trim() || searchParams?.get('q')}`
                                : '正在整理搜索结果'}
                            </div>
                          </div>
                          <div className='flex flex-wrap items-center justify-end gap-3'>
                            <PillGroup>
                              <PillButton
                                type='button'
                                onClick={() => {
                                  setResultDisplayMode('card');
                                  localStorage.setItem(
                                    'searchResultDisplayMode',
                                    'card',
                                  );
                                }}
                                active={resultDisplayMode === 'card'}
                                className='inline-flex items-center gap-1 px-3 py-1.5'
                                aria-label='切换为卡片视图'
                              >
                                <Grid2x2 className='h-4 w-4' />
                              </PillButton>
                              <PillButton
                                type='button'
                                onClick={() => {
                                  setResultDisplayMode('list');
                                  localStorage.setItem(
                                    'searchResultDisplayMode',
                                    'list',
                                  );
                                }}
                                active={resultDisplayMode === 'list'}
                                className='inline-flex items-center gap-1 px-3 py-1.5'
                                aria-label='切换为列表视图'
                              >
                                <List className='h-4 w-4' />
                              </PillButton>
                            </PillGroup>
                            <PillButton
                              type='button'
                              onClick={toggleVirtualization}
                              active={useVirtualization}
                              className='px-4 py-2 text-xs sm:text-sm'
                            >
                              虚拟滑动
                            </PillButton>
                            <PillButton
                              type='button'
                              onClick={() =>
                                setViewMode(viewMode === 'agg' ? 'all' : 'agg')
                              }
                              active={viewMode === 'agg'}
                              className='px-4 py-2 text-xs sm:text-sm'
                            >
                              聚合
                            </PillButton>
                          </div>
                        </div>
                      </div>
                      {/* 搜索结果网格/列表 */}
                      <div className='pt-1'>
                        {isLoading && searchResults.length === 0 ? (
                          <div className='rounded-[28px] border border-black/6 bg-black/[0.02] p-10 text-center dark:border-white/8 dark:bg-white/[0.03]'>
                            <div className='mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-gray-300 border-t-green-500 dark:border-gray-600 dark:border-t-green-400'></div>
                            <div className='text-sm font-medium text-gray-700 dark:text-gray-300'>
                              正在整理搜索结果...
                            </div>
                            <div className='mt-2 text-xs text-gray-500 dark:text-gray-400'>
                              已获取 {completedSources}/{totalSources || 1}{' '}
                              个来源的结果
                            </div>
                          </div>
                        ) : traditionalSearchError && !useFluidSearch ? (
                          <div className='rounded-[28px] border border-red-200 bg-red-50/90 p-8 text-center shadow-[0_12px_30px_rgba(15,23,42,0.05)] dark:border-red-800/50 dark:bg-red-900/20'>
                            <div className='mb-2 text-red-500'>
                              {traditionalSearchError || '搜索失败'}
                            </div>
                            <p className='mb-4 text-sm text-red-400 dark:text-red-300'>
                              请稍后重试，或切换搜索词后重新搜索。
                            </p>
                          </div>
                        ) : searchResults.length === 0 ? (
                          <div className='rounded-[28px] border border-dashed border-black/10 bg-black/[0.02] p-8 text-center dark:border-white/10 dark:bg-white/[0.03]'>
                            <div className='text-gray-500 dark:text-gray-400'>
                              未找到相关影视结果
                            </div>
                            <p className='mt-2 text-sm text-gray-400 dark:text-gray-500'>
                              可以尝试更短的关键词，或关闭精确搜索后再试一次。
                            </p>
                          </div>
                        ) : useVirtualization &&
                          resultDisplayMode === 'card' ? (
                          <div key={`search-results-${viewMode}`}>
                            {viewMode === 'agg' ? (
                              <VirtualGrid
                                items={filteredAggResults}
                                className='grid-cols-3 gap-x-2 px-0 sm:px-2 sm:grid-cols-[repeat(auto-fill,_minmax(11rem,_1fr))] sm:gap-x-8'
                                rowGapClass='pb-14 sm:pb-20'
                                estimateRowHeight={320}
                                renderItem={([mapKey, group]) => {
                                  const title = group[0]?.title || '';
                                  const poster = pickGroupPoster(group);
                                  const year = group[0]?.year || 'unknown';
                                  const { episodes, source_names, douban_id } =
                                    computeGroupStats(group);
                                  const type = episodes === 1 ? 'movie' : 'tv';
                                  if (!groupStatsRef.current.has(mapKey)) {
                                    groupStatsRef.current.set(mapKey, {
                                      episodes,
                                      source_names,
                                      douban_id,
                                    });
                                  }
                                  return (
                                    <div
                                      key={`agg-${mapKey}`}
                                      className='w-full'
                                    >
                                      <VideoCard
                                        ref={getGroupRef(mapKey)}
                                        from='search'
                                        isAggregate={true}
                                        title={title}
                                        poster={poster}
                                        year={year}
                                        episodes={episodes}
                                        source_names={source_names}
                                        douban_id={douban_id}
                                        query={
                                          searchQuery.trim() !== title
                                            ? searchQuery.trim()
                                            : ''
                                        }
                                        type={type}
                                      />
                                    </div>
                                  );
                                }}
                              />
                            ) : (
                              <VirtualGrid
                                items={filteredAllResults}
                                className='grid-cols-3 gap-x-2 px-0 sm:px-2 sm:grid-cols-[repeat(auto-fill,_minmax(11rem,_1fr))] sm:gap-x-8'
                                rowGapClass='pb-14 sm:pb-20'
                                estimateRowHeight={320}
                                renderItem={(item) => (
                                  <div
                                    key={`all-${item.source}-${item.id}`}
                                    className='w-full'
                                  >
                                    <VideoCard
                                      id={item.id}
                                      title={item.title}
                                      poster={item.poster}
                                      episodes={item.episodes.length}
                                      source={item.source}
                                      source_name={item.source_name}
                                      douban_id={item.douban_id}
                                      query={
                                        searchQuery.trim() !== item.title
                                          ? searchQuery.trim()
                                          : ''
                                      }
                                      year={item.year}
                                      from='search'
                                      type={inferTypeFromName(
                                        item.type_name,
                                        item.episodes.length,
                                      )}
                                      remarks={item.remarks}
                                    />
                                  </div>
                                )}
                              />
                            )}
                          </div>
                        ) : (
                          <div
                            key={`search-results-${viewMode}-${resultDisplayMode}`}
                            className={
                              resultDisplayMode === 'list'
                                ? 'space-y-4'
                                : 'justify-start grid grid-cols-3 gap-x-2 gap-y-14 sm:gap-y-20 px-0 sm:px-2 sm:grid-cols-[repeat(auto-fill,_minmax(11rem,_1fr))] sm:gap-x-8'
                            }
                          >
                            {viewMode === 'agg'
                              ? filteredAggResults.map(([mapKey, group]) => {
                                  const title = group[0]?.title || '';
                                  const poster = pickGroupPoster(group);
                                  const year = group[0]?.year || 'unknown';
                                  const desc =
                                    group.find((e) => e.desc?.trim())?.desc ||
                                    '';
                                  const vodRemarks =
                                    group.find((e) =>
                                      (e as any).remarks?.trim(),
                                    )?.remarks || '';
                                  const { episodes, source_names, douban_id } =
                                    computeGroupStats(group);
                                  const type = episodes === 1 ? 'movie' : 'tv';
                                  if (!groupStatsRef.current.has(mapKey)) {
                                    groupStatsRef.current.set(mapKey, {
                                      episodes,
                                      source_names,
                                      douban_id,
                                    });
                                  }
                                  if (resultDisplayMode === 'list') {
                                    return renderListItem({
                                      key: `agg-${mapKey}`,
                                      title,
                                      poster,
                                      year,
                                      type,
                                      episodes,
                                      sourceNames: source_names,
                                      doubanId: douban_id,
                                      desc,
                                      vodRemarks,
                                      isAggregate: true,
                                      query:
                                        searchQuery.trim() !== title
                                          ? searchQuery.trim()
                                          : '',
                                    });
                                  }
                                  return (
                                    <div
                                      key={`agg-${mapKey}`}
                                      className='w-full'
                                    >
                                      <VideoCard
                                        ref={getGroupRef(mapKey)}
                                        from='search'
                                        isAggregate={true}
                                        title={title}
                                        poster={poster}
                                        year={year}
                                        episodes={episodes}
                                        source_names={source_names}
                                        douban_id={douban_id}
                                        query={
                                          searchQuery.trim() !== title
                                            ? searchQuery.trim()
                                            : ''
                                        }
                                        type={type}
                                      />
                                    </div>
                                  );
                                })
                              : filteredAllResults.map((item) => {
                                  const type = inferTypeFromName(
                                    item.type_name,
                                    item.episodes.length,
                                  ) as 'movie' | 'tv';
                                  if (resultDisplayMode === 'list') {
                                    return renderListItem({
                                      key: `all-${item.source}-${item.id}`,
                                      id: item.id,
                                      title: item.title,
                                      poster: item.poster,
                                      episodes: item.episodes.length,
                                      source: item.source,
                                      sourceName: item.source_name,
                                      doubanId: item.douban_id,
                                      query:
                                        searchQuery.trim() !== item.title
                                          ? searchQuery.trim()
                                          : '',
                                      year: item.year,
                                      type,
                                      desc: (item as any).desc,
                                      vodRemarks: item.remarks,
                                    });
                                  }
                                  return (
                                    <div
                                      key={`all-${item.source}-${item.id}`}
                                      className='w-full'
                                    >
                                      <VideoCard
                                        id={item.id}
                                        title={item.title}
                                        poster={item.poster}
                                        episodes={item.episodes.length}
                                        source={item.source}
                                        source_name={item.source_name}
                                        douban_id={item.douban_id}
                                        query={
                                          searchQuery.trim() !== item.title
                                            ? searchQuery.trim()
                                            : ''
                                        }
                                        year={item.year}
                                        from='search'
                                        type={inferTypeFromName(
                                          item.type_name,
                                          item.episodes.length,
                                        )}
                                        remarks={item.remarks}
                                      />
                                    </div>
                                  );
                                })}
                          </div>
                        )}
                      </div>

                      {/* Footer */}
                      {isLoading &&
                      (filteredAggResults.length > 0 ||
                        filteredAllResults.length > 0) ? (
                        <div className='fixed bottom-0 left-0 right-0 z-50 flex justify-center px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3'>
                          <div className='rounded-full border border-black/6 bg-white/78 px-4 py-2 shadow-[0_10px_24px_rgba(15,23,42,0.06)] backdrop-blur-md dark:border-white/8 dark:bg-white/6'>
                            <div className='flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400'>
                              <div className='animate-spin rounded-full h-4 w-4 border-2 border-gray-300 dark:border-gray-600 border-t-green-500 dark:border-t-green-400'></div>
                              <span>正在搜索更多结果...</span>
                            </div>
                          </div>
                        </div>
                      ) : !isLoading &&
                        (filteredAggResults.length > 0 ||
                          filteredAllResults.length > 0) ? (
                        <div className='mt-8 flex justify-center py-6'>
                          <div className='rounded-[24px] border border-black/6 bg-white/72 px-6 py-3 text-sm font-medium text-gray-700 shadow-[0_12px_28px_rgba(15,23,42,0.06)] backdrop-blur-md dark:border-white/8 dark:bg-white/6 dark:text-gray-300'>
                            搜索完成 · 共找到{' '}
                            {viewMode === 'agg'
                              ? filteredAggResults.length
                              : filteredAllResults.length}{' '}
                            个结果
                          </div>
                        </div>
                      ) : null}
                    </div>

                    {hasSearchSidebarAd ? (
                      <div className='mt-2'>
                        <SiteAdSlot position='search_sidebar' />
                      </div>
                    ) : null}
                  </div>
                </>
              )}
            </section>
          ) : (
            /* 搜索历史 */
            <>
              {/* 搜索历史 - 优先显示 */}
              {searchHistory.length > 0 && (
                <section className='mb-12 rounded-[30px] border border-black/6 bg-white/34 p-4 shadow-[0_16px_44px_rgba(15,23,42,0.05)] backdrop-blur-sm dark:border-white/8 dark:bg-white/[0.03] sm:p-5'>
                  <div className='mb-4 flex items-center justify-between'>
                    <h2 className='text-xl font-bold text-gray-800 text-left dark:text-gray-200'>
                      搜索历史
                    </h2>
                    <button
                      onClick={() => {
                        clearSearchHistory();
                      }}
                      className='inline-flex items-center rounded-full border border-black/6 bg-white/70 px-3 py-1.5 text-sm text-gray-500 transition-colors hover:text-red-500 dark:border-white/8 dark:bg-white/6 dark:text-gray-400 dark:hover:text-red-500'
                    >
                      清空
                    </button>
                  </div>
                  <div className='flex flex-wrap gap-2'>
                    {searchHistory.map((item) => (
                      <div key={item} className='relative group'>
                        <button
                          onClick={() => {
                            setSearchQuery(item);
                            router.push(
                              `/search?q=${encodeURIComponent(item.trim())}`,
                            );
                          }}
                          className='rounded-full border border-black/6 bg-white/75 px-4 py-2 text-sm text-gray-700 transition-colors duration-200 hover:bg-gray-100 dark:border-white/8 dark:bg-white/6 dark:text-gray-300 dark:hover:bg-white/10'
                        >
                          {item}
                        </button>
                        {/* 删除按钮 */}
                        <button
                          aria-label='删除搜索历史'
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            deleteSearchHistory(item); // 事件监听会自动更新界面
                          }}
                          className='absolute -top-1 -right-1 w-4 h-4 opacity-0 group-hover:opacity-100 bg-gray-400 hover:bg-red-500 text-white rounded-full flex items-center justify-center text-[10px] transition-colors'
                        >
                          <X className='w-3 h-3' />
                        </button>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {searchHistory.length === 0 && (
                <section className='mb-12 rounded-[30px] border border-dashed border-black/10 bg-black/[0.02] p-8 text-center dark:border-white/10 dark:bg-white/[0.03]'>
                  <h2 className='text-xl font-semibold text-gray-700 dark:text-gray-300'>
                    还没有搜索历史
                  </h2>
                  <p className='mt-2 text-sm text-gray-500 dark:text-gray-400'>
                    输入关键词开始搜索，常用内容会显示在这里。
                  </p>
                </section>
              )}
            </>
          )}
        </div>
      </div>

      {previewImage && (
        <ImageViewer
          isOpen={!!previewImage}
          onClose={() => setPreviewImage(null)}
          imageUrl={previewImage.url}
          alt={previewImage.alt}
        />
      )}

      {/* 返回顶部悬浮按钮 */}
      <button
        onClick={scrollToTop}
        className={`fixed bottom-24 right-6 z-50 flex h-12 w-12 items-center justify-center rounded-full border border-black/6 bg-white/78 text-gray-700 shadow-[0_14px_32px_rgba(15,23,42,0.08)] backdrop-blur-md transition-all duration-300 hover:scale-105 hover:text-green-600 hover:shadow-xl dark:border-white/8 dark:bg-white/6 dark:text-gray-200 dark:hover:text-green-400 md:bottom-6 ${
          showBackToTop
            ? 'opacity-100 translate-y-0'
            : 'opacity-0 translate-y-4 pointer-events-none'
        }`}
        aria-label='返回顶部'
      >
        <ChevronUp className='w-6 h-6' />
      </button>
    </PageLayout>
  );
}

export default function SearchPage() {
  return (
    <Suspense>
      <SearchPageClient />
    </Suspense>
  );
}
