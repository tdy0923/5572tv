/* eslint-disable no-console */
/* eslint-disable unused-imports/no-unused-vars */

import { type ClassValue, clsx } from 'clsx';
import he from 'he';
import Hls from 'hls.js';
import { twMerge } from 'tailwind-merge';

/**
 * Utility function for merging Tailwind CSS classes
 * Combines clsx and tailwind-merge for optimal class handling
 *
 * @example
 * cn('px-2 py-1', condition && 'bg-blue-500')
 * cn('px-2', 'px-4') // => 'px-4' (tailwind-merge handles conflicts)
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function getNavigatorInfo() {
  if (typeof navigator === 'undefined') {
    return {
      userAgent: '',
      maxTouchPoints: 0,
      hardwareConcurrency: 4,
    };
  }

  return {
    userAgent: navigator.userAgent || '',
    maxTouchPoints: navigator.maxTouchPoints || 0,
    hardwareConcurrency: navigator.hardwareConcurrency || 4,
  };
}

function getDeviceFlags() {
  const { userAgent, maxTouchPoints } = getNavigatorInfo();
  const hasMSStream = typeof window !== 'undefined' && 'MSStream' in window;

  const ios = /iPad|iPhone|iPod/i.test(userAgent) && !hasMSStream;
  const ios13Plus =
    ios || (userAgent.includes('Macintosh') && maxTouchPoints >= 1);
  const iPad =
    /iPad/i.test(userAgent) ||
    (userAgent.includes('Macintosh') && maxTouchPoints > 2);
  const android = /Android/i.test(userAgent);
  const mobile =
    ios13Plus ||
    android ||
    /webOS|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
  const tablet =
    iPad ||
    (android && !/Mobile/i.test(userAgent)) ||
    (typeof screen !== 'undefined' && screen.width >= 768);
  const safari = /^(?:(?!chrome|android).)*safari/i.test(userAgent) && !android;
  const webKit = /WebKit/i.test(userAgent);

  return {
    userAgent,
    isIOS: ios,
    isIOS13Plus: ios13Plus,
    isIPad: iPad,
    isAndroid: android,
    isMobile: mobile,
    isTablet: tablet,
    isSafari: safari,
    isWebKit: webKit,
  };
}

const {
  userAgent,
  isIOS,
  isIOS13Plus,
  isIPad,
  isAndroid,
  isMobile,
  isTablet,
  isSafari,
  isWebKit,
} = getDeviceFlags();

// 设备性能等级估算
const getDevicePerformanceLevel = (): 'low' | 'medium' | 'high' => {
  const { hardwareConcurrency } = getNavigatorInfo();
  const cores = hardwareConcurrency;

  if (isMobile) {
    return cores >= 6 ? 'medium' : 'low';
  } else {
    return cores >= 8 ? 'high' : cores >= 4 ? 'medium' : 'low';
  }
};

const devicePerformance = getDevicePerformanceLevel();

// 导出设备检测结果供其他模块使用
export {
  devicePerformance,
  getDevicePerformanceLevel,
  isAndroid,
  isIOS,
  isIOS13Plus,
  isIPad,
  isMobile,
  isSafari,
  isTablet,
  isWebKit,
};

function getDoubanImageProxyConfig(): {
  proxyType:
    | 'direct'
    | 'server'
    | 'img3'
    | 'cmliussss-cdn-tencent'
    | 'cmliussss-cdn-ali'
    | 'baidu'
    | 'custom';
  proxyUrl: string;
} {
  // 安全地访问 localStorage（避免服务端渲染报错）
  let doubanImageProxyType:
    | 'direct'
    | 'server'
    | 'img3'
    | 'cmliussss-cdn-tencent'
    | 'cmliussss-cdn-ali'
    | 'baidu'
    | 'custom' = 'server'; // 默认值
  let doubanImageProxy = '';

  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    const storedType = localStorage.getItem('doubanImageProxyType');
    const runtimeType = (window as any).RUNTIME_CONFIG?.DOUBAN_IMAGE_PROXY_TYPE;

    // 自动修复：如果localStorage或RUNTIME_CONFIG是'direct'，自动改为'server'
    let effectiveStoredType = storedType;
    if (storedType === 'direct') {
      effectiveStoredType = 'server';
      // 自动更新localStorage，避免下次还是'direct'
      localStorage.setItem('doubanImageProxyType', 'server');
    }

    const effectiveRuntimeType =
      runtimeType === 'direct' ? 'server' : runtimeType;

    doubanImageProxyType = (effectiveStoredType ||
      effectiveRuntimeType ||
      'server') as
      | 'direct'
      | 'server'
      | 'img3'
      | 'cmliussss-cdn-tencent'
      | 'cmliussss-cdn-ali'
      | 'baidu'
      | 'custom';
    doubanImageProxy =
      localStorage.getItem('doubanImageProxyUrl') ||
      (window as any).RUNTIME_CONFIG?.DOUBAN_IMAGE_PROXY ||
      '';
  }

  return {
    proxyType: doubanImageProxyType,
    proxyUrl: doubanImageProxy,
  };
}

/**
 * 处理图片 URL，如果设置了图片代理则使用代理
 */
