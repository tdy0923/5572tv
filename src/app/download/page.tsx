'use client';

import {
  CheckCircle,
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
import { useMemo, useState } from 'react';

function detectPlatform(): 'android' | 'ios' | 'tv' | 'desktop' {
  if (typeof window === 'undefined') return 'desktop';
  const ua = navigator.userAgent.toLowerCase();
  if (/android/.test(ua)) return 'android';
  if (/iphone|ipad|ipod/.test(ua)) return 'ios';
  if (/smart tv|android tv|roku|fire tv/i.test(ua)) return 'tv';
  return 'desktop';
}

function getQrCodeUrl(text: string): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(text)}`;
}

export default function DownloadPage() {
  const detectedPlatform = useMemo(() => detectPlatform(), []);
  const [activeScreenshot, setActiveScreenshot] = useState(0);

  const screenshots = [
    {
      label: '首页推荐',
      color: 'from-emerald-500 to-teal-600',
      items: ['热门电影', '热播剧集', '短剧推荐'],
    },
    {
      label: '搜索发现',
      color: 'from-blue-500 to-indigo-600',
      items: ['AI 智能搜索', '豆瓣数据', '多源聚合'],
    },
    {
      label: '播放器',
      color: 'from-purple-500 to-pink-600',
      items: ['弹幕互动', '倍速播放', '画质切换'],
    },
    {
      label: '个人中心',
      color: 'from-orange-500 to-red-600',
      items: ['播放历史', '收藏管理', '设置偏好'],
    },
  ];

  const downloadLinks = {
    android: {
      name: 'Android',
      icon: Smartphone,
      description: '支持 Android 5.0+ 手机和平板',
      url: '/download/5572tv-android.apk',
      qrText: 'https://www.5572.net/download/5572tv-android.apk',
      size: '约 25MB',
      version: 'v1.0.0',
      features: [
        '竖屏短剧',
        '画中画 PiP',
        '离线缓存',
        '投屏 Chromecast',
        '弹幕发送',
        '后台播放',
      ],
    },
    ios: {
      name: 'iOS',
      icon: Smartphone,
      description: '支持 iOS 14.0+ iPhone 和 iPad',
      url: '#',
      qrText: 'https://testflight.apple.com/join/xxxxx',
      size: '约 30MB',
      version: 'v1.0.0',
      features: [
        '竖屏短剧',
        '画中画',
        'AirPlay 投屏',
        'Siri 快捷指令',
        'Widget 小组件',
      ],
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
      {/* Hero */}
      <div className='relative overflow-hidden bg-linear-to-r from-green-600 via-green-500 to-emerald-500 text-white'>
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
        <div className='relative max-w-6xl mx-auto px-4 py-16 sm:py-24'>
          <div className='flex flex-col lg:flex-row items-center gap-12'>
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
              <div className='flex gap-3 mt-6 justify-center lg:justify-start'>
                {Object.entries(downloadLinks).map(([key, platform]) => {
                  const Icon = platform.icon;
                  return (
                    <Link
                      key={key}
                      href={`/download#${key}`}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${detectedPlatform === key ? 'bg-white text-green-600 shadow-lg' : 'bg-white/20 text-white hover:bg-white/30'}`}
                    >
                      <Icon className='w-4 h-4' />
                      {platform.name}
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Phone Mockup with Real-like UI */}
            <div className='flex-shrink-0 hidden sm:block'>
              <div className='relative w-64 h-[520px] bg-gray-900 rounded-[3rem] shadow-2xl border-4 border-gray-700 overflow-hidden'>
                <div className='absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-gray-900 rounded-b-2xl z-10' />
                <div className='h-full overflow-hidden'>
                  {/* Status Bar */}
                  <div className='flex justify-between items-center px-4 pt-8 pb-2 text-white/60 text-xs'>
                    <span>9:41</span>
                    <span>●●● WiFi 🔋</span>
                  </div>
                  {/* App Header */}
                  <div className='px-4 py-2'>
                    <div className='flex items-center gap-2 mb-3'>
                      <div className='w-8 h-8 bg-green-500 rounded-xl flex items-center justify-center text-white font-bold text-sm'>
                        5
                      </div>
                      <span className='text-white font-bold text-sm'>
                        5572 影视
                      </span>
                    </div>
                    <div className='flex gap-2 mb-3'>
                      {['推荐', '电影', '剧集', '动漫'].map((t, i) => (
                        <span
                          key={t}
                          className={`text-xs px-3 py-1 rounded-full ${i === 0 ? 'bg-green-500 text-white' : 'bg-white/10 text-white/60'}`}
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                  {/* Content Cards */}
                  <div className='px-3 space-y-2'>
                    {screenshots[activeScreenshot].items.map((item, i) => (
                      <div
                        key={i}
                        className={`flex gap-2 p-2 rounded-xl bg-gradient-to-r ${screenshots[activeScreenshot].color} bg-opacity-20`}
                      >
                        <div className='w-12 h-16 rounded-lg bg-white/20 flex-shrink-0' />
                        <div className='flex-1 py-1'>
                          <div className='h-3 bg-white/30 rounded w-3/4 mb-1' />
                          <div className='h-2 bg-white/20 rounded w-1/2 mb-1' />
                          <div className='flex gap-1'>
                            <span className='text-[9px] text-white/50 bg-white/10 px-1 rounded'>
                              HD
                            </span>
                            <span className='text-[9px] text-white/50'>·</span>
                            <span className='text-[9px] text-white/50'>
                              8.5分
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {/* Bottom Nav */}
                  <div className='absolute bottom-0 left-0 right-0 flex justify-around py-2 bg-gray-900/90 backdrop-blur'>
                    {['首页', '搜索', '我的'].map((t, i) => (
                      <div
                        key={t}
                        className={`flex flex-col items-center gap-0.5 ${i === 0 ? 'text-green-400' : 'text-white/40'}`}
                      >
                        <div className='w-5 h-5 rounded-full bg-current opacity-20' />
                        <span className='text-[9px]'>{t}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              {/* Screenshot Dots */}
              <div className='flex justify-center gap-2 mt-4'>
                {screenshots.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveScreenshot(i)}
                    className={`w-2 h-2 rounded-full transition-all ${i === activeScreenshot ? 'bg-white w-6' : 'bg-white/40'}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className='max-w-6xl mx-auto px-4 py-16'>
        <h2 className='text-2xl sm:text-3xl font-bold text-center mb-4 text-gray-900 dark:text-white'>
          为什么选择 App？
        </h2>
        <p className='text-center text-gray-500 dark:text-gray-400 mb-12'>
          比网页版更强大，体验更流畅
        </p>
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6'>
          {[
            {
              icon: <Zap className='w-6 h-6' />,
              title: '极速加载',
              desc: '原生性能，秒开播放',
              color: 'yellow',
            },
            {
              icon: <Shield className='w-6 h-6' />,
              title: '离线观看',
              desc: 'WiFi下载，无网也能看',
              color: 'green',
            },
            {
              icon: <Wifi className='w-6 h-6' />,
              title: '多端同步',
              desc: '手机、平板、电视进度同步',
              color: 'blue',
            },
            {
              icon: <Star className='w-6 h-6' />,
              title: '智能推荐',
              desc: 'AI分析喜好，精准推荐',
              color: 'purple',
            },
          ].map((f) => (
            <div
              key={f.title}
              className='bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1'
            >
              <div
                className={`w-14 h-14 rounded-2xl bg-${f.color}-100 dark:bg-${f.color}-900/30 text-${f.color}-600 flex items-center justify-center mb-4`}
              >
                {f.icon}
              </div>
              <h3 className='text-lg font-bold mb-2 text-gray-900 dark:text-white'>
                {f.title}
              </h3>
              <p className='text-gray-500 dark:text-gray-400 text-sm'>
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Platform Detail */}
      <div id={detectedPlatform} className='max-w-4xl mx-auto px-4 py-16'>
        <h2 className='text-2xl sm:text-3xl font-bold text-center mb-8 text-gray-900 dark:text-white'>
          {currentPlatform.name} 版下载
        </h2>
        <div className='bg-white dark:bg-gray-800 rounded-3xl shadow-xl overflow-hidden'>
          <div className='flex flex-col md:flex-row'>
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
              <div className='grid grid-cols-2 gap-3 mb-8'>
                {currentPlatform.features.map((feature) => (
                  <div key={feature} className='flex items-center gap-2'>
                    <CheckCircle className='w-4 h-4 text-green-500 flex-shrink-0' />
                    <span className='text-sm text-gray-700 dark:text-gray-300'>
                      {feature}
                    </span>
                  </div>
                ))}
              </div>
              <a
                href={currentPlatform.url}
                className='w-full inline-flex items-center justify-center gap-2 px-6 py-4 bg-green-500 text-white rounded-2xl font-bold text-lg shadow-lg hover:bg-green-600 hover:shadow-xl transition-all'
              >
                <Download className='w-5 h-5' />
                立即下载
              </a>
            </div>
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

      {/* Comparison */}
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

      {/* Footer */}
      <div className='max-w-4xl mx-auto px-4 py-12 text-center'>
        <p className='text-gray-400 dark:text-gray-500 text-sm'>
          5572 影视 © 2025 · 智能影视播放平台
        </p>
      </div>
    </div>
  );
}
