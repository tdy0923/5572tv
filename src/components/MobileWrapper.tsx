'use client';

import { ReactNode } from 'react';

import { useDevice } from '@/core/hooks/useDevice';

interface MobileWrapperProps {
  children: ReactNode;
  mobileContent?: ReactNode;
  desktopContent?: ReactNode;
}

export default function MobileWrapper({
  children,
  mobileContent,
  desktopContent,
}: MobileWrapperProps) {
  const { isMobile } = useDevice();

  if (isMobile && mobileContent) {
    return <>{mobileContent}</>;
  }

  if (!isMobile && desktopContent) {
    return <>{desktopContent}</>;
  }

  return <>{children}</>;
}
