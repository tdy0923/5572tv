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
import { DeviceProvider } from '../lib/device-context';

const inter = Inter({ subsets: ['latin'], display: 'swap' });

export async function generateMetadata(): Promise<Metadata> {
  const siteName = process.env.NEXT_PUBLIC_SITE_NAME || '5572影视';
  return {
    title: siteName,
    description: '5572影视 - 智能影视播放平台，海量资源，AI搜索，弹幕互动',
    manifest: '/manifest.json',
    icons: {
      icon: [
        { url: '/favicon.ico' },
        { url: '/icon-5.svg', type: 'image/svg+xml' },
        { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
        { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
      ],
      apple: [
        { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      ],
      shortcut: '/favicon.ico',
    },
    appleWebApp: {
      capable: true,
      statusBarStyle: 'black-translucent',
      title: siteName,
    },
    formatDetection: {
      telephone: false,
    },
    openGraph: {
      title: siteName,
      description: '5572影视 - 智能影视播放平台',
      type: 'website',
      siteName: siteName,
    },
  };
}

export const viewport: Viewport = {
  viewportFit: 'cover',
  themeColor: '#f4c24d',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
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
  let customCSS = '';

  try {
    const { getConfig } = await import('@/lib/config');
    const cfg = await getConfig();
    adSettings = cfg?.SiteConfig?.AdSettings || undefined;
    customCSS = cfg?.SiteConfig?.CustomCSS || '';
  } catch {
    // ignore config load errors
  }

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
    AD_SETTINGS: adSettings,
  };

  return (
    <html lang='zh-CN' suppressHydrationWarning>
      <head>
        <meta name='color-scheme' content='light dark' />
        <link rel='apple-touch-icon' href='/icons/icon-192x192.png' />
        <link rel='preconnect' href='https://fonts.googleapis.com' />
        <link
          rel='preconnect'
          href='https://fonts.gstatic.com'
          crossOrigin='anonymous'
        />
        {/* 将配置序列化后直接写入脚本，浏览器端可通过 window.RUNTIME_CONFIG 获取 */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var t = localStorage.getItem('theme');
                if (t === 'dark' || (!t && matchMedia('(prefers-color-scheme:dark)').matches)) {
                  document.documentElement.classList.add('dark');
                }
              } catch(e) {}
            `,
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `window.RUNTIME_CONFIG = ${JSON.stringify(runtimeConfig)};`,
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                  navigator.serviceWorker.register('/sw.js').catch(function(e) { console.warn('SW registration failed:', e); });
                });
              }
            `,
          }}
        />
        {customCSS && <style dangerouslySetInnerHTML={{ __html: customCSS }} />}
        <script
          defer
          src='https://tg.yunku.de/script.js'
          data-website-id='73df4a1d-50cd-41de-a1b0-308bcb1018ea'
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
          <DeviceProvider>
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
            <Toaster
              position='top-center'
              richColors
              closeButton
              toastOptions={{
                style: { marginTop: 'env(safe-area-inset-top)' },
              }}
            />
          </DeviceProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
