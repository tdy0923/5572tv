'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';

// 设备类型定义
export type DeviceType = 'phone' | 'tablet' | 'tv' | 'desktop';
export type InputType = 'touch' | 'remote' | 'mouse' | 'hybrid';
export type PerformanceLevel = 'low' | 'medium' | 'high';
export type NetworkLevel = 'slow' | 'medium' | 'fast';

interface DeviceContextType {
  // 设备类型
  type: DeviceType;
  input: InputType;

  // 能力检测
  capabilities: {
    touch: boolean;
    hover: boolean;
    keyboard: boolean;
    gamepad: boolean;
  };

  // 性能等级
  performance: PerformanceLevel;

  // 网络状态
  network: NetworkLevel;

  // 便捷属性
  isPhone: boolean;
  isTablet: boolean;
  isTV: boolean;
  isDesktop: boolean;
  isMobile: boolean; // phone | tablet

  // 兼容旧接口
  isLowEnd: boolean;
  isSlowNetwork: boolean;
  reduceAnimations: boolean;
  reduceImageQuality: boolean;
}

const DeviceContext = createContext<DeviceContextType>({
  type: 'desktop',
  input: 'mouse',
  capabilities: { touch: false, hover: true, keyboard: true, gamepad: false },
  performance: 'medium',
  network: 'medium',
  isPhone: false,
  isTablet: false,
  isTV: false,
  isDesktop: true,
  isMobile: false,
  isLowEnd: false,
  isSlowNetwork: false,
  reduceAnimations: false,
  reduceImageQuality: false,
});

export function useDevice() {
  return useContext(DeviceContext);
}

// 检测设备类型
function detectDeviceType(): DeviceType {
  if (typeof window === 'undefined') return 'desktop';

  const ua = navigator.userAgent;

  // TV检测（最高优先级）
  if (/smart tv|android tv|roku|fire tv|appletv|googletv|webos/i.test(ua)) {
    return 'tv';
  }

  // 手机检测
  if (/android.*mobile|iphone|ipod/i.test(ua)) {
    return 'phone';
  }

  // 平板检测
  if (/ipad|android(?!.*mobile)|tablet/i.test(ua)) {
    return 'tablet';
  }

  // 屏幕尺寸辅助判断
  if (typeof screen !== 'undefined') {
    const width = screen.width;
    const height = screen.height;
    const dpi = (screen as any).dpi || 96;
    const diagonal = Math.sqrt(width * width + height * height) / dpi;

    if (diagonal < 7) return 'phone';
    if (diagonal < 13) return 'tablet';
  }

  return 'desktop';
}

// 检测输入方式
function detectInputType(deviceType: DeviceType): InputType {
  if (typeof window === 'undefined') return 'mouse';

  // TV总是使用遥控器
  if (deviceType === 'tv') return 'remote';

  // 检测触摸能力
  const hasTouch =
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    (navigator as any).msMaxTouchPoints > 0;

  // 检测鼠标能力（通过hover媒体查询）
  const hasHover = window.matchMedia('(hover: hover)').matches;

  if (deviceType === 'phone') return 'touch';
  if (deviceType === 'tablet') return hasTouch ? 'hybrid' : 'touch';
  if (deviceType === 'desktop') return hasTouch && hasHover ? 'hybrid' : 'mouse';

  return 'mouse';
}

// 检测设备能力
function detectCapabilities(inputType: InputType) {
  if (typeof window === 'undefined') {
    return { touch: false, hover: true, keyboard: true, gamepad: false };
  }

  return {
    touch: inputType === 'touch' || inputType === 'hybrid',
    hover: window.matchMedia('(hover: hover)').matches,
    keyboard: !('ontouchstart' in window) || navigator.maxTouchPoints === 0,
    gamepad: 'getGamepads' in navigator,
  };
}

// 检测性能等级
function detectPerformanceLevel(deviceType: DeviceType): PerformanceLevel {
  if (typeof window === 'undefined') return 'medium';

  const cores = navigator.hardwareConcurrency || 4;
  const memory = (navigator as any).deviceMemory || 4;

  if (deviceType === 'tv') {
    // TV设备通常性能较低
    return cores >= 4 ? 'medium' : 'low';
  }

  if (deviceType === 'phone') {
    if (cores >= 6 && memory >= 4) return 'high';
    if (cores >= 4 && memory >= 2) return 'medium';
    return 'low';
  }

  if (deviceType === 'tablet') {
    if (cores >= 8 && memory >= 4) return 'high';
    if (cores >= 4) return 'medium';
    return 'low';
  }

  // Desktop
  if (cores >= 8 && memory >= 8) return 'high';
  if (cores >= 4) return 'medium';
  return 'low';
}

// 检测网络等级
function detectNetworkLevel(): NetworkLevel {
  if (typeof window === 'undefined') return 'medium';

  const connection = (navigator as any).connection;
  if (connection) {
    const type = connection.effectiveType;
    if (type === '4g' || type === '5g') return 'fast';
    if (type === '3g') return 'medium';
    return 'slow';
  }

  return 'medium';
}

// 检测低端设备（向后兼容）
function detectLowEndDevice(performance: PerformanceLevel): boolean {
  return performance === 'low';
}

// 检测慢速网络（向后兼容）
function detectSlowNetwork(network: NetworkLevel): boolean {
  return network === 'slow';
}

export function DeviceProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const deviceInfo = useMemo<DeviceContextType>(() => {
    // 服务端渲染时使用默认值
    if (!mounted) {
      return {
        type: 'desktop',
        input: 'mouse',
        capabilities: { touch: false, hover: true, keyboard: true, gamepad: false },
        performance: 'medium',
        network: 'medium',
        isPhone: false,
        isTablet: false,
        isTV: false,
        isDesktop: true,
        isMobile: false,
        isLowEnd: false,
        isSlowNetwork: false,
        reduceAnimations: false,
        reduceImageQuality: false,
      };
    }

    const type = detectDeviceType();
    const input = detectInputType(type);
    const capabilities = detectCapabilities(input);
    const performance = detectPerformanceLevel(type);
    const network = detectNetworkLevel();
    const isLowEnd = detectLowEndDevice(performance);
    const isSlowNetwork = detectSlowNetwork(network);

    return {
      type,
      input,
      capabilities,
      performance,
      network,
      isPhone: type === 'phone',
      isTablet: type === 'tablet',
      isTV: type === 'tv',
      isDesktop: type === 'desktop',
      isMobile: type === 'phone' || type === 'tablet',
      isLowEnd,
      isSlowNetwork,
      reduceAnimations: isLowEnd || isSlowNetwork,
      reduceImageQuality: isLowEnd || isSlowNetwork,
    };
  }, [mounted]);

  return (
    <DeviceContext.Provider value={deviceInfo}>
      {children}
    </DeviceContext.Provider>
  );
}
