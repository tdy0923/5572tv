'use client';

import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

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
  const [siteState, setSiteState] = useState({
    siteName,
    announcementTitle,
    announcement,
    adSettings,
  });

  useEffect(() => {
    let cancelled = false;

    const loadPublicSiteConfig = async () => {
      try {
        const response = await fetch('/api/server-config', {
          next: { revalidate: 60 },
        });
        if (!response.ok) return;

        const data = await response.json();
        if (cancelled) return;

        setSiteState((current) => ({
          siteName: data.SiteName || current.siteName,
          announcementTitle:
            data.AnnouncementTitle !== undefined
              ? data.AnnouncementTitle
              : current.announcementTitle,
          announcement:
            data.Announcement !== undefined
              ? data.Announcement
              : current.announcement,
          adSettings: data.AdSettings ?? current.adSettings,
        }));
      } catch {
        // Ignore config refresh failures and keep server-rendered defaults.
      }
    };

    loadPublicSiteConfig();

    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo(() => siteState, [siteState]);

  return <SiteContext.Provider value={value}>{children}</SiteContext.Provider>;
}
