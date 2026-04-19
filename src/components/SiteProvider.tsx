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

const SITE_CONFIG_CACHE_KEY = 'site-public-config-v1';
const SITE_CONFIG_CACHE_TTL = 60 * 1000;

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
        const runtimeConfig =
          typeof window !== 'undefined'
            ? ((window as any).RUNTIME_CONFIG as any | undefined)
            : undefined;

        if (runtimeConfig) {
          setSiteState((current) => {
            const next = {
              siteName: runtimeConfig.SITE_NAME || current.siteName,
              announcementTitle:
                runtimeConfig.ANNOUNCEMENT_TITLE ?? current.announcementTitle,
              announcement: runtimeConfig.ANNOUNCEMENT ?? current.announcement,
              adSettings: runtimeConfig.AD_SETTINGS ?? current.adSettings,
            };

            return next.siteName === current.siteName &&
              next.announcementTitle === current.announcementTitle &&
              next.announcement === current.announcement &&
              next.adSettings === current.adSettings
              ? current
              : next;
          });
          return;
        }

        if (typeof window !== 'undefined') {
          const cached = sessionStorage.getItem(SITE_CONFIG_CACHE_KEY);
          if (cached) {
            const parsed = JSON.parse(cached) as {
              timestamp: number;
              data: typeof siteState;
            };

            if (Date.now() - parsed.timestamp < SITE_CONFIG_CACHE_TTL) {
              setSiteState((current) => {
                const next = {
                  siteName: parsed.data.siteName || current.siteName,
                  announcementTitle:
                    parsed.data.announcementTitle ?? current.announcementTitle,
                  announcement:
                    parsed.data.announcement ?? current.announcement,
                  adSettings: parsed.data.adSettings ?? current.adSettings,
                };

                return next.siteName === current.siteName &&
                  next.announcementTitle === current.announcementTitle &&
                  next.announcement === current.announcement &&
                  next.adSettings === current.adSettings
                  ? current
                  : next;
              });
              return;
            }
          }
        }

        const response = await fetch('/api/server-config', {
          next: { revalidate: 60 },
        });
        if (!response.ok) return;

        const data = await response.json();
        if (cancelled) return;

        if (typeof window !== 'undefined') {
          sessionStorage.setItem(
            SITE_CONFIG_CACHE_KEY,
            JSON.stringify({
              timestamp: Date.now(),
              data: {
                siteName: data.SiteName || siteName,
                announcementTitle:
                  data.AnnouncementTitle !== undefined
                    ? data.AnnouncementTitle
                    : announcementTitle,
                announcement:
                  data.Announcement !== undefined
                    ? data.Announcement
                    : announcement,
                adSettings: data.AdSettings ?? adSettings,
              },
            }),
          );
        }

        setSiteState((current) => {
          const next = {
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
          };

          return next.siteName === current.siteName &&
            next.announcementTitle === current.announcementTitle &&
            next.announcement === current.announcement &&
            next.adSettings === current.adSettings
            ? current
            : next;
        });
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
