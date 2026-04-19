import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { Suspense } from 'react';
import { Toaster } from 'sonner';

import './globals.css';

import { DownloadPanel } from '../components/download/DownloadPanel';
import { GlobalErrorIndicator } from '../components/GlobalErrorIndicator';
import QueryProvider from '../components/QueryProvider';
import { SessionTracker } from '../components/SessionTracker';
import { SiteProvider } from '../components/SiteProvider';
import { ThemeProvider } from '../components/ThemeProvider';
import ChatFloatingWindow from '../components/watch-room/ChatFloatingWindow';
import { WatchRoomProvider } from '../components/WatchRoomProvider';
import { DownloadProvider } from '../contexts/DownloadContext';
import { GlobalCacheProvider } from '../contexts/GlobalCacheContext';

const inter = Inter({ subsets: ['latin'] });

export async function generateMetadata(): Promise<Metadata> {
  const siteName = process.env.NEXT_PUBLIC_SITE_NAME || '5572影视';
  return {
    title: siteName,
    description: '5572影视 - 影视聚合与在线播放',
    manifest: '/manifest.json',
    icons: {
      icon: [
        { url: '/favicon.ico' },
        { url: '/icon-5.svg', type: 'image/svg+xml' },
      ],
      apple: '/icons/icon-192x192.png',
      shortcut: '/favicon.ico',
    },
  };
}

export const viewport: Viewport = {
  viewportFit: 'cover',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let siteName = process.env.NEXT_PUBLIC_SITE_NAME || '5572影视';
  let announcementTitle = process.env.ANNOUNCEMENT_TITLE || '站点公告';
  let announcement =
    process.env.ANNOUNCEMENT ||
    '本网站仅提供影视信息搜索服务，所有内容均来自第三方网站。本站不存储任何视频资源，不对任何内容的准确性、合法性、完整性负责。';

  let doubanProxyType = process.env.NEXT_PUBLIC_DOUBAN_PROXY_TYPE || 'direct';
  let doubanProxy = process.env.NEXT_PUBLIC_DOUBAN_PROXY || '';
  let doubanImageProxyType =
    process.env.NEXT_PUBLIC_DOUBAN_IMAGE_PROXY_TYPE || 'server';
  let doubanImageProxy = process.env.NEXT_PUBLIC_DOUBAN_IMAGE_PROXY || '';
  let disableYellowFilter =
    process.env.NEXT_PUBLIC_DISABLE_YELLOW_FILTER === 'true';
  let fluidSearch = process.env.NEXT_PUBLIC_FLUID_SEARCH !== 'false';
  let enableWebLive = false;
  let customAdFilterVersion = 0;
  let aiRecommendEnabled = false;
  let embyEnabled = false;
  let adSettings = undefined as any;

  // 将运行时配置注入到全局 window 对象，供客户端在运行时读取
  const runtimeConfig = {
    STORAGE_TYPE: process.env.NEXT_PUBLIC_STORAGE_TYPE || 'localstorage',
    DOUBAN_PROXY_TYPE: doubanProxyType,
    DOUBAN_PROXY: doubanProxy,
    DOUBAN_IMAGE_PROXY_TYPE: doubanImageProxyType,
    DOUBAN_IMAGE_PROXY: doubanImageProxy,
    DISABLE_YELLOW_FILTER: disableYellowFilter,
    CUSTOM_CATEGORIES: [],
    FLUID_SEARCH: fluidSearch,
    ENABLE_WEB_LIVE: enableWebLive,
    CUSTOM_AD_FILTER_VERSION: customAdFilterVersion,
    AI_RECOMMEND_ENABLED: aiRecommendEnabled,
    EMBY_ENABLED: embyEnabled,
    PRIVATE_LIBRARY_ENABLED: embyEnabled,
    // 禁用预告片：Vercel 自动检测，或用户手动设置 DISABLE_HERO_TRAILER=true
    DISABLE_HERO_TRAILER:
      process.env.VERCEL === '1' || process.env.DISABLE_HERO_TRAILER === 'true',
  };

  return (
    <html lang='zh-CN' suppressHydrationWarning>
      <head>
        <meta
          name='viewport'
          content='width=device-width, initial-scale=1.0, viewport-fit=cover'
        />
        <meta name='color-scheme' content='light dark' />
        <link rel='apple-touch-icon' href='/icons/icon-192x192.png' />
        {/* 将配置序列化后直接写入脚本，浏览器端可通过 window.RUNTIME_CONFIG 获取 */}
        <script
          dangerouslySetInnerHTML={{
            __html: `window.RUNTIME_CONFIG = ${JSON.stringify(runtimeConfig)};`,
          }}
        />
      </head>
      <body
        className={`${inter.className} min-h-screen bg-white text-gray-900 dark:bg-black dark:text-gray-200`}
      >
        <ThemeProvider
          attribute='class'
          defaultTheme='system'
          enableSystem
          disableTransitionOnChange
        >
          <QueryProvider>
            <GlobalCacheProvider>
              <DownloadProvider>
                <WatchRoomProvider>
                  <SiteProvider
                    siteName={siteName}
                    announcementTitle={announcementTitle}
                    announcement={announcement}
                    adSettings={adSettings}
                  >
                    <Suspense
                      fallback={
                        <div className='min-h-screen flex items-center justify-center'>
                          Loading...
                        </div>
                      }
                    >
                      <SessionTracker />
                      {children}
                      <GlobalErrorIndicator />
                    </Suspense>
                  </SiteProvider>
                  <Suspense fallback={null}>
                    <DownloadPanel />
                    <ChatFloatingWindow />
                  </Suspense>
                </WatchRoomProvider>
              </DownloadProvider>
            </GlobalCacheProvider>
          </QueryProvider>
          <Toaster position='top-center' richColors closeButton />
        </ThemeProvider>
      </body>
    </html>
  );
}
