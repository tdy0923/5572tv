'use client';

import {
  Download,
  ExternalLink,
  Shield,
  Smartphone,
  Star,
  Tv,
  Wifi,
  Zap,
} from 'lucide-react';
import Link from 'next/link';
import { useMemo } from 'react';

// 检测用户平台
function detectPlatform(): 'android' | 'ios' | 'tv' | 'desktop' {
  if (typeof window === 'undefined') return 'desktop';
  const ua = navigator.userAgent.toLowerCase();
  if (/android/.test(ua)) return 'android';
  if (/iphone|ipad|ipod/.test(ua)) return 'ios';
  if (/smart tv|android tv|roku|fire tv/i.test(ua)) return 'tv';
  return 'desktop';
}

// 生成二维码 URL（使用公共 API）
function getQrCodeUrl(text: string): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(text)}`;
}

export default function DownloadPage() {
  const detectedPlatform = useMemo(() => detectPlatform(), []);

  // 下载链接配置
  const downloadLinks = {
    android: {
      name: 'Android',
      icon: Smartphone,
      description: '支持 Android 5.0+ 手机和平板',
      url: '/download/5572tv-android.apk',
      qrText: 'https://www.5572.net/download/5572tv-android.apk',
      size: '约 25MB',
      version: 'v1.0.0',
      features: ['竖屏短剧', '画中画', '离线缓存', '投屏', '弹幕发送'],
    },
    ios: {
      name: 'iOS',
      icon: Smartphone,
      description: '支持 iOS 14.0+ iPhone 和 iPad',
      url: '#',
      qrText: 'https://testflight.apple.com/join/xxxxx',
      size: '约 30MB',
      version: 'v1.0.0',
      features: ['竖屏短剧', '画中画', 'AirPlay', 'Siri 快捷指令', 'Widget'],
    },
    tv: {
      name: 'Android TV',
      icon: Tv,
      description: '支持 Android TV 和智能电视',
      url: '/download/5572tv-android.apk',
      qrText: 'https://www.5572.net/download/5572tv-android.apk',
      size: '约 20MB',
      version: 'v1.0.0',
      features: ['遥控器操作', '大屏优化', '语音搜索', '4K 支持', '屏保模式'],
    },
  };

  const currentPlatform =
    downloadLinks[detectedPlatform as keyof typeof downloadLinks] ||
    downloadLinks.android;

  return (
    <div className='min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800'>
      {/* Hero Section */}
      <div className='relative overflow-hidden bg-linear-to-r from-green-600 via-green-500 to-emerald-500 text-white'>
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
        <div className='relative max-w-6xl mx-auto px-4 py-16 sm:py-24'>
          <div className='flex flex-col lg:flex-row items-center gap-12'>
            {/* 左侧文字 */}
            <div className='flex-1 text-center lg:text-left'>
              <h1 className='text-4xl sm:text-5xl lg:text-6xl font-bold mb-4'>
                5572 影视
              </h1>
              <p className='text-xl sm:text-2xl text-white/80 mb-2'>
                智能影视播放平台
              </p>
              <p className='text-lg text-white/60 mb-8'>
                海量资源 · AI搜索 · 弹幕互动 · 多端同步
              </p>

              {/* 下载按钮 */}
              <div className='flex flex-col sm:flex-row gap-4 justify-center lg:justify-start'>
                <a
                  href={currentPlatform.url}
                  className='inline-flex items-center justify-center gap-3 px-8 py-4 bg-white text-green-600 rounded-2xl font-bold text-lg shadow-xl hover:shadow-2xl transition-all hover:scale-105'
                >
                  <currentPlatform.icon className='w-6 h-6' />
                  下载 {currentPlatform.name} 版
                </a>
                <Link
                  href='/'
                  className='inline-flex items-center justify-center gap-2 px-8 py-4 bg-white/20 text-white rounded-2xl font-bold text-lg backdrop-blur-sm hover:bg-white/30 transition-all border border-white/30'
                >
                  继续使用网页版
                  <ExternalLink className='w-5 h-5' />
                </Link>
              </div>

              {/* 平台标签 */}
              <div className='flex gap-3 mt-6 justify-center lg:justify-start'>
                {Object.entries(downloadLinks).map(([key, platform]) => {
                  const Icon = platform.icon;
                  return (
                    <Link
                      key={key}
                      href={`/download#${key}`}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                        detectedPlatform === key
                          ? 'bg-white text-green-600 shadow-lg'
                          : 'bg-white/20 text-white hover:bg-white/30'
                      }`}
                    >
                      <Icon className='w-4 h-4' />
                      {platform.name}
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* 右侧手机预览 */}
            <div className='flex-shrink-0'>
              <div className='relative w-64 h-[500px] bg-gray-900 rounded-[3rem] shadow-2xl border-4 border-gray-700 overflow-hidden'>
                <div className='absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-gray-900 rounded-b-2xl' />
                <div className='p-4 pt-10'>
                  <div className='text-center mb-4'>
                    <div className='w-16 h-16 mx-auto bg-green-500 rounded-2xl flex items-center justify-center text-2xl font-bold text-white'>
                      5
                    </div>
                    <p className='text-white text-sm mt-2 font-medium'>
                      5572 影视
                    </p>
                  </div>
                  <div className='space-y-3'>
                    {[1, 2, 3].map((i) => (
                      <div key={i} className='flex gap-2'>
                        <div className='w-16 h-22 bg-gray-700 rounded-lg' />
                        <div className='flex-1'>
                          <div className='h-3 bg-gray-700 rounded w-3/4 mb-1' />
                          <div className='h-2 bg-gray-700 rounded w-1/2' />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 功能亮点 */}
      <div className='max-w-6xl mx-auto px-4 py-16'>
        <h2 className='text-2xl sm:text-3xl font-bold text-center mb-4 text-gray-900 dark:text-white'>
          为什么选择 App？
        </h2>
        <p className='text-center text-gray-500 dark:text-gray-400 mb-12'>
          比网页版更强大，体验更流畅
        </p>

        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6'>
          <FeatureCard
            icon={<Zap className='w-6 h-6' />}
            title='极速加载'
            description='原生性能，秒开播放'
            color='yellow'
          />
          <FeatureCard
            icon={<Shield className='w-6 h-6' />}
            title='离线观看'
            description='WiFi下载，无网也能看'
            color='green'
          />
          <FeatureCard
            icon={<Wifi className='w-6 h-6' />}
            title='多端同步'
            description='手机、平板、电视进度同步'
            color='blue'
          />
          <FeatureCard
            icon={<Star className='w-6 h-6' />}
            title='智能推荐'
            description='AI分析你的喜好，精准推荐'
            color='purple'
          />
        </div>
      </div>

      {/* 平台详情 */}
      <div id={detectedPlatform} className='max-w-4xl mx-auto px-4 py-16'>
        <h2 className='text-2xl sm:text-3xl font-bold text-center mb-8 text-gray-900 dark:text-white'>
          {currentPlatform.name} 版下载
        </h2>

        <div className='bg-white dark:bg-gray-800 rounded-3xl shadow-xl overflow-hidden'>
          <div className='flex flex-col md:flex-row'>
            {/* 左侧信息 */}
            <div className='flex-1 p-8'>
              <div className='flex items-center gap-3 mb-4'>
                <currentPlatform.icon className='w-8 h-8 text-green-500' />
                <div>
                  <h3 className='text-xl font-bold text-gray-900 dark:text-white'>
                    {currentPlatform.name}
                  </h3>
                  <p className='text-sm text-gray-500 dark:text-gray-400'>
                    {currentPlatform.description}
                  </p>
                </div>
              </div>

              <div className='flex items-center gap-4 mb-6 text-sm text-gray-500 dark:text-gray-400'>
                <span>{currentPlatform.version}</span>
                <span>·</span>
                <span>{currentPlatform.size}</span>
              </div>

              {/* 功能列表 */}
              <div className='grid grid-cols-2 gap-3 mb-8'>
                {currentPlatform.features.map((feature) => (
                  <div key={feature} className='flex items-center gap-2'>
                    <div className='w-5 h-5 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center'>
                      <svg
                        className='w-3 h-3 text-green-600'
                        fill='currentColor'
                        viewBox='0 0 20 20'
                      >
                        <path
                          fillRule='evenodd'
                          d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z'
                          clipRule='evenodd'
                        />
                      </svg>
                    </div>
                    <span className='text-sm text-gray-700 dark:text-gray-300'>
                      {feature}
                    </span>
                  </div>
                ))}
              </div>

              {/* 下载按钮 */}
              <a
                href={currentPlatform.url}
                className='w-full inline-flex items-center justify-center gap-2 px-6 py-4 bg-green-500 text-white rounded-2xl font-bold text-lg shadow-lg hover:bg-green-600 hover:shadow-xl transition-all'
              >
                <Download className='w-5 h-5' />
                立即下载
              </a>
            </div>

            {/* 右侧二维码 */}
            <div className='flex flex-col items-center justify-center p-8 bg-gray-50 dark:bg-gray-700/50 md:border-l border-gray-200 dark:border-gray-700'>
              <img
                src={getQrCodeUrl(currentPlatform.qrText)}
                alt='扫码下载'
                className='w-48 h-48 rounded-2xl shadow-lg mb-4'
              />
              <p className='text-sm text-gray-500 dark:text-gray-400 text-center'>
                手机扫描二维码下载
              </p>
              <p className='text-xs text-gray-400 dark:text-gray-500 mt-2 text-center max-w-[200px]'>
                或在手机浏览器中打开此页面
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 对比表 */}
      <div className='max-w-4xl mx-auto px-4 py-16'>
        <h2 className='text-2xl sm:text-3xl font-bold text-center mb-8 text-gray-900 dark:text-white'>
          网页版 vs App
        </h2>
        <div className='bg-white dark:bg-gray-800 rounded-3xl shadow-xl overflow-hidden'>
          <div className='overflow-x-auto'>
            <table className='w-full'>
              <thead>
                <tr className='border-b border-gray-200 dark:border-gray-700'>
                  <th className='p-4 text-left text-gray-600 dark:text-gray-400 font-medium'>
                    功能
                  </th>
                  <th className='p-4 text-center text-gray-600 dark:text-gray-400 font-medium'>
                    网页版
                  </th>
                  <th className='p-4 text-center text-green-600 dark:text-green-400 font-bold'>
                    App 版
                  </th>
                </tr>
              </thead>
              <tbody>
                {[
                  { feature: '影视播放', web: true, app: true },
                  { feature: '短剧竖屏', web: '部分', app: '完整' },
                  { feature: 'AI 摘要', web: true, app: true },
                  { feature: '弹幕互动', web: true, app: true },
                  { feature: '离线缓存', web: false, app: true },
                  { feature: '推送通知', web: false, app: true },
                  { feature: '画中画', web: '部分', app: '完整' },
                  { feature: 'TV 遥控器', web: false, app: true },
                  { feature: '投屏', web: false, app: true },
                ].map((row) => (
                  <tr
                    key={row.feature}
                    className='border-b border-gray-100 dark:border-gray-700/50 last:border-0'
                  >
                    <td className='p-4 text-gray-700 dark:text-gray-300'>
                      {row.feature}
                    </td>
                    <td className='p-4 text-center'>
                      {typeof row.web === 'boolean' ? (
                        row.web ? (
                          <span className='text-green-500'>✅</span>
                        ) : (
                          <span className='text-gray-300 dark:text-gray-600'>
                            —
                          </span>
                        )
                      ) : (
                        <span className='text-sm text-gray-500'>{row.web}</span>
                      )}
                    </td>
                    <td className='p-4 text-center'>
                      {typeof row.app === 'boolean' ? (
                        row.app ? (
                          <span className='text-green-500'>✅</span>
                        ) : (
                          <span className='text-gray-300 dark:text-gray-600'>
                            —
                          </span>
                        )
                      ) : (
                        <span className='text-sm text-green-600 dark:text-green-400 font-medium'>
                          {row.app}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 底部 */}
      <div className='max-w-4xl mx-auto px-4 py-12 text-center'>
        <p className='text-gray-400 dark:text-gray-500 text-sm'>
          5572 影视 © 2024 · 智能影视播放平台
        </p>
      </div>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
  color,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
}) {
  const colorClasses = {
    yellow: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600',
    green: 'bg-green-100 dark:bg-green-900/30 text-green-600',
    blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600',
    purple: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600',
  };

  return (
    <div className='bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1'>
      <div
        className={`w-14 h-14 rounded-2xl ${colorClasses[color as keyof typeof colorClasses]} flex items-center justify-center mb-4`}
      >
        {icon}
      </div>
      <h3 className='text-lg font-bold mb-2 text-gray-900 dark:text-white'>
        {title}
      </h3>
      <p className='text-gray-500 dark:text-gray-400 text-sm'>{description}</p>
    </div>
  );
}
