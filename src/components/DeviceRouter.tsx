'use client';

import { ReactNode } from 'react';
import { useDevice } from '@/core/hooks/useDevice';

interface DeviceRouterProps {
  mobile: ReactNode;
  desktop: ReactNode;
}

/**
 * 设备路由组件
 * 根据设备类型自动切换桌面端/移动端UI
 */
export default function DeviceRouter({ mobile, desktop }: DeviceRouterProps) {
  const { isMobile } = useDevice();
  return <>{isMobile ? mobile : desktop}</>;
}
