/* eslint-disable no-console */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable unused-imports/no-unused-vars */

'use client';

import { ChevronUp, Grid2x2, List, Play, Search, X } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import React, {
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import { isAdSettingRenderable } from '@/lib/ad-settings';

import AcgSearch from '@/components/AcgSearch';
import ImageViewer from '@/components/ImageViewer';
import NetDiskSearchResults from '@/components/NetDiskSearchResults';
import PageLayout from '@/components/PageLayout';
import SearchResultFilter from '@/components/SearchResultFilter';
import SearchSuggestions from '@/components/SearchSuggestions';
import { SiteAdSlot } from '@/components/SiteAdSlot';
import { useSite } from '@/components/SiteProvider';
import TMDBFilterPanel, { TMDBFilterState } from '@/components/TMDBFilterPanel';
import {
  GlassPanel,
  PanelField,
  PillButton,
  PillGroup,
} from '@/components/ui-surface';
import VideoCard from '@/components/VideoCard';
import VirtualGrid from '@/components/VirtualGrid';

import { useSearchFilters } from './hooks/useSearchFilters';
import { useSearchHistory } from './hooks/useSearchHistory';
import { useSearchResults } from './hooks/useSearchResults';

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
    const reload = `&_reload=${Date.now()}`;
    if (params.isAggregate || !params.source || !params.id) {
      return `/play?title=${encodeURIComponent(params.title.trim())}${yearParam}${typeParam}${preferParam}${queryParam}${doubanParam}${reload}`;
    }
    return `/play?source=${params.source}&id=${params.id}&title=${encodeURIComponent(params.title.trim())}${yearParam}${preferParam}${queryParam}${typeParam}${doubanParam}${reload}`;
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
        className='group w-full rounded-2xl border border-gray-200/80 bg-white dark:bg-gray-800 p-3 text-left shadow-sm transition-all hover:border-green-300 hover:shadow-md dark:border-gray-700 dark:bg-gray-900/70 dark:hover:border-green-700'
      >
        <div className='flex items-start gap-4'>
          <div className='relative h-32 w-24 sm:h-36 sm:w-28 shrink-0 overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-800'>
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

  const {
    searchHistory,
    addSearchHistory,
    clearSearchHistory,
    deleteSearchHistory,
  } = useSearchHistory();

  const {
    exactSearch,
    setExactSearch,
    useVirtualization,
    toggleVirtualization,
    viewMode,
    setViewMode,
    resultDisplayMode,
    setResultDisplayMode,
    filterAll,
    setFilterAll,
    filterAgg,
    setFilterAgg,
    expandedSourceTags,
    setExpandedSourceTags,
    previewImage,
    setPreviewImage,
    compareYear,
    titleContainsQuery,
  } = useSearchFilters();

  const [showBackToTop, setShowBackToTop] = useState(false);
  const { adSettings } = useSite();

  const router = useRouter();
  const searchParams = useSearchParams();
  const currentQueryRef = useRef<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [trendingSearches, setTrendingSearches] = useState<string[]>([]);
  const [useFluidSearch, setUseFluidSearch] = useState(true);

  const [searchPrefsLoaded, setSearchPrefsLoaded] = useState(false);

  const hasSearchSidebarAd = isAdSettingRenderable(adSettings?.search_sidebar);

  // 网盘搜索相关状态 - 从 URL 参数初始化
  const [searchType, setSearchType] = useState<
    'video' | 'netdisk' | 'tmdb-actor'
  >(() => {
    const typeParam = searchParams.get('type');
    if (typeParam === 'netdisk' || typeParam === 'tmdb-actor') return typeParam;
    return 'video';
  });

  // 切换搜索类型并更新 URL
  const switchSearchType = useCallback(
    (newType: 'video' | 'netdisk' | 'tmdb-actor') => {
      setSearchType(newType);
      // 更新 URL 参数
      const params = new URLSearchParams(searchParams.toString());
      if (newType === 'video') {
        params.delete('type');
      } else {
        params.set('type', newType);
      }
      router.replace(`/search?${params.toString()}`, { scroll: false });
    },
    [searchParams, router],
  );

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

  const trimmedQuery = (searchParams.get('q') || '').trim();

  const {
    searchResults,
    totalSources,
    completedSources,
    isLoading,
    traditionalSearchError,
    aggregatedResults,
    computeGroupStats,
    pickGroupPoster,
    groupRefs,
    groupStatsRef,
    getGroupRef,
    filterOptions,
    filteredAllResults,
    filteredAggResults,
  } = useSearchResults({
    trimmedQuery,
    searchQuery,
    filterAll,
    filterAgg,
    exactSearch,
    useFluidSearch,
    currentQuery: currentQueryRef.current,
    titleContainsQuery,
    compareYear,
  });

  useEffect(() => {
    // 无搜索参数时聚焦搜索框
    !searchParams.get('q') && document.getElementById('searchInput')?.focus();

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

    const handleScroll = () => {
      const scrollTop =
        window.scrollY || document.documentElement.scrollTop || 0;
      setShowBackToTop(scrollTop > 300);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [searchPrefsLoaded]);

  // 加载热门搜索词
  useEffect(() => {
    fetch('/api/search/trending')
      .then((r) => r.json())
      .then((data) => setTrendingSearches(data.trending || []));
    //       .catch((e) => // console.log('[Search] Trending fetch error:', e));
  }, []);

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

    //     // console.log(`🚀 [前端TMDB] 开始搜索: ${query}, type=${type}`);

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
      window.scrollTo({
        top: 0,
        behavior: 'smooth',
      });
    } catch (error) {
      document.documentElement.scrollTop = 0;
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
                      switchSearchType('video');
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
                    className='min-w-0 flex-shrink whitespace-nowrap px-3 py-2.5 font-semibold sm:px-6 sm:text-base'
                  >
                    影视资源
                  </PillButton>
                  <PillButton
                    type='button'
                    onClick={() => {
                      switchSearchType('netdisk');
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
                    className='min-w-0 flex-shrink whitespace-nowrap px-3 py-2.5 font-semibold sm:px-6 sm:text-base'
                  >
                    网盘资源
                  </PillButton>
                  <PillButton
                    type='button'
                    onClick={() => {
                      switchSearchType('tmdb-actor');
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
                    className='min-w-0 flex-shrink whitespace-nowrap px-3 py-2.5 font-semibold sm:px-6 sm:text-base'
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
                        router.replace('/search');
                        document.getElementById('searchInput')?.focus();
                      }}
                      className='absolute right-4 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-gray-200/80 text-gray-500 shadow-sm transition-all duration-300 hover:bg-red-500 hover:text-white dark:bg-gray-700/80 dark:text-gray-400 dark:hover:bg-red-600'
                      aria-label='清除搜索内容'
                    >
                      <X className='h-5 w-5' />
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

              {/* 热门搜索建议 */}
              {!searchQuery && trendingSearches.length > 0 && (
                <div className='mt-3 sm:mt-4'>
                  <p className='text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 mb-2'>
                    🔥 热门搜索
                  </p>
                  <div className='flex flex-wrap gap-2'>
                    {trendingSearches.map((term) => (
                      <button
                        key={term}
                        onClick={() => {
                          setSearchQuery(term);
                          // Trigger search
                          setShowResults(true);
                          setShowSuggestions(false);
                          router.push(`/search?q=${encodeURIComponent(term)}`);
                        }}
                        className='px-3 py-1.5 text-xs sm:text-sm rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors'
                      >
                        {term}
                      </button>
                    ))}
                  </div>
                </div>
              )}
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
                    <div className='rounded-xl border border-red-200 bg-red-50/90 p-8 text-center shadow-sm dark:border-red-800/50 dark:bg-red-900/20'>
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
                    <div className='grid grid-cols-[repeat(auto-fill,_minmax(9.5rem,_1fr))] gap-x-3 gap-y-12 px-0 sm:px-2 sm:grid-cols-[repeat(auto-fill,_minmax(11rem,_1fr))] sm:gap-x-8 sm:gap-y-20'>
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
                    <div className='rounded-xl border border-dashed border-gray-200 dark:border-gray-700 bg-black/[0.02] p-8 text-center dark:border-gray-700 dark:bg-gray-800'>
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
                      <div className='rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm  dark:border-gray-700 dark:bg-gray-800 sm:p-5'>
                        <div className='flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between'>
                          <div className='min-w-0 flex-1'>
                            <h2 className='text-xl font-bold text-gray-800 dark:text-gray-200'>
                              搜索结果
                              {searchResults.length > 0 && (
                                <span className='ml-2 text-sm font-normal text-gray-500 dark:text-gray-400'>
                                  ({searchResults.length}个)
                                </span>
                              )}
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
                                <Grid2x2 className='h-5 w-5' />
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
                                <List className='h-5 w-5' />
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
                          <div className='rounded-xl border border-gray-200 dark:border-gray-700 bg-black/[0.02] p-10 text-center dark:border-gray-700 dark:bg-gray-800'>
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
                          <div className='rounded-xl border border-red-200 bg-red-50/90 p-8 text-center shadow-sm dark:border-red-800/50 dark:bg-red-900/20'>
                            <div className='mb-2 text-red-500'>
                              {traditionalSearchError || '搜索失败'}
                            </div>
                            <p className='mb-4 text-sm text-red-400 dark:text-red-300'>
                              请稍后重试，或切换搜索词后重新搜索。
                            </p>
                          </div>
                        ) : searchResults.length === 0 ? (
                          <div className='rounded-xl border border-dashed border-gray-200 dark:border-gray-700 bg-black/[0.02] p-8 text-center dark:border-gray-700 dark:bg-gray-800'>
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
                                className='grid-cols-3 gap-x-2 px-2 sm:px-2 sm:grid-cols-[repeat(auto-fill,_minmax(11rem,_1fr))] sm:gap-x-8'
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
                                className='grid-cols-3 gap-x-2 px-2 sm:px-2 sm:grid-cols-[repeat(auto-fill,_minmax(11rem,_1fr))] sm:gap-x-8'
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
                                : 'justify-start grid grid-cols-3 gap-x-2 gap-y-14 sm:gap-y-20 px-2 sm:px-2 sm:grid-cols-[repeat(auto-fill,_minmax(11rem,_1fr))] sm:gap-x-8'
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
                          <div className='rounded-full border border-gray-200 dark:border-gray-700 bg-white/78 px-4 py-2 shadow-sm  dark:border-gray-700 dark:bg-gray-800'>
                            <div className='flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400'>
                              <div className='animate-spin rounded-full h-5 w-5 border-2 border-gray-300 dark:border-gray-600 border-t-green-500 dark:border-t-green-400'></div>
                              <span>正在搜索更多结果...</span>
                            </div>
                          </div>
                        </div>
                      ) : !isLoading &&
                        (filteredAggResults.length > 0 ||
                          filteredAllResults.length > 0) ? (
                        <div className='mt-8 flex justify-center py-6'>
                          <div className='rounded-xl border border-gray-200 dark:border-gray-700 bg-white/72 px-6 py-3 text-sm font-medium text-gray-700 shadow-sm  dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300'>
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
                <section className='mb-12 rounded-2xl sm:rounded-xl border border-gray-200 dark:border-gray-700 bg-white/34 p-4 shadow-sm  dark:border-gray-700 dark:bg-gray-800 sm:p-5'>
                  <div className='mb-4 flex items-center justify-between'>
                    <h2 className='text-xl font-bold text-gray-800 text-left dark:text-gray-200'>
                      搜索历史
                    </h2>
                    <button
                      onClick={() => {
                        clearSearchHistory();
                      }}
                      className='inline-flex items-center rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm text-gray-500 transition-colors hover:text-red-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:text-red-500'
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
                          className='rounded-full border border-gray-200 dark:border-gray-700 bg-white/75 px-4 py-2 text-sm text-gray-700 transition-colors duration-200 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-white/10'
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
                          className='absolute -top-1 -right-1 flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-[10px] text-white transition-colors sm:h-4 sm:w-4 sm:min-h-0 sm:min-w-0 sm:opacity-0 sm:group-hover:opacity-100'
                        >
                          <div className='flex h-6 w-6 items-center justify-center rounded-full bg-gray-400 transition-colors group-hover:bg-red-500 sm:bg-gray-400'>
                            <X className='w-3 h-3' />
                          </div>
                        </button>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {searchHistory.length === 0 && (
                <section className='mb-12 rounded-2xl sm:rounded-xl border border-dashed border-gray-200 dark:border-gray-700 bg-black/[0.02] p-8 text-center dark:border-gray-700 dark:bg-gray-800'>
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
        className={`fixed bottom-[calc(96px+env(safe-area-inset-bottom))] right-6 z-70 flex h-12 w-12 items-center justify-center rounded-full border border-gray-200 dark:border-gray-700 bg-white/78 text-gray-700 shadow-md  transition-all duration-300 hover:scale-105 hover:text-green-600 hover:shadow-xl dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:text-green-400 md:bottom-6 ${
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
