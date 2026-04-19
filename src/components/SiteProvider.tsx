'use client';

import { createContext, ReactNode, useContext } from 'react';

import type { AdSettings } from '@/lib/ad-settings';

const SiteContext = createContext<{
  siteName: string;
  announcementTitle?: string;
  announcement?: string;
  adSettings?: AdSettings;
}>({
  // 默认值
  siteName: '5572影视',
  announcementTitle: '站点公告',
  announcement:
    '本网站仅提供影视信息搜索服务，所有内容均来自第三方网站。本站不存储任何视频资源，不对任何内容的准确性、合法性、完整性负责。',
  adSettings: undefined,
});

export const useSite = () => useContext(SiteContext);

export function SiteProvider({
  children,
  siteName,
  announcementTitle,
  announcement,
  adSettings,
}: {
  children: ReactNode;
  siteName: string;
  announcementTitle?: string;
  announcement?: string;
  adSettings?: AdSettings;
}) {
  return (
    <SiteContext.Provider
      value={{ siteName, announcementTitle, announcement, adSettings }}
    >
      {children}
    </SiteContext.Provider>
  );
}
