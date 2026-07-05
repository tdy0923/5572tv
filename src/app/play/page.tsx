/// <reference types="@webgpu/types" />

/* eslint-disable unused-imports/no-unused-vars */

'use client';

import { X } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';

import artplayerPluginChromecast from '@/lib/artplayer-plugin-chromecast';
import artplayerPluginLiquidGlass from '@/lib/artplayer-plugin-liquid-glass';
import { generateStorageKey } from '@/lib/db.client';
import { SearchResult } from '@/lib/types';
import { processImageUrl, resolveCardPosterUrl } from '@/lib/utils';
import type { DanmuManualOverride } from '@/hooks/useDanmu';
import { deduplicateDanmaku, useDanmu } from '@/hooks/useDanmu';

import type { DanmuManualSelection } from '@/components/DanmuManualMatchModal';

import { useAdFilter } from './hooks/useAdFilter';
import { useAudioTracks } from './hooks/useAudioTracks';
import { useBangumiDetails } from './hooks/useBangumiDetails';
import { useCelebrityWorks } from './hooks/useCelebrityWorks';
import { useDeviceInfo } from './hooks/useDeviceInfo';
import { useEpisodeHandlers } from './hooks/useEpisodeHandlers';
import { useFavorites } from './hooks/useFavorites';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useLoadingState } from './hooks/useLoadingState';
import { useNetdiskSearch } from './hooks/useNetdiskSearch';
import { useSourceSwitching } from './hooks/useSourceSwitching';
import { useSpeedTest } from './hooks/useSpeedTest';
import { useWebSR } from './hooks/useWebSR';
import type { WakeLockSentinel } from './utils';
import {
  appendAudioStreamIndex,
  cachedGetAllFavorites,
  cachedGetAllPlayRecords,
  escapeAudioTrackHtml,
  getHlsModule,
  loadPlaybackRate,
  loadPreferredAudioLang,
  normalizeAudioLang,
  replacePlaybackUrlParams,
  resolveAudioTrackName,
  sanitizePlaybackRate,
  savePreferredAudioLang,
} from './utils';

const AcgSearch = dynamic(() => import('@/components/AcgSearch'), {
  ssr: false,
});
const DanmuManualMatchModal = dynamic(
  () => import('@/components/DanmuManualMatchModal'),
  { ssr: false },
);
const DownloadEpisodeSelector = dynamic(
  () => import('@/components/download/DownloadEpisodeSelector'),
  { ssr: false },
);
const EpisodeSelector = dynamic(() => import('@/components/EpisodeSelector'), {
  ssr: false,
});
const NetDiskSearchResults = dynamic(
  () => import('@/components/NetDiskSearchResults'),
  { ssr: false },
);
const PlaylistManager = dynamic(() => import('@/components/PlaylistManager'), {
  ssr: false,
});
const ReviewSection = dynamic(() => import('@/components/ReviewSection'), {
  ssr: false,
});
const ShortDramaVerticalPlayer = dynamic(
  () => import('@/components/shortdrama/ShortDramaVerticalPlayer'),
  { ssr: false },
);

import PageLayout from '@/components/PageLayout';
import BackToTopButton from '@/components/play/BackToTopButton';
import CollapseButton from '@/components/play/CollapseButton';
const DanmuSettingsPanel = dynamic(
  () => import('@/components/play/DanmuSettingsPanel'),
  { ssr: false },
);
import DownloadButtons from '@/components/play/DownloadButtons';
import LoadingScreen from '@/components/play/LoadingScreen';
import NetDiskButton from '@/components/play/NetDiskButton';
const OwnerChangeDialog = dynamic(
  () => import('@/components/play/OwnerChangeDialog'),
  { ssr: false },
);
import PlayErrorDisplay from '@/components/play/PlayErrorDisplay';
const ExternalPlayerButton = dynamic(
  () => import('@/components/play/ExternalPlayerButton'),
  { ssr: false },
);
const SourceSwitchDialog = dynamic(
  () => import('@/components/play/SourceSwitchDialog'),
  { ssr: false },
);
import VideoCoverDisplay from '@/components/play/VideoCoverDisplay';
const VideoInfoSection = dynamic(
  () => import('@/components/play/VideoInfoSection'),
  { ssr: false },
);
const VideoLoadingOverlay = dynamic(
  () => import('@/components/play/VideoLoadingOverlay'),
  { ssr: false },
);
const WebSRSettingsPanel = dynamic(
  () => import('@/components/play/WebSRSettingsPanel'),
  { ssr: false },
);

const SiteAdSlot = dynamic(
  () => import('@/components/SiteAdSlot').then((m) => m.SiteAdSlot),
  { ssr: false },
);
const SkipController = dynamic(() => import('@/components/SkipController'), {
  ssr: false,
});
const SkipSettingsButton = dynamic(
  () => import('@/components/SkipController').then((m) => m.SkipSettingsButton),
  { ssr: false },
);

import { useDownload } from '@/contexts/DownloadContext';

import {
  useDeleteFavoriteMutation,
  useSaveFavoriteMutation,
  useSavePlayRecordMutation,
} from './hooks/usePlayPageMutations';
import {
  useDoubanCommentsQuery,
  useDoubanDetailsQuery,
} from './hooks/usePlayPageQueries';
import { useSourceSearch } from './hooks/useSourceSearch';
import { useTrailerFallback } from './hooks/useTrailerFallback';

const PLAYER_PLAYBACK_RATE_KEY = '5572tv_player_playback_rate';