export function processImageUrl(originalUrl: string): string {
  if (!originalUrl) return originalUrl;

  if (
    originalUrl.startsWith('data:') ||
    originalUrl.startsWith('blob:') ||
    originalUrl.startsWith('/')
  ) {
    return originalUrl;
  }

  if (originalUrl.startsWith('//')) {
    return processImageUrl(`https:${originalUrl}`);
  }

  const normalizedUrl = originalUrl.startsWith('http://')
    ? `https://${originalUrl.slice('http://'.length)}`
    : originalUrl;

  const isRemoteHttpUrl = /^https?:\/\//i.test(normalizedUrl);

  // Only proxy images that need Referer bypass
  // All other CDNs load directly for better performance
  if (
    normalizedUrl.includes('doubanio.com') ||
    normalizedUrl.includes('manmankan.com')
  ) {
    // These CDNs have Referer restrictions, need proxy
  } else if (isRemoteHttpUrl) {
    // All other remote images load directly (no proxy needed)
    return normalizedUrl;
  }

  // Only process doubanio.com images through proxy config
  if (!normalizedUrl.includes('doubanio.com')) {
    // For manmankan, use server proxy directly
    return `/api/image-proxy?url=${encodeURIComponent(normalizedUrl)}`;
  }

  const { proxyType, proxyUrl } = getDoubanImageProxyConfig();
  // 🛡️ 豆瓣图片始终通过代理，确保浏览器能正常加载
  switch (proxyType) {
    case 'server':
      return `/api/image-proxy?url=${encodeURIComponent(normalizedUrl)}`;
    case 'img3':
      return `/api/image-proxy?url=${encodeURIComponent(normalizedUrl.replace(/img\d+\.doubanio\.com/g, 'img3.doubanio.com'))}`;
    case 'cmliussss-cdn-tencent':
      return `/api/image-proxy?url=${encodeURIComponent(normalizedUrl.replace(/img\d+\.doubanio\.com/g, 'img.doubanio.cmliussss.net'))}`;
    case 'cmliussss-cdn-ali':
      return `/api/image-proxy?url=${encodeURIComponent(normalizedUrl.replace(/img\d+\.doubanio\.com/g, 'img.doubanio.cmliussss.com'))}`;
    case 'baidu':
      return `/api/image-proxy?url=${encodeURIComponent(normalizedUrl)}`;
    case 'custom':
      return `/api/image-proxy?url=${encodeURIComponent(normalizedUrl)}`;
    case 'direct':
    default:
      return `/api/image-proxy?url=${encodeURIComponent(normalizedUrl)}`;
  }
}

export function resolvePosterUrl(
  ...candidates: Array<string | null | undefined>
): string {
  for (const candidate of candidates) {
    if (typeof candidate !== 'string') continue;

    const normalized = candidate.trim();
    if (!normalized) continue;

    if (/^(null|undefined|n\/a|none)$/i.test(normalized)) continue;

    return normalized;
  }

  return '';
}

export function resolveCardPosterUrl(
  ...candidates: Array<string | null | undefined>
): string {
  const resolved = resolvePosterUrl(...candidates);
  if (!resolved) return '/placeholder-cover.jpg';

  if (resolved.startsWith('/')) return resolved;

  return processImageUrl(resolved);
}

/**
 * 从m3u8地址获取视频质量等级和网络信息
 * @param m3u8Url m3u8播放列表的URL
 * @returns Promise<{quality: string, loadSpeed: string, pingTime: number}> 视频质量等级和网络信息
 */
