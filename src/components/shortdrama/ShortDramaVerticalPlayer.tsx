'use client';

import {
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  Download,
  Film,
  Frown,
  Heart,
  LayoutGrid,
  List,
  Maximize,
  Minimize,
  RotateCcw,
  Share2,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

import { resolvePlaybackUrl } from '@/lib/geo-blocked-cdns';

import { getHlsModule } from '@/app/play/utils';

interface ShortDramaVerticalPlayerProps {
  episodes: string[];
  episodesTitles: string[];
  currentIndex: number;
  onEpisodeChange: (index: number) => void;
  title: string;
  poster?: string;
  onFavorite?: () => void;
  isFavorited?: boolean;
  onShare?: () => void;
  onDownload?: () => void;
  onExitVerticalMode?: () => void;
  /**
   * 多源集数候选链（仿电影 preferBestSource 架构）：
   * [专用短剧源, 通用源A, 通用源B...]，播放失败自动轮转到下一个源，
   * 某个源成功后记住它（后续集数直接用可用源，不再撞死链）
   */
  episodeCandidates?: string[][];
  /** 父组件并行探活后推荐的首个健康候选下标；仅在尚未成功播放时采纳 */
  preferredCandidateIndex?: number;
}

const AUTOPLAY_NEXT_KEY = '5572tv_autoplay_next_vertical';

// 死亡名单：确认无法播放的候选源（首集URL→死亡时间），10分钟内直接跳过，
// 不再产生请求与控制台报错，大幅加快换集/重试速度
const deadCandidateAt = new Map<string, number>();
const DEAD_CANDIDATE_TTL = 10 * 60 * 1000;

function isCandidateDead(key: string): boolean {
  const t = deadCandidateAt.get(key);
  if (!t) return false;
  if (Date.now() - t > DEAD_CANDIDATE_TTL) {
    deadCandidateAt.delete(key);
    return false;
  }
  return true;
}

export default function ShortDramaVerticalPlayer({
  episodes,
  episodesTitles,
  currentIndex,
  onEpisodeChange,
  title,
  poster,
  onFavorite,
  onShare,
  onDownload,
  onExitVerticalMode,
  episodeCandidates,
  preferredCandidateIndex,
}: ShortDramaVerticalPlayerProps) {
  const router = useRouter();
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showEpisodeList, setShowEpisodeList] = useState(false);
  const [autoPlayNext, setAutoPlayNext] = useState(() => {
    if (typeof window === 'undefined') return true;
    try {
      return localStorage.getItem(AUTOPLAY_NEXT_KEY) !== 'false';
    } catch {
      return true;
    }
  });
  const [liked, setLiked] = useState(false);
  const [likeAnimation, setLikeAnimation] = useState(false);
  const [brightness, setBrightness] = useState(100);
  const [showBrightness, setShowBrightness] = useState(false);
  const [volume, setVolume] = useState(100);
  const [showVolume, setShowVolume] = useState(false);
  const [swipeY, setSwipeY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [videoLoading, setVideoLoading] = useState(true);
  const [videoError, setVideoError] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [episodeSwitching, setEpisodeSwitching] = useState(false);
  // 播完全部集数后的完结面板
  const [playFinished, setPlayFinished] = useState(false);
  const [seekIndicator, setSeekIndicator] = useState<{
    time: number;
    side: 'left' | 'right';
  } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<any>(null);
  // 多源轮转：当前生效的候选源下标（一旦某源可用即锁定，后续集数直接用它）
  const [activeCandidate, setActiveCandidate] = useState(0);
  // 正在轮转换源中（避免重复触发）
  const rotatingRef = useRef(false);
  // 已有分片成功加载 = 当前源真实可用，锁定后不再响应外部推荐切换
  const healthyLockedRef = useRef(false);
  // 当前剧标识（首集地址），换剧时重置轮转
  const lastDramaKeyRef = useRef<string>('');
  // 最后加载的代理地址（防止同 URL 重复销毁重建）
  const lastLoadedUrlRef = useRef<string>('');

  // 已上报死剧的剧名集合（组件级，跨集数/候选切换保持）
  const reportedDeadTitlesRef = useRef<Set<string>>(new Set());

  // 已预热过的下一集URL集合（防重复预热）
  const warmedUrlsRef = useRef<Set<string>>(new Set());

  // 当前集下标镜像：区分"用户切集"与"候选数组重排噪声"
  const lastEpIdxRef = useRef<number>(-1);
  const touchStartRef = useRef({ x: 0, y: 0, time: 0 });
  const lastTapRef = useRef(0);
  const controlsTimerRef = useRef<NodeJS.Timeout | undefined>(undefined);

  // 集数变化时重置状态
  const handleEpisodeChange = useCallback(
    (index: number) => {
      setVideoError(false);
      setVideoLoading(true);
      setPlayFinished(false);
      setEpisodeSwitching(true);
      onEpisodeChange(index);
      setTimeout(() => setEpisodeSwitching(false), 300);
    },
    [onEpisodeChange],
  );

  // 加载看门狗：转圈超过 20 秒自动转为可重试错误，杜绝无限加载圈
  useEffect(() => {
    if (!videoLoading || videoError) return;
    const watchdog = setTimeout(() => {
      setVideoLoading(false);
      setVideoError(true);
    }, 20000);
    return () => clearTimeout(watchdog);
  }, [videoLoading, videoError]);

  // 自动隐藏控制栏（3秒后）
  useEffect(() => {
    if (showControls) {
      controlsTimerRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
    return () => {
      if (controlsTimerRef.current) {
        clearTimeout(controlsTimerRef.current);
      }
    };
  }, [showControls, currentIndex]);

  // 双击快进/快退（左侧快退5秒，右侧快进5秒）
  const handleDoubleTap = useCallback(
    (clientX?: number) => {
      const now = Date.now();
      const timeDiff = now - lastTapRef.current;
      lastTapRef.current = now;

      if (timeDiff < 300) {
        if (videoRef.current) {
          const isLeftSide = clientX ? clientX < window.innerWidth / 2 : false;
          const seekDelta = isLeftSide ? -5 : 5;
          videoRef.current.currentTime = Math.max(
            0,
            Math.min(duration, videoRef.current.currentTime + seekDelta),
          );
          setSeekIndicator({
            time: videoRef.current.currentTime,
            side: isLeftSide ? 'left' : 'right',
          });
          setTimeout(() => setSeekIndicator(null), 800);
        }
      }
    },
    [duration],
  );

  // 触摸开始
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
    };
    setIsDragging(true);
    setSwipeY(0);
  }, []);

  // 触摸移动
  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!isDragging) return;
      const touch = e.touches[0];
      const deltaY = touch.clientY - touchStartRef.current.y;
      const deltaX = touch.clientX - touchStartRef.current.x;

      if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 20) {
        setSwipeY(deltaY);

        if (touchStartRef.current.x < window.innerWidth / 3) {
          setShowBrightness(true);
          const delta = (-deltaY / window.innerHeight) * 100;
          setBrightness((prev) => Math.max(0, Math.min(100, prev + delta)));
        } else if (touchStartRef.current.x > (window.innerWidth * 2) / 3) {
          setShowVolume(true);
          const delta = (-deltaY / window.innerHeight) * 100;
          setVolume((prev) => Math.max(0, Math.min(100, prev + delta)));
        }
      }
    },
    [isDragging],
  );

  // 触摸结束
  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (Math.abs(swipeY) > 100) {
        if (swipeY < 0 && currentIndex < episodes.length - 1) {
          handleEpisodeChange(currentIndex + 1);
        } else if (swipeY > 0 && currentIndex > 0) {
          handleEpisodeChange(currentIndex - 1);
        }
      }
      setIsDragging(false);
      setSwipeY(0);
      setShowBrightness(false);
      setShowVolume(false);
      handleDoubleTap(e.changedTouches[0]?.clientX);
    },
    [
      swipeY,
      currentIndex,
      episodes.length,
      handleEpisodeChange,
      handleDoubleTap,
    ],
  );

  // 点击切换控制栏
  const handleTap = useCallback(() => {
    setShowControls((prev) => !prev);
  }, []);

  // 全屏切换
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  // 监听全屏变化
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () =>
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // 音量变化时同步到视频元素
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = volume / 100;
    }
  }, [volume]);

  // 静音变化时同步到视频元素
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
    }
  }, [isMuted]);

  // 集数变化时自动播放（支持 HLS / m3u8，多源候选链自动轮转）
  useEffect(() => {
    const video = videoRef.current;
    const url = episodes[currentIndex] || '';
    if (!video || !url) return;

    // 换了新剧（首集地址变化）→ 直接从父组件已验证健康的候选起步
    // （不再强制归零撞死链：诊断数据显示起播因此慢6-8秒）
    const dramaKey = episodes[0] || '';
    if (lastDramaKeyRef.current !== dramaKey) {
      lastDramaKeyRef.current = dramaKey;
      healthyLockedRef.current = false;
      const start = preferredCandidateIndex ?? 0;
      if (activeCandidate !== start) {
        // 异步重置，避免 effect 内同步 setState 触发级联渲染
        setTimeout(() => {
          rotatingRef.current = false;
          setActiveCandidate(start);
        }, 0);
        return;
      }
    }
    // 父组件探活完成且尚未成功播放 → 跳到首个健康候选（电影级验货）。
    // 允许打断盲轮转：父组件的并行验货结果优先于逐个试错
    const preferredCand =
      episodeCandidates?.[preferredCandidateIndex as number];
    if (
      preferredCandidateIndex != null &&
      !healthyLockedRef.current &&
      preferredCandidateIndex !== activeCandidate &&
      preferredCand &&
      preferredCand.length > currentIndex &&
      preferredCand[currentIndex] &&
      // 目标候选若在死亡名单内则不跳（探活与播放结论冲突时以播放为准）
      (() => {
        const k = preferredCand[0] || '';
        const deadAt = deadCandidateAt.get(k);
        return !(deadAt && Date.now() - deadAt < 10 * 60 * 1000);
      })()
    ) {
      rotatingRef.current = true;
      // 异步切换，避免 effect 内同步 setState 触发级联渲染
      setTimeout(() => {
        rotatingRef.current = false;
        setActiveCandidate(preferredCandidateIndex);
      }, 0);
      return;
    }
    rotatingRef.current = false;

    // 新一轮加载开始 → 清掉上一次残留的错误浮层（自动恢复中不让用户看到旧错误）
    setTimeout(() => setVideoError(false), 0);

    // 清理旧的 HLS 实例
    if (hlsRef.current) {
      try {
        hlsRef.current.destroy();
      } catch {}
      hlsRef.current = null;
    }

    // 当前生效集数地址：优先用已验证可用的候选源
    const activeSet = episodeCandidates?.[activeCandidate];
    const activeUrl =
      activeSet && activeSet.length > currentIndex
        ? activeSet[currentIndex]
        : url;
    const effectiveUrl = resolvePlaybackUrl(activeUrl);

    // 🛡️ 健康播放保护：
    // - 用户切集（currentIndex 变化）→ 正常放行换源加载
    // - 轮转/优选跳转（rotatingRef）→ 正常放行
    // - 其余情况（父组件重渲染、候选数组按权重重排导致下标漂移）→
    //   一律忽略，绝不因后台数据更新打断正在播放的流
    const isEpisodeChange = currentIndex !== lastEpIdxRef.current;
    if (
      healthyLockedRef.current &&
      !isEpisodeChange &&
      !rotatingRef.current &&
      hlsRef.current
    ) {
      return;
    }
    if (!isEpisodeChange) {
      // 非切集路径进入新加载（首播/轮转）→ 重置健康锁由本次加载重新确立
      if (!(hlsRef.current && lastLoadedUrlRef.current === effectiveUrl)) {
        healthyLockedRef.current = false;
      }
    }
    lastEpIdxRef.current = currentIndex;
    lastLoadedUrlRef.current = effectiveUrl;

    // 异步标记加载态，避免 effect 内同步 setState 触发级联渲染
    const loadingTimer = setTimeout(() => setVideoLoading(true), 0);

    // 看门狗定时器（effect级作用域，attachHls 内赋值，cleanup 清理）
    let watchdog: ReturnType<typeof setTimeout> | null = null;

    /** 轮转到下一个含当前集的候选源；返回是否发起了切换 */
    // 全部候选源失败后上报死剧（每部剧只报一次，fire-and-forget）
    const reportDeadOnce = () => {
      if (!title || reportedDeadTitlesRef.current.has(title)) return;
      reportedDeadTitlesRef.current.add(title);
      fetch('/api/shortdrama/report-dead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: title }),
        keepalive: true,
      }).catch(() => {});
    };

    // 零操作诊断：失败/卡死时自动回传事件链到服务器（站长docker logs可见）
    const flushDebug = (reason: string) => {
      try {
        const dbg = (window as any).__dbg || [];
        const nav: any = navigator;
        fetch('/api/shortdrama/debug-report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          keepalive: true,
          body: JSON.stringify({
            title,
            reason,
            ua: nav.userAgent || '',
            net: nav.connection?.effectiveType || '',
            events: dbg.slice(-40),
          }),
        }).catch(() => {});
      } catch {}
    };

    const rotateToNextSource = () => {
      if (rotatingRef.current || !episodeCandidates?.length) return false;
      for (
        let next = activeCandidate + 1;
        next < episodeCandidates.length;
        next++
      ) {
        const cand = episodeCandidates[next];
        if (!cand || cand.length <= currentIndex || !cand[currentIndex])
          continue;
        // 死亡名单内的候选直接跳过（10 分钟内已确认无法播放）
        if (isCandidateDead(cand[0] || '')) continue;
        rotatingRef.current = true;
        try {
          hlsRef.current?.destroy();
        } catch {}
        hlsRef.current = null;
        setActiveCandidate(next);
        return true; // activeCandidate 变化会触发本 effect 重建播放
      }
      return false;
    };

    const attachHls = async () => {
      const Hls = await getHlsModule();
      if (!Hls || !Hls.isSupported()) {
        video.src = effectiveUrl;
        video.load();
        video.play().catch(() => {});
        return;
      }
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
      });
      hlsRef.current = hls;
      hls.loadSource(effectiveUrl);
      hls.attachMedia(video);

      // ⏱️ 看门狗：12s 内没有成功加载任何分片 → 判定该源卡死
      // （清单不解析/分片被拦/网络挂起），强制走轮转或报错，
      // 从机制上杜绝"一直转圈圈"
      let watchdogFired = false;
      if (watchdog) clearTimeout(watchdog);
      watchdog = setTimeout(() => {
        if (healthy || watchdogFired) return;
        watchdogFired = true;
        const curSet = episodeCandidates?.[activeCandidate];
        if (curSet?.[0]) deadCandidateAt.set(curSet[0], Date.now());
        if (rotateToNextSource()) return;
        setVideoError(true);
        setVideoLoading(false);
        reportDeadOnce();
        flushDebug('watchdog');
      }, 12000);
      let healthy = false;
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(() => {});
      });
      hls.on(Hls.Events.FRAG_LOADED, () => {
        // 第一个分片加载成功 = 该源真正可用，锁定它并解除看门狗；
        // 同时清除历史错误浮层与加载态（修复"已在播却显示失败点击重试"）
        if (!healthy) {
          healthy = true;
          healthyLockedRef.current = true;
          rotatingRef.current = false;
          clearTimeout(watchdog);
          setVideoError(false);
          setVideoLoading(false);
          if (typeof window !== 'undefined') {
            (window as any).__dbg = (window as any).__dbg || [];
            (window as any).__dbg.push({
              t: new Date().toISOString().slice(11, 23),
              ev: 'fragOk',
              candidate: activeCandidate,
            });
            fetch('/api/shortdrama/debug-report', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                title,
                reason: 'ok',
                events: ((window as any).__dbg || []).slice(-5),
              }),
            }).catch(() => {});
          }
          // 预热下一集：m3u8 清单 + 首个分片进浏览器缓存，
          // 上滑切换时 hls.js 命中缓存实现近秒开（低优先级不抢当前集带宽）
          const nextSet = episodeCandidates?.[activeCandidate];
          const nextUrl =
            nextSet && nextSet.length > currentIndex + 1
              ? nextSet[currentIndex + 1]
              : null;
          if (nextUrl && !warmedUrlsRef.current.has(nextUrl)) {
            warmedUrlsRef.current.add(nextUrl);
            const warmupUrl = `/api/proxy/m3u8?url=${encodeURIComponent(nextUrl)}`;
            const warmSignal = AbortSignal.timeout(10000);
            fetch(warmupUrl, { signal: warmSignal })
              .then(async (r) => {
                if (!r.ok) return;
                const text = await r.text();
                // 解析子清单首个分片并整段预热（读入即入HTTP缓存）
                let segRel: string | null = null;
                for (const line of text.split('\n')) {
                  const l = line.trim();
                  if (l && !l.startsWith('#')) {
                    segRel = l;
                    break;
                  }
                }
                if (!segRel) return;
                let segAbs = segRel;
                try {
                  segAbs = new URL(
                    segRel,
                    new URL(warmupUrl, location.href).href,
                  ).href;
                } catch {}
                return fetch(segAbs, {
                  signal: warmSignal,
                  priority: 'low' as any,
                }).then((sr) => sr.arrayBuffer());
              })
              .catch(() => {});
          }
        }
      });
      // 真机调试：把关键事件推到 window.__dbg，vConsole 可见
      if (typeof window !== 'undefined') {
        (window as any).__dbg = (window as any).__dbg || [];
        (window as any).__dbg.push({
          t: new Date().toISOString().slice(11, 23),
          ev: 'load',
          candidate: activeCandidate,
          url: effectiveUrl,
        });
      }
      hls.on(Hls.Events.ERROR, (_: any, data: any) => {
        if (typeof window !== 'undefined') {
          (window as any).__dbg = (window as any).__dbg || [];
          (window as any).__dbg.push({
            t: new Date().toISOString().slice(11, 23),
            ev: 'hlsError',
            fatal: data?.fatal,
            type: data?.type,
            details: data?.details,
            response: data?.response?.code,
            url: (data?.response?.url || '').slice(0, 120),
          });
          console.warn(
            '[短剧HLS]',
            data?.fatal,
            data?.details,
            data?.response?.code,
          );
        }
        if (!data?.fatal) return;
        // 当前源确认死亡 → 记入死亡名单（10 分钟内轮转直接跳过）
        const curSet = episodeCandidates?.[activeCandidate];
        if (curSet?.[0]) deadCandidateAt.set(curSet[0], Date.now());
        // 失败 → 自动轮转到下一个可用源；全部失败才显示错误
        if (!healthy && rotateToNextSource()) {
          return;
        }
        setVideoError(true);
        setVideoLoading(false);
        // 所有源均失败 → 上报死剧（服务端推荐降权，12h 过期自愈）
        reportDeadOnce();
        flushDebug('hlsFatal');
      });
    };

    const isHls = activeUrl.includes('.m3u8');
    if (isHls) {
      attachHls();
    } else {
      // 普通 MP4
      video.src = effectiveUrl;
      video.load();
      video.play().catch(() => {});
      video.onerror = () => {
        if (!rotateToNextSource()) {
          setVideoError(true);
          setVideoLoading(false);
          reportDeadOnce();
          flushDebug('videoError');
        }
      };
    }
    return () => {
      clearTimeout(loadingTimer);
      clearTimeout(watchdog);
    };
  }, [
    currentIndex,
    episodes,
    activeCandidate,
    episodeCandidates,
    preferredCandidateIndex,
  ]);

  // 清理 HLS 实例
  useEffect(() => {
    return () => {
      if (hlsRef.current) {
        try {
          hlsRef.current.destroy();
        } catch {}
        hlsRef.current = null;
      }
    };
  }, []);

  // 自动连播开关持久化
  useEffect(() => {
    try {
      localStorage.setItem(AUTOPLAY_NEXT_KEY, String(autoPlayNext));
    } catch {
      // ignore
    }
  }, [autoPlayNext]);

  const currentUrl = episodes[currentIndex] || '';

  return (
    <div
      ref={containerRef}
      className='relative w-full h-screen h-dvh bg-black overflow-hidden select-none'
      style={{ filter: `brightness(${brightness / 100})` }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onClick={handleTap}
    >
      {/* 视频区域 */}
      <div
        className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 ${episodeSwitching ? 'opacity-0' : 'opacity-100'}`}
      >
        <div className='w-full h-full max-w-[420px] mx-auto bg-gray-900 rounded-lg overflow-hidden'>
          {currentUrl ? (
            <video
              ref={videoRef}
              className='w-full h-full object-contain'
              poster={poster}
              autoPlay
              playsInline
              preload='auto'
              onTimeUpdate={() => {
                if (videoRef.current) {
                  setCurrentTime(videoRef.current.currentTime);
                  setDuration(videoRef.current.duration || 0);
                }
              }}
              onWaiting={() => setVideoLoading(true)}
              onCanPlay={() => setVideoLoading(false)}
              onError={() => {
                setVideoError(true);
                setVideoLoading(false);
              }}
              onEnded={() => {
                if (autoPlayNext && currentIndex < episodes.length - 1) {
                  handleEpisodeChange(currentIndex + 1);
                } else {
                  // 已是最后一集：停止转圈，显示完结面板
                  setPlayFinished(true);
                  setVideoLoading(false);
                }
              }}
            />
          ) : (
            <div className='w-full h-full flex items-center justify-center text-gray-500'>
              <div className='text-center'>
                <Film className='text-4xl mb-2 text-gray-500' />
                <div className='text-sm'>暂无播放源</div>
              </div>
            </div>
          )}

          {/* 加载指示器 */}
          {videoLoading && currentUrl && !videoError && (
            <div className='absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none'>
              <div className='w-10 h-10 border-2 border-white border-t-transparent rounded-full animate-spin' />
            </div>
          )}

          {/* 播完全部集数 */}
          {playFinished && !videoError && (
            <div className='absolute inset-0 flex items-center justify-center bg-black/70 z-30'>
              <div className='text-center'>
                <Film className='w-10 h-10 mx-auto mb-3 text-white/80' />
                <p className='text-white text-sm mb-5'>
                  已播完本剧全部 {episodes.length} 集
                </p>
                <div className='flex items-center gap-3 justify-center'>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setPlayFinished(false);
                      if (videoRef.current) {
                        videoRef.current.currentTime = 0;
                        videoRef.current.play().catch(() => {});
                      }
                    }}
                    className='flex items-center gap-1.5 px-5 py-2.5 bg-white text-black rounded-full text-sm font-medium'
                  >
                    <RotateCcw className='w-4 h-4' />
                    重新播放
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push('/shortdrama');
                    }}
                    className='px-5 py-2.5 bg-white/20 text-white rounded-full text-sm backdrop-blur-sm'
                  >
                    返回选剧
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 错误重试 */}
          {videoError && (
            <div className='absolute inset-0 flex items-center justify-center bg-black/60 z-30'>
              <div className='text-center'>
                <Frown className='text-4xl mb-3 text-gray-500' />
                <p className='text-white text-sm mb-4'>视频加载失败</p>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setVideoError(false);
                    setVideoLoading(true);
                    videoRef.current?.load();
                    videoRef.current?.play().catch(() => {});
                  }}
                  className='px-6 py-2 bg-white text-black rounded-full text-sm font-medium'
                >
                  点击重试
                </button>
              </div>
            </div>
          )}

          {/* 快进/快退指示器 */}
          {seekIndicator && (
            <div
              className={`absolute ${seekIndicator.side === 'left' ? 'left-1/4' : 'right-1/4'} top-1/2 -translate-y-1/2 z-30 pointer-events-none animate-fade-out`}
            >
              <div className='flex flex-col items-center'>
                <div className='text-white text-3xl font-bold'>
                  {seekIndicator.side === 'left' ? '-5s' : '+5s'}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 滑动提示 */}
      {isDragging && Math.abs(swipeY) > 50 && (
        <div className='absolute inset-0 flex items-center justify-center pointer-events-none z-30'>
          <div className='px-4 py-2 bg-black/60 rounded-full text-white text-sm backdrop-blur-sm'>
            {swipeY < 0 && currentIndex < episodes.length - 1 && (
              <span>
                ↑ 下一集:{' '}
                {episodesTitles[currentIndex + 1] ||
                  `第 ${currentIndex + 2} 集`}
              </span>
            )}
            {swipeY > 0 && currentIndex > 0 && (
              <span>
                ↓ 上一集:{' '}
                {episodesTitles[currentIndex - 1] || `第 ${currentIndex} 集`}
              </span>
            )}
          </div>
        </div>
      )}

      {/* 亮度指示器 */}
      {showBrightness && (
        <div className='absolute left-4 top-1/2 -translate-y-1/2 z-30'>
          <div className='w-8 h-32 bg-black/40 rounded-full overflow-hidden'>
            <div
              className='w-full bg-white/80 transition-all'
              style={{
                height: `${brightness}%`,
                marginTop: `${100 - brightness}%`,
              }}
            />
          </div>
          <div className='text-center text-white text-xs mt-1'>
            {Math.round(brightness)}%
          </div>
        </div>
      )}

      {/* 音量指示器 */}
      {showVolume && (
        <div className='absolute right-4 top-1/2 -translate-y-1/2 z-30'>
          <div className='w-8 h-32 bg-black/40 rounded-full overflow-hidden'>
            <div
              className='w-full bg-white/80 transition-all'
              style={{ height: `${volume}%`, marginTop: `${100 - volume}%` }}
            />
          </div>
          <div className='text-center text-white text-xs mt-1'>
            {Math.round(volume)}%
          </div>
        </div>
      )}

      {/* 点赞动画 */}
      {likeAnimation && (
        <div className='absolute inset-0 flex items-center justify-center pointer-events-none z-40'>
          <Heart className='w-24 h-24 text-red-500 fill-red-500 animate-bounce' />
        </div>
      )}

      {/* 右侧操作栏 */}
      {showControls && (
        <div className='absolute right-4 sm:right-6 top-1/2 -translate-y-1/2 flex flex-col items-center gap-4 z-20'>
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleFullscreen();
            }}
            className='flex flex-col items-center min-h-[56px] min-w-[56px]'
          >
            <div className='p-4 rounded-full bg-black/30 backdrop-blur-sm'>
              {isFullscreen ? (
                <Minimize className='w-6 h-6 text-white' />
              ) : (
                <Maximize className='w-6 h-6 text-white' />
              )}
            </div>
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              setLiked(!liked);
              setLikeAnimation(true);
              setTimeout(() => setLikeAnimation(false), 800);
              onFavorite?.();
            }}
            className='flex flex-col items-center min-h-[56px] min-w-[56px]'
          >
            <div
              className={`p-4 rounded-full ${liked ? 'bg-red-500/20' : 'bg-black/30'} backdrop-blur-sm`}
            >
              <Heart
                className={`w-6 h-6 ${liked ? 'text-red-500 fill-red-500' : 'text-white'}`}
              />
            </div>
            <span className='text-white text-xs mt-1'>收藏</span>
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onShare?.();
            }}
            className='flex flex-col items-center min-h-[56px] min-w-[56px]'
          >
            <div className='p-4 rounded-full bg-black/30 backdrop-blur-sm'>
              <Share2 className='w-6 h-6 text-white' />
            </div>
            <span className='text-white text-xs mt-1'>分享</span>
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onDownload?.();
            }}
            className='flex flex-col items-center min-h-[56px] min-w-[56px]'
          >
            <div className='p-4 rounded-full bg-black/30 backdrop-blur-sm'>
              <Download className='w-6 h-6 text-white' />
            </div>
            <span className='text-white text-xs mt-1'>下载</span>
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsMuted(!isMuted);
            }}
            className='flex flex-col items-center min-h-[56px] min-w-[56px]'
          >
            <div className='p-4 rounded-full bg-black/30 backdrop-blur-sm'>
              {isMuted ? (
                <VolumeX className='w-6 h-6 text-white' />
              ) : (
                <Volume2 className='w-6 h-6 text-white' />
              )}
            </div>
            <span className='text-white text-xs mt-1'>
              {isMuted ? '取消静音' : '静音'}
            </span>
          </button>
        </div>
      )}

      {/* 返回按钮 - 始终显示，不随控制栏隐藏 */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          if (typeof document !== 'undefined' && document.referrer) {
            router.back();
          } else {
            router.push('/shortdrama');
          }
        }}
        aria-label='返回'
        className='absolute left-3 top-[calc(0.75rem+env(safe-area-inset-top))] z-40 flex h-11 w-11 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm active:scale-95'
      >
        <ChevronLeft className='h-6 w-6' />
      </button>

      {/* 顶部信息栏 */}
      {showControls && (
        <div className='absolute top-0 left-0 right-0 px-4 pb-4 pt-[calc(1rem+env(safe-area-inset-top))] bg-gradient-to-b from-black/60 to-transparent z-20'>
          <div className='flex items-center justify-between'>
            <div className='min-w-0 flex-1'>
              <h1 className='text-white text-lg font-bold truncate'>{title}</h1>
              <p className='text-white/70 text-sm'>
                {episodesTitles[currentIndex] || `第 ${currentIndex + 1} 集`}
              </p>
            </div>
            <div className='flex items-center gap-2 shrink-0'>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowEpisodeList(true);
                }}
                className='flex items-center gap-1 rounded-full bg-white/20 px-3 py-1.5 text-white text-sm'
              >
                <List className='w-4 h-4' />
                选集
              </button>
              {onExitVerticalMode && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onExitVerticalMode();
                  }}
                  className='flex items-center gap-1 rounded-full bg-white/20 px-3 py-1.5 text-white text-sm'
                >
                  <LayoutGrid className='w-4 h-4' />
                  标准
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 底部信息栏 */}
      {showControls && (
        <div className='absolute bottom-0 left-0 right-0 px-4 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))] bg-gradient-to-t from-black/60 to-transparent z-20'>
          {/* 真实视频进度条 */}
          <div className='mb-3' onClick={(e) => e.stopPropagation()}>
            <div
              className='h-1 bg-white/30 rounded-full overflow-hidden cursor-pointer'
              onClick={(e) => {
                if (videoRef.current && duration > 0) {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const pos = (e.clientX - rect.left) / rect.width;
                  videoRef.current.currentTime = pos * duration;
                }
              }}
            >
              <div
                className='h-full bg-white rounded-full transition-all'
                style={{
                  width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%`,
                }}
              />
            </div>
          </div>

          {/* 时间和集数指示 */}
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-2'>
              <span className='text-white text-sm font-medium'>
                {currentIndex + 1} / {episodes.length}
              </span>
              <span className='text-white/60 text-xs'>
                {duration > 0
                  ? `${formatTime(currentTime)} / ${formatTime(duration)}`
                  : ''}
              </span>
            </div>

            {/* 切换集数按钮 */}
            <div className='flex items-center gap-2'>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setAutoPlayNext((prev) => !prev);
                }}
                className={`flex items-center gap-1 rounded-full px-3 py-2 text-xs ${
                  autoPlayNext
                    ? 'bg-green-500/80 text-white'
                    : 'bg-white/20 text-white/70'
                }`}
              >
                <Film className='w-3.5 h-3.5' />
                {autoPlayNext ? '连播开' : '连播关'}
              </button>
              {currentIndex > 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEpisodeChange(currentIndex - 1);
                  }}
                  className='p-2 rounded-full bg-white/20 backdrop-blur-sm'
                >
                  <ChevronUp className='w-5 h-5 text-white' />
                </button>
              )}
              {currentIndex < episodes.length - 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEpisodeChange(currentIndex + 1);
                  }}
                  className='p-2 rounded-full bg-white/20 backdrop-blur-sm'
                >
                  <ChevronDown className='w-5 h-5 text-white' />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 集数切换提示 - 屏幕中间 */}
      {!showControls && (
        <div className='absolute bottom-8 left-1/2 -translate-x-1/2 z-10'>
          <div className='px-3 py-1 bg-black/40 rounded-full text-white text-xs backdrop-blur-sm'>
            {currentIndex + 1} / {episodes.length}
          </div>
        </div>
      )}

      {/* 选集抽屉 */}
      {showEpisodeList && (
        <div
          className='absolute inset-0 z-50 bg-black/70'
          onClick={(e) => {
            e.stopPropagation();
            setShowEpisodeList(false);
          }}
        >
          <div
            className='absolute bottom-0 left-0 right-0 bg-gray-900 rounded-t-2xl px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3'
            onClick={(e) => e.stopPropagation()}
          >
            <div className='flex items-center justify-between mb-3'>
              <span className='text-white font-semibold'>选集</span>
              <button
                onClick={() => setShowEpisodeList(false)}
                className='text-white/70 text-sm px-2 py-1'
              >
                关闭
              </button>
            </div>
            <div className='max-h-[50vh] overflow-y-auto'>
              {/* 有集数标题时只显示标题胶囊，避免数字网格+标题两套并存 */}
              {episodesTitles.filter(Boolean).length === episodes.length &&
              episodes.length > 0 ? (
                <div className='flex flex-wrap gap-2'>
                  {episodesTitles.map((t, idx) => (
                    <button
                      key={`t-${idx}`}
                      onClick={() => {
                        setShowEpisodeList(false);
                        if (idx !== currentIndex) handleEpisodeChange(idx);
                      }}
                      className={`rounded-full px-3 py-1.5 text-xs ${
                        idx === currentIndex
                          ? 'bg-green-500 text-white font-semibold'
                          : 'bg-gray-800 text-white/70'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              ) : (
                <div className='grid grid-cols-4 sm:grid-cols-6 gap-2'>
                  {episodes.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setShowEpisodeList(false);
                        if (idx !== currentIndex) handleEpisodeChange(idx);
                      }}
                      className={`rounded-lg py-2.5 text-sm ${
                        idx === currentIndex
                          ? 'bg-green-500 text-white font-semibold'
                          : 'bg-gray-800 text-white/80'
                      }`}
                    >
                      {idx + 1}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0)
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}
