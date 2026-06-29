/* eslint-disable react-hooks/exhaustive-deps, no-console, @next/next/no-img-element */

/* eslint-disable unused-imports/no-unused-vars */

'use client';

import Hls from 'hls.js';
import { ChevronDown, ChevronUp, Heart, Radio, Tv, X } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef, useState } from 'react';

import { debounce } from '@/lib/channel-search';
import { parseCustomTimeFormat } from '@/lib/time';
import { devicePerformance, isMobile, isSafari } from '@/lib/utils';
import { useLiveSync } from '@/hooks/useLiveSync';
import { useTabsDragScroll } from '@/hooks/useTabsDragScroll';

import EpgScrollableRow from '@/components/EpgScrollableRow';
import PageLayout from '@/components/PageLayout';

import ChannelSidebar from './components/ChannelSidebar';
import GroupSelectorModal from './components/GroupSelectorModal';
import { useAutoRefresh } from './hooks/useAutoRefresh';
import { useChannelHealth } from './hooks/useChannelHealth';
import { useCorsDetection } from './hooks/useCorsDetection';
import { useLiveFavorites } from './hooks/useLiveFavorites';
import type { GroupSortMode, LiveChannel, LiveSource } from './types';
import { parseStoredStringArray } from './utils';

// 扩展 HTMLVideoElement 类型以支持 hls 和 flv 属性
declare global {
  interface HTMLVideoElement {
    hls?: any;
    flv?: any;
  }
}

// 常量定义
const RECENT_GROUPS_STORAGE_KEY = 'liveRecentGroups';
const PINNED_GROUPS_STORAGE_KEY = 'livePinnedGroups';
const MAX_RECENT_GROUPS = 8;

