'use client';

import {
  Brain,
  Check,
  Download,
  RefreshCw,
  Smartphone,
  Star,
  Tv,
  Zap,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useMemo, useState } from 'react';

import { browserDownload } from '@/lib/browser-download';

import InstallGuide from './components/InstallGuide';
import PhonePreview from './components/PhonePreview';
import { detectPlatform } from './utils';

const APK_SIZE = '63.1';
const APK_VERSION = 'v1.8.0';

function DownloadCard() {
  return (
    <div className='flex flex-col items-center gap-4 p-6 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-sm'>
      <div className='p-2 bg-white rounded-xl shadow-lg shadow-[#f4c24d]/10'>
        <img
          src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent('https://www.5572.net/download/5572tv-android.apk')}`}
          alt='扫码下载 APK'
          className='w-[140px] h-[140px]'
          width={140}
          height={140}
        />
      </div>
      <div className='text-center'>
        <p className='text-sm text-gray-300 font-medium'>手机扫码下载</p>
        <p className='text-xs text-gray-500 mt-1'>
          {APK_VERSION} · {APK_SIZE} MB · Android 5.0+
        </p>
      </div>
    </div>
  );
}

export default function DownloadPage() {
  const platform = useMemo(() => detectPlatform(), []);
  const [showGuide, setShowGuide] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<
    'android' | 'ios' | 'tv'
  >(platform === 'ios' ? 'ios' : platform === 'tv' ? 'tv' : 'android');
  const [isVisible] = useState(true);

  const features = [
    {
      icon: <Zap className='w-6 h-6' />,
      title: '极速播放',
      value: '0.5',
      unit: '秒',
      desc: '平均加载时间',
    },
    {
      icon: <Download className='w-6 h-6' />,
      title: '离线缓存',
      value: '100',
      unit: '万+',
      desc: '已缓存内容',
    },
    {
      icon: <RefreshCw className='w-6 h-6' />,
      title: '多端同步',
      value: '3',
      unit: '台',
      desc: '设备同时在线',
    },
    {
      icon: <Brain className='w-6 h-6' />,
      title: 'AI 推荐',
      value: '98',
      unit: '%',
      desc: '推荐准确率',
    },
  ];

  return (
    <div className='min-h-screen bg-black text-white'>
      {/* Hero Section */}
      <section className='relative min-h-screen flex items-center bg-black'>
        <div className='absolute inset-0'>
          <Image
            src='/images/agnes/epic-bg.png'
            alt=''
            fill
            className='object-cover opacity-30'
            priority
          />
          <div className='absolute inset-0 bg-gradient-to-r from-black/95 via-black/80 to-black/40' />
          <div className='absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/30' />
        </div>

        <div className='relative z-10 w-full max-w-7xl mx-auto px-6 sm:px-12 lg:px-20 py-16'>
          <div
            className={`flex flex-col lg:flex-row items-center gap-12 lg:gap-20 transition-all duration-700 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
          >
            {/* 左侧内容 */}
            <div className='flex-1 text-center lg:text-left'>
              <div className='flex items-center gap-3 mb-6 justify-center lg:justify-start'>
                <Image
                  src='/icons/icon-192x192.png'
                  alt='5572'
                  width={48}
                  height={48}
                  className='rounded-xl'
                />
                <div>
                  <span className='text-xl font-bold text-white'>
                    5572 影视
                  </span>
                  <div className='flex items-center gap-2 text-sm text-gray-400'>
                    <Star className='w-3 h-3 text-yellow-400 fill-yellow-400' />
                    <span>4.8</span>
                    <span>·</span>
                    <span>10万+用户</span>
                  </div>
                </div>
              </div>

              <h1 className='text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-4 leading-tight'>
                想看的，
                <br />
                <span className='text-[#f4c24d]'>这里都有</span>
              </h1>

              <p className='text-lg text-gray-400 mb-6 max-w-lg'>
                海量影视资源聚合，AI智能搜索推荐。支持手机、平板、电视全平台。
              </p>

              <div className='flex gap-6 mb-8 justify-center lg:justify-start'>
                {[
                  { value: '100万+', label: '影视资源' },
                  { value: '50+', label: '播放源' },
                  { value: '24h', label: '实时更新' },
                ].map((stat) => (
                  <div key={stat.label} className='text-center'>
                    <div className='text-xl font-bold text-[#f4c24d]'>
                      {stat.value}
                    </div>
                    <div className='text-xs text-gray-500'>{stat.label}</div>
                  </div>
                ))}
              </div>

              <div className='flex gap-2 mb-6 justify-center lg:justify-start'>
                {(['android', 'ios', 'tv'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setSelectedPlatform(tab)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all ${selectedPlatform === tab ? 'bg-[#f4c24d] text-black' : 'bg-white/10 text-gray-400 hover:bg-white/20'}`}
                  >
                    {tab === 'android' ? (
                      <Smartphone className='w-4 h-4' />
                    ) : tab === 'ios' ? (
                      <Smartphone className='w-4 h-4' />
                    ) : (
                      <Tv className='w-4 h-4' />
                    )}
                    {tab === 'android'
                      ? 'Android'
                      : tab === 'ios'
                        ? 'iOS'
                        : 'TV'}
                  </button>
                ))}
              </div>

              <div className='flex flex-col gap-6 justify-center lg:justify-start'>
                <div className='flex flex-col sm:flex-row gap-3 items-center lg:items-start'>
                  {selectedPlatform === 'ios' ? (
                    <button
                      onClick={() => setShowGuide(true)}
                      className='inline-flex items-center justify-center gap-2 px-8 py-4 bg-[#f4c24d] text-black rounded-xl font-semibold hover:bg-[#d89c18] transition-colors min-h-[56px]'
                    >
                      添加到主屏幕
                    </button>
                  ) : (
                    <a
                      href='/download/5572tv-android.apk'
                      download='5572tv-android.apk'
                      onClick={(e) => {
                        e.preventDefault();
                        browserDownload(
                          '/download/5572tv-android.apk',
                          '5572tv-android.apk',
                        );
                      }}
                      className='inline-flex items-center justify-center gap-2 px-8 py-4 bg-[#f4c24d] text-black rounded-xl font-semibold hover:bg-[#d89c18] transition-colors min-h-[56px]'
                    >
                      <Download className='w-5 h-5' />
                      下载 {selectedPlatform === 'android' ? 'Android' : 'TV'}
                    </a>
                  )}
                  <Link
                    href='/'
                    className='inline-flex items-center justify-center gap-2 px-8 py-4 bg-white/10 text-white rounded-xl font-semibold hover:bg-white/20 transition-colors min-h-[56px]'
                  >
                    网页版体验
                  </Link>
                </div>
                {selectedPlatform !== 'ios' && <DownloadCard />}
              </div>
            </div>

            {/* 右侧手机预览 */}
            <div
              className={`flex-1 flex justify-center lg:justify-end transition-all duration-700 delay-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
            >
              <PhonePreview />
            </div>
          </div>
        </div>
      </section>

      {/* 功能特性 */}
      <section className='py-20 px-6 sm:px-12 lg:px-20 bg-[#111]'>
        <div className='max-w-6xl mx-auto'>
          <div className='text-center mb-12'>
            <h2 className='text-3xl font-bold text-white mb-3'>
              为什么选择 5572
            </h2>
            <p className='text-gray-400'>为极致观影体验而生</p>
          </div>
          <div className='grid grid-cols-2 lg:grid-cols-4 gap-6'>
            {features.map((f) => (
              <div
                key={f.title}
                className='relative p-6 rounded-2xl bg-white/[0.03] border border-white/5 overflow-hidden group hover:border-[#f4c24d]/30 transition-all duration-300 hover:scale-105'
              >
                <div className='absolute inset-0 bg-gradient-to-br from-[#f4c24d]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500' />
                <div className='relative z-10'>
                  <div className='w-12 h-12 rounded-xl bg-[#f4c24d]/10 flex items-center justify-center text-[#f4c24d] mb-4 group-hover:scale-110 transition-transform duration-300'>
                    {f.icon}
                  </div>
                  <div className='flex items-baseline gap-1 mb-1'>
                    <span className='text-3xl font-bold text-[#f4c24d]'>
                      {f.value}
                    </span>
                    <span className='text-lg text-[#f4c24d]/70'>{f.unit}</span>
                  </div>
                  <p className='text-sm text-gray-400'>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 安装说明 */}
      <section className='py-16 px-6 sm:px-12 lg:px-20 bg-[#0a0a0a]'>
        <div className='max-w-6xl mx-auto'>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-8'>
            <div>
              <h2 className='text-2xl font-bold mb-6 text-white'>
                {selectedPlatform === 'ios' ? 'iOS 安装' : '安装步骤'}
              </h2>
              <div className='space-y-4'>
                {(selectedPlatform === 'ios'
                  ? [
                      '用 Safari 打开此页面',
                      '点击底部「分享」按钮',
                      '选择「添加到主屏幕」',
                      '点击「添加」完成',
                    ]
                  : [
                      '点击下载按钮',
                      '打开下载的文件',
                      '点击「仍然安装」',
                      '安装完成，打开使用',
                    ]
                ).map((step, i) => (
                  <div key={`step-${i}`} className='flex items-center gap-4'>
                    <span className='w-8 h-8 rounded-full bg-[#f4c24d]/20 text-[#f4c24d] flex items-center justify-center text-sm font-bold flex-shrink-0'>
                      {i + 1}
                    </span>
                    <span className='text-gray-300'>{step}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h2 className='text-2xl font-bold mb-6 text-white'>核心功能</h2>
              <div className='space-y-3'>
                {[
                  '多源聚合播放',
                  'AI智能搜索推荐',
                  '弹幕互动',
                  '离线缓存',
                  '多端同步',
                ].map((feature) => (
                  <div
                    key={feature}
                    className='flex items-center gap-3 text-gray-300'
                  >
                    <Check className='w-5 h-5 text-[#f4c24d] flex-shrink-0' />
                    {feature}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className='py-8 px-6 sm:px-12 lg:px-20 border-t border-white/10 bg-black'>
        <div className='max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4'>
          <div className='flex items-center gap-2'>
            <Image
              src='/icons/icon-192x192.png'
              alt='5572'
              width={24}
              height={24}
              className='rounded'
            />
            <span className='text-sm text-gray-400'>5572 影视 © 2025</span>
          </div>
          <p className='text-xs text-gray-500'>仅提供影视信息搜索服务</p>
        </div>
      </footer>

      {showGuide && (
        <InstallGuide
          platform={selectedPlatform}
          onClose={() => setShowGuide(false)}
        />
      )}
    </div>
  );
}