export async function getVideoResolutionFromM3u8(m3u8Url: string): Promise<{
  quality: string;
  loadSpeed: string;
  pingTime: number;
}> {
  try {
    // 检测是否为iPad（无论什么浏览器）
    const isIPad = /iPad/i.test(userAgent);

    if (isIPad) {
      // iPad使用最简单的ping测试，不创建任何video或HLS实例
      //       console.log('iPad检测，使用简化测速避免崩溃');

      const startTime = performance.now();
      try {
        await fetch(m3u8Url, {
          method: 'HEAD',
          mode: 'cors',
          signal: AbortSignal.timeout(2000),
        });
        const pingTime = Math.round(performance.now() - startTime);

        return {
          quality: '未知', // iPad不检测视频质量避免崩溃
          loadSpeed: '未知', // iPad不检测下载速度
          pingTime,
        };
      } catch (error) {
        return {
          quality: '未知',
          loadSpeed: '未知',
          pingTime: 9999,
        };
      }
    }

    // 非iPad设备使用优化后的测速逻辑
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.muted = true;
      video.preload = 'metadata';

      // 移动设备使用更小的视频元素减少内存占用
      if (isMobile) {
        video.width = 32;
        video.height = 18;
        video.style.display = 'none';
        video.style.position = 'absolute';
        video.style.left = '-9999px';
      }

      // 测量ping时间
      const pingStart = performance.now();
      let pingTime = 0;

      const pingPromise = fetch(m3u8Url, { method: 'HEAD', mode: 'cors' })
        .then(() => {
          pingTime = performance.now() - pingStart;
        })
        .catch(() => {
          pingTime = performance.now() - pingStart;
        });

      // 基于最新 hls.js v1.6.13 和设备性能的智能优化配置
      const hlsConfig = {
        debug: false,

        // Worker 配置 - 根据设备性能和浏览器能力
        enableWorker: !isMobile && !isSafari && devicePerformance !== 'low',

        // 低延迟模式 - 仅在高性能非移动设备上启用
        lowLatencyMode: !isMobile && devicePerformance === 'high',

        // v1.6.13 新增：优化片段解析错误处理
        fragLoadingRetryDelay: isMobile ? 500 : 300,
        fragLoadingMaxRetry: 3,

        // v1.6.13 新增：时间戳处理优化（针对直播回搜修复）
        allowAugmentingTimeStamp: true,

        // 缓冲管理 - 基于设备性能分级
        maxBufferLength:
          devicePerformance === 'low'
            ? 3
            : devicePerformance === 'medium'
              ? 8
              : 15,
        maxBufferSize:
          devicePerformance === 'low'
            ? 1 * 1024 * 1024
            : devicePerformance === 'medium'
              ? 5 * 1024 * 1024
              : 15 * 1024 * 1024,
        backBufferLength: isTablet ? 20 : isMobile ? 10 : 30,
        frontBufferFlushThreshold:
          devicePerformance === 'low'
            ? 15
            : devicePerformance === 'medium'
              ? 30
              : 60,

        // v1.6.13 增强：更智能的缓冲区管理
        maxBufferHole: 0.3, // 允许较小的缓冲区空洞
        appendErrorMaxRetry: 5, // 增加append错误重试次数以利用v1.6.13修复

        // 自适应比特率 - 根据设备类型和性能调整
        abrEwmaDefaultEstimate:
          devicePerformance === 'low'
            ? 1500000
            : devicePerformance === 'medium'
              ? 3000000
              : 6000000,
        abrBandWidthFactor: 0.95,
        abrBandWidthUpFactor: isMobile ? 0.6 : 0.7,
        abrMaxWithRealBitrate: true,
        maxStarvationDelay: isMobile ? 2 : 4,
        maxLoadingDelay: isMobile ? 2 : 4,

        // v1.6.13 新增：DRM相关优化（虽然你项目不用DRM，但有助于稳定性）
        keyLoadRetryDelay: 1000,
        keyLoadMaxRetry: 3,

        // 浏览器特殊优化
        liveDurationInfinity: !isSafari,
        progressive: false,

        // 移动设备网络优化
        ...(isMobile && {
          manifestLoadingRetryDelay: 2000,
          levelLoadingRetryDelay: 2000,
          manifestLoadingMaxRetry: 3,
          levelLoadingMaxRetry: 3,
        }),
      };

      const hls = new Hls(hlsConfig);

      const timeoutDuration = isMobile ? 3000 : 4000;
      const timeout = setTimeout(() => {
        cleanup();
        reject(new Error('Timeout loading video metadata'));
      }, timeoutDuration);

      const cleanup = () => {
        clearTimeout(timeout);
        try {
          if (hls) hls.destroy();
        } catch (e) {
          console.warn('HLS cleanup error:', e);
        }
        try {
          if (video && video.parentNode) {
            video.parentNode.removeChild(video);
          } else if (video) {
            video.remove();
          }
        } catch (e) {
          console.warn('Video cleanup error:', e);
        }
      };

      video.onerror = () => {
        cleanup();
        reject(new Error('Failed to load video metadata'));
      };

      let actualLoadSpeed = '未知';
      let hasSpeedCalculated = false;
      let hasMetadataLoaded = false;
      let fragmentStartTime = 0;

      const checkAndResolve = async () => {
        if (
          hasMetadataLoaded &&
          (hasSpeedCalculated || actualLoadSpeed !== '未知')
        ) {
          await pingPromise;

          const width = video.videoWidth;
          let quality = '未知';

          if (width && width > 0) {
            quality =
              width >= 3840
                ? '4K'
                : width >= 2560
                  ? '2K'
                  : width >= 1920
                    ? '1080p'
                    : width >= 1280
                      ? '720p'
                      : width >= 854
                        ? '480p'
                        : 'SD';
          }

          cleanup();
          resolve({
            quality,
            loadSpeed: actualLoadSpeed,
            pingTime: Math.round(pingTime),
          });
        }
      };

      // 监听片段加载
      hls.on(Hls.Events.FRAG_LOADING, () => {
        if (!hasSpeedCalculated) {
          fragmentStartTime = performance.now();
        }
      });

      hls.on(Hls.Events.FRAG_LOADED, (event: any, data: any) => {
        if (
          fragmentStartTime > 0 &&
          data &&
          data.payload &&
          !hasSpeedCalculated
        ) {
          const loadTime = performance.now() - fragmentStartTime;
          const size = data.payload.byteLength || 0;

          if (loadTime > 0 && size > 0) {
            const speedKBps = size / 1024 / (loadTime / 1000);
            actualLoadSpeed =
              speedKBps >= 1024
                ? `${(speedKBps / 1024).toFixed(2)} MB/s`
                : `${speedKBps.toFixed(2)} KB/s`;
            hasSpeedCalculated = true;
            checkAndResolve();
          }
        }
      });

      // 监听视频元数据加载完成
      video.addEventListener('loadedmetadata', () => {
        hasMetadataLoaded = true;
        checkAndResolve();
      });

      // 监听HLS错误 - v1.6.13增强处理
      hls.on(Hls.Events.ERROR, (event: any, data: any) => {
        console.warn('HLS测速错误:', data);

        // v1.6.13 特殊处理：片段解析错误不应该导致测速失败
        if (data.details === Hls.ErrorDetails.FRAG_PARSING_ERROR) {
          //           console.log('测速中遇到片段解析错误，v1.6.13已修复，继续测速');
          return;
        }

        // v1.6.13 特殊处理：时间戳错误也不应该导致测速失败
        if (
          data.details === Hls.ErrorDetails.BUFFER_APPEND_ERROR &&
          data.err &&
          data.err.message &&
          data.err.message.includes('timestamp')
        ) {
          //           console.log('测速中遇到时间戳错误，v1.6.13已修复，继续测速');
          return;
        }

        if (data.fatal) {
          cleanup();
          reject(new Error(`HLS Error: ${data.type} - ${data.details}`));
        }
      });

      // 为分片请求添加时间戳参数破除浏览器缓存
      hls.config.xhrSetup = function (xhr: XMLHttpRequest, url: string) {
        const urlWithTimestamp = url.includes('?')
          ? `${url}&_t=${Date.now()}`
          : `${url}?_t=${Date.now()}`;
        xhr.open('GET', urlWithTimestamp, true);
      };

      // 加载m3u8
      try {
        hls.loadSource(m3u8Url);
        hls.attachMedia(video);
      } catch (error) {
        cleanup();
        reject(error);
      }
    });
  } catch (error) {
    throw new Error(`测速失败: ${error}`);
  }
}

export function cleanHtmlTags(text: string): string {
  if (!text) return '';

  const cleanedText = text
    .replace(/<[^>]+>/g, '\n') // 将 HTML 标签替换为换行
    .replace(/\n+/g, '\n') // 将多个连续换行合并为一个
    .replace(/[ \t]+/g, ' ') // 将多个连续空格和制表符合并为一个空格，但保留换行符
    .replace(/^\n+|\n+$/g, '') // 去掉首尾换行
    .trim(); // 去掉首尾空格

  // 使用 he 库解码 HTML 实体
  return he.decode(cleanedText);
}

/**
 * 判断剧集是否已完结
 * @param remarks 备注信息（如"已完结"、"更新至20集"、"HD"等）
 * @returns 是否已完结
 */
export function isSeriesCompleted(remarks?: string): boolean {
  if (!remarks) return false;

  // 匹配规则：
  // - "完结" 或 "已完结"
  // - "全XX集"（如"全30集"）
  // - 单独的"完"（但不包括"完整"）
  return /完结|已完结|全\d+集|完(?!整)/.test(remarks);
}
