'use client';

import { ReactNode } from 'react';
import { useDevice } from '@/core/hooks/useDevice';
import MobileLayout from '@/ui/mobile/layouts/MobileLayout';

interface MobileWrapperProps {
  children: ReactNode;
  mobileContent?: ReactNode;
  desktopContent?: ReactNode;
}

/**
 * 移动端包装器
 * 根据设备类型自动切换桌面端/移动端UI
 */
export default function MobileWrapper({ 
  children, 
  mobileContent, 
  desktopContent 
}: MobileWrapperProps) {
  const { isMobile } = useDevice();

  // 如果提供了移动端内容，使用移动端内容
  if (isMobile && mobileContent) {
    return <MobileLayout>{mobileContent}</MobileLayout>;
  }

  // 如果提供了桌面端内容，使用桌面端内容
  if (!isMobile && desktopContent) {
    return <>{desktopContent}</>;
  }

  // 默认使用原有内容
  return <>{children}</>;
}
