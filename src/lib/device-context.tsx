'use client';

import { createContext, useContext, useMemo } from 'react';

interface DeviceContextType {
  isLowEnd: boolean;
  isSlowNetwork: boolean;
  reduceAnimations: boolean;
  reduceImageQuality: boolean;
}

const DeviceContext = createContext<DeviceContextType>({
  isLowEnd: false,
  isSlowNetwork: false,
  reduceAnimations: false,
  reduceImageQuality: false,
});

export function useDevice() {
  return useContext(DeviceContext);
}

// 检测低端设备（同步，在组件外执行）
function detectLowEndDevice(): boolean {
  if (typeof window === 'undefined') return false;

  // 检测设备内存（API 12+）
  const memory = (navigator as any).deviceMemory;
  if (memory && memory < 2) return true;

  // 检测 CPU 核心数
  const cores = navigator.hardwareConcurrency;
  if (cores && cores <= 2) return true;

  // 检测是否有 WebGL2
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2');
    if (!gl) return true;
  } catch {
    return true;
  }

  return false;
}

// 检测慢速网络（同步）
function detectSlowNetwork(): boolean {
  if (typeof window === 'undefined') return false;
  const connection = (navigator as any).connection;
  if (connection) {
    return (
      connection.effectiveType === '2g' ||
      connection.effectiveType === 'slow-2g'
    );
  }
  return false;
}

export function DeviceProvider({ children }: { children: React.ReactNode }) {
  const deviceInfo = useMemo<DeviceContextType>(() => {
    const isLowEnd = detectLowEndDevice();
    const isSlowNetwork = detectSlowNetwork();
    return {
      isLowEnd,
      isSlowNetwork,
      reduceAnimations: isLowEnd || isSlowNetwork,
      reduceImageQuality: isLowEnd || isSlowNetwork,
    };
  }, []);

  return (
    <DeviceContext.Provider value={deviceInfo}>
      {children}
    </DeviceContext.Provider>
  );
}