function LivePageClient() {
  // -----------------------------------------------------------------------------
  // 状态变量（State）
  // -----------------------------------------------------------------------------
  const [loading, setLoading] = useState(true);
  const [loadingStage, setLoadingStage] = useState<
    'loading' | 'fetching' | 'ready'
  >('loading');
  const [loadingMessage, setLoadingMessage] = useState('正在加载直播源...');
  const [error, setError] = useState<string | null>(null);

  const searchParams = useSearchParams();
  const router = useRouter();

  // 直播源相关
  const [liveSources, setLiveSources] = useState<LiveSource[]>([]);
  const [currentSource, setCurrentSource] = useState<LiveSource | null>(null);
  const currentSourceRef = useRef<LiveSource | null>(null);
  const refreshLiveSourcesRef = useRef<(() => void) | null>(null);
  useEffect(() => {
    currentSourceRef.current = currentSource;
  }, [currentSource]);

  // 频道相关
  const [currentChannels, setCurrentChannels] = useState<LiveChannel[]>([]);
  const [currentChannel, setCurrentChannel] = useState<LiveChannel | null>(
    null,
  );
  useEffect(() => {
    currentChannelRef.current = currentChannel;
  }, [currentChannel]);

  const [needLoadSource] = useState(searchParams.get('source'));
  const [needLoadChannel] = useState(searchParams.get('id'));

  // 播放器相关
  const [videoUrl, setVideoUrl] = useState('');
  const [isVideoLoading, setIsVideoLoading] = useState(false);
  const [unsupportedType, setUnsupportedType] = useState<string | null>(null);

  // 切换直播源状态
  const [isSwitchingSource, setIsSwitchingSource] = useState(false);

  // 刷新相关状态
  const [isRefreshingSource, setIsRefreshingSource] = useState(false);

  // 🚀 直连模式相关状态
  const [directPlaybackEnabled, setDirectPlaybackEnabled] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('live-direct-playback-enabled');
      return saved ? JSON.parse(saved) : false;
    }
    return false;
  });

  // 分组相关
  const [groupedChannels, setGroupedChannels] = useState<{
    [key: string]: LiveChannel[];
  }>({});
  const [selectedGroup, setSelectedGroup] = useState<string>('');

  // Tab 切换
  const [activeTab, setActiveTab] = useState<'channels' | 'sources'>(
    'channels',
  );

  // 频道列表收起状态
  const [isChannelListCollapsed, setIsChannelListCollapsed] = useState(false);

  // 过滤后的频道列表
  const [filteredChannels, setFilteredChannels] = useState<LiveChannel[]>([]);

  // 搜索相关状态
  const [searchQuery, setSearchQuery] = useState('');
  const [currentSourceSearchResults, setCurrentSourceSearchResults] = useState<
    LiveChannel[]
  >([]);

  // 直播源搜索状态
  const [sourceSearchQuery, setSourceSearchQuery] = useState('');
  const [filteredSources, setFilteredSources] = useState<LiveSource[]>([]);

  // 分类选择器状态
  const [isGroupSelectorOpen, setIsGroupSelectorOpen] = useState(false);
  const [groupSearchQuery, setGroupSearchQuery] = useState('');

  // 新增：分类管理状态
  const [groupSortMode, setGroupSortMode] = useState<GroupSortMode>('default');
  const [recentGroups, setRecentGroups] = useState<string[]>([]);
  const [pinnedGroups, setPinnedGroups] = useState<string[]>([]);

  // 节目单信息
  const [epgData, setEpgData] = useState<{
    tvgId: string;
    source: string;
    epgUrl: string;
    logo?: string;
    programs: Array<{
      start: string;
      end: string;
      title: string;
    }>;
  } | null>(null);

  // EPG 数据加载状态
  const [isEpgLoading, setIsEpgLoading] = useState(false);

  const currentChannelRef = useRef<LiveChannel | null>(null);

  // 待同步的频道ID（用于跨直播源切换）
  const [pendingSyncChannelId, setPendingSyncChannelId] = useState<
    string | null
  >(null);

  // 频道名展开状态
  const [expandedChannels, setExpandedChannels] = useState<Set<string>>(
    new Set(),
  );

  // DVR 回放检测状态
  const [dvrDetected, setDvrDetected] = useState(false);
  const [dvrSeekableRange, setDvrSeekableRange] = useState(0);
  const [enableDvrMode, setEnableDvrMode] = useState(false); // 用户手动启用DVR模式

  // Hook calls - placed after all state/ref declarations
  const {
    autoRefreshEnabled,
    setAutoRefreshEnabled,
    autoRefreshInterval,
    setAutoRefreshInterval,
  } = useAutoRefresh({ onRefreshRef: refreshLiveSourcesRef });

  const {
    corsSupport,
    playbackMode,
    corsStats,
    testCORSSupport,
    shouldUseDirectPlayback,
  } = useCorsDetection({ directPlaybackEnabled });

  const { channelHealthMap, checkChannelHealth } = useChannelHealth({
    currentSource,
    currentSourceRef,
  });

  const { favorited, handleToggleFavorite } = useLiveFavorites({
    currentSource,
    currentChannel,
    currentSourceRef,
    currentChannelRef,
  });

  // EPG数据清洗函数 - 去除重叠的节目，保留时间较短的，只显示今日节目
  const cleanEpgData = (
    programs: Array<{ start: string; end: string; title: string }>,
  ) => {
    if (!programs || programs.length === 0) return programs;

    // 获取今日日期（只考虑年月日，忽略时间）
    const today = new Date();
    const todayStart = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
    );
    const todayEnd = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() + 1,
    );

    // 首先过滤出今日的节目（包括跨天节目）
    const todayPrograms = programs.filter((program) => {
      const programStart = parseCustomTimeFormat(program.start);
      const programEnd = parseCustomTimeFormat(program.end);

      // 获取节目的日期范围
      const programStartDate = new Date(
        programStart.getFullYear(),
        programStart.getMonth(),
        programStart.getDate(),
      );
      const programEndDate = new Date(
        programEnd.getFullYear(),
        programEnd.getMonth(),
        programEnd.getDate(),
      );

      // 如果节目的开始时间或结束时间在今天，或者节目跨越今天，都算作今天的节目
      return (
        (programStartDate >= todayStart && programStartDate < todayEnd) || // 开始时间在今天
        (programEndDate >= todayStart && programEndDate < todayEnd) || // 结束时间在今天
        (programStartDate < todayStart && programEndDate >= todayEnd) // 节目跨越今天（跨天节目）
      );
    });

    // 按开始时间排序
    const sortedPrograms = [...todayPrograms].sort((a, b) => {
      const startA = parseCustomTimeFormat(a.start).getTime();
      const startB = parseCustomTimeFormat(b.start).getTime();
      return startA - startB;
    });

    const cleanedPrograms: Array<{
      start: string;
      end: string;
      title: string;
    }> = [];

    for (let i = 0; i < sortedPrograms.length; i++) {
      const currentProgram = sortedPrograms[i];
      const currentStart = parseCustomTimeFormat(currentProgram.start);
      const currentEnd = parseCustomTimeFormat(currentProgram.end);

      // 检查是否与已添加的节目重叠
      let hasOverlap = false;

      for (const existingProgram of cleanedPrograms) {
        const existingStart = parseCustomTimeFormat(existingProgram.start);
        const existingEnd = parseCustomTimeFormat(existingProgram.end);

        // 检查时间重叠（考虑完整的日期和时间）
        if (
          (currentStart >= existingStart && currentStart < existingEnd) || // 当前节目开始时间在已存在节目时间段内
          (currentEnd > existingStart && currentEnd <= existingEnd) || // 当前节目结束时间在已存在节目时间段内
          (currentStart <= existingStart && currentEnd >= existingEnd) // 当前节目完全包含已存在节目
        ) {
          hasOverlap = true;
          break;
        }
      }

      // 如果没有重叠，则添加该节目
      if (!hasOverlap) {
        cleanedPrograms.push(currentProgram);
      } else {
        // 如果有重叠，检查是否需要替换已存在的节目
        for (let j = 0; j < cleanedPrograms.length; j++) {
          const existingProgram = cleanedPrograms[j];
          const existingStart = parseCustomTimeFormat(existingProgram.start);
          const existingEnd = parseCustomTimeFormat(existingProgram.end);

          // 检查是否与当前节目重叠（考虑完整的日期和时间）
          if (
            (currentStart >= existingStart && currentStart < existingEnd) ||
            (currentEnd > existingStart && currentEnd <= existingEnd) ||
            (currentStart <= existingStart && currentEnd >= existingEnd)
          ) {
            // 计算节目时长
            const currentDuration =
              currentEnd.getTime() - currentStart.getTime();
            const existingDuration =
              existingEnd.getTime() - existingStart.getTime();

            // 如果当前节目时间更短，则替换已存在的节目
            if (currentDuration < existingDuration) {
              cleanedPrograms[j] = currentProgram;
            }
            break;
          }
        }
      }
    }

    return cleanedPrograms;
  };

  // 播放器引用
  const artPlayerRef = useRef<any>(null);
  const artRef = useRef<HTMLDivElement | null>(null);

  // 分组标签滚动相关
  const groupContainerRef = useRef<HTMLDivElement>(null);
  const groupButtonRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const channelListRef = useRef<HTMLDivElement>(null);

  // 观影室同步 - 房主切换频道时广播，房员接收并同步
  const liveSync = useLiveSync({
    currentChannelId: currentChannel?.id || '',
    currentChannelName: currentChannel?.name || '',
    currentSourceKey: currentSource?.key || '',
    onChannelChange: (channelId: string, sourceKey: string) => {
      // 房员接收到频道切换指令
      //       // // console.log('[Live] Received channel change from owner:', {
      //         channelId,
      //         sourceKey,
      //       });

      // 1. 先切换直播源（如果不同）
      if (sourceKey && sourceKey !== currentSourceRef.current?.key) {
        const targetSource = liveSources.find((s) => s.key === sourceKey);
        if (targetSource) {
          // 这里需要先加载直播源的频道列表，然后再切换频道
          // 由于 loadChannels 是异步的，我们需要等待加载完成后再切换频道
          setCurrentSource(targetSource);
          // 保存需要切换的频道ID，在频道列表加载完成后自动切换
          setPendingSyncChannelId(channelId);
          return;
        }
      }

      // 2. 切换频道（同一直播源）
      const targetChannel = currentChannels.find((c) => c.id === channelId);
      if (targetChannel) {
        setCurrentChannel(targetChannel);
        setVideoUrl(targetChannel.url);
        // 自动滚动到选中的频道位置
        setTimeout(() => {
          scrollToChannel(targetChannel);
        }, 100);
      }
    },
  });

  // 拖拽滚动功能
  const { isDragging, dragHandlers } = useTabsDragScroll();

  // -----------------------------------------------------------------------------
  // 工具函数（Utils）
  // -----------------------------------------------------------------------------

  // 刷新直播源
  const refreshLiveSources = async () => {
    if (isRefreshingSource) return;

    refreshLiveSourcesRef.current = refreshLiveSources;
    setIsRefreshingSource(true);
    try {
      //       // // console.log('开始刷新直播源...');

      // 调用后端刷新API
      const response = await fetch('/api/admin/live/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('刷新直播源失败');
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || '刷新直播源失败');
      }

      //       // // console.log('直播源刷新成功');

      // 重新获取直播源列表
      await fetchLiveSources();
    } catch (error) {
      console.error('刷新直播源失败:', error);
      // 这里可以显示错误提示，但不设置全局error状态
    } finally {
      setIsRefreshingSource(false);
    }
  };

  // 设置自动刷新
  // 获取直播源列表
  const fetchLiveSources = async () => {
    try {
      setLoadingStage('fetching');
      setLoadingMessage('正在获取直播源...');

      // 获取 AdminConfig 中的直播源信息
      const response = await fetch('/api/live/sources');
      if (!response.ok) {
        throw new Error('获取直播源失败');
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || '获取直播源失败');
      }

      const sources = result.data;
      setLiveSources(sources);

      if (sources.length > 0) {
        // 默认选中第一个源
        const firstSource = sources[0];
        if (needLoadSource) {
          const foundSource = sources.find(
            (s: LiveSource) => s.key === needLoadSource,
          );
          if (foundSource) {
            setCurrentSource(foundSource);
            await fetchChannels(foundSource);
          } else {
            setCurrentSource(firstSource);
            await fetchChannels(firstSource);
          }
        } else {
          setCurrentSource(firstSource);
          await fetchChannels(firstSource);
        }
      }

      setLoadingStage('ready');
      setLoadingMessage('✨ 准备就绪...');

      setTimeout(() => {
        setLoading(false);
      }, 1000);
    } catch (err) {
      console.error('获取直播源失败:', err);
      // 不设置错误，而是显示空状态
      setLiveSources([]);
      setLoading(false);
    } finally {
      // 移除 URL 搜索参数中的 source 和 id
      const newSearchParams = new URLSearchParams(searchParams.toString());
      newSearchParams.delete('source');
      newSearchParams.delete('id');

      const newUrl = newSearchParams.toString()
        ? `?${newSearchParams.toString()}`
        : window.location.pathname;

      router.replace(newUrl);
    }
  };

  // 获取频道列表
  const fetchChannels = async (source: LiveSource) => {
    try {
      setIsVideoLoading(true);

      // 从 cachedLiveChannels 获取频道信息
      const response = await fetch(`/api/live/channels?source=${source.key}`);
      if (!response.ok) {
        throw new Error('获取频道列表失败');
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || '获取频道列表失败');
      }

      const channelsData = result.data;
      if (!channelsData || channelsData.length === 0) {
        // 不抛出错误，而是设置空频道列表
        setCurrentChannels([]);
        setGroupedChannels({});
        setFilteredChannels([]);

        // 更新直播源的频道数为 0
        setLiveSources((prevSources) =>
          prevSources.map((s) =>
            s.key === source.key ? { ...s, channelNumber: 0 } : s,
          ),
        );

        setIsVideoLoading(false);
        return;
      }

      // 转换频道数据格式
      const channels: LiveChannel[] = channelsData.map((channel: any) => ({
        id: channel.id,
        tvgId: channel.tvgId || channel.name,
        name: channel.name,
        logo: channel.logo,
        group: channel.group || '其他',
        url: channel.url,
      }));

      setCurrentChannels(channels);

      // 更新直播源的频道数
      setLiveSources((prevSources) =>
        prevSources.map((s) =>
          s.key === source.key ? { ...s, channelNumber: channels.length } : s,
        ),
      );

      // 默认选中第一个频道
      if (channels.length > 0) {
        if (needLoadChannel) {
          const foundChannel = channels.find(
            (c: LiveChannel) => c.id === needLoadChannel,
          );
          if (foundChannel) {
            setCurrentChannel(foundChannel);
            setVideoUrl(foundChannel.url);
            // 延迟滚动到选中的频道
            setTimeout(() => {
              scrollToChannel(foundChannel);
            }, 200);
          } else {
            setCurrentChannel(channels[0]);
            setVideoUrl(channels[0].url);
          }
        } else {
          setCurrentChannel(channels[0]);
          setVideoUrl(channels[0].url);
        }
      }

      // 按分组组织频道
      const grouped = channels.reduce(
        (acc, channel) => {
          const group = channel.group || '其他';
          if (!acc[group]) {
            acc[group] = [];
          }
          acc[group].push(channel);
          return acc;
        },
        {} as { [key: string]: LiveChannel[] },
      );

      setGroupedChannels(grouped);

      // 默认选中当前加载的channel所在的分组，如果没有则选中第一个分组
      let targetGroup = '';
      if (needLoadChannel) {
        const foundChannel = channels.find(
          (c: LiveChannel) => c.id === needLoadChannel,
        );
        if (foundChannel) {
          targetGroup = foundChannel.group || '其他';
        }
      }

      // 如果目标分组不存在，则使用第一个分组
      if (!targetGroup || !grouped[targetGroup]) {
        targetGroup = Object.keys(grouped)[0] || '';
      }

      // 先设置过滤后的频道列表，但不设置选中的分组
      setFilteredChannels(targetGroup ? grouped[targetGroup] : channels);

      // 触发模拟点击分组，让模拟点击来设置分组状态和触发滚动
      if (targetGroup) {
        // 确保切换到频道tab
        setActiveTab('channels');

        // 使用更长的延迟，确保状态更新和DOM渲染完成
        setTimeout(() => {
          simulateGroupClick(targetGroup);
        }, 500); // 增加延迟时间，确保状态更新和DOM渲染完成
      }

      // 检查是否有待同步的频道（来自观影室同步）
      if (pendingSyncChannelId) {
        const syncChannel = channels.find(
          (c: LiveChannel) => c.id === pendingSyncChannelId,
        );
        if (syncChannel) {
          //           // // console.log(
          //             '[Live] Auto-switching to synced channel:',
          //             syncChannel.name,
          //           );
          setCurrentChannel(syncChannel);
          setVideoUrl(syncChannel.url);
          // 自动滚动到选中的频道位置
          setTimeout(() => {
            scrollToChannel(syncChannel);
          }, 200);
        }
        setPendingSyncChannelId(null); // 清除待同步的频道ID
      }

      setIsVideoLoading(false);
    } catch (err) {
      console.error('获取频道列表失败:', err);
      // 不设置错误，而是设置空频道列表
      setCurrentChannels([]);
      setGroupedChannels({});
      setFilteredChannels([]);

      // 更新直播源的频道数为 0
      setLiveSources((prevSources) =>
        prevSources.map((s) =>
          s.key === source.key ? { ...s, channelNumber: 0 } : s,
        ),
      );

      setIsVideoLoading(false);
    }
  };

  // 切换直播源
  const handleSourceChange = async (source: LiveSource) => {
    try {
      // 设置切换状态，锁住频道切换器
      setIsSwitchingSource(true);

      // 首先销毁当前播放器
      cleanupPlayer();

      // 重置不支持的类型状态
      setUnsupportedType(null);

      // 清空节目单信息
      setEpgData(null);

      setCurrentSource(source);
      await fetchChannels(source);
    } catch (err) {
      console.error('切换直播源失败:', err);
      // 不设置错误，保持当前状态
    } finally {
      // 切换完成，解锁频道切换器
      setIsSwitchingSource(false);
      // 自动切换到频道 tab
      setActiveTab('channels');
    }
  };

  // 切换频道
  const handleChannelChange = async (channel: LiveChannel) => {
    // 如果正在切换直播源，则禁用频道切换
    if (isSwitchingSource) return;

    // 首先销毁当前播放器
    cleanupPlayer();

    // 重置不支持的类型状态
    setUnsupportedType(null);

    // 重置错误计数器
    keyLoadErrorCount = 0;
    lastErrorTime = 0;
    hlsNetworkRetryCount = 0;
    flvNetworkRetryCount = 0;

    setCurrentChannel(channel);
    setVideoUrl(channel.url);

    // 自动滚动到选中的频道位置
    setTimeout(() => {
      scrollToChannel(channel);
    }, 100);

    // 获取节目单信息
    if (channel.tvgId && currentSource) {
      try {
        setIsEpgLoading(true); // 开始加载 EPG 数据
        const response = await fetch(
          `/api/live/epg?source=${currentSource.key}&tvgId=${channel.tvgId}`,
        );
        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            // 清洗EPG数据，去除重叠的节目
            const cleanedData = {
              ...result.data,
              programs: cleanEpgData(result.data.programs),
            };
            setEpgData(cleanedData);
          }
        }
      } catch (error) {
        console.error('获取节目单信息失败:', error);
      } finally {
        setIsEpgLoading(false); // 无论成功失败都结束加载状态
      }
    } else {
      // 如果没有 tvgId 或 currentSource，清空 EPG 数据
      setEpgData(null);
      setIsEpgLoading(false);
    }
  };

  // 滚动到指定频道位置的函数
  const scrollToChannel = (channel: LiveChannel) => {
    if (!channelListRef.current) return;

    // 使用 data 属性来查找频道元素
    const targetElement = channelListRef.current.querySelector(
      `[data-channel-id="${channel.id}"]`,
    ) as HTMLButtonElement;

    if (targetElement) {
      // 计算滚动位置，使频道居中显示
      const container = channelListRef.current;
      const containerRect = container.getBoundingClientRect();
      const elementRect = targetElement.getBoundingClientRect();

      // 计算目标滚动位置
      const scrollTop =
        container.scrollTop +
        (elementRect.top - containerRect.top) -
        containerRect.height / 2 +
        elementRect.height / 2;

      // 平滑滚动到目标位置
      container.scrollTo({
        top: Math.max(0, scrollTop),
        behavior: 'smooth',
      });
    }
  };

  // 模拟点击分组的函数
  const simulateGroupClick = (group: string, retryCount = 0) => {
    if (!groupContainerRef.current) {
      if (retryCount < 10) {
        setTimeout(() => {
          simulateGroupClick(group, retryCount + 1);
        }, 200);
        return;
      } else {
        return;
      }
    }

    // 直接通过 data-group 属性查找目标按钮
    const targetButton = groupContainerRef.current.querySelector(
      `[data-group="${group}"]`,
    ) as HTMLButtonElement;

    if (targetButton) {
      // 手动设置分组状态，确保状态一致性
      setSelectedGroup(group);

      // 触发点击事件
      (targetButton as HTMLButtonElement).click();
    }
  };

  // 清理播放器资源的统一函数
  const cleanupPlayer = () => {
    // 重置不支持的类型状态
    setUnsupportedType(null);

    if (artPlayerRef.current) {
      try {
        // 先暂停播放
        if (artPlayerRef.current.video) {
          artPlayerRef.current.video.pause();
          artPlayerRef.current.video.src = '';
          artPlayerRef.current.video.load();
        }

        // 销毁 HLS 实例
        if (artPlayerRef.current.video && artPlayerRef.current.video.hls) {
          artPlayerRef.current.video.hls.destroy();
          artPlayerRef.current.video.hls = null;
        }

        // 销毁 FLV 实例 - 增强清理逻辑
        if (artPlayerRef.current.video && artPlayerRef.current.video.flv) {
          try {
            // 先停止加载
            if (artPlayerRef.current.video.flv.unload) {
              artPlayerRef.current.video.flv.unload();
            }
            // 销毁播放器
            artPlayerRef.current.video.flv.destroy();
            // 确保引用被清空
            artPlayerRef.current.video.flv = null;
          } catch (flvError) {
            console.warn('FLV实例销毁时出错:', flvError);
            // 强制清空引用
            artPlayerRef.current.video.flv = null;
          }
        }

        // 移除所有事件监听器
        artPlayerRef.current.off('ready');
        artPlayerRef.current.off('loadstart');
        artPlayerRef.current.off('loadeddata');
        artPlayerRef.current.off('canplay');
        artPlayerRef.current.off('waiting');
        artPlayerRef.current.off('error');

        // 销毁 ArtPlayer 实例
        artPlayerRef.current.destroy();
        artPlayerRef.current = null;
      } catch (err) {
        console.warn('清理播放器资源时出错:', err);
        artPlayerRef.current = null;
      }
    }
  };

  // 确保视频源正确设置
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

  // 新增：持久化最近访问分组
  const persistRecentGroups = (nextGroups: string[]) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(RECENT_GROUPS_STORAGE_KEY, JSON.stringify(nextGroups));
  };

  // 新增：持久化置顶分组
  const persistPinnedGroups = (nextGroups: string[]) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(PINNED_GROUPS_STORAGE_KEY, JSON.stringify(nextGroups));
  };

  // 新增：添加到最近访问
  const pushRecentGroup = (group: string) => {
    setRecentGroups((prevGroups) => {
      const nextGroups = [group, ...prevGroups.filter((item) => item !== group)]
        .filter(Boolean)
        .slice(0, MAX_RECENT_GROUPS);
      persistRecentGroups(nextGroups);
      return nextGroups;
    });
  };

  // 新增：切换置顶分组
  const handlePinnedGroupToggle = (group: string) => {
    setPinnedGroups((prevGroups) => {
      const exists = prevGroups.includes(group);
      const nextGroups = exists
        ? prevGroups.filter((item) => item !== group)
        : [group, ...prevGroups];
      persistPinnedGroups(nextGroups);
      return nextGroups;
    });
  };

  // 切换分组
  const handleGroupChange = (
    group: string,
    options?: { preserveSearch?: boolean; skipRecent?: boolean },
  ) => {
    // 如果正在切换直播源，则禁用分组切换
    if (isSwitchingSource) return;

    // 清空搜索框（除非指定保留）
    if (!options?.preserveSearch) {
      setSearchQuery('');
    }

    setSelectedGroup(group);
    const filtered = currentChannels.filter(
      (channel) => channel.group === group,
    );
    setFilteredChannels(filtered);

    // 添加到最近访问（除非指定跳过）
    if (!options?.skipRecent) {
      pushRecentGroup(group);
    }

    // 如果当前选中的频道在新的分组中，自动滚动到该频道位置
    if (
      currentChannel &&
      filtered.some((channel) => channel.id === currentChannel.id)
    ) {
      setTimeout(() => {
        scrollToChannel(currentChannel);
      }, 100);
    } else {
      // 否则滚动到频道列表顶端
      if (channelListRef.current) {
        channelListRef.current.scrollTo({
          top: 0,
          behavior: 'smooth',
        });
      }
    }
  };

  // 简化的搜索频道（只在当前源内搜索）
  const searchCurrentSourceChannels = (query: string) => {
    if (!query.trim()) {
      setCurrentSourceSearchResults([]);
      return;
    }

    const normalizedQuery = query.toLowerCase();
    const results = currentChannels.filter(
      (channel) =>
        channel.name.toLowerCase().includes(normalizedQuery) ||
        channel.group.toLowerCase().includes(normalizedQuery),
    );
    setCurrentSourceSearchResults(results);
  };

  // 防抖搜索
  const debouncedSearch = debounce(searchCurrentSourceChannels, 300);

  // 处理搜索输入
  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    debouncedSearch(query);
  };

  // 搜索直播源
  const searchLiveSources = (query: string) => {
    if (!query.trim()) {
      setFilteredSources(liveSources);
      return;
    }

    const normalizedQuery = query.toLowerCase();
    const results = liveSources.filter(
      (source) =>
        source.name.toLowerCase().includes(normalizedQuery) ||
        source.key.toLowerCase().includes(normalizedQuery),
    );
    setFilteredSources(results);
  };

  // 防抖搜索直播源
  const debouncedSourceSearch = debounce(searchLiveSources, 300);

  // 处理直播源搜索输入
  const handleSourceSearchChange = (query: string) => {
    setSourceSearchQuery(query);
    debouncedSourceSearch(query);
  };

  // 切换频道名展开状态
  const toggleChannelNameExpanded = (channelId: string) => {
    setExpandedChannels((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(channelId)) {
        newSet.delete(channelId);
      } else {
        newSet.add(channelId);
      }
      return newSet;
    });
  };

  // 切换收藏
  // 初始化
  useEffect(() => {
    fetchLiveSources();

    // 初始化最近访问分组
    const savedRecentGroups = parseStoredStringArray(
      localStorage.getItem(RECENT_GROUPS_STORAGE_KEY),
    ).slice(0, MAX_RECENT_GROUPS);
    setRecentGroups(savedRecentGroups);

    // 初始化置顶分组
    const savedPinnedGroups = parseStoredStringArray(
      localStorage.getItem(PINNED_GROUPS_STORAGE_KEY),
    );
    setPinnedGroups(savedPinnedGroups);
  }, []);

  // 只在用户开始搜索时才加载跨源数据，而不是页面加载时就加载
  // useEffect(() => {
  //   if (liveSources.length > 0) {
  //     loadAllChannelsAcrossSources();
  //   }
  // }, [liveSources]);

  // 当 liveSources 改变时，更新 filteredSources
  useEffect(() => {
    if (!sourceSearchQuery.trim()) {
      setFilteredSources(liveSources);
    } else {
      searchLiveSources(sourceSearchQuery);
    }
  }, [liveSources]);

  // 当分组切换时，将激活的分组标签滚动到视口中间
  useEffect(() => {
    if (!selectedGroup || !groupContainerRef.current) return;

    const groupKeys = Object.keys(groupedChannels);
    const groupIndex = groupKeys.indexOf(selectedGroup);
    if (groupIndex === -1) return;

    const btn = groupButtonRefs.current[groupIndex];
    if (btn) {
      // 使用原生 scrollIntoView API 自动滚动到视口中央
      btn.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center', // 水平居中显示选中的分组
      });
    }
  }, [selectedGroup, groupedChannels]);

  class CustomHlsJsLoader extends Hls.DefaultConfig.loader {
    constructor(config: any) {
      super(config);
      const load = this.load.bind(this);
      this.load = function (context: any, config: any, callbacks: any) {
        // 所有的请求都带一个 source 参数
        try {
          const url = new URL(context.url);
          url.searchParams.set(
            '5572tv-source',
            currentSourceRef.current?.key || '',
          );
          context.url = url.toString();
        } catch (error) {
          // ignore
        }
        // 拦截manifest和level请求
        if (
          (context as any).type === 'manifest' ||
          (context as any).type === 'level'
        ) {
          // 判断是否浏览器直连
          const isLiveDirectConnectStr =
            localStorage.getItem('liveDirectConnect');
          const isLiveDirectConnect = isLiveDirectConnectStr === 'true';
          if (isLiveDirectConnect) {
            // 浏览器直连，使用 URL 对象处理参数
            try {
              const url = new URL(context.url);
              url.searchParams.set('allowCORS', 'true');
              context.url = url.toString();
            } catch (error) {
              // 如果 URL 解析失败，回退到字符串拼接
              context.url = context.url + '&allowCORS=true';
            }
          }
        }
        // 执行原始load方法
        load(context, config, callbacks);
      };
    }
  }

  // 错误重试状态管理
  let keyLoadErrorCount = 0;
  let lastErrorTime = 0;
  const MAX_KEY_ERRORS = 3;
  const ERROR_TIMEOUT = 10000; // 10秒内超过3次keyLoadError就认为频道不可用

  // HLS 网络错误重试计数
  let hlsNetworkRetryCount = 0;
  const MAX_HLS_NETWORK_RETRIES = 3;

  // FLV 网络错误重试计数
  let flvNetworkRetryCount = 0;
  const MAX_FLV_NETWORK_RETRIES = 3;

  function m3u8Loader(video: HTMLVideoElement, url: string) {
    if (!Hls) {
      console.error('HLS.js 未加载');
      return;
    }

    // 清理之前的 HLS 实例
    if (video.hls) {
      try {
        video.hls.destroy();
        video.hls = null;
      } catch (err) {
        console.warn('清理 HLS 实例时出错:', err);
      }
    }

    // 基于最新 hls.js 源码和设备性能的智能配置
    const hlsConfig = {
      debug: false,

      // Worker 配置 - 根据设备性能和浏览器能力
      enableWorker: !isMobile && !isSafari && devicePerformance !== 'low',

      // 低延迟模式 - 仅在高性能非移动设备上启用 (源码默认为true)
      lowLatencyMode: !isMobile && devicePerformance === 'high',

      // 缓冲管理优化 - 参考 hls.js 源码默认值进行设备优化
      backBufferLength: devicePerformance === 'low' ? 30 : Infinity, // 源码默认 Infinity
      maxBufferLength:
        devicePerformance === 'low'
          ? 20
          : devicePerformance === 'medium'
            ? 30
            : 30, // 源码默认 30
      maxBufferSize:
        devicePerformance === 'low'
          ? 30 * 1000 * 1000
          : devicePerformance === 'medium'
            ? 60 * 1000 * 1000
            : 60 * 1000 * 1000, // 源码默认 60MB
      maxBufferHole: 0.1, // 源码默认值，允许小的缓冲区空洞

      // Gap Controller 配置 - 缓冲区空洞处理 (源码中的默认值)
      nudgeOffset: 0.1, // 跳过小间隙的偏移量
      nudgeMaxRetry: 3, // 最大重试次数 (源码默认)

      // 自适应比特率优化 - 参考源码默认值
      abrEwmaDefaultEstimate:
        devicePerformance === 'low'
          ? 500000
          : devicePerformance === 'medium'
            ? 500000
            : 500000, // 源码默认 500k
      abrBandWidthFactor: 0.95, // 源码默认
      abrBandWidthUpFactor: 0.7, // 源码默认
      abrMaxWithRealBitrate: false, // 源码默认
      maxStarvationDelay: 4, // 源码默认
      maxLoadingDelay: 4, // 源码默认

      // 直播流特殊配置
      startLevel: undefined, // 源码默认，自动选择起始质量
      capLevelToPlayerSize: false, // 源码默认

      // 渐进式加载 (直播流建议关闭)
      progressive: false,

      // 浏览器特殊优化
      liveDurationInfinity: false, // 源码默认，Safari兼容

      // 移动设备网络优化 - 使用新的LoadPolicy配置
      ...(isMobile && {
        // 使用 fragLoadPolicy 替代旧的配置方式
        fragLoadPolicy: {
          default: {
            maxTimeToFirstByteMs: 8000,
            maxLoadTimeMs: 20000,
            timeoutRetry: {
              maxNumRetry: 2,
              retryDelayMs: 1000,
              maxRetryDelayMs: 8000,
              backoff: 'linear' as const,
            },
            errorRetry: {
              maxNumRetry: 3,
              retryDelayMs: 1000,
              maxRetryDelayMs: 8000,
              backoff: 'linear' as const,
            },
          },
        },
      }),

      loader: CustomHlsJsLoader,
    };

    const hls = new Hls(hlsConfig);

    hls.loadSource(url);
    hls.attachMedia(video);
    video.hls = hls;

    hls.on(Hls.Events.ERROR, function (event: any, data: any) {
      // 非致命网络错误不输出日志
      if (
        data.details === Hls.ErrorDetails.MANIFEST_LOAD_ERROR ||
        data.details === Hls.ErrorDetails.LEVEL_LOAD_ERROR ||
        data.details === Hls.ErrorDetails.FRAG_LOAD_ERROR
      ) {
        return;
      }
      console.error('HLS Error:', event, data);

      // 使用最新版本的错误详情类型
      if (data.details === Hls.ErrorDetails.KEY_LOAD_ERROR) {
        const currentTime = Date.now();

        // 重置计数器（如果距离上次错误超过10秒）
        if (currentTime - lastErrorTime > ERROR_TIMEOUT) {
          keyLoadErrorCount = 0;
        }

        keyLoadErrorCount++;
        lastErrorTime = currentTime;

        console.warn(
          `KeyLoadError count: ${keyLoadErrorCount}/${MAX_KEY_ERRORS}`,
        );

        // 如果短时间内keyLoadError次数过多，认为这个频道不可用
        if (keyLoadErrorCount >= MAX_KEY_ERRORS) {
          console.error(
            'Too many keyLoadErrors, marking channel as unavailable',
          );
          setUnsupportedType('channel-unavailable');
          setIsVideoLoading(false);
          hls.destroy();
          return;
        }

        // 使用指数退避重试策略
        if (keyLoadErrorCount <= 2) {
          setTimeout(() => {
            try {
              hls.startLoad();
            } catch (e) {
              console.warn('Failed to restart load after key error:', e);
            }
          }, 1000 * keyLoadErrorCount);
        }
        return;
      }

      // v1.6.13 增强：处理片段解析错误（针对initPTS修复）
      if (data.details === Hls.ErrorDetails.FRAG_PARSING_ERROR) {
        //         // // console.log('直播片段解析错误，尝试重新加载...');
        // 重新开始加载，利用v1.6.13的initPTS修复
        try {
          hls.startLoad();
        } catch (e) {
          console.warn('重新加载失败:', e);
        }
        return;
      }

      // v1.6.13 增强：处理直播中的时间戳错误（直播回搜修复）
      if (
        data.details === Hls.ErrorDetails.BUFFER_APPEND_ERROR &&
        data.err &&
        data.err.message &&
        data.err.message.includes('timestamp')
      ) {
        //         // // console.log('直播时间戳错误，利用v1.6.13修复重新加载...');
        try {
          // 对于直播，直接重新开始加载最新片段
          hls.trigger(Hls.Events.BUFFER_RESET, undefined);
          hls.startLoad();
        } catch (e) {
          console.warn('直播缓冲区重置失败:', e);
          hls.startLoad();
        }
        return;
      }

      // 处理其他特定错误类型
      if (data.details === Hls.ErrorDetails.BUFFER_INCOMPATIBLE_CODECS_ERROR) {
        console.error('Incompatible codecs error - fatal');
        setUnsupportedType('codec-incompatible');
        setIsVideoLoading(false);
        hls.destroy();
        return;
      }

      if (data.fatal) {
        switch (data.type) {
          case Hls.ErrorTypes.NETWORK_ERROR:
            hlsNetworkRetryCount++;
            //             // // console.log(
            //               `Network error (${hlsNetworkRetryCount}/${MAX_HLS_NETWORK_RETRIES}), attempting to recover...`,
            //             );

            if (hlsNetworkRetryCount >= MAX_HLS_NETWORK_RETRIES) {
              console.error('Too many network errors, marking as unavailable');
              setUnsupportedType('network-error');
              setIsVideoLoading(false);
              hls.destroy();
              return;
            }

            // 根据具体的网络错误类型进行处理
            if (data.details === Hls.ErrorDetails.MANIFEST_LOAD_ERROR) {
              //               // // console.log('Manifest load error, attempting reload...');
              setTimeout(() => {
                try {
                  hls.loadSource(url);
                } catch (e) {
                  console.error('Failed to reload source:', e);
                }
              }, 2000 * hlsNetworkRetryCount);
            } else {
              try {
                hls.startLoad();
              } catch (e) {
                console.error('Failed to restart after network error:', e);
              }
            }
            break;

          case Hls.ErrorTypes.MEDIA_ERROR:
            //             // // console.log('Media error, attempting to recover...');
            try {
              hls.recoverMediaError();
            } catch (e) {
              console.error(
                'Failed to recover from media error, trying audio codec swap:',
                e,
              );
              try {
                // 使用音频编解码器交换作为备选方案
                hls.swapAudioCodec();
                hls.recoverMediaError();
              } catch (swapError) {
                console.error('Audio codec swap also failed:', swapError);
                setUnsupportedType('media-error');
                setIsVideoLoading(false);
              }
            }
            break;

          default:
            //             // // console.log('Fatal error, destroying HLS instance');
            setUnsupportedType('fatal-error');
            setIsVideoLoading(false);
            hls.destroy();
            break;
        }
      }
    });

    // 添加性能监控和缓冲管理事件
    hls.on(Hls.Events.FRAG_LOADED, (event, data) => {
      if (
        data.frag.stats &&
        data.frag.stats.loading &&
        data.frag.stats.loaded
      ) {
        const loadTime =
          data.frag.stats.loading.end - data.frag.stats.loading.start;
        if (loadTime > 0 && data.frag.stats.loaded > 0) {
          const throughputBps = (data.frag.stats.loaded * 8 * 1000) / loadTime; // bits per second
          const throughputMbps = throughputBps / 1000000;
          if (process.env.NODE_ENV === 'development') {
            //             // // console.log(
            //               `Fragment loaded: ${loadTime.toFixed(2)}ms, size: ${data.frag.stats.loaded}B, throughput: ${throughputMbps.toFixed(2)} Mbps`,
            //             );
          }
        }
      }
    });

    // 监听缓冲区卡顿和自动恢复
    // v1.6.15 改进：HLS.js 内部已优化 buffer stall 和 gap segment 处理
    hls.on(Hls.Events.ERROR, (event, data) => {
      if (data.details === Hls.ErrorDetails.BUFFER_STALLED_ERROR) {
        console.warn(
          '[HLS v1.6.15] Buffer stalled - internal recovery improved',
        );
      } else if (data.details === Hls.ErrorDetails.BUFFER_SEEK_OVER_HOLE) {
        console.warn(
          '[HLS v1.6.15] Buffer gap detected - internal handling improved',
        );
      }
    });

    // 监听质量切换
    hls.on(Hls.Events.LEVEL_SWITCHED, (event, data) => {
      if (process.env.NODE_ENV === 'development') {
        //         // // console.log(`Quality switched to level ${data.level}`);
      }
    });

    // 监听缓冲区清理事件
    hls.on(Hls.Events.BUFFER_FLUSHED, (event, data) => {
      //       // // console.log('Buffer flushed:', data);
    });
  }

  // FLV 播放器加载函数
  function flvLoader(video: HTMLVideoElement, url: string, art: any) {
    const flvjs = (window as any).DynamicFlvjs;
    if (!flvjs || !flvjs.isSupported()) {
      console.error('flv.js 不支持当前浏览器');
      return;
    }

    // 清理之前的 FLV 实例
    if (video.flv) {
      try {
        video.flv.unload();
        video.flv.detachMediaElement();
        video.flv.destroy();
        video.flv = null;
      } catch (err) {
        console.warn('清理 FLV 实例时出错:', err);
      }
    }

    const flvPlayer = flvjs.createPlayer(
      {
        type: 'flv',
        url: url,
        isLive: true,
        hasAudio: true,
        hasVideo: true,
        cors: true,
      },
      {
        enableWorker: false,
        enableStashBuffer: true,
        stashInitialSize: 128 * 1024,
        lazyLoad: true,
        lazyLoadMaxDuration: 3 * 60,
        lazyLoadRecoverDuration: 30,
        deferLoadAfterSourceOpen: true,
        autoCleanupSourceBuffer: true,
        autoCleanupMaxBackwardDuration: 3 * 60,
        autoCleanupMinBackwardDuration: 2 * 60,
        fixAudioTimestampGap: true,
        accurateSeek: true,
        seekType: 'range',
        rangeLoadZeroStart: false,
      },
    );

    flvPlayer.attachMediaElement(video);
    flvPlayer.load();
    video.flv = flvPlayer;

    flvPlayer.on(
      flvjs.Events.ERROR,
      (errorType: string, errorDetail: string) => {
        console.error('FLV Error:', errorType, errorDetail);
        if (errorType === flvjs.ErrorTypes.NETWORK_ERROR) {
          flvNetworkRetryCount++;
          //           // // console.log(
          //             `FLV 网络错误 (${flvNetworkRetryCount}/${MAX_FLV_NETWORK_RETRIES})，尝试重新加载...`,
          //           );

          if (flvNetworkRetryCount >= MAX_FLV_NETWORK_RETRIES) {
            console.error('FLV 网络错误过多，标记为不可用');
            setUnsupportedType('network-error');
            setIsVideoLoading(false);
            try {
              flvPlayer.unload();
              flvPlayer.detachMediaElement();
              flvPlayer.destroy();
            } catch (e) {
              console.warn('销毁 FLV 实例出错:', e);
            }
            return;
          }

          setTimeout(() => {
            try {
              flvPlayer.unload();
              flvPlayer.load();
            } catch (e) {
              console.warn('FLV 重新加载失败:', e);
            }
          }, 2000 * flvNetworkRetryCount);
        } else if (errorType === flvjs.ErrorTypes.MEDIA_ERROR) {
          console.error('FLV 媒体错误:', errorDetail);
          setUnsupportedType('media-error');
          setIsVideoLoading(false);
        }
      },
    );

    // 播放结束时的清理
    art.on('destroy', () => {
      if (video.flv) {
        try {
          video.flv.unload();
          video.flv.detachMediaElement();
          video.flv.destroy();
          video.flv = null;
        } catch (e) {
          console.warn('销毁时清理 FLV 实例出错:', e);
        }
      }
    });
  }

  // 播放器初始化
  useEffect(() => {
    // 异步初始化播放器，避免SSR问题
    const initPlayer = async () => {
      if (!Hls || !videoUrl || !artRef.current || !currentChannel) {
        return;
      }

      //       // // console.log('视频URL:', videoUrl);

      // 销毁之前的播放器实例并创建新的
      if (artPlayerRef.current) {
        cleanupPlayer();
      }

      // 根据hls.js源码设计，直接让hls.js处理各种媒体类型和错误
      // 不需要预检查，hls.js会在加载时自动检测和处理

      // 重置不支持的类型
      setUnsupportedType(null);

      // 检测 URL 类型（FLV 或 M3U8）- 在选择代理模式之前检测
      const isFlvUrl =
        videoUrl.toLowerCase().includes('.flv') ||
        videoUrl.toLowerCase().includes('/flv') ||
        videoUrl.includes('/douyu/') || // 斗鱼源
        videoUrl.includes('/huya/') || // 虎牙源
        videoUrl.includes('/bilibili/') || // B站源
        videoUrl.includes('/yy/'); // YY源

      // 🚀 智能选择直连或代理模式
      let targetUrl: string;
      const useDirect = await shouldUseDirectPlayback(videoUrl);

      if (useDirect) {
        // 直连模式：直接使用原始 URL
        targetUrl = videoUrl;
        //         // // console.log(
        //           `🎬 播放模式: ⚡ 直连 (${isFlvUrl ? 'FLV' : 'M3U8'}) | URL: ${targetUrl.substring(0, 100)}...`,
        //         );
      } else {
        // 代理模式：FLV 和 M3U8 都通过代理
        const proxyEndpoint = isFlvUrl
          ? '/api/proxy/stream'
          : '/api/proxy/m3u8';
        targetUrl = `${proxyEndpoint}?url=${encodeURIComponent(videoUrl)}&5572tv-source=${currentSourceRef.current?.key || ''}`;
        //         // // console.log(
        //           `🎬 播放模式: 🔄 代理 (${isFlvUrl ? 'FLV' : 'M3U8'}) | URL: ${targetUrl.substring(0, 100)}...`,
        //         );
      }

      // 根据 URL 类型选择播放器类型
      const playerType = isFlvUrl ? 'flv' : 'm3u8';
      //       // // console.log(`📺 播放器类型: ${playerType} | FLV检测: ${isFlvUrl}`);

      const customType = {
        m3u8: m3u8Loader,
        flv: flvLoader,
      };

      try {
        // 使用动态导入的 Artplayer
        const Artplayer = (window as any).DynamicArtplayer;

        // 创建新的播放器实例
        Artplayer.USE_RAF = false;
        Artplayer.FULLSCREEN_WEB_IN_BODY = true;

        artPlayerRef.current = new Artplayer({
          container: artRef.current,
          url: targetUrl,
          poster: currentChannel.logo,
          volume: 0.7,
          isLive: !enableDvrMode, // 根据用户设置决定是否为直播模式
          muted: false,
          autoplay: true,
          pip: true,
          autoSize: false,
          autoMini: false,
          screenshot: false,
          setting: false,
          loop: false,
          flip: false,
          playbackRate: false,
          aspectRatio: false,
          fullscreen: true,
          fullscreenWeb: true,
          subtitleOffset: false,
          miniProgressBar: false,
          mutex: true,
          playsInline: true,
          autoPlayback: false,
          airplay: true,
          theme: '#22c55e',
          lang: 'zh-cn',
          hotkey: false,
          fastForward: false, // 直播不需要快进
          autoOrientation: true,
          lock: true,
          moreVideoAttr: {
            crossOrigin: 'anonymous',
            preload: 'metadata',
          },
          type: playerType,
          customType: customType,
          icons: {
            loading:
              '<img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI1MCIgaGVpZ2h0PSI1MCIgdmlld0JveD0iMCAwIDUwIDUwIj48cGF0aCBkPSJNMjUuMjUxIDYuNDYxYy0xMC4zMTggMC0xOC42ODMgOC4zNjUtMTguNjgzIDE4LjY4M2g0LjA2OGMwLTguMDcgNi41NDUtMTQuNjE1IDE0LjYxNS0xNC42MTVWNi40NjF6IiBmaWxsPSIjMDA5Njg4Ij48YW5pbWF0ZVRyYW5zZm9ybSBhdHRyaWJ1dGVOYW1lPSJ0cmFuc2Zvcm0iIGF0dHJpYnV0ZVR5cGU9IlhNTCIgZHVyPSIxcyIgZnJvbT0iMCAyNSAyNSIgcmVwZWF0Q291bnQ9ImluZGVmaW5pdGUiIHRvPSIzNjAgMjUgMjUiIHR5cGU9InJvdGF0ZSIvPjwvcGF0aD48L3N2Zz4=">',
          },
        });

        // 监听播放器事件
        artPlayerRef.current.on('ready', () => {
          setError(null);
          setIsVideoLoading(false);

          // 延迟检测是否支持 DVR/时移回放（仅在未启用DVR模式时检测）
          if (!enableDvrMode) {
            setTimeout(() => {
              if (artPlayerRef.current && artPlayerRef.current.video) {
                const video = artPlayerRef.current.video;

                try {
                  if (video.seekable && video.seekable.length > 0) {
                    const seekableEnd = video.seekable.end(0);
                    const seekableStart = video.seekable.start(0);
                    const seekableRange = seekableEnd - seekableStart;

                    // 如果可拖动范围大于60秒，说明支持回放
                    if (seekableRange > 60) {
                      //                       // // console.log(
                      //                         '✓ 检测到支持回放，可拖动范围:',
                      //                         Math.floor(seekableRange),
                      //                         '秒',
                      //                       );
                      setDvrDetected(true);
                      setDvrSeekableRange(Math.floor(seekableRange));
                    } else {
                      //                       // // console.log(
                      //                         '✗ 纯直播流，可拖动范围:',
                      //                         Math.floor(seekableRange),
                      //                         '秒',
                      //                       );
                      setDvrDetected(false);
                    }
                  }
                } catch (error) {
                  //                   // // console.log('DVR检测失败:', error);
                }
              }
            }, 3000); // 等待3秒让HLS加载足够的片段
          }
        });

        artPlayerRef.current.on('loadstart', () => {
          setIsVideoLoading(true);
        });

        artPlayerRef.current.on('loadeddata', () => {
          setIsVideoLoading(false);
          // 视频成功加载，清除错误状态
          setUnsupportedType(null);
        });

        artPlayerRef.current.on('canplay', () => {
          setIsVideoLoading(false);
          // 视频可以播放，清除错误状态
          setUnsupportedType(null);
        });

        artPlayerRef.current.on('waiting', () => {
          setIsVideoLoading(true);
        });

        artPlayerRef.current.on('error', (err: any) => {
          console.error('播放器错误:', err);
          // 检查是否是可恢复的错误
          const errorCode = artPlayerRef.current?.video?.error?.code;
          if (errorCode) {
            // MediaError codes: 1=ABORTED, 2=NETWORK, 3=DECODE, 4=SRC_NOT_SUPPORTED
            if (errorCode === 2) {
              // 网络错误由 HLS/FLV 处理
              //               // // console.log('Video element network error (handled by HLS/FLV)');
            } else if (errorCode === 3) {
              // 只在没有已设置错误时才设置解码错误
              setUnsupportedType((prev) => prev || 'decode-error');
              setIsVideoLoading(false);
            } else if (errorCode === 4) {
              // 只在没有已设置错误时才设置格式不支持错误
              // 避免覆盖 HLS/FLV 已经设置的 network-error
              setUnsupportedType((prev) => prev || 'format-not-supported');
              setIsVideoLoading(false);
            }
          }
        });

        if (artPlayerRef.current?.video) {
          ensureVideoSource(
            artPlayerRef.current.video as HTMLVideoElement,
            targetUrl,
          );
        }
      } catch (err) {
        console.error('创建播放器失败:', err);
        // 不设置错误，只记录日志
      }
    }; // 结束 initPlayer 函数

    // 动态导入 ArtPlayer 和 flv.js 并初始化
    const loadAndInit = async () => {
      try {
        const { default: Artplayer } = await import('artplayer');

        // 动态导入 flv.js（避免 SSR 问题）
        const flvjs = await import('flv.js');

        // 将导入的模块设置为全局变量供 initPlayer 使用
        (window as any).DynamicArtplayer = Artplayer;
        (window as any).DynamicFlvjs = flvjs.default;

        await initPlayer();
      } catch (error) {
        console.error('动态导入 ArtPlayer 或 flv.js 失败:', error);
        // 不设置错误，只记录日志
      }
    };

    loadAndInit();
  }, [Hls, videoUrl, currentChannel, loading, directPlaybackEnabled]);

  // 清理播放器资源
  useEffect(() => {
    return () => {
      cleanupPlayer();
    };
  }, []);

  // 页面卸载时的额外清理
  useEffect(() => {
    const handleBeforeUnload = () => {
      cleanupPlayer();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      cleanupPlayer();
    };
  }, []);

  // 全局快捷键处理
  useEffect(() => {
    const handleKeyboardShortcuts = (e: KeyboardEvent) => {
      // 忽略输入框中的按键事件
      if (
        (e.target as HTMLElement).tagName === 'INPUT' ||
        (e.target as HTMLElement).tagName === 'TEXTAREA'
      )
        return;

      // 上箭头 = 音量+
      if (e.key === 'ArrowUp') {
        if (artPlayerRef.current && artPlayerRef.current.volume < 1) {
          artPlayerRef.current.volume =
            Math.round((artPlayerRef.current.volume + 0.1) * 10) / 10;
          artPlayerRef.current.notice.show = `音量: ${Math.round(
            artPlayerRef.current.volume * 100,
          )}`;
          e.preventDefault();
        }
      }

      // 下箭头 = 音量-
      if (e.key === 'ArrowDown') {
        if (artPlayerRef.current && artPlayerRef.current.volume > 0) {
          artPlayerRef.current.volume =
            Math.round((artPlayerRef.current.volume - 0.1) * 10) / 10;
          artPlayerRef.current.notice.show = `音量: ${Math.round(
            artPlayerRef.current.volume * 100,
          )}`;
          e.preventDefault();
        }
      }

      // 空格 = 播放/暂停
      if (e.key === ' ') {
        if (artPlayerRef.current) {
          artPlayerRef.current.toggle();
          e.preventDefault();
        }
      }

      // f 键 = 切换全屏
      if (e.key === 'f' || e.key === 'F') {
        if (artPlayerRef.current) {
          artPlayerRef.current.fullscreen = !artPlayerRef.current.fullscreen;
          e.preventDefault();
        }
      }
    };

    document.addEventListener('keydown', handleKeyboardShortcuts);
    return () => {
      document.removeEventListener('keydown', handleKeyboardShortcuts);
    };
  }, []);

  if (loading) {
    return (
      <PageLayout activePath='/live'>
        <div className='flex items-center justify-center min-h-screen bg-transparent'>
          <div className='text-center max-w-md mx-auto px-6'>
            {/* 动画直播图标 */}
            <div className='relative mb-8'>
              <div className='relative mx-auto w-24 h-24 bg-linear-to-r from-green-500 to-emerald-600 rounded-2xl shadow-2xl flex items-center justify-center transform hover:scale-105 transition-transform duration-300'>
                <div className='text-white text-4xl'>📺</div>
                {/* 旋转光环 */}
                <div className='absolute -inset-2 bg-linear-to-r from-green-500 to-emerald-600 rounded-2xl opacity-20 animate-spin'></div>
              </div>

              {/* 浮动粒子效果 */}
              <div className='absolute top-0 left-0 w-full h-full pointer-events-none'>
                <div className='absolute top-2 left-2 w-2 h-2 bg-green-400 rounded-full animate-bounce'></div>
                <div
                  className='absolute top-4 right-4 w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce'
                  style={{ animationDelay: '0.5s' }}
                ></div>
                <div
                  className='absolute bottom-3 left-6 w-1 h-1 bg-lime-400 rounded-full animate-bounce'
                  style={{ animationDelay: '1s' }}
                ></div>
              </div>
            </div>

            {/* 进度指示器 */}
            <div className='mb-6 w-80 mx-auto'>
              <div className='flex justify-center space-x-2 mb-4'>
                <div
                  className={`w-3 h-3 rounded-full transition-all duration-500 ${
                    loadingStage === 'loading'
                      ? 'bg-green-500 scale-125'
                      : 'bg-green-500'
                  }`}
                ></div>
                <div
                  className={`w-3 h-3 rounded-full transition-all duration-500 ${
                    loadingStage === 'fetching'
                      ? 'bg-green-500 scale-125'
                      : 'bg-green-500'
                  }`}
                ></div>
                <div
                  className={`w-3 h-3 rounded-full transition-all duration-500 ${
                    loadingStage === 'ready'
                      ? 'bg-green-500 scale-125'
                      : 'bg-gray-300'
                  }`}
                ></div>
              </div>

              {/* 进度条 */}
              <div className='w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden'>
                <div
                  className='h-full bg-linear-to-r from-green-500 to-emerald-600 rounded-full transition-all duration-1000 ease-out'
                  style={{
                    width:
                      loadingStage === 'loading'
                        ? '33%'
                        : loadingStage === 'fetching'
                          ? '66%'
                          : '100%',
                  }}
                ></div>
              </div>
            </div>

            {/* 加载消息 */}
            <div className='space-y-2'>
              <p className='text-xl font-semibold text-gray-800 dark:text-gray-200 animate-pulse'>
                {loadingMessage}
              </p>
            </div>
          </div>
        </div>
      </PageLayout>
    );
  }

  if (error) {
    return (
      <PageLayout activePath='/live'>
        <div className='flex items-center justify-center min-h-screen bg-transparent'>
          <div className='text-center max-w-md mx-auto px-6'>
            {/* 错误图标 */}
            <div className='relative mb-8'>
              <div className='relative mx-auto w-24 h-24 bg-linear-to-r from-red-500 to-orange-500 rounded-2xl shadow-2xl flex items-center justify-center transform hover:scale-105 transition-transform duration-300'>
                <div className='text-white text-4xl'>😵</div>
                {/* 脉冲效果 */}
                <div className='absolute -inset-2 bg-linear-to-r from-red-500 to-orange-500 rounded-2xl opacity-20 animate-pulse'></div>
              </div>
            </div>

            {/* 错误信息 */}
            <div className='space-y-4 mb-8'>
              <h2 className='text-2xl font-bold text-gray-800 dark:text-gray-200'>
                哎呀，出现了一些问题
              </h2>
              <div className='bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4'>
                <p className='text-red-600 dark:text-red-400 font-medium'>
                  {error}
                </p>
              </div>
              <p className='text-sm text-gray-500 dark:text-gray-400'>
                请检查网络连接或尝试刷新页面
              </p>
            </div>

            {/* 操作按钮 */}
            <div className='space-y-3'>
              <button
                onClick={() => window.location.reload()}
                className='w-full px-6 py-3 bg-linear-to-r from-blue-500 to-cyan-600 text-white rounded-xl font-medium hover:from-blue-600 hover:to-cyan-700 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl'
              >
                🔄 重新尝试
              </button>
            </div>
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout activePath='/live'>
      <div className='flex flex-col gap-3 py-4 px-5 lg:px-[3rem] 2xl:px-20'>
        {/* 第一行：页面标题 */}
        <div className='py-1'>
          <h1 className='text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2'>
            <Radio className='w-5 h-5 text-blue-500 shrink-0' />
            <div className='min-w-0 flex-1 flex items-center gap-2'>
              {/* 频道名称 - 点击展开/收起 */}
              <div
                className='min-w-0 flex-1 flex items-center gap-1 cursor-pointer select-none group'
                onClick={() =>
                  currentChannel && toggleChannelNameExpanded('page-title')
                }
              >
                <div className='min-w-0 flex-1'>
                  <div
                    className={
                      expandedChannels.has('page-title')
                        ? ''
                        : 'line-clamp-1 md:line-clamp-2'
                    }
                  >
                    <span className='text-gray-900 dark:text-gray-100'>
                      {currentSource?.name}
                    </span>
                    {currentSource && currentChannel && (
                      <span className='text-gray-500 dark:text-gray-400'>
                        {` > ${currentChannel.name}`}
                      </span>
                    )}
                    {currentSource && !currentChannel && (
                      <span className='text-gray-500 dark:text-gray-400'>
                        {` > ${currentSource.name}`}
                      </span>
                    )}
                  </div>
                </div>
                {/* Chevron图标 - 始终显示，带旋转动画 */}
                {currentChannel && (
                  <div className='shrink-0 flex items-center gap-1'>
                    {expandedChannels.has('page-title') ? (
                      <ChevronUp className='w-4 h-4 text-blue-500 dark:text-blue-400 transition-transform duration-300' />
                    ) : (
                      <ChevronDown className='w-4 h-4 text-gray-400 dark:text-gray-500 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-all duration-300' />
                    )}
                    {/* 文字提示 - 仅桌面端显示 */}
                    <span className='hidden md:inline text-xs text-blue-500 dark:text-blue-400'>
                      {expandedChannels.has('page-title') ? '收起' : '展开'}
                    </span>
                  </div>
                )}
              </div>
              {/* 播放模式切换按钮 - 显示开关状态和实际播放模式 */}
              {currentChannel && (
                <button
                  onClick={() => {
                    const newValue = !directPlaybackEnabled;
                    setDirectPlaybackEnabled(newValue);
                    // 保存到 localStorage
                    if (typeof window !== 'undefined') {
                      localStorage.setItem(
                        'live-direct-playback-enabled',
                        JSON.stringify(newValue),
                      );
                    }
                    // useEffect 会自动检测 directPlaybackEnabled 的变化并重新加载播放器
                  }}
                  className='inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full shrink-0 bg-gradient-to-r from-blue-100 to-cyan-100 dark:from-blue-900/40 dark:to-cyan-900/40 border border-blue-200 dark:border-blue-700 whitespace-nowrap cursor-pointer hover:opacity-80 active:scale-95 transition-all duration-150'
                  title={
                    directPlaybackEnabled
                      ? playbackMode === 'direct'
                        ? '直连模式已开启，当前使用直连播放。点击关闭。'
                        : '直连模式已开启，但当前视频源不支持CORS，使用代理播放。点击关闭。'
                      : '直连模式已关闭，使用代理播放。点击开启。'
                  }
                >
                  {directPlaybackEnabled ? (
                    <>
                      <span className='text-green-600 dark:text-green-400'>
                        ⚡
                      </span>
                      <span className='text-green-700 dark:text-green-300'>
                        直连{playbackMode === 'proxy' ? '(降级)' : ''}
                      </span>
                    </>
                  ) : (
                    <>
                      <span className='text-gray-600 dark:text-gray-400'>
                        🔒
                      </span>
                      <span className='text-gray-700 dark:text-gray-300'>
                        代理
                      </span>
                    </>
                  )}
                </button>
              )}
            </div>
          </h1>
        </div>

        {/* 第二行：播放器和频道列表 */}
        <div className='space-y-2'>
          {/* 折叠控制 - 仅在 lg 及以上屏幕显示 */}
          <div className='hidden lg:flex justify-end'>
            <button
              onClick={() => setIsChannelListCollapsed(!isChannelListCollapsed)}
              className='group relative flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-white/80 hover:bg-white dark:bg-gray-800/80 dark:hover:bg-gray-800 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 shadow-sm hover:shadow-md transition-all duration-200'
              title={isChannelListCollapsed ? '显示频道列表' : '隐藏频道列表'}
            >
              <svg
                className={`w-3.5 h-3.5 text-gray-500 dark:text-gray-400 transition-transform duration-200 ${
                  isChannelListCollapsed ? 'rotate-180' : 'rotate-0'
                }`}
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth='2'
                  d='M9 5l7 7-7 7'
                />
              </svg>
              <span className='text-xs font-medium text-gray-600 dark:text-gray-300'>
                {isChannelListCollapsed ? '显示' : '隐藏'}
              </span>

              {/* 精致的状态指示点 */}
              <div
                className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full transition-all duration-200 ${
                  isChannelListCollapsed
                    ? 'bg-orange-400 animate-pulse'
                    : 'bg-green-400'
                }`}
              ></div>
            </button>
          </div>

          <div
            className={`grid gap-4 lg:h-[500px] xl:h-[650px] 2xl:h-[750px] transition-all duration-300 ease-in-out ${
              isChannelListCollapsed
                ? 'grid-cols-1'
                : 'grid-cols-1 md:grid-cols-4'
            }`}
          >
            {/* 播放器 */}
            <div
              className={`h-full transition-all duration-300 ease-in-out ${isChannelListCollapsed ? 'col-span-1' : 'md:col-span-3'}`}
            >
              <div className='relative w-full h-[300px] lg:h-full'>
                <div
                  ref={artRef}
                  className='bg-black w-full h-full rounded-xl overflow-hidden shadow-lg border border-white/0 dark:border-white/30'
                ></div>

                {/* 不支持的直播类型提示 */}
                {unsupportedType && (
                  <div className='absolute inset-0 bg-black/90 backdrop-blur-sm rounded-xl overflow-hidden shadow-lg border border-white/0 dark:border-white/30 flex items-center justify-center z-60 transition-all duration-300'>
                    <div className='text-center max-w-md mx-auto px-6'>
                      <div className='relative mb-8'>
                        <div className='relative mx-auto w-24 h-24 bg-linear-to-r from-orange-500 to-red-600 rounded-2xl shadow-2xl flex items-center justify-center transform hover:scale-105 transition-transform duration-300'>
                          <div className='text-white text-4xl'>
                            {unsupportedType === 'network-error'
                              ? '🌐'
                              : unsupportedType === 'channel-unavailable'
                                ? '🔒'
                                : unsupportedType === 'decode-error'
                                  ? '🔧'
                                  : unsupportedType === 'format-not-supported'
                                    ? '📼'
                                    : '⚠️'}
                          </div>
                          <div className='absolute -inset-2 bg-linear-to-r from-orange-500 to-red-600 rounded-2xl opacity-20 animate-pulse'></div>
                        </div>
                      </div>
                      <div className='space-y-4'>
                        <h3 className='text-xl font-semibold text-white'>
                          {unsupportedType === 'channel-unavailable'
                            ? '该频道暂时不可用'
                            : unsupportedType === 'network-error'
                              ? '网络连接失败'
                              : unsupportedType === 'media-error'
                                ? '媒体播放错误'
                                : unsupportedType === 'decode-error'
                                  ? '视频解码失败'
                                  : unsupportedType === 'format-not-supported'
                                    ? '格式不支持'
                                    : unsupportedType === 'codec-incompatible'
                                      ? '编解码器不兼容'
                                      : unsupportedType === 'fatal-error'
                                        ? '播放器错误'
                                        : '暂不支持的直播流类型'}
                        </h3>
                        <div className='bg-orange-500/20 border border-orange-500/30 rounded-lg p-4'>
                          <p className='text-orange-300 font-medium'>
                            {unsupportedType === 'channel-unavailable'
                              ? '频道可能需要特殊访问权限或链接已过期'
                              : unsupportedType === 'network-error'
                                ? '无法连接到直播源服务器'
                                : unsupportedType === 'media-error'
                                  ? '视频流无法正常播放'
                                  : unsupportedType === 'decode-error'
                                    ? '浏览器无法解码此视频格式'
                                    : unsupportedType === 'format-not-supported'
                                      ? '当前浏览器不支持此视频格式'
                                      : unsupportedType === 'codec-incompatible'
                                        ? '视频编解码器与播放器不兼容'
                                        : unsupportedType === 'fatal-error'
                                          ? '播放器遇到无法恢复的错误'
                                          : `当前频道直播流类型：${unsupportedType.toUpperCase()}`}
                          </p>
                          <p className='text-sm text-orange-200 mt-2'>
                            {unsupportedType === 'channel-unavailable'
                              ? '请联系IPTV提供商或尝试其他频道'
                              : unsupportedType === 'network-error'
                                ? '请检查网络连接或尝试其他频道'
                                : unsupportedType === 'decode-error' ||
                                    unsupportedType === 'format-not-supported'
                                  ? '请尝试使用其他浏览器或更换频道'
                                  : '请尝试其他频道或刷新页面'}
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            setUnsupportedType(null);
                            // 重试当前频道
                            if (currentChannel) {
                              const newUrl = currentChannel.url;
                              setVideoUrl('');
                              setTimeout(() => setVideoUrl(newUrl), 100);
                            }
                          }}
                          className='mt-4 px-6 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium transition-colors duration-200'
                        >
                          重试
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* DVR 回放支持提示 */}
                {dvrDetected && (
                  <div className='absolute top-4 left-4 right-4 bg-linear-to-r from-blue-500/90 to-cyan-500/90 backdrop-blur-sm rounded-lg px-4 py-3 shadow-lg z-60 animate-in fade-in slide-in-from-top-2 duration-300'>
                    <div className='flex items-center justify-between'>
                      <div className='flex items-center gap-3 flex-1'>
                        <div className='shrink-0'>
                          <div className='w-8 h-8 bg-white/20 rounded-full flex items-center justify-center'>
                            <span className='text-lg'>⏯️</span>
                          </div>
                        </div>
                        <div className='flex-1 min-w-0'>
                          <p className='text-sm font-semibold text-white'>
                            此频道支持回放功能
                          </p>
                          <p className='text-xs text-white/90 mt-0.5'>
                            可拖动范围: {Math.floor(dvrSeekableRange / 60)} 分钟
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          // 启用DVR模式并重新加载播放器
                          setEnableDvrMode(true);
                          setDvrDetected(false); // 隐藏提示
                          if (currentChannel) {
                            const currentUrl = currentChannel.url;
                            setVideoUrl('');
                            setTimeout(() => setVideoUrl(currentUrl), 100);
                          }
                        }}
                        className='ml-2 px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-medium rounded transition-colors whitespace-nowrap'
                      >
                        启用进度条
                      </button>
                      <button
                        onClick={() => setDvrDetected(false)}
                        className='ml-2 p-1 hover:bg-white/20 rounded transition-colors'
                      >
                        <X className='w-4 h-4 text-white' />
                      </button>
                    </div>
                  </div>
                )}

                {/* 视频加载蒙层 */}
                {isVideoLoading && (
                  <div className='absolute inset-0 bg-black/85 backdrop-blur-sm rounded-xl overflow-hidden shadow-lg border border-white/0 dark:border-white/30 flex items-center justify-center z-60 transition-all duration-300'>
                    <div className='text-center max-w-md mx-auto px-6'>
                      <div className='relative mb-8'>
                        <div className='relative mx-auto w-24 h-24 bg-linear-to-r from-green-500 to-emerald-600 rounded-2xl shadow-2xl flex items-center justify-center transform hover:scale-105 transition-transform duration-300'>
                          <div className='text-white text-4xl'>📺</div>
                          <div className='absolute -inset-2 bg-linear-to-r from-green-500 to-emerald-600 rounded-2xl opacity-20 animate-spin'></div>
                        </div>
                      </div>
                      <div className='space-y-2'>
                        <p className='text-xl font-semibold text-white animate-pulse'>
                          🔄 IPTV 加载中...
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 频道列表 */}
            {!isChannelListCollapsed && (
              <ChannelSidebar
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                searchQuery={searchQuery}
                handleSearchChange={handleSearchChange}
                isSwitchingSource={isSwitchingSource}
                liveSyncShouldDisableControls={liveSync.shouldDisableControls}
                setIsGroupSelectorOpen={setIsGroupSelectorOpen}
                groupedChannels={groupedChannels}
                selectedGroup={selectedGroup}
                handleGroupChange={handleGroupChange}
                dragHandlers={dragHandlers}
                isDragging={isDragging}
                filteredChannels={filteredChannels}
                channelListRef={channelListRef}
                handleChannelChange={handleChannelChange}
                currentChannel={currentChannel}
                currentSource={currentSource}
                channelHealthMap={channelHealthMap}
                expandedChannels={expandedChannels}
                toggleChannelNameExpanded={toggleChannelNameExpanded}
                checkChannelHealth={checkChannelHealth}
                currentSourceSearchResults={currentSourceSearchResults}
                sourceSearchQuery={sourceSearchQuery}
                handleSourceSearchChange={handleSourceSearchChange}
                refreshLiveSources={refreshLiveSources}
                isRefreshingSource={isRefreshingSource}
                autoRefreshEnabled={autoRefreshEnabled}
                setAutoRefreshEnabled={setAutoRefreshEnabled}
                autoRefreshInterval={autoRefreshInterval}
                setAutoRefreshInterval={setAutoRefreshInterval}
                directPlaybackEnabled={directPlaybackEnabled}
                setDirectPlaybackEnabled={setDirectPlaybackEnabled}
                filteredSources={filteredSources}
                handleSourceChange={handleSourceChange}
              />
            )}
          </div>
        </div>

        {/* 当前频道信息 */}
        {currentChannel && (
          <div className='pt-4 pb-24 md:pb-0'>
            <div className='flex flex-col lg:flex-row gap-4'>
              {/* 频道图标+名称 - 在小屏幕上占100%，大屏幕占20% */}
              <div className='w-full shrink-0'>
                <div className='flex items-center gap-4'>
                  <div className='w-20 h-20 bg-gray-300 dark:bg-gray-700 rounded-lg flex items-center justify-center shrink-0 overflow-hidden'>
                    {epgData?.logo || currentChannel.logo ? (
                      <img
                        src={
                          epgData?.logo
                            ? `/api/proxy/logo?url=${encodeURIComponent(epgData.logo)}&source=${currentSource?.key || ''}`
                            : `/api/proxy/logo?url=${encodeURIComponent(currentChannel.logo)}&source=${currentSource?.key || ''}`
                        }
                        alt={currentChannel.name}
                        className='w-full h-full rounded object-contain'
                        loading='lazy'
                        onError={(e) => {
                          // Logo 加载失败时，显示"直播中"图标（红点）
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const parent = target.parentElement;
                          if (
                            parent &&
                            !parent.querySelector('.fallback-icon')
                          ) {
                            parent.innerHTML = `
                              <div class="fallback-icon relative w-full h-full flex items-center justify-center">
                                <svg class="w-10 h-10 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                                </svg>
                                <span class="absolute -top-1 -right-1 flex h-4 w-4">
                                  <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                  <span class="relative inline-flex rounded-full h-4 w-4 bg-red-500"></span>
                                </span>
                              </div>
                            `;
                          }
                        }}
                      />
                    ) : (
                      <Tv className='w-10 h-10 text-gray-500' />
                    )}
                  </div>
                  <div className='flex-1 min-w-0'>
                    <div className='flex items-center gap-3'>
                      {/* 当前频道名 - 点击展开/收起 */}
                      <div
                        className='flex-1 min-w-0 flex items-center gap-1 cursor-pointer select-none group'
                        onClick={() =>
                          toggleChannelNameExpanded('current-channel-info')
                        }
                      >
                        <div className='flex-1 min-w-0'>
                          <h3 className='text-lg font-semibold text-gray-900 dark:text-gray-100'>
                            <div
                              className={
                                expandedChannels.has('current-channel-info')
                                  ? ''
                                  : 'truncate'
                              }
                            >
                              {currentChannel.name}
                            </div>
                          </h3>
                        </div>
                        {/* Chevron图标 - 始终显示，带旋转动画 */}
                        <div className='shrink-0 flex items-center gap-1'>
                          {expandedChannels.has('current-channel-info') ? (
                            <ChevronUp className='w-4 h-4 text-blue-500 dark:text-blue-400 transition-transform duration-300' />
                          ) : (
                            <ChevronDown className='w-4 h-4 text-gray-400 dark:text-gray-500 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-all duration-300' />
                          )}
                          {/* 文字提示 - 仅桌面端显示 */}
                          <span className='hidden md:inline text-xs text-blue-500 dark:text-blue-400'>
                            {expandedChannels.has('current-channel-info')
                              ? '收起'
                              : '展开'}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleFavorite();
                        }}
                        className='shrink-0 hover:opacity-80 transition-opacity'
                        title={favorited ? '取消收藏' : '收藏'}
                      >
                        <FavoriteIcon filled={favorited} />
                      </button>
                    </div>
                    <p className='text-sm text-gray-500 dark:text-gray-400 truncate'>
                      {currentSource?.name} {' > '} {currentChannel.group}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* EPG节目单 */}
            <EpgScrollableRow
              programs={epgData?.programs || []}
              currentTime={new Date()}
              isLoading={isEpgLoading}
            />
          </div>
        )}
      </div>

      {/* 分类选择器模态弹窗 */}
      {isGroupSelectorOpen && (
        <GroupSelectorModal
          groupedChannels={groupedChannels}
          currentChannels={currentChannels}
          selectedGroup={selectedGroup}
          groupSearchQuery={groupSearchQuery}
          groupSortMode={groupSortMode}
          pinnedGroups={pinnedGroups}
          recentGroups={recentGroups}
          handleGroupChange={handleGroupChange}
          handlePinnedGroupToggle={handlePinnedGroupToggle}
          setGroupSearchQuery={setGroupSearchQuery}
          setIsGroupSelectorOpen={setIsGroupSelectorOpen}
          setGroupSortMode={setGroupSortMode}
        />
      )}
    </PageLayout>
  );
}

// FavoriteIcon 组件
const FavoriteIcon = ({ filled }: { filled: boolean }) => {
  if (filled) {
    return (
      <svg
        className='h-6 w-6'
        viewBox='0 0 24 24'
        xmlns='http://www.w3.org/2000/svg'
      >
        <path
          d='M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z'
          fill='#ef4444' /* Tailwind red-500 */
          stroke='#ef4444'
          strokeWidth='2'
          strokeLinecap='round'
          strokeLinejoin='round'
        />
      </svg>
    );
  }
  return (
    <Heart className='h-6 w-6 stroke-[1] text-gray-600 dark:text-gray-300' />
  );
};

export default function LivePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LivePageGuard />
    </Suspense>
  );
}

function LivePageGuard() {
  const [enabled, setEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    const runtimeConfig = (window as any).RUNTIME_CONFIG;
    setEnabled(!!runtimeConfig?.ENABLE_WEB_LIVE);
  }, []);

  if (enabled === null) {
    return <div>Loading...</div>;
  }

  if (!enabled) {
    return (
      <PageLayout>
        <div className='flex flex-col items-center justify-center min-h-[60vh] text-gray-500 dark:text-gray-400'>
          <Radio className='h-16 w-16 mb-4 opacity-30' />
          <h2 className='text-xl font-semibold mb-2'>直播功能未开启</h2>
          <p className='text-sm opacity-70'>请联系管理员开启直播功能</p>
        </div>
      </PageLayout>
    );
  }

  return <LivePageClient />;
}
