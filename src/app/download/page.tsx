'use client';

import { Apple, Download, QrCode, Smartphone, Tv } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';

// 检测用户平台
function detectPlatform(): 'android' | 'ios' | 'tv' | 'desktop' {
  if (typeof window === 'undefined') return 'desktop';
  const ua = navigator.userAgent.toLowerCase();
  if (/android/.test(ua)) return 'android';
  if (/iphone|ipad|ipod/.test(ua)) return 'ios';
  if (/smart tv|android tv|roku|fire tv/i.test(ua)) return 'tv';
  return 'desktop';
}

export default function DownloadPage() {
  const detectedPlatform = useMemo(() => detectPlatform(), []);
  const [selectedPlatform, setSelectedPlatform] = useState<
    'android' | 'ios' | 'tv'
  >(() => {
    if (
      detectedPlatform === 'android' ||
      detectedPlatform === 'ios' ||
      detectedPlatform === 'tv'
    ) {
      return detectedPlatform;
    }
    return 'android';
  });

  const platforms = [
    {
      id: 'android' as const,
      name: 'Android',
      icon: Smartphone,
      description: '支持 Android 8.0+ 手机和平板',
      apkUrl: '#', // TODO: 替换为实际下载链接
      size: '约 25MB',
      features: ['竖屏短剧', '画中画', '离线缓存', '投屏'],
    },
    {
      id: 'ios' as const,
      name: 'iOS',
      icon: Apple,
      description: '支持 iOS 14.0+ iPhone 和 iPad',
      apkUrl: '#', // TODO: 替换为 TestFlight 或 App Store 链接
      size: '约 30MB',
      features: ['竖屏短剧', '画中画', 'AirPlay', 'Siri 快捷指令'],
    },
    {
      id: 'tv' as const,
      name: 'TV',
      icon: Tv,
      description: '支持 Android TV 和智能电视',
      apkUrl: '#', // TODO: 替换为 TV 版下载链接
      size: '约 20MB',
      features: ['遥控器操作', '大屏优化', '语音搜索', '4K 支持'],
    },
  ];

  const currentPlatform = platforms.find((p) => p.id === selectedPlatform);

  return (
    <div className='min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800'>
      {/* Hero Section */}
      <div className='relative overflow-hidden bg-gradient-to-r from-green-600 to-blue-600 text-white'>
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10"></div>
        <div className='relative max-w-6xl mx-auto px-4 py-16 sm:py-24'>
          <div className='text-center'>
            <h1 className='text-4xl sm:text-5xl font-bold mb-4'>5572 影视</h1>
            <p className='text-xl text-white/80 mb-8'>
              智能影视播放平台 · 随时随地畅享精彩
            </p>

            {/* 快速下载按钮 */}
            <div className='flex flex-col sm:flex-row gap-4 justify-center'>
              <a
                href='#download'
                className='inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-green-600 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all hover:scale-105'
              >
                <Download className='w-6 h-6' />
                立即下载
              </a>
              <Link
                href='/'
                className='inline-flex items-center justify-center gap-2 px-8 py-4 bg-white/20 text-white rounded-xl font-bold text-lg backdrop-blur-sm hover:bg-white/30 transition-all'
              >
                继续使用网页版
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* 功能亮点 */}
      <div className='max-w-6xl mx-auto px-4 py-16'>
        <h2 className='text-2xl font-bold text-center mb-12'>
          为什么选择 App？
        </h2>
        <div className='grid grid-cols-1 md:grid-cols-3 gap-8'>
          <FeatureCard
            icon={<Smartphone className='w-8 h-8' />}
            title='移动端优化'
            description='专为手机设计的竖屏播放体验，像刷短视频一样刷短剧'
          />
          <FeatureCard
            icon={<Tv className='w-8 h-8' />}
            title='TV 大屏'
            description='支持遥控器操作，客厅大屏观影体验'
          />
          <FeatureCard
            icon={<Download className='w-8 h-8' />}
            title='离线缓存'
            description='WiFi 时自动下载，无网络也能看'
          />
        </div>
      </div>

      {/* 平台选择 */}
      <div id='download' className='max-w-4xl mx-auto px-4 py-16'>
        <h2 className='text-2xl font-bold text-center mb-8'>选择你的平台</h2>

        {/* 平台标签 */}
        <div className='flex justify-center gap-4 mb-8'>
          {platforms.map((platform) => {
            const Icon = platform.icon;
            return (
              <button
                key={platform.id}
                onClick={() => setSelectedPlatform(platform.id)}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${
                  selectedPlatform === platform.id
                    ? 'bg-green-500 text-white shadow-lg'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <Icon className='w-5 h-5' />
                {platform.name}
              </button>
            );
          })}
        </div>

        {/* 平台详情 */}
        {currentPlatform && (
          <div className='bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8'>
            <div className='flex flex-col md:flex-row items-center gap-8'>
              {/* 左侧信息 */}
              <div className='flex-1'>
                <h3 className='text-2xl font-bold mb-2'>
                  {currentPlatform.name} 版
                </h3>
                <p className='text-gray-600 dark:text-gray-400 mb-4'>
                  {currentPlatform.description}
                </p>
                <p className='text-sm text-gray-500 mb-6'>
                  大小：{currentPlatform.size}
                </p>

                {/* 功能列表 */}
                <div className='grid grid-cols-2 gap-3 mb-6'>
                  {currentPlatform.features.map((feature) => (
                    <div key={feature} className='flex items-center gap-2'>
                      <div className='w-2 h-2 rounded-full bg-green-500'></div>
                      <span className='text-sm text-gray-700 dark:text-gray-300'>
                        {feature}
                      </span>
                    </div>
                  ))}
                </div>

                {/* 下载按钮 */}
                <div className='flex gap-4'>
                  <a
                    href={currentPlatform.apkUrl}
                    className='inline-flex items-center gap-2 px-8 py-4 bg-green-500 text-white rounded-xl font-bold text-lg shadow-lg hover:bg-green-600 transition-all hover:scale-105'
                  >
                    <Download className='w-5 h-5' />
                    下载 {currentPlatform.name} 版
                  </a>
                </div>
              </div>

              {/* 右侧二维码 */}
              <div className='flex flex-col items-center'>
                <div className='w-48 h-48 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center mb-4'>
                  <QrCode className='w-32 h-32 text-gray-400' />
                </div>
                <p className='text-sm text-gray-500'>扫码下载</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 对比表 */}
      <div className='max-w-4xl mx-auto px-4 py-16'>
        <h2 className='text-2xl font-bold text-center mb-8'>网页 vs App</h2>
        <div className='bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden'>
          <table className='w-full'>
            <thead>
              <tr className='border-b border-gray-200 dark:border-gray-700'>
                <th className='p-4 text-left'>功能</th>
                <th className='p-4 text-center'>网页版</th>
                <th className='p-4 text-center'>App 版</th>
              </tr>
            </thead>
            <tbody>
              {[
                { feature: '影视播放', web: true, app: true },
                { feature: '短剧竖屏', web: '部分', app: '完整' },
                { feature: 'AI 搜索', web: true, app: true },
                { feature: '弹幕互动', web: true, app: true },
                { feature: '离线缓存', web: false, app: true },
                { feature: '推送通知', web: false, app: true },
                { feature: '画中画', web: '部分', app: '完整' },
                { feature: 'TV 遥控器', web: false, app: true },
                { feature: '投屏', web: false, app: true },
              ].map((row) => (
                <tr
                  key={row.feature}
                  className='border-b border-gray-100 dark:border-gray-700/50'
                >
                  <td className='p-4 font-medium'>{row.feature}</td>
                  <td className='p-4 text-center'>
                    {typeof row.web === 'boolean' ? (
                      row.web ? (
                        '✅'
                      ) : (
                        '❌'
                      )
                    ) : (
                      <span className='text-sm text-gray-500'>{row.web}</span>
                    )}
                  </td>
                  <td className='p-4 text-center'>
                    {typeof row.app === 'boolean' ? (
                      row.app ? (
                        '✅'
                      ) : (
                        '❌'
                      )
                    ) : (
                      <span className='text-sm text-green-600 font-medium'>
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

      {/* 底部 */}
      <div className='max-w-4xl mx-auto px-4 py-12 text-center text-gray-500 text-sm'>
        <p>5572 影视 © 2024 · 智能影视播放平台</p>
      </div>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className='bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow'>
      <div className='w-16 h-16 rounded-2xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 mb-4'>
        {icon}
      </div>
      <h3 className='text-lg font-bold mb-2'>{title}</h3>
      <p className='text-gray-600 dark:text-gray-400 text-sm'>{description}</p>
    </div>
  );
}