function PlayPageClient() {
  const searchParams = useSearchParams();
  const { createTask, setShowDownloadPanel } = useDownload();

  // TanStack Query mutations
  const savePlayRecordMutation = useSavePlayRecordMutation();
  const saveFavoriteMutation = useSaveFavoriteMutation();
  const deleteFavoriteMutation = useDeleteFavoriteMutation();

  // -----------------------------------------------------------------------------
  // 状态变量（State）
  // -----------------------------------------------------------------------------
  const {
    loading,
    loadingStage,
    loadingMessage,
    error,
    setStage: setLoadingStage,
    setError,
    setReady: setReadyLoading,
  } = useLoadingState();
  const [detail, setDetail] = useState<SearchResult | null>(null);

  // 返回顶部按钮显示状态
  const [showBackToTop, setShowBackToTop] = useState(false);

  // 短剧详情状态（用于显示简介等信息）
  const [shortdramaDetails, setShortdramaDetails] = useState<any>(null);
  const loadingShortdramaRef = useRef(false);

  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  const [showPlaylistManager, setShowPlaylistManager] = useState(false);
  const [aiSummary, setAiSummary] = useState<{
    summary: string;
    highlights: string[];
    review: string;
  } | null>(null);
  const [aiSummaryLoading, setAiSummaryLoading] = useState(false);

  // ACG 动漫磁力搜索状态
  const [acgTriggerSearch, setAcgTriggerSearch] = useState<boolean>();

  // SkipController 相关状态
  const [isSkipSettingOpen, setIsSkipSettingOpen] = useState(false);
  const [currentPlayTime, setCurrentPlayTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);

  // 弹幕设置面板状态
  const [isDanmuSettingsPanelOpen, setIsDanmuSettingsPanelOpen] =
    useState(false);
  const [isDanmuManualModalOpen, setIsDanmuManualModalOpen] = useState(false);
  const [manualDanmuOverrides, setManualDanmuOverrides] = useState<
    Record<string, DanmuManualSelection>
  >({});
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(
    null,
  );

  // WebSR 设置面板状态
  const [isWebSRSettingsPanelOpen, setIsWebSRSettingsPanelOpen] =
    useState(false);

  // 下载选集面板状态
  const [showDownloadEpisodeSelector, setShowDownloadEpisodeSelector] =
    useState(false);

  // 下载功能启用状态
  const [downloadEnabled, setDownloadEnabled] = useState(true);

  // 外部播放器功能启用状态
  const [enableExternalPlayer, setEnableExternalPlayer] = useState(false);

  // 视频分辨率状态

  // 进度条拖拽状态管理
  const isDraggingProgressRef = useRef(false);
  const seekResetTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // resize事件防抖管理
  const resizeResetTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 获取服务器配置（下载功能开关）

  useEffect(() => {
    const fetchServerConfig = async () => {
      try {
        const response = await fetch('/api/server-config');
        if (response.ok) {
          const config = await response.json();
          setDownloadEnabled(config.DownloadEnabled ?? true);
          setEnableExternalPlayer(config.EnableExternalPlayer ?? false);
        }
      } catch (error) {
        console.error('获取服务器配置失败:', error);
        // 出错时默认启用下载功能
        setDownloadEnabled(true);
      }
    };
    fetchServerConfig();
  }, []);

  // 获取 HLS 缓冲配置（根据用户设置的模式）
  const getHlsBufferConfig = () => {
    const mode =
      typeof window !== 'undefined'
        ? localStorage.getItem('playerBufferMode') || 'standard'
        : 'standard';

    switch (mode) {
      case 'enhanced':
        // 增强模式：1.5 倍缓冲
        return {
          maxBufferLength: 45, // 45s（默认30s × 1.5）
          backBufferLength: 45,
          maxBufferSize: 90 * 1000 * 1000, // 90MB
        };
      case 'max':
        // 强力模式：3 倍缓冲
        return {
          maxBufferLength: 90, // 90s（默认30s × 3）
          backBufferLength: 60,
          maxBufferSize: 180 * 1000 * 1000, // 180MB
        };
      case 'standard':
      default:
        // 默认模式
        return {
          maxBufferLength: 30,
          backBufferLength: 30,
          maxBufferSize: 60 * 1000 * 1000, // 60MB
        };
    }
  };

  // 视频基本信息
  const [videoTitle, setVideoTitle] = useState(searchParams.get('title') || '');
  const [videoYear, setVideoYear] = useState(searchParams.get('year') || '');

  // 网盘搜索
  const {
    netdiskResults,
    setNetdiskResults,
    netdiskLoading,
    netdiskError,
    setNetdiskError,
    netdiskTotal,
    showNetdiskModal,
    setShowNetdiskModal,
    netdiskResourceType,
    setNetdiskResourceType,
    netdiskModalContentRef,
    handleNetDiskSearch,
  } = useNetdiskSearch(videoTitle, videoYear);

  const [videoCover, setVideoCover] = useState('');
  const [videoDoubanId, setVideoDoubanId] = useState(
    parseInt(searchParams.get('douban_id') || '0') || 0,
  );

  // TanStack Query queries - 豆瓣详情和评论（依赖 videoDoubanId）
  const {
    data: movieDetails,
    status: movieDetailsStatus,
    error: movieDetailsError,
  } = useDoubanDetailsQuery(videoDoubanId);

  const {
    data: movieComments,
    status: commentsStatus,
    error: commentsError,
  } = useDoubanCommentsQuery(videoDoubanId);

  const { bangumiDetails, loadingBangumiDetails } = useBangumiDetails(
    videoDoubanId,
    detail?.source,
  );

  // 兼容旧代码的 loading 状态
  const loadingMovieDetails = movieDetailsStatus === 'pending';
  const loadingComments = commentsStatus === 'pending';

  // 当前源和ID
  const [currentSource, setCurrentSource] = useState(
    searchParams.get('source') || '',
  );
  const [currentId, setCurrentId] = useState(searchParams.get('id') || '');

  // 短剧ID（用于获取详情显示，不影响源搜索）
  const [shortdramaId] = useState(searchParams.get('shortdrama_id') || '');

  // 搜索所需信息
  const [searchTitle, setSearchTitle] = useState(
    searchParams.get('stitle') || '',
  );
  const [searchType] = useState(searchParams.get('stype') || '');

  // 是否需要优选
  const [needPrefer, setNeedPrefer] = useState(
    searchParams.get('prefer') === 'true',
  );
  const needPreferRef = useRef(needPrefer);
  // 集数相关
  const [currentEpisodeIndex, setCurrentEpisodeIndex] = useState(() => {
    // 从 URL 读取初始集数
    const indexParam = searchParams.get('index');
    const parsed = indexParam ? parseInt(indexParam, 10) : 0;
    return Number.isNaN(parsed) ? 0 : parsed;
  });

  // 监听 URL index 参数变化（观影室切集同步）

  useEffect(() => {
    const indexParam = searchParams.get('index');
    const parsedIndex = indexParam ? parseInt(indexParam, 10) : 0;
    const newIndex = Number.isNaN(parsedIndex) ? 0 : parsedIndex;
    if (newIndex !== currentEpisodeIndex) {
      // // console.log('[PlayPage] URL index changed, updating episode:', newIndex);
      setCurrentEpisodeIndex(newIndex);
    }
  }, [searchParams.get('index')]);

  // 重新加载触发器（用于触发 initAll 重新执行）
  const [reloadTrigger, setReloadTrigger] = useState(0);
  const reloadFlagRef = useRef<string | null>(null);
  const searchParamsStr = useMemo(
    () => searchParams.toString(),
    [searchParams],
  );

  // 监听 URL source/id 参数变化（观影室切换源同步）

  useEffect(() => {
    const newSource = searchParams.get('source') || '';
    const newId = searchParams.get('id') || '';
    const parsedIndex = parseInt(searchParams.get('index') || '0');
    const parsedTime = parseInt(searchParams.get('t') || '0');
    const newIndex = Number.isNaN(parsedIndex) ? 0 : parsedIndex;
    const newTime = Number.isNaN(parsedTime) ? 0 : parsedTime;
    const reloadFlag = searchParams.get('_reload');

    // 如果 source 或 id 变化，且有 _reload 标记，且不是已经处理过的reload
    if (
      reloadFlag &&
      reloadFlag !== reloadFlagRef.current &&
      (newSource !== currentSource || newId !== currentId)
    ) {
      // // console.log(
      // '[PlayPage] URL source/id changed with reload flag, reloading:',
      // { newSource, newId, newIndex, newTime },
      // );

      // 标记此reload已处理
      reloadFlagRef.current = reloadFlag;

      // 重置所有相关状态
      setCurrentSource(newSource);
      setCurrentId(newId);
      setCurrentEpisodeIndex(newIndex);
      setError(null);
      setLoadingStage('searching');
      setNeedPrefer(false);

      // 触发重新加载（通过更新 reloadTrigger 来触发 initAll 重新执行）
      setReloadTrigger((prev) => prev + 1);
    }
  }, [searchParamsStr, currentSource, currentId]);

  const currentSourceRef = useRef(currentSource);
  const currentIdRef = useRef(currentId);
  const videoTitleRef = useRef(videoTitle);
  const videoYearRef = useRef(videoYear);
  const videoDoubanIdRef = useRef(videoDoubanId);
  const detailRef = useRef<SearchResult | null>(detail);
  const currentEpisodeIndexRef = useRef(currentEpisodeIndex);

  // ArtPlayer ref
  const artPlayerRef = useRef<any>(null);
  const artRef = useRef<HTMLDivElement | null>(null);

  const tryTrailerFallback = useTrailerFallback(
    videoDoubanIdRef,
    videoTitleRef,
    videoYearRef,
    searchType,
  );

  // 🚀 使用 useDanmu Hook 管理弹幕
  const danmuScopeKey = `${videoTitle}_${videoYear}_${videoDoubanId}_${currentEpisodeIndex + 1}`;
  const activeManualDanmuOverride: DanmuManualOverride | null =
    manualDanmuOverrides[danmuScopeKey] || null;

  const {
    externalDanmuEnabled,
    setExternalDanmuEnabled,
    danmuList, // 弹幕列表state（用于显示弹幕数量）
    loading: danmuLoading, // 加载状态（state）
    loadMeta: danmuLoadMeta, // 加载元数据
    error: danmuError, // 错误状态
    loadExternalDanmu,
    handleDanmuOperationOptimized,
    externalDanmuEnabledRef,
    danmuLoadingRef,
    lastDanmuLoadKeyRef,
    danmuPluginStateRef,
    danmuLoadedAtRef,
    danmuLoadLockRef,
  } = useDanmu({
    videoTitle,
    videoYear,
    videoDoubanId,
    currentEpisodeIndex,
    currentSource,
    artPlayerRef,
    manualOverride: activeManualDanmuOverride,
  });

  const { speedTestProgress, precomputedVideoInfo, fullSpeedTest } =
    useSpeedTest();

  const {
    webGPUSupported,
    websrEnabled,
    websrMode,
    websrContentType,
    websrNetworkSize,
    websrCompareEnabled,
    websrComparePosition,
    setWebsrEnabled,
    setWebsrMode,
    setWebsrContentType,
    setWebsrNetworkSize,
    setWebsrCompareEnabled,
    setWebsrComparePosition,
    initWebSR,
    destroyWebSR,
    toggleWebSR,
    switchWebSRConfig,
  } = useWebSR(artPlayerRef);

  const {
    blockAdEnabled,
    setBlockAdEnabled,
    blockAdEnabledRef,
    customAdFilterCodeRef,
    filterAdsFromM3U8,
    formatTime,
  } = useAdFilter(currentSourceRef);

  const {
    selectedCelebrityName,
    setSelectedCelebrityName,
    celebrityWorks,
    setCelebrityWorks,
    loadingCelebrityWorks,
    handleCelebrityClick,
  } = useCelebrityWorks(currentSource, currentId, videoTitle);

  // ✅ 合并所有 ref 同步的 useEffect - 减少不必要的渲染
  useEffect(() => {
    externalDanmuEnabledRef.current = externalDanmuEnabled;
    needPreferRef.current = needPrefer;
    currentSourceRef.current = currentSource;
    currentIdRef.current = currentId;
    detailRef.current = detail;
    currentEpisodeIndexRef.current = currentEpisodeIndex;
    videoTitleRef.current = videoTitle;
    videoYearRef.current = videoYear;
    videoDoubanIdRef.current = videoDoubanId;
  }, [
    externalDanmuEnabled,
    needPrefer,
    currentSource,
    currentId,
    detail,
    currentEpisodeIndex,
    videoTitle,
    videoYear,
    videoDoubanId,
  ]);

  // 🎬 更新全屏标题层内容（集数变化时）
  // portalContainer 作为依赖确保 ArtPlayer 初始化后再执行
  useEffect(() => {
    if (!artPlayerRef.current) return;
    const titleLayer = artPlayerRef.current.layers['fullscreen-title'];
    if (!titleLayer) return;

    const episodeName = detail?.episodes_titles?.[currentEpisodeIndex] || '';
    const hasEpisodes = detail?.episodes && detail.episodes.length > 1;

    titleLayer.innerHTML = `
      <div class="fullscreen-title-container">
        <div class="fullscreen-title-content">
          <h1 class="fullscreen-title-text">${escapeAudioTrackHtml(detail?.title || '')}</h1>
          ${
            hasEpisodes && episodeName
              ? `<span class="fullscreen-episode-text">${escapeAudioTrackHtml(episodeName)}</span>`
              : hasEpisodes
                ? `<span class="fullscreen-episode-text">第 ${currentEpisodeIndex + 1} 集</span>`
                : ''
          }
        </div>
      </div>
    `;
  }, [currentEpisodeIndex, detail, portalContainer]);

  // 🚀 豆瓣评论由 useDoubanCommentsQuery 自动加载，无需手动 useEffect

  // 加载短剧详情（仅用于显示简介等信息，不影响源搜索）

  useEffect(() => {
    if (!shortdramaId || shortdramaDetails) return;
    if (loadingShortdramaRef.current) return;
    loadingShortdramaRef.current = true;

    const dramaTitle = searchParams.get('title') || videoTitleRef.current || '';
    const titleParam = dramaTitle
      ? `&name=${encodeURIComponent(dramaTitle)}`
      : '';
    fetch(`/api/shortdrama/detail?id=${shortdramaId}&episode=1${titleParam}`)
      .then((response) => {
        if (response.ok) return response.json();
        throw new Error(`HTTP ${response.status}`);
      })
      .then((data) => {
        setShortdramaDetails(data);
      })
      .catch((error) => {
        console.error('Failed to load shortdrama details:', error);
      })
      .finally(() => {
        loadingShortdramaRef.current = false;
      });
  }, [shortdramaId, shortdramaDetails]);

  // 视频播放地址
  const [videoUrl, setVideoUrl] = useState('');

  // 总集数
  const totalEpisodes = detail?.episodes?.length || 0;

  // 用于记录是否需要在播放器 ready 后跳转到指定进度
  const resumeTimeRef = useRef<number | null>(null);

  const {
    audioTracks,
    setAudioTracks,
    currentAudioTrack,
    setCurrentAudioTrack,
    isAudioTrackSwitching,
    setIsAudioTrackSwitching,
    audioTracksRef,
    currentAudioTrackRef,
    handleAudioTrackSelect,
    buildAudioTrackControl,
    resetAudioTrackState,
  } = useAudioTracks({
    artPlayerRef,
    detail,
    currentEpisodeIndex,
    videoUrl,
    setVideoUrl,
    resumeTimeRef,
  });
  // 上次使用的音量，默认 0.7
  const lastVolumeRef = useRef<number>(0.7);
  // 用于清理 autoplay 首次交互的 document click 监听器
  const firstInteractionHandlerRef = useRef<(() => void) | null>(null);
  // 上次使用的播放速率，从 localStorage 恢复
  const lastPlaybackRateRef = useRef<number>(loadPlaybackRate());

  const [sourceSearchLoading, setSourceSearchLoading] = useState(false);
  const [sourceSearchError, setSourceSearchError] = useState<string | null>(
    null,
  );
  const [backgroundSourcesLoading, setBackgroundSourcesLoading] =
    useState(false);

  // 优选和测速开关
  const [optimizationEnabled] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('enableOptimization');
      if (saved !== null) {
        try {
          return JSON.parse(saved);
        } catch {
          /* ignore */
        }
      }
    }
    return false;
  });

  // 折叠状态（仅在 lg 及以上屏幕有效）
  const [isEpisodeSelectorCollapsed, setIsEpisodeSelectorCollapsed] =
    useState(false);

  // 换源加载状态
  const [isVideoLoading, setIsVideoLoading] = useState(true);
  const [videoLoadingStage, setVideoLoadingStage] = useState<
    'initing' | 'sourceChanging'
  >('initing');

  // 播放进度保存相关
  const saveIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastSaveTimeRef = useRef<number>(0);

  // 🚀 连续切换源防抖和资源管理
  const episodeSwitchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isEpisodeChangingRef = useRef<boolean>(false); // 标记是否正在切换集数
  const isSkipControllerTriggeredRef = useRef<boolean>(false); // 标记是否通过 SkipController 触发了下一集
  const videoEndedHandledRef = useRef<boolean>(false); // 🔥 标记当前视频的 video:ended 事件是否已经被处理过（防止多个监听器重复触发）

  // 🚀 新增：连续切换源防抖和资源管理
  const sourceSwitchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const switchPromiseRef = useRef<Promise<void> | null>(null); // 当前切换的Promise

  const {
    handleSourceChange,
    availableSources,
    setAvailableSources,
    availableSourcesRef,
    sourceRetryStateRef,
    totalSessionFailuresRef,
    fallbackAutoRetriedRef,
    isSourceChangingRef,
    sourceErrorCountRef,
    getSourceIdentityKey,
    markSourceFailed,
    filterInvalidSources,
    findWorkingSource,
    resetSourceState,
    MAX_SOURCE_ERRORS,
    MAX_SESSION_FAILURES,
  } = useSourceSwitching({
    videoTitleRef,
    videoYearRef,
    videoDoubanIdRef,
    setDetail,
    setError,
    artPlayerRef,
    currentEpisodeIndex,
    setCurrentEpisodeIndex,
    currentSourceRef,
    currentIdRef,
    detailRef,
    currentEpisodeIndexRef,
    searchTitle,
    setVideoTitle,
    setVideoYear,
    setVideoCover,
    setVideoDoubanId,
    setCurrentSource,
    setCurrentId,
    replacePlaybackUrlParams,
    setVideoLoadingStage,
    setIsVideoLoading,
    loadExternalDanmu,
    externalDanmuEnabledRef,
    episodeSwitchTimeoutRef,
    lastDanmuLoadKeyRef,
    danmuLoadingRef,
  });

  // Wake Lock 相关
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const danmakuConfigCleanupRef = useRef<(() => void) | null>(null);
  const globalCleanupFnsRef = useRef<(() => void)[]>([]);

  // 观影室同步
  const {
    isInRoom: isInWatchRoom,
    isOwner: isWatchRoomOwner,
    syncPaused,
    pauseSync,
    resumeSync,
    isSameVideoAsOwner,
    pendingOwnerChange,
    confirmFollowOwner,
    rejectFollowOwner,
    showSourceSwitchDialog,
    pendingOwnerState,
    handleConfirmSourceSwitch,
    handleCancelSourceSwitch,
  } = {
    isInRoom: false,
    isOwner: false,
    syncPaused: false,
    pauseSync: () => {},
    resumeSync: () => {},
    isSameVideoAsOwner: true,
    pendingOwnerChange: null,
    confirmFollowOwner: () => {},
    rejectFollowOwner: () => {},
    showSourceSwitchDialog: false,
    pendingOwnerState: null,
    handleConfirmSourceSwitch: () => {},
    handleCancelSourceSwitch: () => {},
  };

  // 获取源权重映射（缓存30秒避免重复请求）
  const _sourceWeightsCacheRef = useRef<Record<string, number> | null>(null);
  const _sourceWeightsCacheTimeRef = useRef(0);
  const fetchSourceWeights = async (): Promise<Record<string, number>> => {
    const now = Date.now();
    if (
      _sourceWeightsCacheRef.current &&
      now - _sourceWeightsCacheTimeRef.current < 30000
    ) {
      return _sourceWeightsCacheRef.current;
    }
    try {
      const response = await fetch('/api/source-weights');
      if (!response.ok) {
        return _sourceWeightsCacheRef.current || {};
      }
      const data = await response.json();
      _sourceWeightsCacheRef.current = data.weights || {};
      _sourceWeightsCacheTimeRef.current = now;
      return _sourceWeightsCacheRef.current;
    } catch (error) {
      return _sourceWeightsCacheRef.current || {};
    }
  };

  // 按权重排序源（权重高的在前）
  const sortSourcesByWeight = (
    sources: SearchResult[],
    weights: Record<string, number>,
  ): SearchResult[] => {
    return [...sources].sort((a, b) => {
      const weightA = weights[a.source] ?? 50;
      const weightB = weights[b.source] ?? 50;
      return weightB - weightA; // 降序排列，权重高的在前
    });
  };

  // 设置可用源列表（先按权重排序）
  const setAvailableSourcesWithWeight = async (
    sources: SearchResult[],
  ): Promise<SearchResult[]> => {
    const validSources = filterInvalidSources(sources);

    if (validSources.length <= 1) {
      setAvailableSources(validSources);
      return validSources;
    }
    const weights = await fetchSourceWeights();
    const sortedSources = sortSourcesByWeight(validSources, weights);
    // // console.log(
    // '按权重排序可用源:',
    // sortedSources
    // .map((s) => `${s.source_name}(${weights[s.source] ?? 50})`)
    // .slice(0, 5),
    // '...',
    // );
    setAvailableSources(sortedSources);
    return sortedSources;
  };

  const sourceSearchAbortRef = useRef<AbortController>(
    typeof window !== 'undefined' ? new AbortController() : (null as any),
  );
  const { fetchSourcesData } = useSourceSearch({
    videoTitleRef,
    videoYearRef,
    videoDoubanIdRef,
    currentEpisodeRef: currentEpisodeIndexRef,
    searchType,
    signal: sourceSearchAbortRef.current.signal,
    availableSourcesRef,
    searchTitle,
    videoTitle,
    currentSource,
    currentId,
    tryTrailerFallback,
    setAvailableSourcesWithWeight,
    setSourceSearchError,
    setAvailableSources,
    setSourceSearchLoading,
  });

  // 播放源优选函数（针对旧iPad做极端保守优化）
  const preferBestSource = async (
    sources: SearchResult[],
  ): Promise<SearchResult> => {
    if (sources.length === 1) return sources[0];

    // 🎯 获取源权重并按权重排序
    const weights = await fetchSourceWeights();
    const weightedSources = sortSourcesByWeight(sources, weights);
    // // console.log(
    // '按权重排序后的源:',
    // weightedSources.map(
    // (s) => `${s.source_name}(${weights[s.source] ?? 50})`,
    // ),
    // );

    // 使用全局统一的设备检测结果
    const _isIPad =
      /iPad/i.test(userAgent) ||
      (userAgent.includes('Macintosh') && navigator.maxTouchPoints >= 1);
    const _isIOS = isIOSGlobal;
    const isIOS13 = isIOS13Global;
    const isMobile = isMobileGlobal;

    // 如果是iPad或iOS13+（包括新iPad在桌面模式下），使用极简策略避免崩溃
    if (isIOS13) {
      // // console.log('检测到iPad/iOS13+设备，使用无测速优选策略避免崩溃');

      // 直接返回权重最高的源（已按权重排序）
      // 同时保留原来的源名称优先级作为备用排序
      const sourcePreference = [
        'ok',
        'niuhu',
        'ying',
        'wasu',
        'mgtv',
        'iqiyi',
        'youku',
        'qq',
      ];

      const sortedSources = weightedSources.sort((a, b) => {
        // 首先按权重排序（已经排好了）
        const weightA = weights[a.source] ?? 50;
        const weightB = weights[b.source] ?? 50;
        if (weightA !== weightB) {
          return weightB - weightA;
        }

        // 权重相同时，按源名称优先级排序
        const aIndex = sourcePreference.findIndex((name) =>
          a.source_name?.toLowerCase().includes(name),
        );
        const bIndex = sourcePreference.findIndex((name) =>
          b.source_name?.toLowerCase().includes(name),
        );

        if (aIndex !== -1 && bIndex !== -1) {
          return aIndex - bIndex;
        }
        if (aIndex !== -1) return -1;
        if (bIndex !== -1) return 1;

        return 0;
      });

      // // console.log(
      // 'iPad/iOS13+优选结果:',
      // sortedSources.map((s) => s.source_name),
      // );
      return sortedSources[0];
    }

    // 移动设备使用轻量级测速（仅ping，不创建HLS）
    if (isMobile) {
      // // console.log('移动设备使用轻量级优选');
      return await lightweightPreference(weightedSources, weights);
    }

    // 桌面设备使用原来的测速方法（控制并发）
    return await fullSpeedTest(weightedSources, weights);
  };

  // 轻量级优选：仅测试连通性，不创建video和HLS
  const lightweightPreference = async (
    sources: SearchResult[],
    weights: Record<string, number> = {},
  ): Promise<SearchResult> => {
    // // console.log('开始轻量级测速，仅测试连通性');

    const results = await Promise.all(
      sources.map(async (source) => {
        try {
          if (!source.episodes || source.episodes.length === 0) {
            return {
              source,
              pingTime: 9999,
              available: false,
              weight: weights[source.source] ?? 50,
            };
          }

          const episodeUrl =
            source.episodes.length > 1
              ? source.episodes[1]
              : source.episodes[0];

          // 仅测试连通性和响应时间
          const startTime = performance.now();
          await fetch(episodeUrl, {
            method: 'HEAD',
            mode: 'no-cors',
            signal: AbortSignal.timeout(3000), // 3秒超时
          });
          const pingTime = performance.now() - startTime;

          return {
            source,
            pingTime: Math.round(pingTime),
            available: true,
            weight: weights[source.source] ?? 50,
          };
        } catch (error) {
          console.warn(`轻量级测速失败: ${source.source_name}`, error);
          return {
            source,
            pingTime: 9999,
            available: false,
            weight: weights[source.source] ?? 50,
          };
        }
      }),
    );

    // 按权重分组，在同权重组内按ping时间排序
    const sortedResults = results
      .filter((r) => r.available)
      .sort((a, b) => {
        // 首先按权重降序
        if (a.weight !== b.weight) {
          return b.weight - a.weight;
        }
        // 同权重按ping时间升序
        return a.pingTime - b.pingTime;
      });

    if (sortedResults.length === 0) {
      console.warn('所有源都不可用，返回第一个');
      return sources[0];
    }

    // // console.log(
    // '轻量级优选结果:',
    // sortedResults.map((r) => `${r.source.source_name}: ${r.pingTime}ms`),
    // );

    return sortedResults[0].source;
  };

  // 更新视频地址
  const updateVideoUrl = async (
    detailData: SearchResult | null,
    episodeIndex: number,
  ) => {
    if (
      !detailData ||
      !detailData.episodes ||
      episodeIndex >= detailData.episodes.length
    ) {
      setVideoUrl('');
      return;
    }

    const episodeData = detailData.episodes[episodeIndex];

    // 检查是否为短剧格式
    if (episodeData && episodeData.startsWith('shortdrama:')) {
      try {
        const [, videoId, episode] = episodeData.split(':');
        // 添加剧名参数以支持备用API fallback
        const nameParam = detailData.drama_name
          ? `&name=${encodeURIComponent(detailData.drama_name)}`
          : '';
        const response = await fetch(
          `/api/shortdrama/parse?id=${videoId}&episode=${episode}${nameParam}`,
        );

        if (response.ok) {
          const result = await response.json();
          const newUrl = result.url || '';
          if (newUrl !== videoUrl) {
            setVideoUrl(newUrl);
          }
        } else {
          // 读取API返回的错误信息
          try {
            const errorData = await response.json();
            setError(errorData.error || '短剧解析失败');
          } catch {
            setError('短剧解析失败');
          }
          setVideoUrl('');
        }
      } catch (err) {
        console.error('短剧URL解析失败:', err);
        setError('播放失败，请稍后再试');
        setVideoUrl('');
      }
    } else {
      // 普通视频格式
      let newUrl = episodeData || '';

      // ✅ 关键修复：对于Emby源，如果有偏好音轨，添加AudioStreamIndex参数
      const isEmbySource =
        detailData.source === 'emby' || detailData.source?.startsWith('emby_');
      if (isEmbySource && newUrl && currentAudioTrackRef.current >= 0) {
        newUrl = appendAudioStreamIndex(newUrl, currentAudioTrackRef.current);
        // // console.log('🎵 换集时应用音轨参数:', currentAudioTrackRef.current);
      }

      // 🛡️ 外部 CDN 的 m3u8 链接 - 优先让客户端直接获取（绕过CDN防盗链）
      if (
        newUrl &&
        newUrl.includes('.m3u8') &&
        !newUrl.includes(window.location.host) &&
        !isEmbySource
      ) {
        // 优先使用原始URL让客户端直接获取（CDN防盗链通常只拦截服务器IP）
        // 如果客户端获取失败，hls.js会自动重试或显示错误
        // 不再强制使用代理，因为代理会被CDN服务器封锁
      }

      if (newUrl !== videoUrl) {
        setVideoUrl(newUrl);
      }
    }
  };

  const ensureVideoSource = (video: HTMLVideoElement | null, url: string) => {
    if (!video || !url) return;
    const sources = Array.from(video.getElementsByTagName('source'));
    const existed = sources.some((s) => s.src === url);
    if (!existed) {
      // 移除旧的 source，保持唯一
      sources.forEach((s) => s.remove());
      const sourceEl = document.createElement('source');
      sourceEl.src = url;
      video.appendChild(sourceEl);
    }

    // 始终允许远程播放（AirPlay / Cast）
    video.disableRemotePlayback = false;
    // 如果曾经有禁用属性，移除之
    if (video.hasAttribute('disableRemotePlayback')) {
      video.removeAttribute('disableRemotePlayback');
    }
  };

  // 检测移动设备（在组件层级定义）- 参考ArtPlayer compatibility.js
  const {
    userAgent,
    isMobile: isMobileGlobal,
    isIOS: isIOSGlobal,
    isIOS13: isIOS13Global,
    isSafari,
    isWebKit,
  } = useDeviceInfo();
  const requestWakeLock = async () => {
    try {
      if ('wakeLock' in navigator) {
        wakeLockRef.current = await (navigator as any).wakeLock.request(
          'screen',
        );
        // // console.log('Wake Lock 已启用');
      }
    } catch (err) {
      console.warn('Wake Lock 请求失败:', err);
    }
  };

  const releaseWakeLock = async () => {
    try {
      if (wakeLockRef.current) {
        await wakeLockRef.current.release();
        wakeLockRef.current = null;
        // // console.log('Wake Lock 已释放');
      }
    } catch (err) {
      console.warn('Wake Lock 释放失败:', err);
    }
  };

  // 清理播放器资源的统一函数
  const cleanupPlayer = async () => {
    // 清理弹幕配置面板的事件监听器
    if (danmakuConfigCleanupRef.current) {
      danmakuConfigCleanupRef.current();
      danmakuConfigCleanupRef.current = null;
    }

    // 清理全局 document/window 事件监听器
    for (const fn of globalCleanupFnsRef.current) {
      try {
        fn();
      } catch {}
    }
    globalCleanupFnsRef.current = [];

    // 先清理WebSR，避免GPU纹理错误
    await destroyWebSR();

    // 清理集数切换定时器
    if (episodeSwitchTimeoutRef.current) {
      clearTimeout(episodeSwitchTimeoutRef.current);
      episodeSwitchTimeoutRef.current = null;
    }

    // 清理弹幕状态引用
    danmuPluginStateRef.current = null;

    if (artPlayerRef.current) {
      try {
        // 🔥 关键：先保存 video 和 hls 引用
        const video = artPlayerRef.current.video;
        const hls = video?.hls;

        // 清理弹幕插件
        if (artPlayerRef.current.plugins?.artplayerPluginDanmuku) {
          const danmukuPlugin =
            artPlayerRef.current.plugins.artplayerPluginDanmuku;
          if (
            danmukuPlugin.worker &&
            typeof danmukuPlugin.worker.terminate === 'function'
          ) {
            danmukuPlugin.worker.terminate();
            // // console.log('[Cleanup] 弹幕WebWorker已清理');
          }
          if (typeof danmukuPlugin.reset === 'function') {
            danmukuPlugin.reset();
          }
        }

        // 1. 先销毁 ArtPlayer，停止所有控制
        artPlayerRef.current.destroy(false);
        artPlayerRef.current = null;
        // // console.log('[Cleanup] ArtPlayer已销毁');

        // 2. 然后清理 video 和 HLS
        if (video) {
          video.pause();
          // // console.log('[Cleanup] 视频已暂停');
        }

        if (hls) {
          try {
            hls.stopLoad();
            hls.detachMedia();
            hls.destroy();
            // // console.log('[Cleanup] HLS已清理');
          } catch (err) {
            console.warn('[Cleanup] HLS清理出错:', err);
          }
        }

        if (video) {
          video.removeAttribute('src');
          video.load();
          video.src = '';
          // // console.log('[Cleanup] video src已清空');
        }

        // // console.log('播放器资源已清理');
      } catch (err) {
        console.warn('清理播放器资源时出错:', err);
        artPlayerRef.current = null;
      }
    }
  };

  // 🚀 优化的集数变化处理（防抖 + 状态保护）
  useEffect(() => {
    // 🔥 标记正在切换集数（只在非换源时）
    if (!isSourceChangingRef.current) {
      isEpisodeChangingRef.current = true;
      // 🔑 立即重置 SkipController 触发标志，允许新集数自动跳过片头片尾
      isSkipControllerTriggeredRef.current = false;
      videoEndedHandledRef.current = false;
    }

    updateVideoUrl(detail, currentEpisodeIndex);

    // 🚀 如果正在换源，跳过弹幕处理（换源会在完成后手动处理）
    if (isSourceChangingRef.current) {
      // // console.log('⏭️ 正在换源，跳过弹幕处理');
      return;
    }

    // 🔥 关键修复：重置弹幕加载标识，确保新集数能正确加载弹幕
    lastDanmuLoadKeyRef.current = '';
    danmuLoadingRef.current = false; // 重置加载状态

    // 清除之前的集数切换定时器，防止重复执行
    if (episodeSwitchTimeoutRef.current) {
      clearTimeout(episodeSwitchTimeoutRef.current);
    }

    // 如果播放器已经存在且弹幕插件已加载，重新加载弹幕
    if (
      artPlayerRef.current &&
      artPlayerRef.current.plugins?.artplayerPluginDanmuku
    ) {
      // // console.log('🚀 集数变化，优化后重新加载弹幕');

      // 🔥 关键修复：立即清空当前弹幕，避免旧弹幕残留
      const plugin = artPlayerRef.current.plugins.artplayerPluginDanmuku;
      plugin.reset(); // 立即回收所有正在显示的弹幕DOM
      plugin.load(); // 不传参数，完全清空弹幕队列

      // 保存当前弹幕插件状态
      danmuPluginStateRef.current = {
        isHide: artPlayerRef.current.plugins.artplayerPluginDanmuku.isHide,
        isStop: artPlayerRef.current.plugins.artplayerPluginDanmuku.isStop,
        option: artPlayerRef.current.plugins.artplayerPluginDanmuku.option,
      };

      // 使用防抖处理弹幕重新加载
      episodeSwitchTimeoutRef.current = setTimeout(async () => {
        try {
          // 确保播放器和插件仍然存在（防止快速切换时的状态不一致）
          if (!artPlayerRef.current?.plugins?.artplayerPluginDanmuku) {
            return;
          }
          if (danmuLoadLockRef.current) return;
          danmuLoadLockRef.current = true;

          const result = await loadExternalDanmu();

          // 再次确认插件状态
          if (artPlayerRef.current?.plugins?.artplayerPluginDanmuku) {
            const plugin = artPlayerRef.current.plugins.artplayerPluginDanmuku;

            if (result.count > 0) {
              const deduped = deduplicateDanmaku(result.data);
              plugin.load();
              plugin.load(deduped);

              // 恢复弹幕插件的状态
              if (danmuPluginStateRef.current) {
                if (!danmuPluginStateRef.current.isHide) {
                  plugin.show();
                }
              }

              if (artPlayerRef.current) {
                artPlayerRef.current.notice.show = `已加载 ${result.count} 条弹幕`;
              }
            } else {
              // // console.log('📭 集数变化后没有弹幕数据可加载');
              plugin.load(); // 不传参数，确保清空弹幕

              if (artPlayerRef.current) {
                artPlayerRef.current.notice.show = '暂无弹幕数据';
              }
            }
          }
        } catch (error) {
          console.error('❌ 集数变化后加载外部弹幕失败:', error);
        } finally {
          danmuLoadLockRef.current = false;
          episodeSwitchTimeoutRef.current = null;
        }
      }, 800); // 缩短延迟时间，提高响应性
    }
  }, [detail, currentEpisodeIndex]);

  // 进入页面时直接获取全部源信息

  useEffect(() => {
    const abortController = new AbortController();
    const signal = abortController.signal;

    const fetchSourceDetail = async (
      source: string,
      id: string,
      title?: string,
    ): Promise<SearchResult[]> => {
      // 豆瓣预告片源无需再请求详情
      if (source === 'douban_trailer') {
        return availableSourcesRef.current.filter(
          (s) => s.source === 'douban_trailer',
        );
      }

      try {
        let detailResponse;

        // 判断是否为短剧源
        if (source === 'shortdrama') {
          // 传递 title 参数以支持备用API fallback
          // 优先使用 URL 参数的 title，因为 videoTitleRef 可能还未初始化
          const dramaTitle =
            searchParams.get('title') || videoTitleRef.current || '';
          const titleParam = dramaTitle
            ? `&name=${encodeURIComponent(dramaTitle)}`
            : '';
          detailResponse = await fetch(
            `/api/shortdrama/detail?id=${id}&episode=1${titleParam}`,
            { signal },
          );
        } else {
          // 所有其他源（包括 Emby）统一使用 /api/detail
          // 添加 title 参数用于搜索匹配
          const titleParam = title ? `&title=${encodeURIComponent(title)}` : '';
          detailResponse = await fetch(
            `/api/detail?source=${source}&id=${id}${titleParam}`,
            { signal },
          );
        }

        if (!detailResponse.ok) {
          if (detailResponse.status === 404 && source && id) {
            markSourceFailed(getSourceIdentityKey(source, id));
          }
          throw new Error(`获取视频详情失败 (${detailResponse.status})`);
        }

        const detailData = (await detailResponse.json()) as SearchResult;

        // 验证返回的数据与请求的 source/id 匹配，防止导航错乱
        if (
          detailData.source &&
          String(detailData.source).trim() !== String(source).trim()
        ) {
          console.warn(
            `[Play] 详情 source 不匹配: 请求 ${source}, 得到 ${detailData.source}，跳过当前源`,
          );
          return [];
        }
        if (
          detailData.id &&
          String(detailData.id).trim() !== String(id).trim()
        ) {
          console.warn(
            `[Play] 详情 id 不匹配: 请求 ${id}, 得到 ${detailData.id}，跳过当前源`,
          );
          return [];
        }

        // 对于短剧源，检查 title 和 poster 是否有效
        if (source === 'shortdrama') {
          if (!detailData.title || !detailData.poster) {
            throw new Error('短剧源数据不完整（缺少标题或海报）');
          }
        }

        // 注意：不检查episodes是否为空，因为有些源可能需要后续处理
        // 即使episodes为空，也返回数据，让调用方决定如何处理

        return [detailData];
      } catch (err) {
        console.warn('获取视频详情失败:', err);
        return [];
      } finally {
        setSourceSearchLoading(false);
      }
    };
    const initAll = async () => {
      if (!currentSource && !currentId && !videoTitle && !searchTitle) {
        setError('缺少必要参数');
        setReadyLoading();
        return;
      }
      // 切换视频时重置源重试状态，避免上一部视频的失败标记影响当前播放
      resetSourceState();
      setLoadingStage(
        currentSource && currentId ? 'fetching' : 'searching',
        currentSource && currentId
          ? '🎬 正在获取视频详情...'
          : '🔍 正在搜索播放源...',
      );

      let detailData: SearchResult | null = null;
      let sourcesInfo: SearchResult[] = [];

      if (currentSource && currentId && !searchTitle && !videoTitle) {
        try {
          const [allRecords, favorites] = await Promise.all([
            cachedGetAllPlayRecords().catch(() => ({})),
            cachedGetAllFavorites().catch(() => ({})),
          ]);
          const currentKey = generateStorageKey(currentSource, currentId);
          const matchedRecord = allRecords[currentKey];
          const matchedFavorite = favorites[currentKey];
          const strictMeta = matchedRecord || matchedFavorite;

          if (strictMeta) {
            if (strictMeta.search_title) {
              videoTitleRef.current = strictMeta.search_title;
              setSearchTitle(strictMeta.search_title);
            } else if (strictMeta.title) {
              videoTitleRef.current = strictMeta.title;
              setSearchTitle(strictMeta.title);
            }

            if (strictMeta.title) {
              setVideoTitle(strictMeta.title);
            }

            if (strictMeta.year) {
              videoYearRef.current = strictMeta.year;
              setVideoYear(strictMeta.year);
            }

            if ('douban_id' in strictMeta && strictMeta.douban_id) {
              videoDoubanIdRef.current = strictMeta.douban_id;
              setVideoDoubanId(strictMeta.douban_id);
            }
          }
        } catch (error) {
          console.warn('恢复播放元信息失败:', error);
        }
      }

      const hasSearchFallbackContext = Boolean(
        searchTitle ||
        videoTitle ||
        videoDoubanIdRef.current ||
        videoYearRef.current,
      );

      // 如果已经有了source和id，优先通过单个详情接口快速获取
      if (currentSource && currentId) {
        // douban等非视频源直接跳过详情获取，走搜索流程
        const isDirectSource = ![
          'douban',
          'douban-search',
          'douban-api',
          'upcoming_release',
        ].includes(currentSource);

        if (isDirectSource) {
          // 先快速获取当前源的详情
          try {
            const currentSourceDetail = await fetchSourceDetail(
              currentSource,
              currentId,
              searchTitle || videoTitle,
            );
            if (currentSourceDetail.length > 0) {
              detailData = currentSourceDetail[0];
              sourcesInfo = currentSourceDetail;

              if (!searchTitle && !videoTitle && detailData.title) {
                setVideoTitle(detailData.title);
                videoTitleRef.current = detailData.title;
                setSearchTitle(detailData.title);
              }
              if (!videoYearRef.current && detailData.year) {
                setVideoYear(detailData.year);
                videoYearRef.current = detailData.year;
              }
            } else {
              console.warn('[Play] fetchSourceDetail 返回空数组');
            }
          } catch (err) {
            console.warn('获取当前源详情失败:', err);
          }
        } else {
          console.warn(
            '[Play] 当前源',
            currentSource,
            '不支持直接获取详情，将通过搜索查找',
          );
        }

        // 获取其他源信息；当前源已可播放时放到后台，不阻塞首屏播放
        setBackgroundSourcesLoading(true);
        const otherSourcesQuery =
          searchTitle || videoTitle || detailData?.title || '';
        const otherSourcesPromise = fetchSourcesData(otherSourcesQuery)
          .then((sources) => {
            const allSources = [...sourcesInfo];
            sources.forEach((source) => {
              if (
                !(source.source === currentSource && source.id === currentId)
              ) {
                allSources.push(source);
              }
            });
            // 🛡️ 过滤掉已标记无效的源，防止死循环
            const filteredAllSources = filterInvalidSources(allSources);
            setAvailableSources(filteredAllSources);
            return filteredAllSources;
          })
          .catch((err) => {
            console.error('异步获取其他源失败:', err);
            return [...sourcesInfo];
          })
          .finally(() => {
            setBackgroundSourcesLoading(false);
          });

        if (!detailData) {
          const otherSources = await otherSourcesPromise;
          if (otherSources.length > 0) {
            console.warn(
              '[Play] 当前指定源详情失效，自动回退到搜索到的其他可用源',
            );
            sourcesInfo = otherSources;
            detailData = otherSources[0];
          }
        } else {
          void otherSourcesPromise;
        }

        if (!detailData && sourcesInfo.length > 0) {
          console.warn(
            '[Play] 当前指定源详情失效，自动回退到搜索到的其他可用源',
          );
          detailData = sourcesInfo[0];
        }
      } else {
        // 没有source和id，正常搜索流程
        sourcesInfo = await fetchSourcesData(searchTitle || videoTitle);
      }

      if (!detailData && sourcesInfo.length === 0) {
        setError(
          currentSource && currentId
            ? '当前线路已失效，且未找到其他严格匹配的可用线路'
            : videoDoubanIdRef.current && videoDoubanIdRef.current > 0
              ? '该影片尚未上映或暂无播放源'
              : '未找到严格匹配结果',
        );
        setReadyLoading();
        return;
      }

      if (!detailData) {
        detailData = sourcesInfo[0];
      }
      // 指定源和id且无需优选
      if (currentSource && currentId && !needPreferRef.current) {
        const target = sourcesInfo.find(
          (source) =>
            source.source === currentSource && source.id === currentId,
        );
        if (target) {
          detailData = target;

          // 如果是 emby 源且 episodes 为空，需要调用 detail 接口获取完整信息
          if (
            (detailData.source === 'emby' ||
              detailData.source.startsWith('emby_')) &&
            (!detailData.episodes || detailData.episodes.length === 0)
          ) {
            // // console.log(
            // '[Play] Emby source has no episodes, fetching detail...',
            // );
            const detailSources = await fetchSourceDetail(
              currentSource,
              currentId,
              searchTitle || videoTitle,
            );
            if (detailSources.length > 0) {
              detailData = detailSources[0];
            }
          }
        } else {
          // 兼容场景：当前源详情已拿到，但全源搜索未返回当前 source/id 时，继续使用当前详情播放
          if (
            detailData &&
            detailData.source === currentSource &&
            detailData.id === currentId
          ) {
            console.warn(
              '[Play] 当前源详情已存在，但全源搜索未命中当前 source/id，回退使用当前详情',
            );
          } else if (hasSearchFallbackContext && sourcesInfo.length > 0) {
            console.warn(
              '[Play] 当前 source/id 未命中，使用回退候选源进入优选流程',
            );
            needPreferRef.current = true;
            setNeedPrefer(true);
          } else {
            if (sourcesInfo.length > 0) {
              console.warn('[Play] 当前 source/id 未命中，直接进入优选回退');
              needPreferRef.current = true;
              setNeedPrefer(true);
            } else {
              setError('当前线路已失效，且未找到其他严格匹配的可用线路');
              setReadyLoading();
              return;
            }
          }
        }
      }

      // 未指定源和 id 或需要优选，且开启优选开关
      if (
        (!currentSource || !currentId || needPreferRef.current) &&
        optimizationEnabled
      ) {
        setLoadingStage('preferring', '⚡ 正在优选最佳播放源...');

        // 过滤掉 emby 源，它们不参与测速
        const sourcesToTest = sourcesInfo.filter((s) => {
          // 检查是否为 emby 源（包括 emby 和 emby_xxx 格式）
          if (s.source === 'emby' || s.source.startsWith('emby_')) return false;
          return true;
        });

        const excludedSources = sourcesInfo.filter(
          (s) => s.source === 'emby' || s.source.startsWith('emby_'),
        );

        if (sourcesToTest.length > 0) {
          detailData = await preferBestSource(sourcesToTest);
        } else if (excludedSources.length > 0) {
          // 如果只有 emby 源，直接使用第一个
          detailData = excludedSources[0];
        } else {
          detailData = sourcesInfo[0];
        }
      }

      if (!detailData) {
        if (sourcesInfo.length > 0) {
          detailData = sourcesInfo[0];
        } else {
          setError(
            currentSource && currentId
              ? '当前线路已失效，且未找到其他严格匹配的可用线路'
              : '未找到严格匹配结果',
          );
          setReadyLoading();
          return;
        }
      }

      // // console.log(detailData.source, detailData.id);

      // 如果是 emby 源且 episodes 为空，需要调用 detail 接口获取完整信息
      if (
        (detailData.source === 'emby' ||
          detailData.source.startsWith('emby_')) &&
        (!detailData.episodes || detailData.episodes.length === 0)
      ) {
        // // console.log('[Play] Emby source has no episodes, fetching detail...');
        const detailSources = await fetchSourceDetail(
          detailData.source,
          detailData.id,
          detailData.title || videoTitleRef.current,
        );
        if (detailSources.length > 0) {
          detailData = detailSources[0];
        }
      }

      setNeedPrefer(false);
      setCurrentSource(detailData.source);
      setCurrentId(detailData.id);
      setVideoYear(detailData.year);
      setVideoTitle(detailData.title || videoTitleRef.current);
      setSearchTitle(
        searchTitle || videoTitleRef.current || detailData.title || '',
      );
      setVideoCover(resolveCardPosterUrl(detailData.poster));
      // 优先保留URL参数中的豆瓣ID，如果URL中没有则使用详情数据中的
      setVideoDoubanId(videoDoubanIdRef.current || detailData.douban_id || 0);
      setDetail(detailData);
      const resolvedEpisodeIndex =
        currentEpisodeIndex >= detailData.episodes.length
          ? 0
          : currentEpisodeIndex;
      if (resolvedEpisodeIndex !== currentEpisodeIndex) {
        setCurrentEpisodeIndex(resolvedEpisodeIndex);
      }

      // 规范URL参数
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.set('source', detailData.source);
      newUrl.searchParams.set('id', detailData.id);
      newUrl.searchParams.set('year', detailData.year);
      newUrl.searchParams.set('title', detailData.title);
      newUrl.searchParams.set('index', resolvedEpisodeIndex.toString());
      if (searchTitle || videoTitleRef.current || detailData.title) {
        newUrl.searchParams.set(
          'stitle',
          searchTitle || videoTitleRef.current || detailData.title,
        );
      }
      newUrl.searchParams.delete('prefer');
      newUrl.searchParams.delete('_reload');
      // Fix: Only call replaceState if URL actually changed (prevents unnecessary router updates)
      const newUrlStr = newUrl.toString();
      if (newUrlStr !== window.location.href) {
        // Fix: Use __NA flag to bypass Next.js router interception (prevents infinite remount loop)
        window.history.replaceState({ __NA: true }, '', newUrlStr);
      }

      setLoadingStage('ready', '✨ 准备就绪，即将开始播放...');

      // 短暂延迟让用户看到完成状态
      setTimeout(() => {
        setReadyLoading();
      }, 1000);
    };

    initAll();

    return () => {
      abortController.abort();
    };
  }, [reloadTrigger]); // 添加 reloadTrigger 作为依赖，当它变化时重新执行 initAll

  // 播放记录处理

  useEffect(() => {
    const initFromHistory = async () => {
      if (!currentSource || !currentId) return;

      const explicitIndex = searchParams.get('index');
      const explicitTime = searchParams.get('t') || searchParams.get('time');
      const hasExplicitPlaybackState =
        explicitIndex !== null || explicitTime !== null;

      // 🔥 关键修复：优先检查 sessionStorage 中的临时进度（换源时保存的）
      const tempProgressKey = `temp_progress_${currentSource}_${currentId}_${currentEpisodeIndex}`;
      const tempProgress = sessionStorage.getItem(tempProgressKey);

      if (tempProgress) {
        const savedTime = parseFloat(tempProgress);
        if (savedTime > 1) {
          resumeTimeRef.current = savedTime;
          // // console.log(
          // `🎯 从 sessionStorage 恢复换源前的播放进度: ${savedTime.toFixed(2)}s`,
          // );
          // 立即清除临时进度，避免重复恢复
          sessionStorage.removeItem(tempProgressKey);
          return; // 优先使用临时进度，不再读取历史记录
        }
      }

      try {
        const allRecords = await cachedGetAllPlayRecords();
        const key = generateStorageKey(currentSource, currentId);
        const record = allRecords[key];

        if (record) {
          if (hasExplicitPlaybackState) {
            return;
          }

          const maxIndex = Math.max(
            (detailRef.current?.episodes?.length || 1) - 1,
            0,
          );
          const targetIndex = Math.min(Math.max(record.index - 1, 0), maxIndex);
          const targetTime = record.play_time;

          // 更新当前选集索引
          if (targetIndex !== currentEpisodeIndex) {
            setCurrentEpisodeIndex(targetIndex);
          }

          // 保存待恢复的播放进度，待播放器就绪后跳转
          resumeTimeRef.current = targetTime;
        }
      } catch (err) {
        console.error('读取播放记录失败:', err);
      }
    };

    initFromHistory();
  }, [currentSource, currentId, currentEpisodeIndex, searchParams]);

  // 🚀 组件卸载时清理所有定时器和状态
  useEffect(() => {
    return () => {
      // 清理所有定时器
      if (episodeSwitchTimeoutRef.current) {
        clearTimeout(episodeSwitchTimeoutRef.current);
      }
      if (sourceSwitchTimeoutRef.current) {
        clearTimeout(sourceSwitchTimeoutRef.current);
      }

      // 重置状态
      isSourceChangingRef.current = false;
      switchPromiseRef.current = null;
    };
  }, []);

  // ---------------------------------------------------------------------------
  // 播放记录相关
  // ---------------------------------------------------------------------------
  // 保存播放进度
  const saveCurrentPlayProgress = async () => {
    if (
      !artPlayerRef.current ||
      !currentSourceRef.current ||
      !currentIdRef.current ||
      !videoTitleRef.current ||
      !detailRef.current?.source_name
    ) {
      return;
    }

    const player = artPlayerRef.current;
    const currentTime = player.currentTime || 0;
    const duration = player.duration || 0;

    // 如果播放时间太短（少于5秒）或者视频时长无效，不保存
    if (currentTime < 1 || !duration) {
      return;
    }

    try {
      // 获取现有播放记录以保持原始集数
      const existingRecord = await cachedGetAllPlayRecords()
        .then((records) => {
          const key = generateStorageKey(
            currentSourceRef.current,
            currentIdRef.current,
          );
          return records[key];
        })
        .catch(() => null);

      const currentTotalEpisodes = detailRef.current?.episodes.length || 1;

      // 尝试从换源列表中获取更准确的 remarks（搜索接口比详情接口更可能有 remarks）
      const sourceFromList = availableSourcesRef.current?.find(
        (s) =>
          s.source === currentSourceRef.current &&
          s.id === currentIdRef.current,
      );
      const remarksToSave =
        sourceFromList?.remarks || detailRef.current?.remarks;

      savePlayRecordMutation.mutate({
        source: currentSourceRef.current,
        id: currentIdRef.current,
        record: {
          title: videoTitleRef.current,
          source_name: detailRef.current?.source_name || '',
          year: detailRef.current?.year,
          cover: resolveCardPosterUrl(detailRef.current?.poster),
          index: currentEpisodeIndexRef.current + 1,
          total_episodes: currentTotalEpisodes,
          original_episodes: existingRecord?.original_episodes,
          play_time: Math.floor(currentTime),
          total_time: Math.floor(duration),
          save_time: Date.now(),
          search_title: searchTitle,
          remarks: remarksToSave,
          douban_id:
            videoDoubanIdRef.current ||
            detailRef.current?.douban_id ||
            undefined,
          type: searchType || undefined,
        },
      });

      lastSaveTimeRef.current = Date.now();
      // // console.log('播放进度已保存:', {
      // title: videoTitleRef.current,
      // episode: currentEpisodeIndexRef.current + 1,
      // year: detailRef.current?.year,
      // progress: `${Math.floor(currentTime)}/${Math.floor(duration)}`,
      // });
    } catch (err) {
      console.error('保存播放进度失败:', err);
    }
  };

  // ---------------------------------------------------------------------------
  // 集数切换
  // ---------------------------------------------------------------------------
  const { handleEpisodeChange, handlePreviousEpisode, handleNextEpisode } =
    useEpisodeHandlers({
      artPlayerRef,
      detailRef,
      currentEpisodeIndexRef,
      currentSourceRef,
      currentIdRef,
      saveCurrentPlayProgress,
      setCurrentEpisodeIndex,
      totalEpisodes,
      isSkipControllerTriggeredRef,
      resumeTimeRef,
    });

  // 键盘快捷键
  useKeyboardShortcuts({
    artPlayerRef,
    detailRef,
    currentEpisodeIndexRef,
    handlePreviousEpisode,
    handleNextEpisode,
    setShowShortcutsHelp,
    showShortcutsHelp,
  });

  useEffect(() => {
    // 页面即将卸载时保存播放进度和清理资源
    const handleBeforeUnload = () => {
      saveCurrentPlayProgress();
      releaseWakeLock();
      cleanupPlayer(); // 不await，让它异步执行
    };

    // 页面可见性变化时保存播放进度和释放 Wake Lock
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        saveCurrentPlayProgress();
        releaseWakeLock();
      } else if (document.visibilityState === 'visible') {
        // 页面重新可见时，如果正在播放则重新请求 Wake Lock
        if (artPlayerRef.current && !artPlayerRef.current.paused) {
          requestWakeLock();
        }
      }
    };

    // 添加事件监听器
    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      // 清理事件监听器
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [currentEpisodeIndex, detail, artPlayerRef.current]);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (saveIntervalRef.current) {
        clearInterval(saveIntervalRef.current);
      }
    };
  }, []);

  // ---------------------------------------------------------------------------
  // 收藏相关
  // ---------------------------------------------------------------------------
  const { favorited, favoritedKeyRef, handleToggleFavorite } = useFavorites({
    currentSource,
    currentId,
    videoDoubanId,
    shortdramaId,
    videoTitleRef,
    videoYearRef,
    videoCover,
    detail,
    searchTitle,
    saveFavoriteMutation,
    deleteFavoriteMutation,
  });

  useEffect(() => {
    // 异步初始化播放器，避免SSR问题
    const initPlayer = async () => {
      if (
        !videoUrl ||
        loading ||
        currentEpisodeIndex === null ||
        !artRef.current
      ) {
        return;
      }

      // 确保选集索引有效
      if (
        !detail ||
        !detail.episodes ||
        currentEpisodeIndex >= detail.episodes.length ||
        currentEpisodeIndex < 0
      ) {
        setError(`选集索引无效，当前共 ${totalEpisodes} 集`);
        return;
      }

      if (!videoUrl) {
        setError('视频地址无效');
        return;
      }
      // // console.log(videoUrl);

      // 检测移动设备和浏览器类型 - 使用统一的全局检测结果
      const isIOS = isIOSGlobal;
      const isIOS13 = isIOS13Global;
      const isMobile = isMobileGlobal;
      // Chrome浏览器检测 - 只有真正的Chrome才支持Chromecast
      // 排除各种厂商浏览器，即使它们的UA包含Chrome字样
      const isChrome =
        /Chrome/i.test(userAgent) &&
        !/Edg/i.test(userAgent) && // 排除Edge
        !/OPR/i.test(userAgent) && // 排除Opera
        !/SamsungBrowser/i.test(userAgent) && // 排除三星浏览器
        !/OPPO/i.test(userAgent) && // 排除OPPO浏览器
        !/OppoBrowser/i.test(userAgent) && // 排除OppoBrowser
        !/HeyTapBrowser/i.test(userAgent) && // 排除HeyTapBrowser (OPPO新版浏览器)
        !/OnePlus/i.test(userAgent) && // 排除OnePlus浏览器
        !/Xiaomi/i.test(userAgent) && // 排除小米浏览器
        !/MIUI/i.test(userAgent) && // 排除MIUI浏览器
        !/Huawei/i.test(userAgent) && // 排除华为浏览器
        !/Vivo/i.test(userAgent) && // 排除Vivo浏览器
        !/UCBrowser/i.test(userAgent) && // 排除UC浏览器
        !/QQBrowser/i.test(userAgent) && // 排除QQ浏览器
        !/Baidu/i.test(userAgent) && // 排除百度浏览器
        !/SogouMobileBrowser/i.test(userAgent); // 排除搜狗浏览器

      // 调试信息：输出设备检测结果和投屏策略
      // // console.log('🔍 设备检测结果:', {
      // userAgent,
      // isIOS,
      // isSafari,
      // isMobile,
      // isWebKit,
      // isChrome,
      // AirPlay按钮: isIOS || isSafari ? '✅ 显示' : '❌ 隐藏',
      // Chromecast按钮: isChrome && !isIOS ? '✅ 显示' : '❌ 隐藏',
      // 投屏策略:
      // isIOS || isSafari
      // ? '🍎 AirPlay (WebKit)'
      // : isChrome
      // ? '📺 Chromecast (Cast API)'
      // : '❌ 不支持投屏',
      // });

      // 🚀 优化连续切换：防抖机制 + 资源管理
      if (artPlayerRef.current && !loading) {
        try {
          // 清除之前的切换定时器
          if (sourceSwitchTimeoutRef.current) {
            clearTimeout(sourceSwitchTimeoutRef.current);
            sourceSwitchTimeoutRef.current = null;
          }

          // 如果有正在进行的切换，先取消
          if (switchPromiseRef.current) {
            // // console.log('⏸️ 取消前一个切换操作，开始新的切换');
            // ArtPlayer没有提供取消机制，但我们可以忽略旧的结果
            switchPromiseRef.current = null;
          }

          // 保存弹幕状态
          if (artPlayerRef.current?.plugins?.artplayerPluginDanmuku) {
            danmuPluginStateRef.current = {
              isHide:
                artPlayerRef.current.plugins.artplayerPluginDanmuku.isHide,
              isStop:
                artPlayerRef.current.plugins.artplayerPluginDanmuku.isStop,
              option:
                artPlayerRef.current.plugins.artplayerPluginDanmuku.option,
            };
          }

          // 🚀 关键修复：区分换源和切换集数
          const isEpisodeChange = isEpisodeChangingRef.current;
          const currentTime = artPlayerRef.current.currentTime || 0;

          // 在切换前从 localStorage 重新读取播放速率，确保使用最新保存的值
          const savedPlaybackRate = loadPlaybackRate();
          lastPlaybackRateRef.current = savedPlaybackRate;

          let switchPromise: Promise<any>;
          if (isEpisodeChange) {
            // // console.log(`🎯 开始切换集数: ${videoUrl} (重置播放时间到0)`);
            // 切换集数时重置播放时间到0
            switchPromise = artPlayerRef.current.switchUrl(videoUrl);
          } else {
            // // console.log(
            // `🎯 开始切换源: ${videoUrl} (保持进度: ${currentTime.toFixed(2)}s)`,
            // );
            // 换源时保持播放进度
            switchPromise = artPlayerRef.current.switchQuality(videoUrl);
          }

          // 创建切换Promise
          switchPromise = switchPromise
            .then(() => {
              // 只有当前Promise还是活跃的才执行后续操作
              if (switchPromiseRef.current === switchPromise) {
                artPlayerRef.current.title = `${videoTitle} - 第${currentEpisodeIndex + 1}集`;
                artPlayerRef.current.poster = videoCover;

                // 🔥 重置集数切换标识
                if (isEpisodeChange) {
                  // 🔑 关键修复：切换集数后显式重置播放时间为 0，确保片头自动跳过能触发
                  artPlayerRef.current.currentTime = 0;
                  isEpisodeChangingRef.current = false;
                }
              }
            })
            .catch((error: any) => {
              if (switchPromiseRef.current === switchPromise) {
                console.warn('⚠️ 源切换失败，将重建播放器:', error);
                // 重置集数切换标识
                if (isEpisodeChange) {
                  isEpisodeChangingRef.current = false;
                }
                throw error; // 让外层catch处理
              }
            });

          switchPromiseRef.current = switchPromise;
          await switchPromise;

          // 切换后立即恢复播放速率，防止被重置
          if (artPlayerRef.current) {
            artPlayerRef.current.playbackRate = savedPlaybackRate;
            // 恢复倍速时显示提示
            if (savedPlaybackRate !== 1.0 && artPlayerRef.current.notice) {
              artPlayerRef.current.notice.show = `已恢复 ${savedPlaybackRate}x 倍速`;
            }
          }

          if (artPlayerRef.current?.video) {
            ensureVideoSource(
              artPlayerRef.current.video as HTMLVideoElement,
              videoUrl,
            );
          }

          // 🚀 移除原有的 setTimeout 弹幕加载逻辑，交由 useEffect 统一优化处理

          // // console.log('使用switch方法成功切换视频');
          return;
        } catch (error) {
          console.warn('Switch方法失败，将重建播放器:', error);
          // 重置集数切换标识
          isEpisodeChangingRef.current = false;
          // 如果switch失败，清理播放器并重新创建
          await cleanupPlayer();
        }
      }
      if (artPlayerRef.current) {
        await cleanupPlayer();
      }

      // 确保 DOM 容器完全清空，避免多实例冲突
      if (artRef.current) {
        artRef.current.innerHTML = '';
      }

      try {
        // 使用动态导入的 Artplayer
        const Artplayer = (window as any).DynamicArtplayer;
        const artplayerPluginDanmuku = (window as any)
          .DynamicArtplayerPluginDanmuku;

        // 创建新的播放器实例
        Artplayer.PLAYBACK_RATE = [0.5, 0.75, 1, 1.25, 1.5, 2, 3];
        Artplayer.USE_RAF = false;
        Artplayer.FULLSCREEN_WEB_IN_BODY = true;
        // 重新启用5.3.0内存优化功能，但使用false参数避免清空DOM
        Artplayer.REMOVE_SRC_WHEN_DESTROY = true;

        artPlayerRef.current = new Artplayer({
          container: artRef.current,
          url: videoUrl,
          poster: videoCover,
          volume: 0.7,
          isLive: false,
          // iOS设备需要静音才能自动播放，参考ArtPlayer源码处理
          muted: isIOS || isSafari,
          autoplay: true,
          pip: true,
          autoSize: false,
          autoMini: false,
          screenshot: !isMobile, // 桌面端启用截图功能
          setting: true,
          loop: false,
          flip: true,
          playbackRate: true,
          aspectRatio: true,
          fullscreen: true,
          fullscreenWeb: true,
          subtitleOffset: false,
          miniProgressBar: true,
          mutex: true,
          playsInline: true,
          autoPlayback: true,
          theme: '#22c55e',
          lang: 'zh-cn',
          hotkey: false,
          fastForward: true,
          autoOrientation: true,
          lock: true,
          // AirPlay 仅在支持 WebKit API 的浏览器中启用
          // 主要是 Safari (桌面和移动端) 和 iOS 上的其他浏览器
          airplay: isIOS || isSafari,
          moreVideoAttr: {
            crossOrigin: 'anonymous',
          },
          // HLS 支持配置
          customType: {
            m3u8: async function (video: HTMLVideoElement, url: string) {
              const canUseNativeHls =
                typeof video.canPlayType === 'function' &&
                video.canPlayType('application/vnd.apple.mpegurl') !== '';

              if (canUseNativeHls) {
                video.src = url;
                ensureVideoSource(video, url);
                return;
              }

              const HlsModule = await getHlsModule();
              if (!HlsModule || !HlsModule.isSupported()) {
                console.error('当前浏览器不支持 HLS 播放');
                return;
              }

              if (video.hls) {
                video.hls.destroy();
              }

              // 在函数内部重新检测iOS13+设备
              const localIsIOS13 = isIOS13;

              // 获取用户的缓冲模式配置
              const bufferConfig = getHlsBufferConfig();

              // CustomHlsJsLoader - 拦截manifest请求以过滤广告
              class CustomHlsJsLoader extends HlsModule.DefaultConfig.loader {
                constructor(config: any) {
                  super(config);
                  const load = this.load.bind(this);
                  this.load = function (
                    context: any,
                    config: any,
                    callbacks: any,
                  ) {
                    if (
                      (context as any).type === 'manifest' ||
                      (context as any).type === 'level'
                    ) {
                      const onSuccess = callbacks.onSuccess;
                      callbacks.onSuccess = function (
                        response: any,
                        stats: any,
                        ctx: any,
                      ) {
                        if (
                          response.data &&
                          typeof response.data === 'string'
                        ) {
                          response.data = filterAdsFromM3U8(response.data);
                        }
                        return onSuccess(response, stats, ctx, null);
                      };
                    }
                    load(context, config, callbacks);
                  };
                }
              }

              // 🚀 根据 HLS.js 官方源码的最佳实践配置
              const hls = new HlsModule({
                debug: false,
                enableWorker: true,
                // 参考 HLS.js config.ts：移动设备关闭低延迟模式以节省资源
                lowLatencyMode: !isMobile,
                // CORS配置：允许跨域请求
                xhrSetup: (xhr: XMLHttpRequest) => {
                  xhr.withCredentials = false;
                },

                // 🎯 官方推荐的缓冲策略 - iOS13+ 特别优化
                /* 缓冲长度配置 - 参考 hlsDefaultConfig - 桌面设备应用用户配置 */
                maxBufferLength: isMobile
                  ? localIsIOS13
                    ? 8
                    : isIOS
                      ? 10
                      : 15 // iOS13+: 8s, iOS: 10s, Android: 15s
                  : bufferConfig.maxBufferLength, // 桌面使用用户配置
                backBufferLength: isMobile
                  ? localIsIOS13
                    ? 5
                    : isIOS
                      ? 8
                      : 10 // iOS13+更保守
                  : bufferConfig.backBufferLength, // 桌面使用用户配置

                /* 缓冲大小配置 - 基于官方 maxBufferSize - 桌面设备应用用户配置 */
                maxBufferSize: isMobile
                  ? localIsIOS13
                    ? 20 * 1000 * 1000
                    : isIOS
                      ? 30 * 1000 * 1000
                      : 40 * 1000 * 1000 // iOS13+: 20MB, iOS: 30MB, Android: 40MB
                  : bufferConfig.maxBufferSize, // 桌面使用用户配置

                /* 网络加载优化 - 参考 defaultLoadPolicy */
                maxLoadingDelay: isMobile ? (localIsIOS13 ? 2 : 3) : 4, // iOS13+设备更快超时
                maxBufferHole: isMobile ? (localIsIOS13 ? 0.05 : 0.1) : 0.1, // 减少缓冲洞容忍度

                /* Fragment管理 - 参考官方配置 */
                liveDurationInfinity: false, // 避免无限缓冲 (官方默认false)
                liveBackBufferLength: isMobile ? (localIsIOS13 ? 3 : 5) : null, // 已废弃，保持兼容

                /* 高级优化配置 - 参考 StreamControllerConfig */
                maxMaxBufferLength: isMobile ? (localIsIOS13 ? 60 : 120) : 600, // 最大缓冲长度限制
                maxFragLookUpTolerance: isMobile ? 0.1 : 0.25, // 片段查找容忍度

                /* ABR优化 - 参考 ABRControllerConfig */
                abrEwmaFastLive: isMobile ? 2 : 3, // 移动端更快的码率切换
                abrEwmaSlowLive: isMobile ? 6 : 9,
                abrBandWidthFactor: isMobile ? 0.8 : 0.95, // 移动端更保守的带宽估计

                /* 启动优化 */
                startFragPrefetch: !isMobile, // 移动端关闭预取以节省资源
                testBandwidth: !localIsIOS13, // iOS13+关闭带宽测试以快速启动

                /* Loader配置 - 参考官方 fragLoadPolicy */
                fragLoadPolicy: {
                  default: {
                    maxTimeToFirstByteMs: isMobile ? 6000 : 10000,
                    maxLoadTimeMs: isMobile ? 60000 : 120000,
                    timeoutRetry: {
                      maxNumRetry: isMobile ? 2 : 4,
                      retryDelayMs: 0,
                      maxRetryDelayMs: 0,
                    },
                    errorRetry: {
                      maxNumRetry: isMobile ? 3 : 6,
                      retryDelayMs: 1000,
                      maxRetryDelayMs: isMobile ? 4000 : 8000,
                    },
                  },
                },

                /* 自定义loader */
                loader: blockAdEnabledRef.current
                  ? CustomHlsJsLoader
                  : HlsModule.DefaultConfig.loader,
              });

              hls.loadSource(url);
              hls.attachMedia(video);
              video.hls = hls;

              ensureVideoSource(video, url);

              // HLS音轨事件监听
              hls.on(
                HlsModule.Events.AUDIO_TRACKS_UPDATED,
                (_event: any, data: any) => {
                  const nextTracks = (
                    Array.isArray(data?.audioTracks)
                      ? data.audioTracks
                      : Array.isArray(hls.audioTracks)
                        ? hls.audioTracks
                        : []
                  ) as Array<{
                    id?: number;
                    name?: string;
                    lang?: string;
                    default?: boolean;
                  }>;

                  if (nextTracks.length < 2) {
                    resetAudioTrackState();
                    return;
                  }

                  const mappedTracks = nextTracks.map((track, index) => ({
                    index:
                      typeof track.id === 'number' && Number.isFinite(track.id)
                        ? track.id
                        : index,
                    name: resolveAudioTrackName(track.name, track.lang, index),
                    language: track.lang,
                    isDefault: Boolean(track.default),
                    hlsIndex: index,
                  }));

                  setAudioTracks(mappedTracks);

                  const activeHlsIndex =
                    typeof hls.audioTrack === 'number' && hls.audioTrack >= 0
                      ? hls.audioTrack
                      : (mappedTracks.find((t) => t.isDefault)?.hlsIndex ??
                        mappedTracks[0].hlsIndex ??
                        -1);

                  setCurrentAudioTrack(activeHlsIndex);

                  // 应用用户偏好
                  const preferredLang = loadPreferredAudioLang();
                  if (preferredLang) {
                    const preferredTrack = mappedTracks.find(
                      (t) => normalizeAudioLang(t.language) === preferredLang,
                    );
                    if (
                      preferredTrack &&
                      typeof preferredTrack.hlsIndex === 'number' &&
                      preferredTrack.hlsIndex !== activeHlsIndex
                    ) {
                      hls.audioTrack = preferredTrack.hlsIndex;
                    }
                  }
                },
              );

              hls.on(
                HlsModule.Events.AUDIO_TRACK_SWITCHED,
                (_event: any, data: any) => {
                  const switchedIndex =
                    typeof data?.id === 'number' && data.id >= 0
                      ? data.id
                      : hls.audioTrack;
                  setCurrentAudioTrack(switchedIndex);

                  const switchedTrack = audioTracksRef.current.find(
                    (t) => t.hlsIndex === switchedIndex,
                  );
                  savePreferredAudioLang(switchedTrack?.language);
                },
              );

              hls.on(HlsModule.Events.ERROR, function (event: any, data: any) {
                console.error('HLS Error:', event, data);

                // v1.6.15 改进：优化了播放列表末尾空片段/间隙处理，改进了音频TS片段duration处理
                // v1.6.13 增强：处理片段解析错误（针对initPTS修复）
                if (
                  data.details === HlsModule.ErrorDetails.FRAG_PARSING_ERROR
                ) {
                  // // console.log('片段解析错误，尝试重新加载...');
                  // 重新开始加载，利用v1.6.13的initPTS修复
                  hls.startLoad();
                  return;
                }

                // v1.6.13 增强：处理时间戳相关错误（直播回搜修复）
                if (
                  data.details === HlsModule.ErrorDetails.BUFFER_APPEND_ERROR &&
                  data.err &&
                  data.err.message &&
                  data.err.message.includes('timestamp')
                ) {
                  // // console.log('时间戳错误，清理缓冲区并重新加载...');
                  try {
                    // 清理缓冲区后重新开始，利用v1.6.13的时间戳包装修复
                    const currentTime = video.currentTime;
                    hls.trigger(HlsModule.Events.BUFFER_RESET, undefined);
                    hls.startLoad(currentTime);
                  } catch (e) {
                    console.warn('缓冲区重置失败:', e);
                    hls.startLoad();
                  }
                  return;
                }

                if (data.fatal) {
                  switch (data.type) {
                    case HlsModule.ErrorTypes.NETWORK_ERROR:
                      // // console.log('网络错误，尝试恢复...');
                      hls.startLoad();
                      break;
                    case HlsModule.ErrorTypes.MEDIA_ERROR:
                      // // console.log('媒体错误，尝试恢复...');
                      hls.recoverMediaError();
                      break;
                    default:
                      // // console.log('无法恢复的错误，标记源无效');
                      // 标记当前源为无效，触发 ArtPlayer error 事件进行换源
                      const hlsFailSource = currentSourceRef.current;
                      const hlsFailId = currentIdRef.current;
                      if (hlsFailSource && hlsFailId) {
                        markSourceFailed(
                          getSourceIdentityKey(hlsFailSource, hlsFailId),
                        );
                      }
                      hls.destroy();
                      break;
                  }
                }
              });
            },
          },
          icons: {
            loading:
              '<img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI1MCIgaGVpZ2h0PSI1MCIgdmlld0JveD0iMCAwIDUwIDUwIj48cGF0aCBkPSJNMjUuMjUxIDYuNDYxYy0xMC4zMTggMC0xOC42ODMgOC4zNjUtMTguNjgzIDE4LjY4M2g0LjA2OGMwLTguMDcgNi41NDUtMTQuNjE1IDE0LjYxNS0xNC42MTVWNi40NjF6IiBmaWxsPSIjMDA5Njg4Ij48YW5pbWF0ZVRyYW5zZm9ybSBhdHRyaWJ1dGVOYW1lPSJ0cmFuc2Zvcm0iIGF0dHJpYnV0ZVR5cGU9IlhNTCIgZHVyPSIxcyIgZnJvbT0iMCAyNSAyNSIgcmVwZWF0Q291bnQ9ImluZGVmaW5pdGUiIHRvPSIzNjAgMjUgMjUiIHR5cGU9InJvdGF0ZSIvPjwvcGF0aD48L3N2Zz4=">',
          },
          settings: [
            {
              html: '去广告',
              icon: '<text x="50%" y="50%" font-size="20" font-weight="bold" text-anchor="middle" dominant-baseline="middle" fill="#ffffff">AD</text>',
              tooltip: blockAdEnabled ? '已开启' : '已关闭',
              onClick() {
                const newVal = !blockAdEnabled;
                try {
                  localStorage.setItem('enable_blockad', String(newVal));
                  if (artPlayerRef.current) {
                    resumeTimeRef.current = artPlayerRef.current.currentTime;
                    if (artPlayerRef.current.video.hls) {
                      artPlayerRef.current.video.hls.destroy();
                    }
                    artPlayerRef.current.destroy(false);
                    artPlayerRef.current = null;
                  }
                  setBlockAdEnabled(newVal);
                } catch (_) {
                  // ignore
                }
                return newVal ? '当前开启' : '当前关闭';
              },
            },
            {
              name: '外部弹幕',
              html: '外部弹幕',
              icon: '<text x="50%" y="50%" font-size="14" font-weight="bold" text-anchor="middle" dominant-baseline="middle" fill="#ffffff">外</text>',
              tooltip: externalDanmuEnabled
                ? '外部弹幕已开启'
                : '外部弹幕已关闭',
              switch: externalDanmuEnabled,
              onSwitch: function (item: any) {
                const nextState = !item.switch;

                // 🚀 使用优化后的弹幕操作处理函数
                handleDanmuOperationOptimized(nextState);

                // 更新tooltip显示
                item.tooltip = nextState ? '外部弹幕已开启' : '外部弹幕已关闭';

                return nextState; // 立即返回新状态
              },
            },
            {
              name: '弹幕设置',
              html: '弹幕设置',
              tooltip: '打开弹幕设置面板',
              icon: '<text x="50%" y="50%" font-size="14" font-weight="bold" text-anchor="middle" dominant-baseline="middle" fill="#ffffff">弹</text>',
              // 🎨 点击式按钮，打开美化的弹幕设置面板
              onClick: function () {
                setIsDanmuSettingsPanelOpen(true);
                // 关闭settings菜单
                if (artPlayerRef.current) {
                  artPlayerRef.current.setting.show = false;
                }
                // ✅ 必须返回tooltip文本，否则ArtPlayer会设置为undefined
                return '打开弹幕设置面板';
              },
            },
            {
              width: 200,
              html: '显示模式',
              icon: '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>',
              tooltip: (() => {
                const mode =
                  localStorage.getItem('video_object_fit') || 'contain';
                const modeNames: Record<string, string> = {
                  contain: '默认(完整显示)',
                  cover: '填充(裁切)',
                  fill: '拉伸(变形)',
                };
                return modeNames[mode] || '默认(完整显示)';
              })(),
              selector: [
                {
                  html: '默认(完整显示)',
                  value: 'contain',
                  default:
                    (localStorage.getItem('video_object_fit') || 'contain') ===
                    'contain',
                },
                {
                  html: '填充(裁切)',
                  value: 'cover',
                  default: localStorage.getItem('video_object_fit') === 'cover',
                },
                {
                  html: '拉伸(变形)',
                  value: 'fill',
                  default: localStorage.getItem('video_object_fit') === 'fill',
                },
              ],
              onSelect: function (item: any) {
                const mode = item.value;
                localStorage.setItem('video_object_fit', mode);

                // 应用到当前视频元素
                if (artPlayerRef.current?.video) {
                  artPlayerRef.current.video.style.objectFit = mode;
                }

                const modeNames: Record<string, string> = {
                  contain: '默认(完整显示)',
                  cover: '填充(裁切)',
                  fill: '拉伸(变形)',
                };

                return modeNames[mode] || item.html;
              },
            },
            ...(webGPUSupported
              ? [
                  {
                    name: '超分设置',
                    html: '超分设置',
                    icon: '<text x="50%" y="50%" font-size="14" font-weight="bold" text-anchor="middle" dominant-baseline="middle" fill="#ffffff">超</text>',
                    tooltip: '打开AI超分设置面板',
                    onClick: function () {
                      setIsWebSRSettingsPanelOpen(true);
                      if (artPlayerRef.current) {
                        artPlayerRef.current.setting.show = false;
                      }
                      return '打开AI超分设置面板';
                    },
                  },
                ]
              : []),
          ],
          // 控制栏配置
          controls: [
            {
              position: 'left',
              index: 13,
              html: '<i class="art-icon flex hint--top" aria-label="播放下一集"><svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" fill="currentColor"/></svg></i>',
              tooltip: '播放下一集',
              click: function () {
                handleNextEpisode();
              },
            },
            // 🚀 简单弹幕发送按钮（移动端和Web端均显示）
            [
              {
                position: 'right',
                html: '<span class="hint--top" aria-label="发送弹幕">弹</span>',
                tooltip: '发送弹幕',
                click: async function () {
                  if (artPlayerRef.current?.plugins?.artplayerPluginDanmuku) {
                    const text = await new Promise<string | null>((resolve) => {
                      const input = document.createElement('input');
                      input.type = 'text';
                      input.placeholder = '发送弹幕...';
                      input.maxLength = 100;
                      input.className = 'danmaku-mobile-input';
                      input.style.cssText =
                        'position:fixed;bottom:calc(80px + env(safe-area-inset-bottom));left:50%;transform:translateX(-50%);width:calc(100vw - 40px);max-width:400px;padding:12px 16px;border-radius:12px;border:1px solid rgba(255,255,255,0.2);background:rgba(0,0,0,0.8);color:white;font-size:16px;z-index:99999;outline:none;backdrop-filter:blur(10px);';
                      document.body.appendChild(input);
                      input.focus();

                      const cleanup = () => {
                        if (input.parentNode)
                          input.parentNode.removeChild(input);
                      };

                      input.addEventListener('keydown', (e) => {
                        if (e.key === 'Enter') {
                          resolve(input.value.trim());
                          cleanup();
                        }
                        if (e.key === 'Escape') {
                          resolve(null);
                          cleanup();
                        }
                      });
                      input.addEventListener('blur', () => {
                        setTimeout(() => {
                          resolve(input.value.trim());
                          cleanup();
                        }, 200);
                      });
                    });
                    if (text && text.trim()) {
                      artPlayerRef.current.plugins.artplayerPluginDanmuku.emit({
                        text: text.trim(),
                        time: artPlayerRef.current.currentTime,
                        color: '#FFFFFF',
                        mode: 0,
                      });
                    }
                  }
                },
              },
            ],
            // 截图按钮（仅移动端）
            ...(isMobile
              ? [
                  {
                    name: 'screenshot',
                    index: 6,
                    position: 'right' as const,
                    html: '<div style="padding:0 8px;cursor:pointer;display:flex;align-items:center;justify-content:center;" title="截图"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="12" cy="12" r="3"/></svg></div>',
                    click: function () {
                      if (!artPlayerRef.current) return;
                      const video = artPlayerRef.current.video;
                      const canvas = document.createElement('canvas');
                      canvas.width = video.videoWidth;
                      canvas.height = video.videoHeight;
                      const ctx = canvas.getContext('2d');
                      if (!ctx) return;
                      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                      canvas.toBlob((blob) => {
                        if (!blob) return;
                        const url = URL.createObjectURL(blob);
                        // Try native share API
                        if (navigator.share && navigator.canShare) {
                          const file = new File([blob], 'screenshot.png', {
                            type: 'image/png',
                          });
                          if (navigator.canShare({ files: [file] })) {
                            navigator.share({
                              files: [file],
                              title: artPlayerRef.current?.title || '截图',
                            });
                            URL.revokeObjectURL(url);
                            return;
                          }
                        }
                        // Fallback: download
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `screenshot_${Date.now()}.png`;
                        a.click();
                        URL.revokeObjectURL(url);
                        if (artPlayerRef.current)
                          artPlayerRef.current.notice.show = '📸 截图已保存';
                      }, 'image/png');
                    },
                  },
                ]
              : []),
            // 音轨切换按钮
            buildAudioTrackControl(),
          ],
          // 🚀 性能优化的弹幕插件配置 - 保持弹幕数量，优化渲染性能
          plugins: [
            artplayerPluginDanmuku(
              (() => {
                // 🎯 设备性能检测
                const getDevicePerformance = () => {
                  const hardwareConcurrency =
                    navigator.hardwareConcurrency || 2;
                  const memory =
                    (performance as any).memory?.jsHeapSizeLimit || 0;

                  // 简单性能评分（0-1）
                  let score = 0;
                  score += Math.min(hardwareConcurrency / 4, 1) * 0.5; // CPU核心数权重
                  score += Math.min(memory / (1024 * 1024 * 1024), 1) * 0.3; // 内存权重
                  score += (isMobile ? 0.2 : 0.5) * 0.2; // 设备类型权重

                  if (score > 0.7) return 'high';
                  if (score > 0.4) return 'medium';
                  return 'low';
                };

                const devicePerformance = getDevicePerformance();
                // // console.log(`🎯 设备性能等级: ${devicePerformance}`);

                // 🚀 激进性能优化：针对大量弹幕的渲染策略
                const getOptimizedConfig = () => {
                  const baseConfig = {
                    danmuku: [], // 初始为空数组，后续通过load方法加载
                    speed: parseFloat(
                      localStorage.getItem('danmaku_speed') || '5',
                    ),
                    opacity: parseFloat(
                      localStorage.getItem('danmaku_opacity') || '0.8',
                    ),
                    fontSize: parseInt(
                      localStorage.getItem('danmaku_fontSize') || '25',
                    ),
                    color: '#FFFFFF',
                    mode: 0 as const,
                    modes: JSON.parse(
                      localStorage.getItem('danmaku_modes') || '[0, 1, 2]',
                    ) as Array<0 | 1 | 2>,
                    margin: JSON.parse(
                      localStorage.getItem('danmaku_margin') || '[10, "75%"]',
                    ) as [number | `${number}%`, number | `${number}%`],
                    visible:
                      localStorage.getItem('danmaku_visible') !== 'false',
                    emitter: false,
                    maxLength: 50,
                    lockTime: 1, // 🎯 进一步减少锁定时间，提升进度跳转响应
                    theme: 'dark' as const,
                    width: 300,

                    // 🎯 激进优化配置 - 保持功能完整性
                    antiOverlap:
                      localStorage.getItem('danmaku_antiOverlap') !== null
                        ? localStorage.getItem('danmaku_antiOverlap') === 'true'
                        : devicePerformance === 'high', // 默认值：高性能设备开启防重叠
                    synchronousPlayback: true, // ✅ 必须保持true！确保弹幕与视频播放速度同步
                    heatmap: false, // 关闭热力图，减少DOM计算开销

                    // 🧠 智能过滤器 - 激进性能优化，过滤影响性能的弹幕
                    filter: (danmu: any) => {
                      // 基础验证
                      if (!danmu.text || !danmu.text.trim()) return false;

                      const text = danmu.text.trim();

                      // 🔥 激进长度限制，减少DOM渲染负担
                      if (text.length > 50) return false; // 从100改为50，更激进
                      if (text.length < 2) return false; // 过短弹幕通常无意义

                      // 🔥 激进特殊字符过滤，避免复杂渲染
                      const specialCharCount = (
                        text.match(
                          /[^\u4e00-\u9fa5a-zA-Z0-9\s.,!?；，。！？]/g,
                        ) || []
                      ).length;
                      if (specialCharCount > 5) return false; // 从10改为5，更严格

                      // 🔥 过滤纯数字或纯符号弹幕，减少无意义渲染
                      if (/^\d+$/.test(text)) return false;
                      if (/^[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]+$/.test(text))
                        return false;

                      // 🔥 过滤常见低质量弹幕，提升整体质量
                      const lowQualityPatterns = [
                        /^666+$/,
                        /^好+$/,
                        /^哈+$/,
                        /^啊+$/,
                        /^[!！.。？?]+$/,
                        /^牛+$/,
                        /^强+$/,
                      ];
                      if (
                        lowQualityPatterns.some((pattern) => pattern.test(text))
                      )
                        return false;

                      return true;
                    },

                    // 🚀 优化的弹幕显示前检查（换源时性能优化）
                    beforeVisible: (danmu: any) => {
                      return new Promise<boolean>((resolve) => {
                        // 换源期间快速拒绝弹幕显示，减少处理开销
                        if (isSourceChangingRef.current) {
                          resolve(false);
                          return;
                        }

                        // 🎯 动态弹幕密度控制 - 根据当前屏幕上的弹幕数量决定是否显示
                        const currentVisibleCount = document.querySelectorAll(
                          '.art-danmuku [data-state="emit"]',
                        ).length;
                        const maxConcurrentDanmu =
                          devicePerformance === 'high'
                            ? 60
                            : devicePerformance === 'medium'
                              ? 40
                              : 25;

                        if (currentVisibleCount >= maxConcurrentDanmu) {
                          // 🔥 当弹幕密度过高时，随机丢弃部分弹幕，保持流畅性
                          const dropRate =
                            devicePerformance === 'high'
                              ? 0.1
                              : devicePerformance === 'medium'
                                ? 0.3
                                : 0.5;
                          if (Math.random() < dropRate) {
                            resolve(false); // 丢弃当前弹幕
                            return;
                          }
                        }

                        // 🎯 硬件加速优化
                        if (danmu.$ref && danmu.mode === 0) {
                          danmu.$ref.style.willChange = 'transform';
                          danmu.$ref.style.backfaceVisibility = 'hidden';

                          // 低性能设备额外优化
                          if (devicePerformance === 'low') {
                            danmu.$ref.style.transform = 'translateZ(0)'; // 强制硬件加速
                            danmu.$ref.classList.add('art-danmuku-optimized');
                          }
                        }

                        resolve(true);
                      });
                    },
                  };

                  // 根据设备性能调整核心配置
                  switch (devicePerformance) {
                    case 'high': // 高性能设备 - 完整功能
                      return {
                        ...baseConfig,
                        antiOverlap: true, // 开启防重叠
                        synchronousPlayback: true, // 保持弹幕与视频播放速度同步
                        useWorker: true, // v5.2.0: 启用Web Worker优化
                      };

                    case 'medium': // 中等性能设备 - 适度优化
                      return {
                        ...baseConfig,
                        antiOverlap: !isMobile, // 移动端关闭防重叠
                        synchronousPlayback: true, // 保持同步播放以确保体验一致
                        useWorker: true, // v5.2.0: 中等设备也启用Worker
                      };

                    case 'low': // 低性能设备 - 平衡优化
                      return {
                        ...baseConfig,
                        antiOverlap: false, // 关闭复杂的防重叠算法
                        synchronousPlayback: true, // 保持同步以确保体验，计算量不大
                        useWorker: true, // 开启Worker减少主线程负担
                        maxLength: 30, // v5.2.0优化: 减少弹幕数量是关键优化
                      };
                  }
                };

                const config = getOptimizedConfig();

                // 🎨 为低性能设备添加CSS硬件加速样式
                if (devicePerformance === 'low') {
                  // 创建CSS动画样式（硬件加速）
                  if (!document.getElementById('danmaku-performance-css')) {
                    const style = document.createElement('style');
                    style.id = 'danmaku-performance-css';
                    style.textContent = `
                  /* 🚀 硬件加速的弹幕优化 */
                  .art-danmuku-optimized {
                    will-change: transform !important;
                    backface-visibility: hidden !important;
                    transform: translateZ(0) !important;
                    transition: transform linear !important;
                  }
                `;
                    document.head.appendChild(style);
                    // // console.log('🎨 已加载CSS硬件加速优化');
                  }
                }

                return config;
              })(),
            ),
            // Chromecast 插件加载策略：
            // 只在 Chrome 浏览器中显示 Chromecast（排除 iOS Chrome）
            // Safari 和 iOS：不显示 Chromecast（用原生 AirPlay）
            // 其他浏览器：不显示 Chromecast（不支持 Cast API）
            ...(isChrome && !isIOS
              ? [
                  artplayerPluginChromecast({
                    title: videoTitle
                      ? `${videoTitle}${currentEpisodeIndex >= 0 ? ` - 第${currentEpisodeIndex + 1}集` : ''}`
                      : undefined,
                    poster: videoCover || undefined,
                    onStateChange: (state) => {
                      // // console.log('Chromecast state changed:', state);
                    },
                    onCastAvailable: (available) => {
                      // // console.log('Chromecast available:', available);
                    },
                    onCastStart: () => {
                      // // console.log('Chromecast started');
                    },
                    onCastEnd: () => {
                      // // console.log('Chromecast ended');
                    },
                    onError: (error) => {
                      console.error('Chromecast error:', error);
                    },
                  }),
                ]
              : []),
            // 毛玻璃效果控制栏插件 - 现代化悬浮设计
            // CSS已优化：桌面98%宽度，移动端100%，按钮可自动缩小适应
            artplayerPluginLiquidGlass(),
          ],
        });

        // 设置 Portal 容器为 ArtPlayer 的 $player 元素（全屏时只有该元素可见）
        setPortalContainer(artPlayerRef.current.template.$player);

        // ===== Mobile Swipe Gestures =====
        {
          let touchStartX = 0;
          let touchStartY = 0;
          let touchStartTime = 0;
          let isSwiping = false;
          let gestureIndicator: HTMLDivElement | null = null;

          const createIndicator = (text: string, color = 'rgba(0,0,0,0.7)') => {
            if (gestureIndicator) gestureIndicator.remove();
            gestureIndicator = document.createElement('div');
            gestureIndicator.textContent = text;
            gestureIndicator.style.cssText = `position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);padding:8px 16px;border-radius:8px;background:${color};color:white;font-size:14px;z-index:999;pointer-events:none;transition:opacity 0.3s;`;
            const container = artPlayerRef.current?.container;
            if (container) container.appendChild(gestureIndicator);
            return gestureIndicator;
          };

          artPlayerRef.current?.container?.addEventListener(
            'touchstart',
            (e: TouchEvent) => {
              if (artPlayerRef.current?.lock) return;
              touchStartX = e.touches[0].clientX;
              touchStartY = e.touches[0].clientY;
              touchStartTime = Date.now();
              isSwiping = false;
            },
            { passive: true },
          );

          artPlayerRef.current?.container?.addEventListener(
            'touchmove',
            (e: TouchEvent) => {
              if (artPlayerRef.current?.lock) return;

              // Three-finger swipe down = PiP
              if (e.touches.length === 3) {
                const avgY =
                  Array.from(e.touches).reduce((sum, t) => sum + t.clientY, 0) /
                  e.touches.length;
                const threeFingerDeltaY = avgY - touchStartY;
                if (threeFingerDeltaY > 50) {
                  const video = artPlayerRef.current?.video;
                  if (video && document.pictureInPictureEnabled) {
                    try {
                      if (!document.pictureInPictureElement) {
                        video.requestPictureInPicture();
                      }
                    } catch (err) {}
                  }
                  return;
                }
              }

              const deltaX = e.touches[0].clientX - touchStartX;
              const deltaY = e.touches[0].clientY - touchStartY;
              const containerRect =
                artPlayerRef.current?.container?.getBoundingClientRect();
              if (!containerRect) return;

              // Horizontal swipe - seek
              if (
                Math.abs(deltaX) > Math.abs(deltaY) &&
                Math.abs(deltaX) > 30
              ) {
                isSwiping = true;
                const seekDelta = (deltaX / containerRect.width) * 60; // max 60s
                const currentTime = artPlayerRef.current?.currentTime || 0;
                const duration = (artPlayerRef.current as any)?.duration || 0;
                const newTime = Math.max(
                  0,
                  Math.min(duration, currentTime + seekDelta),
                );
                const indicator = createIndicator(
                  `${seekDelta > 0 ? '+' : ''}${Math.round(seekDelta)}s`,
                );
                if (indicator) indicator.style.opacity = '1';
              }

              // Vertical swipe - volume (right side) or brightness hint (left side)
              if (
                Math.abs(deltaY) > Math.abs(deltaX) &&
                Math.abs(deltaY) > 30
              ) {
                isSwiping = true;
                const isRightSide =
                  touchStartX > containerRect.left + containerRect.width / 2;
                if (isRightSide) {
                  // Right side: volume
                  const volumeDelta = -(deltaY / containerRect.height) * 2;
                  const newVol = Math.max(
                    0,
                    Math.min(
                      1,
                      (artPlayerRef.current?.volume || 0.7) + volumeDelta,
                    ),
                  );
                  artPlayerRef.current!.volume = newVol;
                  const indicator = createIndicator(
                    `🔊 ${Math.round(newVol * 100)}%`,
                  );
                  if (indicator) indicator.style.opacity = '1';
                } else {
                  // Left side: brightness (via CSS filter as fallback)
                  const brightDelta = -(deltaY / containerRect.height) * 2;
                  const currentBrightness = parseFloat(
                    (
                      artPlayerRef.current?.container as any
                    )?.style?.filter?.match(/brightness\(([^)]+)\)/)?.[1] ||
                      '1',
                  );
                  const newBright = Math.max(
                    0.3,
                    Math.min(3, currentBrightness + brightDelta),
                  );
                  if (artPlayerRef.current?.video)
                    (
                      artPlayerRef.current.video as HTMLVideoElement
                    ).style.filter = `brightness(${newBright})`;
                  const indicator = createIndicator(
                    `☀️ ${Math.round(newBright * 100)}%`,
                  );
                  if (indicator) indicator.style.opacity = '1';
                }
              }
            },
            { passive: true },
          );

          artPlayerRef.current?.container?.addEventListener(
            'touchend',
            () => {
              if (isSwiping && gestureIndicator) {
                setTimeout(() => {
                  if (gestureIndicator) gestureIndicator.style.opacity = '0';
                }, 200);
                setTimeout(() => {
                  if (gestureIndicator) {
                    gestureIndicator.remove();
                    gestureIndicator = null;
                  }
                }, 500);
              }
              isSwiping = false;
            },
            { passive: true },
          );
        }

        // 监听播放器事件
        artPlayerRef.current.on('ready', async () => {
          setError(null);

          // 使用ArtPlayer layers API添加分辨率徽章（带渐变和发光效果）
          const video = artPlayerRef.current.video as HTMLVideoElement;

          // 🖥️ 应用保存的显示模式设置（支持超宽屏）
          const savedObjectFit =
            localStorage.getItem('video_object_fit') || 'contain';
          if (video) {
            video.style.objectFit = savedObjectFit;
          }

          // 添加分辨率徽章layer
          artPlayerRef.current.layers.add({
            name: 'resolution-badge',
            html: '<div class="resolution-badge"></div>',
            style: {
              position: 'absolute',
              bottom: '60px',
              left: '20px',
              padding: '5px 12px',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: '700',
              color: 'white',
              textShadow: '0 1px 3px rgba(0, 0, 0, 0.5)',
              backdropFilter: 'blur(10px)',
              pointerEvents: 'none',
              opacity: '1',
              transition: 'opacity 0.3s ease',
              letterSpacing: '0.5px',
            },
          });

          // 🎬 全屏标题/集数层
          const fsEpisodeName =
            detail?.episodes_titles?.[currentEpisodeIndex] || '';
          const fsHasEpisodes = detail?.episodes && detail.episodes.length > 1;
          artPlayerRef.current.layers.add({
            name: 'fullscreen-title',
            html: `
            <div class="fullscreen-title-container">
              <div class="fullscreen-title-content">
                <h1 class="fullscreen-title-text">${detail?.title || ''}</h1>
                ${
                  fsHasEpisodes && fsEpisodeName
                    ? `<span class="fullscreen-episode-text">${fsEpisodeName}</span>`
                    : fsHasEpisodes
                      ? `<span class="fullscreen-episode-text">第 ${currentEpisodeIndex + 1} 集</span>`
                      : ''
                }
              </div>
            </div>
          `,
            style: {
              position: 'absolute',
              top: '0',
              left: '0',
              right: '0',
              height: '80px',
              display: 'none',
              pointerEvents: 'none',
              zIndex: '20',
            },
          });

          // 自动隐藏徽章的定时器
          let badgeHideTimer: NodeJS.Timeout | null = null;

          const showBadge = () => {
            const badge = artPlayerRef.current?.layers['resolution-badge'];
            if (badge) {
              badge.style.opacity = '1';

              // 清除之前的定时器
              if (badgeHideTimer) {
                clearTimeout(badgeHideTimer);
              }

              // 3秒后自动隐藏徽章
              badgeHideTimer = setTimeout(() => {
                if (badge) {
                  badge.style.opacity = '0';
                }
              }, 3000);
            }
          };

          const updateResolution = () => {
            if (video.videoWidth && video.videoHeight) {
              const width = video.videoWidth;
              const label =
                width >= 3840
                  ? '4K'
                  : width >= 2560
                    ? '2K'
                    : width >= 1920
                      ? '1080P'
                      : width >= 1280
                        ? '720P'
                        : width + 'P';

              // 根据质量设置不同的渐变背景和发光效果
              let gradientStyle = '';
              let boxShadow = '';

              if (width >= 3840) {
                // 4K - 金色/紫色渐变 + 金色发光
                gradientStyle =
                  'linear-gradient(135deg, #FFD700 0%, #FFA500 50%, #FF8C00 100%)';
                boxShadow =
                  '0 0 20px rgba(255, 215, 0, 0.6), 0 0 10px rgba(255, 165, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.3)';
              } else if (width >= 2560) {
                // 2K - 蓝色/青色渐变 + 蓝色发光
                gradientStyle =
                  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
                boxShadow =
                  '0 0 20px rgba(102, 126, 234, 0.6), 0 0 10px rgba(118, 75, 162, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.3)';
              } else if (width >= 1920) {
                // 1080P - 绿色/青色渐变 + 绿色发光
                gradientStyle =
                  'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)';
                boxShadow =
                  '0 0 15px rgba(17, 153, 142, 0.5), 0 0 8px rgba(56, 239, 125, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.3)';
              } else if (width >= 1280) {
                // 720P - 橙色渐变 + 橙色发光
                gradientStyle =
                  'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)';
                boxShadow =
                  '0 0 15px rgba(240, 147, 251, 0.4), 0 0 8px rgba(245, 87, 108, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.3)';
              } else {
                // 低质量 - 灰色渐变
                gradientStyle =
                  'linear-gradient(135deg, #606c88 0%, #3f4c6b 100%)';
                boxShadow =
                  '0 0 10px rgba(96, 108, 136, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)';
              }

              // 更新layer内容和样式
              const badge = artPlayerRef.current.layers['resolution-badge'];
              if (badge) {
                badge.innerHTML = label;
                badge.style.background = gradientStyle;
                badge.style.boxShadow = boxShadow;
              }

              // 显示徽章并启动自动隐藏定时器
              showBadge();
            }
          };

          // 监听loadedmetadata事件获取分辨率
          video.addEventListener('loadedmetadata', updateResolution);
          if (video.videoWidth && video.videoHeight) {
            updateResolution();
          }

          // 用户交互时重新显示徽章（鼠标移动、点击、键盘操作）
          const userInteractionEvents = [
            'mousemove',
            'click',
            'touchstart',
            'keydown',
          ];
          userInteractionEvents.forEach((eventName) => {
            artPlayerRef.current.on(eventName, showBadge);
          });

          // 观影室时间同步：从URL参数读取初始播放时间
          const timeParam = searchParams.get('t') || searchParams.get('time');
          if (timeParam && artPlayerRef.current) {
            const seekTime = parseFloat(timeParam);
            if (!isNaN(seekTime) && seekTime > 0) {
              // // console.log('[WatchRoom] Seeking to synced time:', seekTime);
              setTimeout(() => {
                if (artPlayerRef.current) {
                  artPlayerRef.current.currentTime = seekTime;
                }
              }, 500); // 延迟确保播放器完全就绪
            }
          }

          // iOS设备自动播放优化：如果是静音启动的，在开始播放后恢复音量
          if ((isIOS || isSafari) && artPlayerRef.current.muted) {
            // // console.log('iOS设备静音自动播放，准备在播放开始后恢复音量');

            const handleFirstPlay = () => {
              setTimeout(() => {
                if (artPlayerRef.current && artPlayerRef.current.muted) {
                  artPlayerRef.current.muted = false;
                  artPlayerRef.current.volume = lastVolumeRef.current || 0.7;
                  // // console.log(
                  // 'iOS设备已恢复音量:',
                  // artPlayerRef.current.volume,
                  // );
                }
              }, 500); // 延迟500ms确保播放稳定

              // 只执行一次
              artPlayerRef.current.off('video:play', handleFirstPlay);
            };

            artPlayerRef.current.on('video:play', handleFirstPlay);
          }

          // 添加弹幕插件按钮选择性隐藏CSS
          const optimizeDanmukuControlsCSS = () => {
            if (document.getElementById('danmuku-controls-optimize')) return;

            const style = document.createElement('style');
            style.id = 'danmuku-controls-optimize';
            style.textContent = `
            /* 隐藏弹幕开关按钮和发射器 */
            .artplayer-plugin-danmuku .apd-toggle {
              display: none !important;
            }

            .artplayer-plugin-danmuku .apd-emitter {
              display: none !important;
            }

            
            /* 弹幕配置面板优化 - 修复全屏模式下点击问题 */
            .artplayer-plugin-danmuku .apd-config {
              position: relative;
            }
            
            .artplayer-plugin-danmuku .apd-config-panel {
              /* 使用绝对定位而不是fixed，让ArtPlayer的动态定位生效 */
              position: absolute !important;
              /* 保持ArtPlayer原版的默认left: 0，让JS动态覆盖 */
              /* 保留z-index确保层级正确 */
              z-index: 2147483647 !important; /* 使用最大z-index确保在全屏模式下也能显示在最顶层 */
              /* 确保面板可以接收点击事件 */
              pointer-events: auto !important;
              /* 添加一些基础样式确保可见性 */
              background: rgba(0, 0, 0, 0.8);
              border-radius: 6px;
              backdrop-filter: blur(10px);
            }
            
            /* 全屏模式下的特殊优化 */
            .artplayer[data-fullscreen="true"] .artplayer-plugin-danmuku .apd-config-panel {
              /* 全屏时使用固定定位并调整位置 */
              position: fixed !important;
              top: auto !important;
              bottom: 80px !important; /* 距离底部控制栏80px */
              right: 20px !important; /* 距离右边20px */
              left: auto !important;
              z-index: 2147483647 !important;
            }
            
            /* 确保全屏模式下弹幕面板内部元素可点击 */
            .artplayer[data-fullscreen="true"] .artplayer-plugin-danmuku .apd-config-panel * {
              pointer-events: auto !important;
            }
          `;
            document.head.appendChild(style);
          };

          // 应用CSS优化
          optimizeDanmukuControlsCSS();

          // 精确解决弹幕菜单与进度条拖拽冲突 - 基于ArtPlayer原生拖拽逻辑
          const fixDanmakuProgressConflict = () => {
            let isDraggingProgress = false;

            setTimeout(() => {
              const progressControl = document.querySelector(
                '.art-control-progress',
              ) as HTMLElement;
              if (!progressControl) return;

              // 添加精确的CSS控制
              const addPrecisionCSS = () => {
                if (document.getElementById('danmaku-drag-fix')) return;

                const style = document.createElement('style');
                style.id = 'danmaku-drag-fix';
                style.textContent = `
                /* 🔧 修复长时间播放后弹幕菜单hover失效问题 */

                /* 确保控制元素本身可以接收鼠标事件，恢复原生hover机制 */
                .artplayer-plugin-danmuku .apd-config,
                .artplayer-plugin-danmuku .apd-style {
                  pointer-events: auto !important;
                }

                /* 简化：依赖全局CSS中的hover处理 */

                /* 确保进度条层级足够高，避免被弹幕面板遮挡 */
                .art-progress {
                  position: relative;
                  z-index: 1000 !important;
                }

                /* 面板背景在非hover状态下不拦截事件，但允许hover检测 */
                .artplayer-plugin-danmuku .apd-config-panel:not(:hover),
                .artplayer-plugin-danmuku .apd-style-panel:not(:hover) {
                  pointer-events: none;
                }

                /* 面板内的具体控件始终可以交互 */
                .artplayer-plugin-danmuku .apd-config-panel-inner,
                .artplayer-plugin-danmuku .apd-style-panel-inner,
                .artplayer-plugin-danmuku .apd-config-panel .apd-mode,
                .artplayer-plugin-danmuku .apd-config-panel .apd-other,
                .artplayer-plugin-danmuku .apd-config-panel .apd-slider,
                .artplayer-plugin-danmuku .apd-style-panel .apd-mode,
                .artplayer-plugin-danmuku .apd-style-panel .apd-color {
                  pointer-events: auto !important;
                }
              `;
                document.head.appendChild(style);
              };

              // 精确模拟ArtPlayer的拖拽检测逻辑
              const handleProgressMouseDown = (event: MouseEvent) => {
                // 只有左键才开始拖拽检测
                if (event.button === 0) {
                  isDraggingProgress = true;
                  const artplayer = document.querySelector(
                    '.artplayer',
                  ) as HTMLElement;
                  if (artplayer) {
                    artplayer.setAttribute('data-dragging', 'true');
                  }
                }
              };

              // 监听document的mousemove，与ArtPlayer保持一致
              const handleDocumentMouseMove = () => {
                // 如果正在拖拽，确保弹幕菜单被隐藏
                if (isDraggingProgress) {
                  const panels = document.querySelectorAll(
                    '.artplayer-plugin-danmuku .apd-config-panel, .artplayer-plugin-danmuku .apd-style-panel',
                  ) as NodeListOf<HTMLElement>;
                  panels.forEach((panel) => {
                    if (panel.style.opacity !== '0') {
                      panel.style.opacity = '0';
                      panel.style.pointerEvents = 'none';
                    }
                  });
                }
              };

              // mouseup时立即恢复 - 与ArtPlayer逻辑完全同步
              const handleDocumentMouseUp = () => {
                if (isDraggingProgress) {
                  isDraggingProgress = false;
                  const artplayer = document.querySelector(
                    '.artplayer',
                  ) as HTMLElement;
                  if (artplayer) {
                    artplayer.removeAttribute('data-dragging');
                  }
                  // 立即恢复，不使用延迟
                }
              };

              // 绑定事件 - 与ArtPlayer使用相同的事件绑定方式
              progressControl.addEventListener(
                'mousedown',
                handleProgressMouseDown,
              );
              document.addEventListener('mousemove', handleDocumentMouseMove);
              document.addEventListener('mouseup', handleDocumentMouseUp);
              globalCleanupFnsRef.current.push(() => {
                document.removeEventListener(
                  'mousemove',
                  handleDocumentMouseMove,
                );
                document.removeEventListener('mouseup', handleDocumentMouseUp);
              });

              // 应用CSS
              addPrecisionCSS();

              // 🔄 添加定期重置机制，防止长时间播放后状态污染
              const danmakuResetInterval = setInterval(() => {
                if (!artPlayerRef.current?.plugins?.artplayerPluginDanmuku) {
                  clearInterval(danmakuResetInterval);
                  return;
                }

                try {
                  // 重置弹幕控件和面板状态
                  const controls = document.querySelectorAll(
                    '.artplayer-plugin-danmuku .apd-config, .artplayer-plugin-danmuku .apd-style',
                  ) as NodeListOf<HTMLElement>;
                  const panels = document.querySelectorAll(
                    '.artplayer-plugin-danmuku .apd-config-panel, .artplayer-plugin-danmuku .apd-style-panel',
                  ) as NodeListOf<HTMLElement>;

                  // 强制重置控制元素的事件接收能力
                  controls.forEach((control) => {
                    if (control.style.pointerEvents === 'none') {
                      control.style.pointerEvents = 'auto';
                    }
                  });

                  // 重置面板状态，但不影响当前hover状态
                  panels.forEach((panel) => {
                    if (
                      !panel.matches(':hover') &&
                      panel.style.opacity === '0'
                    ) {
                      panel.style.opacity = '';
                      panel.style.pointerEvents = '';
                      panel.style.visibility = '';
                    }
                  });
                } catch (error) {
                  console.warn('弹幕状态重置失败:', error);
                }
              }, 300000); // 每5分钟重置一次

              // 🚀 立即恢复hover状态（修复当前可能已存在的问题）
              const immediateRestore = () => {
                const controls = document.querySelectorAll(
                  '.artplayer-plugin-danmuku .apd-config, .artplayer-plugin-danmuku .apd-style',
                ) as NodeListOf<HTMLElement>;
                controls.forEach((control) => {
                  control.style.pointerEvents = 'auto';
                });
                // // console.log('🚀 弹幕菜单hover状态已立即恢复');
              };

              // 立即执行一次恢复
              setTimeout(immediateRestore, 100);
            }, 1500); // 等待弹幕插件加载
          };

          // 启用精确修复
          fixDanmakuProgressConflict();

          // 移动端弹幕配置按钮点击切换支持 - 基于ArtPlayer设置按钮原理
          const addMobileDanmakuToggle = () => {
            const isMobile =
              /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
                navigator.userAgent,
              );

            setTimeout(() => {
              const configButton = document.querySelector(
                '.artplayer-plugin-danmuku .apd-config',
              );
              const configPanel = document.querySelector(
                '.artplayer-plugin-danmuku .apd-config-panel',
              );

              if (!configButton || !configPanel) {
                console.warn('弹幕配置按钮或面板未找到');
                return;
              }

              // // console.log('设备类型:', isMobile ? '移动端' : '桌面端');

              // 桌面端：简化处理，依赖CSS hover，移除复杂的JavaScript事件
              if (!isMobile) {
                // // console.log('桌面端：使用CSS原生hover，避免JavaScript事件冲突');
                return;
              }

              if (isMobile) {
                // 移动端：添加点击切换支持 + 持久位置修正
                // // console.log('为移动端添加弹幕配置按钮点击切换功能');

                let isConfigVisible = false;

                // 弹幕面板位置修正函数 - 简化版本
                const adjustPanelPosition = () => {
                  const player = document.querySelector('.artplayer');
                  if (!player || !configButton || !configPanel) return;

                  try {
                    const panelElement = configPanel as HTMLElement;

                    // 始终清除内联样式，使用CSS默认定位
                    panelElement.style.left = '';
                    panelElement.style.right = '';
                    panelElement.style.transform = '';

                    // // console.log('弹幕面板：使用CSS默认定位，自动适配屏幕方向');
                  } catch (error) {
                    console.warn('弹幕面板位置调整失败:', error);
                  }
                };

                // 添加点击事件监听器
                configButton.addEventListener('click', (e) => {
                  e.preventDefault();
                  e.stopPropagation();

                  isConfigVisible = !isConfigVisible;

                  if (isConfigVisible) {
                    (configPanel as HTMLElement).style.display = 'block';
                    // 显示后立即调整位置
                    setTimeout(adjustPanelPosition, 10);
                    // // console.log('移动端弹幕配置面板：显示');
                  } else {
                    (configPanel as HTMLElement).style.display = 'none';
                    // // console.log('移动端弹幕配置面板：隐藏');
                  }
                });

                // 监听ArtPlayer的resize事件
                if (artPlayerRef.current) {
                  artPlayerRef.current.on('resize', () => {
                    if (isConfigVisible) {
                      // // console.log(
                      // '检测到ArtPlayer resize事件，重新调整弹幕面板位置',
                      // );
                      setTimeout(adjustPanelPosition, 50); // 短暂延迟确保resize完成
                    }
                  });
                  // // console.log('已监听ArtPlayer resize事件，实现自动适配');
                }

                // 额外监听屏幕方向变化事件，确保完全自动适配
                const handleOrientationChange = () => {
                  if (isConfigVisible) {
                    setTimeout(adjustPanelPosition, 100);
                  }
                  // 手机横屏自动进入全屏，退出横屏自动退出全屏
                  const isLandscape = window.matchMedia(
                    '(orientation: landscape)',
                  ).matches;
                  const isMobileDevice = /Android|iPhone|iPad|iPod/i.test(
                    navigator.userAgent,
                  );
                  if (isMobileDevice && artPlayerRef.current) {
                    if (isLandscape && !artPlayerRef.current.fullscreen) {
                      try {
                        artPlayerRef.current.fullscreen = true;
                      } catch {}
                    } else if (
                      !isLandscape &&
                      artPlayerRef.current.fullscreen
                    ) {
                      try {
                        artPlayerRef.current.fullscreen = false;
                      } catch {}
                    }
                  }
                };

                window.addEventListener(
                  'orientationchange',
                  handleOrientationChange,
                );
                window.addEventListener('resize', handleOrientationChange);

                // 清理函数
                const _cleanup = () => {
                  window.removeEventListener(
                    'orientationchange',
                    handleOrientationChange,
                  );
                  window.removeEventListener('resize', handleOrientationChange);
                };

                // 点击其他地方自动隐藏
                const handleConfigPanelClickOutside = (e: MouseEvent) => {
                  if (
                    isConfigVisible &&
                    !configButton.contains(e.target as Node) &&
                    !configPanel.contains(e.target as Node)
                  ) {
                    isConfigVisible = false;
                    (configPanel as HTMLElement).style.display = 'none';
                    // // console.log('点击外部区域，隐藏弹幕配置面板');
                  }
                };
                document.addEventListener(
                  'click',
                  handleConfigPanelClickOutside,
                );

                // 存储清理函数以便播放器销毁时调用
                const prevCleanup = danmakuConfigCleanupRef.current;
                danmakuConfigCleanupRef.current = () => {
                  if (prevCleanup) prevCleanup();
                  _cleanup();
                  document.removeEventListener(
                    'click',
                    handleConfigPanelClickOutside,
                  );
                };

                // // console.log('移动端弹幕配置切换功能已激活');
              }
            }, 2000); // 延迟2秒确保弹幕插件完全初始化
          };

          // 启用移动端弹幕配置切换
          addMobileDanmakuToggle();

          // 弹幕加载已由 useDanmu hook 和 episode change effect 处理
          // 不再在 player ready 中重复加载，避免竞态导致双排重复

          // 监听弹幕插件的显示/隐藏事件，自动保存状态到localStorage
          artPlayerRef.current.on('artplayerPluginDanmuku:show', () => {
            localStorage.setItem('danmaku_visible', 'true');
            // // console.log('弹幕显示状态已保存');
          });

          artPlayerRef.current.on('artplayerPluginDanmuku:hide', () => {
            localStorage.setItem('danmaku_visible', 'false');
            // // console.log('弹幕隐藏状态已保存');
          });

          // 监听弹幕插件的配置变更事件，自动保存所有设置到localStorage
          artPlayerRef.current.on(
            'artplayerPluginDanmuku:config',
            (option: any) => {
              try {
                // 保存所有弹幕配置到localStorage
                if (typeof option.fontSize !== 'undefined') {
                  localStorage.setItem(
                    'danmaku_fontSize',
                    option.fontSize.toString(),
                  );
                }
                if (typeof option.opacity !== 'undefined') {
                  localStorage.setItem(
                    'danmaku_opacity',
                    option.opacity.toString(),
                  );
                }
                if (typeof option.speed !== 'undefined') {
                  localStorage.setItem(
                    'danmaku_speed',
                    option.speed.toString(),
                  );
                }
                if (typeof option.margin !== 'undefined') {
                  localStorage.setItem(
                    'danmaku_margin',
                    JSON.stringify(option.margin),
                  );
                }
                if (typeof option.modes !== 'undefined') {
                  localStorage.setItem(
                    'danmaku_modes',
                    JSON.stringify(option.modes),
                  );
                }
                if (typeof option.antiOverlap !== 'undefined') {
                  localStorage.setItem(
                    'danmaku_antiOverlap',
                    option.antiOverlap.toString(),
                  );
                }
                if (typeof option.visible !== 'undefined') {
                  localStorage.setItem(
                    'danmaku_visible',
                    option.visible.toString(),
                  );
                }
                // // console.log('弹幕配置已自动保存:', option);
              } catch (error) {
                console.error('保存弹幕配置失败:', error);
              }
            },
          );

          // 监听播放进度跳转，优化弹幕重置（减少闪烁）
          artPlayerRef.current.on('seek', () => {
            if (artPlayerRef.current?.plugins?.artplayerPluginDanmuku) {
              // 清除之前的重置计时器
              if (seekResetTimeoutRef.current) {
                clearTimeout(seekResetTimeoutRef.current);
              }

              // 增加延迟并只在非拖拽状态下重置，减少快进时的闪烁
              seekResetTimeoutRef.current = setTimeout(() => {
                if (
                  !isDraggingProgressRef.current &&
                  artPlayerRef.current?.plugins?.artplayerPluginDanmuku &&
                  !artPlayerRef.current.seeking
                ) {
                  artPlayerRef.current.plugins.artplayerPluginDanmuku.reset();
                  // // console.log('进度跳转，弹幕已重置');
                }
              }, 500); // 增加到500ms延迟，减少频繁重置导致的闪烁
            }
          });

          // 监听拖拽状态 - v5.2.0优化: 在拖拽期间暂停弹幕更新以减少闪烁
          artPlayerRef.current.on('video:seeking', () => {
            isDraggingProgressRef.current = true;
            // v5.2.0新增: 拖拽时隐藏弹幕，减少CPU占用和闪烁
            // 只有在外部弹幕开启且当前显示时才隐藏
            if (
              artPlayerRef.current?.plugins?.artplayerPluginDanmuku &&
              externalDanmuEnabledRef.current &&
              !artPlayerRef.current.plugins.artplayerPluginDanmuku.isHide
            ) {
              artPlayerRef.current.plugins.artplayerPluginDanmuku.hide();
            }
          });

          artPlayerRef.current.on('video:seeked', () => {
            isDraggingProgressRef.current = false;
            // v5.2.0优化: 拖拽结束后根据外部弹幕开关状态决定是否恢复弹幕显示
            if (artPlayerRef.current?.plugins?.artplayerPluginDanmuku) {
              // 只有在外部弹幕开启时才恢复显示
              if (externalDanmuEnabledRef.current) {
                artPlayerRef.current.plugins.artplayerPluginDanmuku.show(); // 先恢复显示
                setTimeout(() => {
                  // 延迟重置以确保播放状态稳定
                  if (artPlayerRef.current?.plugins?.artplayerPluginDanmuku) {
                    artPlayerRef.current.plugins.artplayerPluginDanmuku.reset();
                    // // console.log('拖拽结束，弹幕已重置');
                  }
                }, 100);
              } else {
                // 外部弹幕关闭时，确保保持隐藏状态
                artPlayerRef.current.plugins.artplayerPluginDanmuku.hide();
                // // console.log('拖拽结束，外部弹幕已关闭，保持隐藏状态');
              }
            }
          });

          // 监听播放器窗口尺寸变化，触发弹幕重置（双重保障）
          artPlayerRef.current.on('resize', () => {
            // 清除之前的重置计时器
            if (resizeResetTimeoutRef.current) {
              clearTimeout(resizeResetTimeoutRef.current);
            }

            // 延迟重置弹幕，避免连续触发（全屏切换优化）
            resizeResetTimeoutRef.current = setTimeout(() => {
              if (artPlayerRef.current?.plugins?.artplayerPluginDanmuku) {
                artPlayerRef.current.plugins.artplayerPluginDanmuku.reset();
                // // console.log('窗口尺寸变化，弹幕已重置（防抖优化）');
              }
            }, 300); // 300ms防抖，减少全屏切换时的卡顿
          });

          // 播放器就绪后，如果正在播放则请求 Wake Lock
          if (artPlayerRef.current && !artPlayerRef.current.paused) {
            requestWakeLock();
          }
        });

        // 监听播放状态变化，控制 Wake Lock
        artPlayerRef.current.on('play', () => {
          requestWakeLock();
        });

        artPlayerRef.current.on('pause', () => {
          releaseWakeLock();
          // 🔥 关键修复：暂停时也检查是否在片尾，避免保存错误的进度
          const currentTime = artPlayerRef.current?.currentTime || 0;
          const duration = artPlayerRef.current?.duration || 0;
          const remainingTime = duration - currentTime;
          const isNearEnd = duration > 0 && remainingTime < 180; // 最后3分钟

          if (!isNearEnd) {
            saveCurrentPlayProgress();
          }
        });

        // 如果播放器初始化时已经在播放状态，则请求 Wake Lock
        if (artPlayerRef.current && !artPlayerRef.current.paused) {
          requestWakeLock();
        }

        artPlayerRef.current.on('video:volumechange', () => {
          lastVolumeRef.current = artPlayerRef.current.volume;
        });
        artPlayerRef.current.on('video:ratechange', () => {
          lastPlaybackRateRef.current = sanitizePlaybackRate(
            artPlayerRef.current.playbackRate,
          );
          try {
            localStorage.setItem(
              PLAYER_PLAYBACK_RATE_KEY,
              String(lastPlaybackRateRef.current),
            );
          } catch {
            // ignore
          }
        });

        // 监听全屏事件，进入全屏后自动隐藏控制栏 + 显示标题层
        artPlayerRef.current.on('fullscreen', (isFullscreen: boolean) => {
          const titleLayer = artPlayerRef.current?.layers['fullscreen-title'];
          if (titleLayer) {
            titleLayer.style.display = isFullscreen ? 'block' : 'none';
          }
          if (isFullscreen) {
            // 进入全屏后，延迟100ms触发控制栏自动隐藏
            setTimeout(() => {
              if (artPlayerRef.current?.controls) {
                artPlayerRef.current.controls.show = true;
              }
            }, 100);
          }
        });

        // 监听网页全屏事件，显示/隐藏标题层
        artPlayerRef.current.on('fullscreenWeb', (isFullscreenWeb: boolean) => {
          const titleLayer = artPlayerRef.current?.layers['fullscreen-title'];
          if (titleLayer) {
            titleLayer.style.display = isFullscreenWeb ? 'block' : 'none';
          }
        });

        // 监听视频可播放事件，这时恢复播放进度更可靠
        artPlayerRef.current.on('video:canplay', () => {
          // 🔥 重置 video:ended 处理标志，因为这是新视频
          videoEndedHandledRef.current = false;

          // 若存在需要恢复的播放进度，则跳转
          if (resumeTimeRef.current && resumeTimeRef.current > 0) {
            try {
              const duration = artPlayerRef.current.duration || 0;
              let target = resumeTimeRef.current;
              if (duration && target >= duration - 2) {
                target = Math.max(0, duration - 5);
              }
              artPlayerRef.current.currentTime = target;
              // // console.log('成功恢复播放进度到:', resumeTimeRef.current);
            } catch (err) {
              console.warn('恢复播放进度失败:', err);
            }
          }
          resumeTimeRef.current = null;

          // 音轨切换完成
          if (isAudioTrackSwitching) {
            setIsAudioTrackSwitching(false);
          }

          // 移动端自动播放回退机制：如果自动播放失败，尝试用户交互触发播放
          if (isMobile && artPlayerRef.current.paused) {
            // // console.log('移动端检测到视频未自动播放，准备交互触发机制');

            const tryAutoPlay = async () => {
              try {
                // 多重尝试策略
                let playAttempts = 0;
                const maxAttempts = 3;

                const attemptPlay = async (): Promise<boolean> => {
                  playAttempts++;
                  // // console.log(`自动播放尝试 ${playAttempts}/${maxAttempts}`);

                  try {
                    await artPlayerRef.current.play();
                    // // console.log('设备自动播放成功');
                    return true;
                  } catch (playError: any) {
                    // // console.log(
                    // `播放尝试 ${playAttempts} 失败:`,
                    // playError.name,
                    // );

                    // 根据错误类型采用不同策略
                    if (playError.name === 'NotAllowedError') {
                      // 用户交互需求错误 - 最常见
                      if (playAttempts < maxAttempts) {
                        // 尝试降低音量再播放
                        artPlayerRef.current.volume = 0.1;
                        await new Promise((resolve) =>
                          setTimeout(resolve, 200),
                        );
                        return attemptPlay();
                      }
                      return false;
                    } else if (playError.name === 'AbortError') {
                      // 播放被中断 - 等待后重试
                      if (playAttempts < maxAttempts) {
                        await new Promise((resolve) =>
                          setTimeout(resolve, 500),
                        );
                        return attemptPlay();
                      }
                      return false;
                    }
                    return false;
                  }
                };

                const success = await attemptPlay();

                if (!success) {
                  // // console.log('设备需要用户交互才能播放，这是正常的浏览器行为');
                  // 显示友好的播放提示
                  if (artPlayerRef.current) {
                    artPlayerRef.current.notice.show = '轻触播放按钮开始观看';

                    // 添加一次性点击监听器用于首次播放
                    let hasHandledFirstInteraction = false;
                    const handleFirstUserInteraction = async () => {
                      if (hasHandledFirstInteraction) return;
                      hasHandledFirstInteraction = true;

                      // 嵌入式预告片（Bilibili / YouTube）：iframe 播放
                      if (
                        videoUrl.includes('bilibili.com/player') ||
                        videoUrl.includes('youtube.com/embed')
                      ) {
                        artRef.current.innerHTML = '';
                        const iframe = document.createElement('iframe');
                        iframe.src = videoUrl;
                        iframe.allow =
                          'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
                        iframe.allowFullscreen = true;
                        iframe.style.cssText =
                          'width:100%;height:100%;border:none;border-radius:12px';
                        artRef.current.appendChild(iframe);
                        return;
                      }

                      try {
                        await artPlayerRef.current.play();
                        // 首次成功播放后恢复正常音量
                        setTimeout(() => {
                          if (
                            artPlayerRef.current &&
                            !artPlayerRef.current.muted
                          ) {
                            artPlayerRef.current.volume =
                              lastVolumeRef.current || 0.7;
                          }
                        }, 1000);
                      } catch (error) {
                        console.warn('用户交互播放失败:', error);
                      }

                      // 移除监听器
                      artPlayerRef.current?.off(
                        'video:play',
                        handleFirstUserInteraction,
                      );
                      document.removeEventListener(
                        'click',
                        handleFirstUserInteraction,
                      );
                      firstInteractionHandlerRef.current = null;
                    };

                    // 保存引用以便 unmount 时清理
                    firstInteractionHandlerRef.current =
                      handleFirstUserInteraction;

                    // 监听播放事件和点击事件
                    artPlayerRef.current.on(
                      'video:play',
                      handleFirstUserInteraction,
                    );
                    document.addEventListener(
                      'click',
                      handleFirstUserInteraction,
                    );
                  }
                }
              } catch (error) {
                console.warn('自动播放回退机制执行失败:', error);
              }
            };

            // 延迟尝试，避免与进度恢复冲突
            setTimeout(tryAutoPlay, 200);
          }

          setTimeout(() => {
            if (!artPlayerRef.current) return;
            if (
              Math.abs(artPlayerRef.current.volume - lastVolumeRef.current) >
              0.01
            ) {
              artPlayerRef.current.volume = lastVolumeRef.current;
            }
            if (
              Math.abs(
                artPlayerRef.current.playbackRate - lastPlaybackRateRef.current,
              ) > 0.01
            ) {
              artPlayerRef.current.playbackRate = lastPlaybackRateRef.current;
            }
            artPlayerRef.current.notice.show = '';
          }, 0);

          // 隐藏换源加载状态
          setIsVideoLoading(false);

          // 🔥 重置集数切换标识（播放器成功创建后）
          if (isEpisodeChangingRef.current) {
            isEpisodeChangingRef.current = false;
          }
        });

        // 监听播放器错误 - 自动切换到备用源
        artPlayerRef.current.on('error', (err: any) => {
          console.error('播放器错误:', err);

          // 仅在视频未开始播放时（currentTime < 1）触发换源
          if (artPlayerRef.current.currentTime > 1) {
            return;
          }

          sourceErrorCountRef.current++;

          // 超过错误限制，停止重试并显示错误
          if (sourceErrorCountRef.current > MAX_SOURCE_ERRORS) {
            setError('播放失败，请尝试刷新页面或切换其他线路');
            return;
          }

          // 标记当前源为无效
          const failSource = currentSourceRef.current;
          const failId = currentIdRef.current;
          const failUrl =
            detailRef.current?.episodes?.[currentEpisodeIndexRef.current] || '';
          if (failSource && failId) {
            const failKey = getSourceIdentityKey(failSource, failId);
            markSourceFailed(failKey);
          }

          // 尝试切换到备用源
          findWorkingSource(failSource, failId, failUrl).then((nextSource) => {
            if (nextSource) {
              sourceErrorCountRef.current = 0;
              handleSourceChange(
                nextSource.source,
                nextSource.id,
                nextSource.title || '',
              );
            } else {
              // 所有源都不可用，显示错误
              if (
                fallbackAutoRetriedRef.current ||
                totalSessionFailuresRef.current >= MAX_SESSION_FAILURES ||
                filterInvalidSources(availableSourcesRef.current).length === 0
              ) {
                setError('当前线路播放失败，且没有其他可用线路');
              } else {
                // 尝试一次重试
                fallbackAutoRetriedRef.current = true;
                const retrySource = availableSourcesRef.current[0];
                if (retrySource) {
                  setTimeout(() => {
                    handleSourceChange(
                      retrySource.source,
                      retrySource.id,
                      retrySource.title || '',
                    );
                  }, 2000);
                } else {
                  setError('当前线路播放失败，且没有其他可用线路');
                }
              }
            }
          });
        });

        // 监听视频播放结束事件，自动播放下一集
        artPlayerRef.current.on('video:ended', () => {
          releaseWakeLock();
          const idx = currentEpisodeIndexRef.current;

          // 🔥 关键修复：首先检查这个 video:ended 事件是否已经被处理过
          if (videoEndedHandledRef.current) {
            return;
          }

          // 🔑 检查是否已经通过 SkipController 触发了下一集，避免重复触发
          if (isSkipControllerTriggeredRef.current) {
            videoEndedHandledRef.current = true;
            // 🔥 关键修复：延迟重置标志，等待新集数开始加载
            setTimeout(() => {
              isSkipControllerTriggeredRef.current = false;
            }, 2000);
            return;
          }

          const d = detailRef.current;
          if (d && d.episodes && idx < d.episodes.length - 1) {
            videoEndedHandledRef.current = true;
            const nextIndex = idx + 1;
            const nextEp = d.episodes[nextIndex];
            const isShortDrama = currentSourceRef.current === 'shortdrama';

            if (isShortDrama) {
              // 短剧模式：无等待立即连播（类似抖音/红果体验）
              const toast = document.createElement('div');
              toast.textContent = `▶ ${d.episodes_titles?.[nextIndex] || `第 ${nextIndex + 1} 集`}`;
              toast.style.cssText =
                'position:absolute;bottom:80px;left:50%;transform:translateX(-50%);padding:6px 16px;border-radius:20px;background:rgba(0,0,0,0.7);color:white;font-size:12px;z-index:999;backdrop-filter:blur(10px);white-space:nowrap;transition:opacity 0.3s;';
              artPlayerRef.current?.container?.appendChild(toast);
              setTimeout(() => {
                if (toast.parentNode) {
                  toast.style.opacity = '0';
                  setTimeout(() => toast.remove(), 300);
                }
              }, 800);
              // 立即跳转下一集
              replacePlaybackUrlParams({ index: String(nextIndex) });
              setCurrentEpisodeIndex(nextIndex);
            } else {
              // 普通模式：3秒倒计时
              const notice = document.createElement('div');
              notice.textContent = `${nextEp || `第 ${nextIndex + 1} 集`} - 3秒后自动播放`;
              notice.style.cssText =
                'position:absolute;bottom:60px;left:50%;transform:translateX(-50%);padding:10px 20px;border-radius:10px;background:rgba(0,0,0,0.8);color:white;font-size:14px;z-index:999;backdrop-filter:blur(10px);white-space:nowrap;';
              artPlayerRef.current?.container?.appendChild(notice);

              const autoPlayTimer = setTimeout(() => {
                if (notice.parentNode) notice.remove();
                replacePlaybackUrlParams({ index: String(nextIndex) });
                setCurrentEpisodeIndex(nextIndex);
              }, 3000);

              notice.addEventListener('click', () => {
                if (notice.parentNode) notice.remove();
                clearTimeout(autoPlayTimer);
                videoEndedHandledRef.current = false;
              });
            }
          }
        });

        // 合并的timeupdate监听器 - 处理跳过片头片尾和保存进度
        artPlayerRef.current.on('video:timeupdate', () => {
          const currentTime = artPlayerRef.current.currentTime || 0;
          const duration = artPlayerRef.current.duration || 0;
          const now = performance.now(); // 使用performance.now()更精确

          // 更新 SkipController 所需的时间信息
          setCurrentPlayTime(currentTime);
          setVideoDuration(duration);

          // 保存播放进度逻辑 - 优化保存间隔以减少网络开销
          const saveNow = Date.now();
          // 🔧 优化：增加播放中的保存间隔，依赖暂停时保存作为主要保存时机
          // upstash: 60秒兜底保存，其他存储: 30秒兜底保存
          // 用户暂停、切换集数、页面卸载时会立即保存，因此较长间隔不影响体验
          const interval =
            process.env.NEXT_PUBLIC_STORAGE_TYPE === 'upstash' ? 60000 : 30000;

          // 🔥 关键修复：如果当前播放位置接近视频结尾（最后3分钟），不保存进度
          // 这是为了避免自动跳过片尾时保存了片尾位置的进度，导致"继续观看"从错误位置开始
          const remainingTime = duration - currentTime;
          const isNearEnd = duration > 0 && remainingTime < 180; // 最后3分钟

          if (saveNow - lastSaveTimeRef.current > interval && !isNearEnd) {
            saveCurrentPlayProgress();
            lastSaveTimeRef.current = saveNow;
          }
        });

        // Long-press to 2x speed
        {
          let longPressTimer = null;
          let isLongPress = false;
          let originalSpeed = 1;

          artPlayerRef.current.container?.addEventListener(
            'touchstart',
            () => {
              isLongPress = false;
              originalSpeed = artPlayerRef.current.playbackRate || 1;
              longPressTimer = setTimeout(() => {
                isLongPress = true;
                artPlayerRef.current.playbackRate = 2;
                const indicator = document.createElement('div');
                indicator.textContent = '⚡ 2x';
                indicator.style.cssText =
                  'position:absolute;top:10px;right:10px;padding:4px 10px;border-radius:6px;background:rgba(244,194,77,0.9);color:#111;font-size:12px;font-weight:bold;z-index:999;pointer-events:none;';
                indicator.className = 'long-press-speed-indicator';
                artPlayerRef.current.container?.appendChild(indicator);
              }, 500);
            },
            { passive: true },
          );

          artPlayerRef.current.container?.addEventListener(
            'touchend',
            () => {
              if (longPressTimer) clearTimeout(longPressTimer);
              if (isLongPress) {
                artPlayerRef.current.playbackRate = originalSpeed;
                const indicator = artPlayerRef.current.container?.querySelector(
                  '.long-press-speed-indicator',
                );
                if (indicator) indicator.remove();
              }
              isLongPress = false;
            },
            { passive: true },
          );

          artPlayerRef.current.container?.addEventListener(
            'touchmove',
            () => {
              if (longPressTimer) clearTimeout(longPressTimer);
            },
            { passive: true },
          );
        }

        if (artPlayerRef.current?.video) {
          ensureVideoSource(
            artPlayerRef.current.video as HTMLVideoElement,
            videoUrl,
          );
        }
      } catch (err) {
        console.error('创建播放器失败:', err);
        // 重置集数切换标识
        isEpisodeChangingRef.current = false;
        setError('播放器初始化失败');
      }
    }; // 结束 initPlayer 函数

    // 动态导入 ArtPlayer 并初始化
    const loadAndInit = async () => {
      try {
        const [{ default: Artplayer }, { default: artplayerPluginDanmuku }] =
          await Promise.all([
            import('artplayer'),
            import('artplayer-plugin-danmuku'),
          ]);

        // 将导入的模块设置为全局变量供 initPlayer 使用
        (window as any).DynamicArtplayer = Artplayer;
        (window as any).DynamicArtplayerPluginDanmuku = artplayerPluginDanmuku;

        await initPlayer();
      } catch (error) {
        console.error('动态导入 ArtPlayer 失败:', error);
        setError('播放器加载失败');
      }
    };

    loadAndInit();
  }, [videoUrl, loading, blockAdEnabled]);

  // 当组件卸载时清理定时器、Wake Lock 和播放器资源
  useEffect(() => {
    return () => {
      // 清理定时器
      if (saveIntervalRef.current) {
        clearInterval(saveIntervalRef.current);
      }

      // 清理弹幕重置定时器
      if (seekResetTimeoutRef.current) {
        clearTimeout(seekResetTimeoutRef.current);
      }

      // 清理resize防抖定时器
      if (resizeResetTimeoutRef.current) {
        clearTimeout(resizeResetTimeoutRef.current);
      }

      // 清理 autoplay 首次交互的 document click 监听器
      if (firstInteractionHandlerRef.current) {
        document.removeEventListener(
          'click',
          firstInteractionHandlerRef.current,
        );
        firstInteractionHandlerRef.current = null;
      }

      // 释放 Wake Lock
      releaseWakeLock();

      // 清理WebSR
      destroyWebSR();

      // 销毁播放器实例
      cleanupPlayer();
    };
  }, []);

  // 当 URL 参数变化时清理旧的播放器实例
  useEffect(() => {
    const currentSource = searchParams.get('source');
    const currentId = searchParams.get('id');
    const currentKey = `${currentSource}_${currentId}`;

    // 如果视频源或ID变化，清理旧播放器
    return () => {
      if (artPlayerRef.current) {
        // // console.log('[Play] URL参数变化，清理旧播放器');
        cleanupPlayer();
      }
    };
  }, [searchParams.get('source'), searchParams.get('id'), reloadTrigger]);

  // 返回顶部功能相关
  useEffect(() => {
    // 获取滚动位置的函数 - 专门针对 body 滚动
    const getScrollTop = () => {
      return document.body.scrollTop || 0;
    };

    // 使用 requestAnimationFrame 持续检测滚动位置
    let isRunning = false;
    const checkScrollPosition = () => {
      if (!isRunning) return;

      const scrollTop = getScrollTop();
      const shouldShow = scrollTop > 300;
      setShowBackToTop(shouldShow);

      requestAnimationFrame(checkScrollPosition);
    };

    // 启动持续检测
    isRunning = true;
    checkScrollPosition();

    // 监听 body 元素的滚动事件
    const handleScroll = () => {
      const scrollTop = getScrollTop();
      setShowBackToTop(scrollTop > 300);
    };

    document.body.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      isRunning = false; // 停止 requestAnimationFrame 循环
      // 移除 body 滚动事件监听器
      document.body.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // 返回顶部功能
  const scrollToTop = () => {
    try {
      // 根据调试结果，真正的滚动容器是 document.body
      document.body.scrollTo({
        top: 0,
        behavior: 'smooth',
      });
    } catch (error) {
      // 如果平滑滚动完全失败，使用立即滚动
      document.body.scrollTop = 0;
    }
  };

  if (loading) {
    return (
      <LoadingScreen
        loadingStage={loadingStage}
        loadingMessage={loadingMessage}
        speedTestProgress={speedTestProgress}
      />
    );
  }

  if (error) {
    return (
      <PageLayout activePath='/play'>
        <PlayErrorDisplay error={error} videoTitle={videoTitle} />
      </PageLayout>
    );
  }

  return (
    <>
      {/* 短剧竖屏模式 - 移动端全屏 */}
      {isMobileGlobal &&
        currentSourceRef.current === 'shortdrama' &&
        detail && (
          <ShortDramaVerticalPlayer
            episodes={detail.episodes || []}
            episodesTitles={detail.episodes_titles || []}
            currentIndex={currentEpisodeIndex}
            onEpisodeChange={handleEpisodeChange}
            title={videoTitle || detail.title || ''}
            poster={detail.poster}
            onFavorite={handleToggleFavorite}
            isFavorited={favorited}
            onShare={() => {
              if (navigator.share) {
                navigator.share({
                  title: videoTitle,
                  url: window.location.href,
                });
              }
            }}
            onDownload={() => setShowDownloadEpisodeSelector(true)}
          />
        )}

      {/* 原有播放器布局 - PC端或非短剧内容 */}
      {!(isMobileGlobal && currentSourceRef.current === 'shortdrama') && (
        <PageLayout activePath='/play'>
          <div className='flex flex-col gap-3 py-4 px-4 sm:px-5 lg:px-[3rem] 2xl:px-20'>
            {/* 第一行：影片标题 */}
            <div className='py-1'>
              <h1 className='text-lg sm:text-xl font-semibold text-gray-900 dark:text-gray-100 truncate'>
                {videoTitle || '影片标题'}
                {totalEpisodes > 1 && (
                  <span className='text-gray-500 dark:text-gray-400'>
                    {` > ${detail?.episodes_titles?.[currentEpisodeIndex] || `第 ${currentEpisodeIndex + 1} 集`}`}
                  </span>
                )}
              </h1>
            </div>
            {/* 第二行：播放器和选集 */}
            <div className='space-y-2'>
              {/* 折叠控制 */}
              <div className='flex justify-end items-center gap-2 sm:gap-3'>
                {/* 网盘资源按钮 */}
                <NetDiskButton
                  videoTitle={videoTitle}
                  netdiskLoading={netdiskLoading}
                  netdiskTotal={netdiskTotal}
                  netdiskResults={netdiskResults}
                  onSearch={handleNetDiskSearch}
                  onOpenModal={() => setShowNetdiskModal(true)}
                />

                {/* 下载按钮 - 使用独立组件优化性能 */}
                <DownloadButtons
                  downloadEnabled={downloadEnabled}
                  onDownloadClick={() => setShowDownloadEpisodeSelector(true)}
                  onDownloadPanelClick={() => setShowDownloadPanel(true)}
                />

                {/* 外部播放器按钮 */}
                <ExternalPlayerButton
                  videoUrl={videoUrl}
                  videoTitle={videoTitle}
                  enabled={enableExternalPlayer}
                />

                {/* 折叠控制按钮 - 仅在 lg 及以上屏幕显示 */}
                <CollapseButton
                  isCollapsed={isEpisodeSelectorCollapsed}
                  onToggle={() =>
                    setIsEpisodeSelectorCollapsed(!isEpisodeSelectorCollapsed)
                  }
                />
              </div>

              <div
                className={`grid gap-4 lg:h-[500px] xl:h-[650px] 2xl:h-[750px] transition-all duration-300 ease-in-out ${
                  isEpisodeSelectorCollapsed
                    ? 'grid-cols-1'
                    : 'grid-cols-1 lg:grid-cols-4'
                }`}
              >
                {/* 播放器 */}
                <div
                  className={`h-full transition-all duration-300 ease-in-out rounded-xl border border-white/0 dark:border-white/30 ${
                    isEpisodeSelectorCollapsed ? 'col-span-1' : 'md:col-span-3'
                  }`}
                >
                  <div className='relative w-full h-[40vh] sm:h-[45vh] md:h-[50vh] lg:h-full min-h-[200px] sm:min-h-[240px]'>
                    <div
                      ref={artRef}
                      className='bg-black w-full h-full rounded-xl shadow-lg'
                    ></div>

                    {/* WebSR 分屏对比分割线 */}
                    {websrEnabled && websrCompareEnabled && (
                      <div
                        style={{
                          position: 'absolute',
                          left: `${websrComparePosition}%`,
                          top: 0,
                          bottom: 0,
                          width: '4px',
                          backgroundColor: 'white',
                          cursor: 'col-resize',
                          zIndex: 10,
                          transform: 'translateX(-50%)',
                        }}
                        onPointerDown={(e) => {
                          e.currentTarget.setPointerCapture(e.pointerId);
                        }}
                        onPointerMove={(e) => {
                          if (!e.currentTarget.hasPointerCapture(e.pointerId))
                            return;
                          const rect =
                            e.currentTarget.parentElement?.getBoundingClientRect();
                          if (!rect) return;
                          const x = e.clientX - rect.left;
                          const pct = Math.max(
                            0,
                            Math.min(100, (x / rect.width) * 100),
                          );
                          setWebsrComparePosition(pct);
                        }}
                      >
                        <div
                          style={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            backgroundColor: 'rgba(255,255,255,0.9)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '16px',
                            color: '#333',
                          }}
                        >
                          ↔
                        </div>
                      </div>
                    )}

                    {/* 跳过设置按钮 - 播放器内右上角 */}
                    {currentSource && currentId && (
                      <div className='absolute top-4 right-4 z-10'>
                        <SkipSettingsButton
                          onClick={() => setIsSkipSettingOpen(true)}
                        />
                      </div>
                    )}

                    {/* SkipController 组件 */}
                    {currentSource && currentId && detail?.title && (
                      <SkipController
                        source={currentSource}
                        id={currentId}
                        title={detail.title}
                        episodeIndex={currentEpisodeIndex}
                        artPlayerRef={artPlayerRef}
                        currentTime={currentPlayTime}
                        duration={videoDuration}
                        isSettingMode={isSkipSettingOpen}
                        onSettingModeChange={setIsSkipSettingOpen}
                        onNextEpisode={handleNextEpisode}
                      />
                    )}

                    {/* 换源加载蒙层 */}
                    <VideoLoadingOverlay
                      isVisible={isVideoLoading}
                      loadingStage={videoLoadingStage}
                    />
                  </div>
                </div>

                {/* 选集和换源 - 移动端可折叠以腾出播放器空间 */}
                <div
                  className={`md:overflow-hidden transition-all duration-300 ease-in-out ${
                    isEpisodeSelectorCollapsed
                      ? 'max-h-0 opacity-0 md:max-h-0 lg:hidden lg:opacity-0 lg:scale-95 md:col-span-1'
                      : 'max-h-[50vh] md:max-h-none lg:max-h-none lg:h-full lg:opacity-100 lg:scale-100 md:col-span-1'
                  }`}
                >
                  <EpisodeSelector
                    totalEpisodes={totalEpisodes}
                    episodes_titles={detail?.episodes_titles || []}
                    value={currentEpisodeIndex + 1}
                    onChange={handleEpisodeChange}
                    onSourceChange={handleSourceChange}
                    currentSource={currentSource}
                    currentId={currentId}
                    videoTitle={searchTitle || videoTitle}
                    availableSources={filterInvalidSources(
                      availableSources,
                    ).filter((source) => {
                      // 必须有集数数据（所有源包括短剧源都必须满足）
                      if (!source.episodes || source.episodes.length < 1)
                        return false;

                      // 短剧源不受集数差异限制（但必须有集数数据）
                      if (source.source === 'shortdrama') return true;

                      // 如果当前有 detail，只显示集数相近的源（允许 ±30% 的差异）
                      if (
                        detail &&
                        detail.episodes &&
                        detail.episodes.length > 0
                      ) {
                        const currentEpisodes = detail.episodes.length;
                        const sourceEpisodes = source.episodes.length;
                        const tolerance = Math.max(
                          5,
                          Math.ceil(currentEpisodes * 0.3),
                        ); // 至少5集的容差

                        // 在合理范围内
                        return (
                          Math.abs(sourceEpisodes - currentEpisodes) <=
                          tolerance
                        );
                      }

                      return true;
                    })}
                    sourceSearchLoading={sourceSearchLoading}
                    sourceSearchError={sourceSearchError}
                    precomputedVideoInfo={precomputedVideoInfo}
                  />

                  {/* 上一集/下一集按钮 - 移动端友好 */}
                  {totalEpisodes > 1 && (
                    <div className='flex gap-2 mt-3'>
                      <button
                        onClick={handlePreviousEpisode}
                        disabled={currentEpisodeIndex <= 0}
                        className='flex-1 flex items-center justify-center gap-1.5 py-3.5 sm:py-4 min-h-[44px] rounded-lg text-sm font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors'
                      >
                        <span>◀</span> 上一集
                      </button>
                      <button
                        onClick={handleNextEpisode}
                        disabled={currentEpisodeIndex >= totalEpisodes - 1}
                        className='flex-1 flex items-center justify-center gap-1.5 py-3.5 sm:py-4 min-h-[44px] rounded-lg text-sm font-medium bg-green-500 text-white hover:bg-green-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors'
                      >
                        下一集 <span>▶</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className='mt-4'>
              <SiteAdSlot position='play_sidebar' />
            </div>

            {/* 详情展示 */}
            <div className='grid grid-cols-1 md:grid-cols-4 gap-4'>
              {/* 文字区 - 使用独立组件优化性能 */}
              <VideoInfoSection
                videoTitle={videoTitle}
                videoYear={videoYear}
                videoCover={videoCover}
                videoDoubanId={videoDoubanId}
                currentSource={currentSource}
                favorited={favorited}
                onToggleFavorite={handleToggleFavorite}
                detail={detail}
                movieDetails={movieDetails}
                bangumiDetails={bangumiDetails}
                shortdramaDetails={shortdramaDetails}
                movieComments={movieComments}
                commentsError={commentsError?.message || null}
                loadingMovieDetails={loadingMovieDetails}
                loadingBangumiDetails={loadingBangumiDetails}
                loadingComments={loadingComments}
                loadingCelebrityWorks={loadingCelebrityWorks}
                selectedCelebrityName={selectedCelebrityName}
                celebrityWorks={celebrityWorks}
                onCelebrityClick={handleCelebrityClick}
                onClearCelebrity={() => {
                  setSelectedCelebrityName(null);
                  setCelebrityWorks([]);
                }}
                processImageUrl={processImageUrl}
              />

              {/* AI 影片摘要 */}
              <div className='md:col-span-3'>
                <div className='rounded-xl sm:rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm backdrop-blur-sm dark:border-gray-700 dark:bg-white/[0.04] sm:p-5'>
                  <div className='flex items-center justify-between mb-3'>
                    <h3 className='text-sm font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2'>
                      <span className='text-purple-500'>🤖</span> AI 摘要
                    </h3>
                    {!aiSummary && !aiSummaryLoading && (
                      <button
                        onClick={async () => {
                          setAiSummaryLoading(true);
                          try {
                            const res = await fetch(
                              `/api/ai-summary?title=${encodeURIComponent(videoTitle || '')}&description=${encodeURIComponent(detail?.desc || '')}&year=${encodeURIComponent(videoYear || '')}`,
                            );
                            if (res.ok) {
                              const data = await res.json();
                              setAiSummary(data);
                            }
                          } catch {}
                          setAiSummaryLoading(false);
                        }}
                        className='text-xs text-purple-500 hover:text-purple-600 dark:text-purple-400'
                      >
                        生成摘要
                      </button>
                    )}
                  </div>
                  {aiSummaryLoading && (
                    <div className='space-y-2'>
                      <div className='h-4 bg-gray-200 dark:bg-gray-700 rounded animate-[fluent2-shimmer_1.5s_ease-in-out_infinite] w-full' />
                      <div className='h-4 bg-gray-200 dark:bg-gray-700 rounded animate-[fluent2-shimmer_1.5s_ease-in-out_infinite] w-3/4' />
                    </div>
                  )}
                  {aiSummary && (
                    <div className='space-y-3'>
                      <p className='text-sm text-gray-600 dark:text-gray-400'>
                        {aiSummary.summary}
                      </p>
                      {aiSummary.highlights.length > 0 && (
                        <div className='flex flex-wrap gap-1.5'>
                          {aiSummary.highlights.map((h, i) => (
                            <span
                              key={h}
                              className='px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full text-xs'
                            >
                              {h}
                            </span>
                          ))}
                        </div>
                      )}
                      {aiSummary.review && (
                        <p className='text-xs text-gray-500 dark:text-gray-400 italic'>
                          「{aiSummary.review}」
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* 封面展示 */}
              <VideoCoverDisplay
                videoCover={videoCover}
                bangumiDetails={bangumiDetails}
                videoTitle={videoTitle}
                videoDoubanId={videoDoubanId}
              />
            </div>

            {/* 用户评价 */}
            {currentId && currentSource && (
              <div className='mt-4'>
                <ReviewSection
                  videoId={currentId}
                  videoSource={currentSource}
                />
              </div>
            )}
          </div>

          {/* 返回顶部悬浮按钮 - 使用独立组件优化性能 */}
          <BackToTopButton show={showBackToTop} onClick={scrollToTop} />

          {/* 源切换确认对话框 */}
          <SourceSwitchDialog
            show={showSourceSwitchDialog && !!pendingOwnerState}
            ownerSource={pendingOwnerState?.source || ''}
            onConfirm={handleConfirmSourceSwitch}
            onCancel={handleCancelSourceSwitch}
          />

          {/* 房主切换视频/集数确认框 */}
          <OwnerChangeDialog
            show={!!pendingOwnerChange}
            videoName={pendingOwnerChange?.videoName || ''}
            episode={pendingOwnerChange?.episode || 0}
            onConfirm={confirmFollowOwner}
            onReject={rejectFollowOwner}
          />

          {/* 🎨 美化的弹幕设置面板 - Portal 到 ArtPlayer $player 支持全屏 */}
          {isDanmuSettingsPanelOpen &&
            portalContainer &&
            createPortal(
              <div
                style={{
                  all: 'initial',
                  fontFamily: 'Inter, system-ui, sans-serif',
                  position: 'fixed',
                  inset: 0,
                  pointerEvents: 'none',
                  zIndex: 9999,
                }}
              >
                <style>{`.danmu-iso svg { fill: none !important; }`}</style>
                <div className='danmu-iso' style={{ pointerEvents: 'auto' }}>
                  <DanmuSettingsPanel
                    isOpen={isDanmuSettingsPanelOpen}
                    onClose={() => setIsDanmuSettingsPanelOpen(false)}
                    settings={{
                      enabled: externalDanmuEnabled, // 启用弹幕主开关
                      fontSize: parseInt(
                        localStorage.getItem('danmaku_fontSize') || '25',
                      ),
                      speed: parseFloat(
                        localStorage.getItem('danmaku_speed') || '5',
                      ),
                      opacity: parseFloat(
                        localStorage.getItem('danmaku_opacity') || '0.8',
                      ),
                      margin: JSON.parse(
                        localStorage.getItem('danmaku_margin') || '[10, "75%"]',
                      ),
                      modes: JSON.parse(
                        localStorage.getItem('danmaku_modes') || '[0, 1, 2]',
                      ) as Array<0 | 1 | 2>,
                      antiOverlap:
                        localStorage.getItem('danmaku_antiOverlap') !== null
                          ? localStorage.getItem('danmaku_antiOverlap') ===
                            'true'
                          : true, // 默认开启防重叠
                      visible:
                        localStorage.getItem('danmaku_visible') !== 'false',
                    }}
                    matchInfo={
                      detail?.title && currentEpisodeIndex >= 0
                        ? {
                            animeTitle: detail.title,
                            episodeTitle: `第 ${currentEpisodeIndex + 1} 集`,
                          }
                        : null
                    }
                    onSettingsChange={(newSettings) => {
                      // 更新启用状态
                      if (newSettings.enabled !== undefined) {
                        handleDanmuOperationOptimized(newSettings.enabled);
                      }

                      // 更新 localStorage
                      if (newSettings.fontSize !== undefined) {
                        localStorage.setItem(
                          'danmaku_fontSize',
                          String(newSettings.fontSize),
                        );
                      }
                      if (newSettings.speed !== undefined) {
                        localStorage.setItem(
                          'danmaku_speed',
                          String(newSettings.speed),
                        );
                      }
                      if (newSettings.opacity !== undefined) {
                        localStorage.setItem(
                          'danmaku_opacity',
                          String(newSettings.opacity),
                        );
                      }
                      if (newSettings.margin !== undefined) {
                        localStorage.setItem(
                          'danmaku_margin',
                          JSON.stringify(newSettings.margin),
                        );
                      }
                      if (newSettings.modes !== undefined) {
                        localStorage.setItem(
                          'danmaku_modes',
                          JSON.stringify(newSettings.modes),
                        );
                      }
                      if (newSettings.antiOverlap !== undefined) {
                        localStorage.setItem(
                          'danmaku_antiOverlap',
                          String(newSettings.antiOverlap),
                        );
                      }
                      if (newSettings.visible !== undefined) {
                        localStorage.setItem(
                          'danmaku_visible',
                          String(newSettings.visible),
                        );
                      }

                      // 实时更新弹幕插件配置
                      if (
                        artPlayerRef.current?.plugins?.artplayerPluginDanmuku
                      ) {
                        artPlayerRef.current.plugins.artplayerPluginDanmuku.config(
                          newSettings,
                        );

                        // 处理显示/隐藏
                        if (newSettings.visible !== undefined) {
                          if (newSettings.visible) {
                            artPlayerRef.current.plugins.artplayerPluginDanmuku.show();
                          } else {
                            artPlayerRef.current.plugins.artplayerPluginDanmuku.hide();
                          }
                        }
                      }

                      // 触发面板重新读取设置（通过 key 变化）
                    }}
                    danmuCount={danmuList.length} // 使用state而不是ref，确保React能追踪变化
                    loading={danmuLoading}
                    loadMeta={danmuLoadMeta}
                    error={danmuError}
                    onReload={async () => {
                      // 重新加载外部弹幕（强制刷新）
                      const result = await loadExternalDanmu({ force: true });
                      if (
                        artPlayerRef.current?.plugins?.artplayerPluginDanmuku
                      ) {
                        const danmuPlugin =
                          artPlayerRef.current.plugins.artplayerPluginDanmuku;
                        danmuPlugin.load(); // 清空已有弹幕
                        danmuPlugin.load(result.data);
                        if (result.count > 0) {
                          artPlayerRef.current.notice.show = `已加载 ${result.count} 条弹幕`;
                        } else {
                          artPlayerRef.current.notice.show = '暂无弹幕数据';
                        }
                      }
                      return result.count;
                    }}
                    isManualOverridden={!!activeManualDanmuOverride}
                    onManualMatch={() => {
                      setIsDanmuSettingsPanelOpen(false);
                      setIsDanmuManualModalOpen(true);
                    }}
                    onClearManualMatch={async () => {
                      setManualDanmuOverrides((prev) => {
                        const next = { ...prev };
                        delete next[danmuScopeKey];
                        return next;
                      });
                      // Reload with auto matching
                      const result = await loadExternalDanmu({
                        force: true,
                        manualOverride: null,
                      });
                      if (
                        artPlayerRef.current?.plugins?.artplayerPluginDanmuku
                      ) {
                        const danmuPlugin =
                          artPlayerRef.current.plugins.artplayerPluginDanmuku;
                        danmuPlugin.load(); // 清空已有弹幕
                        danmuPlugin.load(result.data);
                        artPlayerRef.current.notice.show =
                          result.count > 0
                            ? `已恢复自动匹配，加载 ${result.count} 条弹幕`
                            : '已恢复自动匹配，暂无弹幕';
                      }
                    }}
                  />
                </div>
              </div>,
              portalContainer,
            )}

          {/* 手动匹配弹幕弹窗 */}
          <DanmuManualMatchModal
            isOpen={isDanmuManualModalOpen}
            defaultKeyword={videoTitle}
            currentEpisode={currentEpisodeIndex + 1}
            portalContainer={portalContainer}
            onClose={() => setIsDanmuManualModalOpen(false)}
            onApply={async (selection) => {
              setManualDanmuOverrides((prev) => ({
                ...prev,
                [danmuScopeKey]: selection,
              }));
              setIsDanmuManualModalOpen(false);

              const override: DanmuManualOverride = {
                animeId: selection.animeId,
                episodeId: selection.episodeId,
                animeTitle: selection.animeTitle,
                episodeTitle: selection.episodeTitle,
              };
              const result = await loadExternalDanmu({
                force: true,
                manualOverride: override,
              });
              if (artPlayerRef.current?.plugins?.artplayerPluginDanmuku) {
                const danmuPlugin =
                  artPlayerRef.current.plugins.artplayerPluginDanmuku;
                danmuPlugin.load(); // 清空已有弹幕
                danmuPlugin.load(result.data);
                artPlayerRef.current.notice.show =
                  result.count > 0
                    ? `已手动匹配: ${selection.animeTitle} · ${selection.episodeTitle} (${result.count} 条)`
                    : `已手动匹配，但该集暂无弹幕`;
              }
            }}
          />

          {/* WebSR 设置面板 */}
          {isWebSRSettingsPanelOpen &&
            portalContainer &&
            createPortal(
              <div
                style={{
                  all: 'initial',
                  fontFamily: 'Inter, system-ui, sans-serif',
                  position: 'fixed',
                  inset: 0,
                  pointerEvents: 'none',
                  zIndex: 9999,
                }}
              >
                <style>{`.websr-iso svg { fill: none !important; }`}</style>
                <div className='websr-iso' style={{ pointerEvents: 'auto' }}>
                  <WebSRSettingsPanel
                    isOpen={isWebSRSettingsPanelOpen}
                    onClose={() => setIsWebSRSettingsPanelOpen(false)}
                    settings={{
                      enabled: websrEnabled,
                      mode: websrMode,
                      contentType: websrContentType,
                      networkSize: websrNetworkSize,
                      compareEnabled: websrCompareEnabled,
                      comparePosition: 50,
                    }}
                    onSettingsChange={async (newSettings) => {
                      // 更新启用状态
                      if (newSettings.enabled !== undefined) {
                        await toggleWebSR(newSettings.enabled);
                      }

                      // 更新模式
                      if (newSettings.mode !== undefined) {
                        setWebsrMode(newSettings.mode);
                        localStorage.setItem('websr_mode', newSettings.mode);
                        await switchWebSRConfig();
                      }

                      // 更新内容类型
                      if (newSettings.contentType !== undefined) {
                        setWebsrContentType(newSettings.contentType);
                        localStorage.setItem(
                          'websr_content_type',
                          newSettings.contentType,
                        );
                        await switchWebSRConfig();
                      }

                      // 更新画质等级
                      if (newSettings.networkSize !== undefined) {
                        setWebsrNetworkSize(newSettings.networkSize);
                        localStorage.setItem(
                          'websr_network_size',
                          newSettings.networkSize,
                        );
                        await switchWebSRConfig();
                      }

                      // 更新对比模式
                      if (newSettings.compareEnabled !== undefined) {
                        setWebsrCompareEnabled(newSettings.compareEnabled);
                      }
                    }}
                    webGPUSupported={webGPUSupported}
                    processing={false}
                  />
                </div>
              </div>,
              portalContainer,
            )}
        </PageLayout>
      )}

      {/* 网盘资源模态框 */}
      {showNetdiskModal && (
        <div
          className='fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-0 backdrop-blur-sm md:items-center md:p-4'
          onClick={() => setShowNetdiskModal(false)}
        >
          <div
            className='flex max-h-[85vh] w-full flex-col rounded-t-[28px] border border-gray-200 dark:border-gray-700 bg-white/88 shadow-lg  dark:border-gray-700 dark:bg-gray-900 md:max-h-[90vh] md:max-w-4xl md:rounded-xl'
            onClick={(e) => e.stopPropagation()}
          >
            {/* 头部 - Fixed */}
            <div className='shrink-0 border-b border-gray-200 dark:border-gray-700 p-4 sm:p-6'>
              <div className='flex items-center justify-between mb-3'>
                <div className='flex items-center gap-2 sm:gap-3'>
                  <div className='flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300'>
                    <svg
                      className='h-5 w-5'
                      fill='none'
                      stroke='currentColor'
                      viewBox='0 0 24 24'
                    >
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={2}
                        d='M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z'
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className='text-lg sm:text-xl font-semibold text-gray-800 dark:text-gray-200'>
                      资源搜索
                    </h3>
                    {videoTitle && (
                      <p className='text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5'>
                        搜索关键词：{videoTitle}
                      </p>
                    )}
                  </div>
                  {netdiskLoading && netdiskResourceType === 'netdisk' && (
                    <span className='inline-block ml-2'>
                      <span className='inline-block h-5 w-5 sm:h-5 sm:w-5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin'></span>
                    </span>
                  )}
                  {netdiskTotal > 0 && netdiskResourceType === 'netdisk' && (
                    <span className='inline-flex items-center px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 ml-2'>
                      {netdiskTotal} 个资源
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setShowNetdiskModal(false)}
                  className='rounded-full p-1.5 transition-colors active:scale-95 hover:bg-gray-100 dark:hover:bg-gray-700 sm:p-2'
                  aria-label='关闭'
                >
                  <X className='h-5 w-5 sm:h-6 sm:w-6 text-gray-500' />
                </button>
              </div>

              {/* 资源类型切换器 - 仅当是动漫时显示 */}
              {(() => {
                const typeName = detail?.type_name?.toLowerCase() || '';
                const isAnime =
                  typeName.includes('动漫') ||
                  typeName.includes('动画') ||
                  typeName.includes('anime') ||
                  typeName.includes('番剧') ||
                  typeName.includes('日剧') ||
                  typeName.includes('韩剧');

                // // console.log(
                // '[NetDisk] type_name:',
                // detail?.type_name,
                // 'isAnime:',
                // isAnime,
                // );

                return (
                  isAnime && (
                    <div className='flex items-center gap-2'>
                      <span className='text-xs sm:text-sm text-gray-600 dark:text-gray-400'>
                        资源类型：
                      </span>
                      <div className='flex gap-2'>
                        <button
                          onClick={() => {
                            setNetdiskResourceType('netdisk');
                            setNetdiskResults(null);
                            setNetdiskError(null);
                          }}
                          className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-all sm:px-3 sm:py-1.5 sm:text-sm ${
                            netdiskResourceType === 'netdisk'
                              ? 'bg-linear-to-r from-[#f4c24d] via-[#f0b938] to-[#d89c18] border-transparent text-[#171717] shadow-md'
                              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600'
                          }`}
                        >
                          网盘资源
                        </button>
                        <button
                          onClick={() => {
                            setNetdiskResourceType('acg');
                            setNetdiskResults(null);
                            setNetdiskError(null);
                            if (videoTitle) {
                              setAcgTriggerSearch((prev) => !prev);
                            }
                          }}
                          className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-all sm:px-3 sm:py-1.5 sm:text-sm ${
                            netdiskResourceType === 'acg'
                              ? 'bg-linear-to-r from-[#f4c24d] via-[#f0b938] to-[#d89c18] border-transparent text-[#171717] shadow-md'
                              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600'
                          }`}
                        >
                          动漫磁力
                        </button>
                      </div>
                    </div>
                  )
                );
              })()}
            </div>

            {/* 内容区 - Scrollable */}
            <div
              ref={netdiskModalContentRef}
              className='flex-1 overflow-y-auto p-4 sm:p-6 relative'
            >
              {/* 根据资源类型显示不同的内容 */}
              {netdiskResourceType === 'netdisk' ? (
                <>
                  {videoTitle &&
                    !netdiskLoading &&
                    !netdiskResults &&
                    !netdiskError && (
                      <div className='flex flex-col items-center justify-center py-12 text-center sm:py-16'>
                        <div className='mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300'>
                          <svg
                            className='h-7 w-7'
                            fill='none'
                            stroke='currentColor'
                            viewBox='0 0 24 24'
                          >
                            <path
                              strokeLinecap='round'
                              strokeLinejoin='round'
                              strokeWidth={2}
                              d='M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z'
                            />
                          </svg>
                        </div>
                        <p className='text-sm sm:text-base text-gray-600 dark:text-gray-400'>
                          点击搜索按钮开始查找网盘资源
                        </p>
                        <button
                          onClick={() => handleNetDiskSearch(videoTitle)}
                          disabled={netdiskLoading}
                          className='mt-4 rounded-full bg-linear-to-r from-[#f4c24d] via-[#f0b938] to-[#d89c18] px-4 py-2 text-sm font-medium text-[#171717] shadow-md transition-transform hover:scale-[1.02] disabled:opacity-50 sm:px-6 sm:py-2.5 sm:text-base'
                        >
                          开始搜索
                        </button>
                      </div>
                    )}

                  <NetDiskSearchResults
                    results={netdiskResults}
                    loading={netdiskLoading}
                    error={netdiskError}
                    total={netdiskTotal}
                  />
                </>
              ) : (
                /* ACG 动漫磁力搜索 */
                <AcgSearch
                  keyword={videoTitle || ''}
                  triggerSearch={acgTriggerSearch}
                  onError={(error) => console.error('ACG搜索失败:', error)}
                />
              )}

              {/* 返回顶部按钮 - 统一放在外层，适用于所有资源类型 */}
              {((netdiskResourceType === 'netdisk' && netdiskTotal > 10) ||
                netdiskResourceType === 'acg') && (
                <button
                  onClick={() => {
                    if (netdiskModalContentRef.current) {
                      netdiskModalContentRef.current.scrollTo({
                        top: 0,
                        behavior: 'smooth',
                      });
                    }
                  }}
                  className='sticky bottom-6 left-full -ml-14 z-50 flex h-11 w-11 items-center justify-center rounded-full border border-gray-200 dark:border-gray-700 bg-white/82 text-gray-700 shadow-md backdrop-blur-md transition-all duration-200 hover:scale-105 hover:text-blue-600 hover:shadow-xl active:scale-95 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 sm:bottom-8 sm:-ml-16 sm:h-12 sm:w-12'
                  aria-label='返回顶部'
                >
                  <svg
                    className='w-5 h-5 sm:w-6 sm:h-6 group-hover:translate-y-[-2px] transition-transform'
                    fill='none'
                    stroke='currentColor'
                    viewBox='0 0 24 24'
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2.5}
                      d='M5 10l7-7m0 0l7 7m-7-7v18'
                    />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 下载选集面板 */}
      <DownloadEpisodeSelector
        isOpen={showDownloadEpisodeSelector}
        onClose={() => setShowDownloadEpisodeSelector(false)}
        totalEpisodes={detail?.episodes?.length || 1}
        episodesTitles={detail?.episodes_titles || []}
        videoTitle={videoTitle || '视频'}
        currentEpisodeIndex={currentEpisodeIndex}
        onDownload={async (episodeIndexes) => {
          if (!detail?.episodes || detail.episodes.length === 0) {
            // 单集视频，直接下载当前
            const currentUrl = videoUrl;
            if (!currentUrl) {
              toast.error('无法获取视频地址');
              return;
            }
            if (!currentUrl.includes('.m3u8')) {
              toast.error('仅支持M3U8格式视频下载');
              return;
            }
            try {
              // 从 M3U8 URL 提取 origin 和 referer
              const urlObj = new URL(currentUrl);
              const origin = `${urlObj.protocol}//${urlObj.host}`;
              const referer = currentUrl;

              await createTask(currentUrl, videoTitle || '视频', 'TS', {
                referer,
                origin,
              });

              // 显示 Toast 通知
              toast.success('下载已开始', {
                description: videoTitle || '视频',
                action: {
                  label: '查看下载',
                  onClick: () => setShowDownloadPanel(true),
                },
                duration: 5000,
              });
            } catch (error) {
              console.error('创建下载任务失败:', error);
              toast.error('创建下载任务失败', {
                description: (error as Error).message,
                duration: 5000,
              });
            }
            return;
          }

          // 批量下载多集 - 立即显示 toast
          const taskCount = episodeIndexes.length;
          toast.success('下载已开始', {
            description:
              taskCount === 1
                ? `${videoTitle || '视频'}_第${episodeIndexes[0] + 1}集`
                : `正在添加 ${taskCount} 个下载任务...`,
            action: {
              label: '查看下载',
              onClick: () => setShowDownloadPanel(true),
            },
            duration: 5000,
          });

          let successCount = 0;
          let hasAttempted = false;
          for (const episodeIndex of episodeIndexes) {
            hasAttempted = true;
            try {
              let episodeUrl = detail.episodes[episodeIndex];
              if (!episodeUrl) continue;

              // 检查是否为短剧格式，需要先解析
              if (episodeUrl.startsWith('shortdrama:')) {
                try {
                  const [, videoId, episode] = episodeUrl.split(':');
                  const nameParam = detail.drama_name
                    ? `&name=${encodeURIComponent(detail.drama_name)}`
                    : '';
                  const response = await fetch(
                    `/api/shortdrama/parse?id=${videoId}&episode=${episode}${nameParam}`,
                  );

                  if (response.ok) {
                    const result = await response.json();
                    episodeUrl = result.url || '';
                    if (!episodeUrl) {
                      console.warn(`第${episodeIndex + 1}集解析失败，跳过`);
                      continue;
                    }
                  } else {
                    console.warn(`第${episodeIndex + 1}集解析失败，跳过`);
                    continue;
                  }
                } catch (parseError) {
                  console.error(
                    `第${episodeIndex + 1}集短剧URL解析失败:`,
                    parseError,
                  );
                  continue;
                }
              }

              // 检查是否是M3U8
              if (!episodeUrl.includes('.m3u8')) {
                console.warn(`第${episodeIndex + 1}集不是M3U8格式，跳过`);
                continue;
              }

              const episodeName = `第${episodeIndex + 1}集`;
              const downloadTitle = `${videoTitle || '视频'}_${episodeName}`;

              // 从 M3U8 URL 提取 origin 和 referer
              const urlObj = new URL(episodeUrl);
              const origin = `${urlObj.protocol}//${urlObj.host}`;
              const referer = episodeUrl;

              await createTask(episodeUrl, downloadTitle, 'TS', {
                referer,
                origin,
              });
              successCount++;
            } catch (error) {
              console.error(`创建第${episodeIndex + 1}集下载任务失败:`, error);
            }
          }

          // 如果有失败的任务，显示错误提示
          if (successCount === 0 && hasAttempted) {
            toast.error('下载失败', {
              description: '无法创建下载任务，请查看控制台了解详情',
              duration: 5000,
            });
          } else if (successCount < taskCount) {
            toast.warning('部分任务创建失败', {
              description: `成功添加 ${successCount}/${taskCount} 个下载任务`,
              duration: 5000,
            });
          }
        }}
      />

      {/* 键盘快捷键帮助面板 */}
      {showShortcutsHelp && (
        <div
          className='fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm'
          onClick={() => setShowShortcutsHelp(false)}
        >
          <div
            className='bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full mx-4 p-6'
            onClick={(e) => e.stopPropagation()}
          >
            <div className='flex items-center justify-between mb-4'>
              <h3 className='text-lg font-bold text-gray-900 dark:text-white'>
                键盘快捷键
              </h3>
              <button
                onClick={() => setShowShortcutsHelp(false)}
                className='p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800'
              >
                ✕
              </button>
            </div>
            <div className='space-y-2 text-sm'>
              {[
                ['Space', '播放 / 暂停'],
                ['← →', '快退 / 快进 10秒'],
                ['↑ ↓', '音量 +10% / -10%'],
                ['F', '切换全屏'],
                ['Alt + ←', '上一集'],
                ['Alt + →', '下一集'],
                ['?', '显示此帮助'],
                ['Esc', '关闭帮助'],
              ].map(([key, desc]) => (
                <div
                  key={key}
                  className='flex items-center justify-between py-1.5 border-b border-gray-100 dark:border-gray-800 last:border-0'
                >
                  <kbd className='px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs font-mono text-gray-700 dark:text-gray-300'>
                    {key}
                  </kbd>
                  <span className='text-gray-600 dark:text-gray-400'>
                    {desc}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 片单管理器 */}
      <PlaylistManager
        isOpen={showPlaylistManager}
        onClose={() => setShowPlaylistManager(false)}
        currentVideo={
          currentId && currentSource && videoTitle
            ? {
                id: currentId,
                title: videoTitle,
                cover: videoCover,
                source: currentSource,
              }
            : undefined
        }
      />
    </>
  );
}

export default function PlayPage() {
  return (
    <>
      <Suspense fallback={<div>Loading...</div>}>
        <PlayPageClientWrapper />
      </Suspense>
    </>
  );
}

function PlayPageClientWrapper() {
  const searchParams = useSearchParams();
  const key = `${searchParams.get('source') || ''}+${searchParams.get('id') || ''}`;

  return <PlayPageClient key={key} />;
}
