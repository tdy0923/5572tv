'use client';

import { useEffect, useState } from 'react';

import { ClientCache } from '@/lib/client-cache';

interface DeviceInfo {
  isMobile: boolean;
  isIOS: boolean;
  isIOS13: boolean;
  isSafari: boolean;
  isWebKit: boolean;
  userAgent: string;
}

const checkMemoryPressure = async () => {
  if (typeof performance !== 'undefined' && 'memory' in performance) {
    try {
      const memInfo = (performance as any).memory;
      const usedJSHeapSize = memInfo.usedJSHeapSize;
      const heapLimit = memInfo.jsHeapSizeLimit;

      const memoryUsageRatio = usedJSHeapSize / heapLimit;

      if (memoryUsageRatio > 0.75) {
        console.warn('内存使用过高，清理缓存...');

        try {
          await ClientCache.clearExpired('danmu-cache');

          const oldCacheKey = 'lunatv_danmu_cache';
          localStorage.removeItem(oldCacheKey);
        } catch (e) {
          console.warn('清理弹幕缓存失败:', e);
        }

        if (typeof (window as any).gc === 'function') {
          (window as any).gc();
        }

        return true;
      }
    } catch (error) {
      console.warn('内存检测失败:', error);
    }
  }
  return false;
};

const getInitialDeviceInfo = (): DeviceInfo => {
  if (typeof navigator === 'undefined') {
    return {
      userAgent: '',
      isMobile: false,
      isIOS: false,
      isIOS13: false,
      isSafari: false,
      isWebKit: false,
    };
  }
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/i.test(ua) && !(window as any).MSStream;
  const isIOS13 =
    isIOS || (ua.includes('Macintosh') && navigator.maxTouchPoints >= 1);
  const isMobile =
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua) ||
    isIOS13;
  const isSafari = /^(?:(?!chrome|android).)*safari/i.test(ua);
  const isWebKit = isSafari || isIOS;
  return { userAgent: ua, isMobile, isIOS, isIOS13, isSafari, isWebKit };
};

export function useDeviceInfo() {
  const [deviceInfo] = useState<DeviceInfo>(getInitialDeviceInfo);

  useEffect(() => {
    if (!deviceInfo.isMobile) return;

    const memoryCheckInterval = setInterval(() => {
      checkMemoryPressure().catch(console.error);
    }, 30000);

    return () => {
      clearInterval(memoryCheckInterval);
    };
  }, [deviceInfo.isMobile]);

  return deviceInfo;
}
