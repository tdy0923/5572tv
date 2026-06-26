'use client';

import { useMemo } from 'react';

export type DeviceType = 'phone' | 'tablet' | 'tv' | 'desktop';

function detectPlatform(): 'android' | 'ios' | 'tv' | 'desktop' {
  if (typeof window === 'undefined') return 'desktop';
  const ua = navigator.userAgent.toLowerCase();
  if (/android/.test(ua)) return 'android';
  if (/iphone|ipad|ipod/.test(ua)) return 'ios';
  if (/smart tv|android tv|roku|fire tv/i.test(ua)) return 'tv';
  return 'desktop';
}

export function useDevice() {
  const device = useMemo(() => {
    const platform = detectPlatform();
    const width = typeof window !== 'undefined' ? window.innerWidth : 1024;
    
    let type: DeviceType = 'desktop';
    if (platform === 'android' || platform === 'ios') {
      type = width < 768 ? 'phone' : 'tablet';
    } else if (platform === 'tv') {
      type = 'tv';
    }
    
    return {
      type,
      isPhone: type === 'phone',
      isTablet: type === 'tablet',
      isTV: type === 'tv',
      isDesktop: type === 'desktop',
      isMobile: type === 'phone' || type === 'tablet',
      width,
    };
  }, []);

  return device;
}
