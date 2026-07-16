'use client';

import { Check, Download, X } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useMemo, useState } from 'react';

import { browserDownload } from '@/lib/browser-download';

import {
  FluentFadeIn,
  FluentScaleIn,
  FluentStagger,
} from '@/components/FluentTransition';
import { GlassPanel } from '@/components/ui-surface';

import AnimatedGradient from './components/AnimatedGradient';
import FeatureShowcase from './components/FeatureShowcase';
import InstallGuide from './components/InstallGuide';
import PhonePreview from './components/PhonePreview';
import PlatformTabs from './components/PlatformTabs';
import { detectPlatform } from './utils';

const APK_SIZE = '53';
const APK_VERSION = 'v1.11.0';

export default function DownloadPage() {
  const platform = useMemo(() => detectPlatform(), []);
  const [showGuide, setShowGuide] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<
    'android' | 'ios' | 'tv'
  >(platform === 'ios' ? 'ios' : platform === 'tv' ? 'tv' : 'android');

  const steps =
    selectedPlatform === 'ios'
      ? [
          { title: '打开 Safari', desc: '在 Safari 中访问 www.5572.net' },
          { title: '添加到主屏幕', desc: '点击底部「分享」→「添加到主屏幕」' },
          { title: '确认添加', desc: '点击右上角「添加」确认' },
          { title: '打开使用', desc: '回到主屏幕，点击图标打开 5572 影视' },
        ]
      : [
          { title: '下载安装包', desc: '点击下载按钮，等待 APK 下载完成' },
          { title: '允许安装', desc: '打开文件，点击「仍然安装」' },
          { title: '完成安装', desc: '安装完成后在桌面找到应用图标' },
          { title: '打开使用', desc: '首次打开可能需要几秒加载，耐心等待' },
        ];

  return (
    <div className='min-h-screen bg-[#0a0a0a]'>
      {/* ── Hero ── */}
      <section className='relative min-h-[100dvh] flex items-center overflow-hidden'>
        <AnimatedGradient />
        <div className='absolute inset-0'>
          <Image
            src='/images/agnes/epic-bg.png'
            alt=''
            fill
            className='object-cover opacity-20'
            priority
          />
          <div className='absolute inset-0 bg-gradient-to-br from-[#0a0a0a] via-[#0a0a0a]/80 to-transparent' />
          <div className='absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-[#0a0a0a]/60' />
        </div>

        <div className='relative z-10 w-full max-w-7xl mx-auto px-5 sm:px-8 lg:px-16 py-10'>
          <FluentFadeIn>
            <div className='flex flex-col lg:flex-row items-center gap-10 lg:gap-16'>
              {/* Left */}
              <div className='flex-1 text-center lg:text-left'>
                {/* Logo + rating */}
                <div className='flex items-center gap-3 mb-5 justify-center lg:justify-start'>
                  <div className='relative'>
                    <img
                      src='/icons/icon.svg'
                      alt='5572'
                      width={48}
                      height={48}
                      className='rounded-xl'
                      style={{ boxShadow: '0 4px 16px rgba(244,194,77,0.3)' }}
                    />
                  </div>
                  <div>
                    <span className='text-lg font-bold text-white'>
                      5572 影视
                    </span>
                    <div className='flex items-center gap-1.5 text-xs justify-center lg:justify-start mt-0.5'>
                      <span style={{ color: '#f4c24d' }}>★</span>
                      <span style={{ color: '#a3a3a3' }}>4.8</span>
                      <span style={{ color: '#545454' }}>·</span>
                      <span style={{ color: '#a3a3a3' }}>10万+用户</span>
                    </div>
                  </div>
                </div>

                {/* Headline */}
                <h1 className='text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-3 leading-tight'>
                  想看的，
                  <span style={{ color: '#f4c24d' }}>这里都有</span>
                </h1>
                <p
                  className='text-base mb-5 max-w-md mx-auto lg:mx-0'
                  style={{ color: '#a3a3a3' }}
                >
                  海量影视资源聚合，AI智能搜索推荐。支持手机、平板、电视全平台。
                </p>

                {/* Stats */}
                <div className='flex gap-6 mb-5 justify-center lg:justify-start'>
                  {[
                    { v: '100万+', l: '影视资源' },
                    { v: '50+', l: '播放源' },
                    { v: '24h', l: '实时更新' },
                  ].map((s) => (
                    <div key={s.l}>
                      <div
                        className='text-lg font-bold'
                        style={{ color: '#f4c24d' }}
                      >
                        {s.v}
                      </div>
                      <div className='text-xs' style={{ color: '#767676' }}>
                        {s.l}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Platform tabs */}
                <PlatformTabs
                  selected={selectedPlatform}
                  onSelect={setSelectedPlatform}
                  className='mb-5 lg:justify-start'
                />

                {/* CTA row */}
                <div className='flex flex-col sm:flex-row gap-3 mb-6 justify-center lg:justify-start'>
                  {selectedPlatform === 'ios' ? (
                    <button
                      onClick={() => setShowGuide(true)}
                      className='inline-flex items-center justify-center gap-2 px-7 py-3 rounded-lg font-semibold text-sm whitespace-nowrap transition-all duration-150'
                      style={{
                        background: 'linear-gradient(135deg, #f4c24d, #dba52b)',
                        color: '#1a1a1a',
                        boxShadow: '0 4px 16px rgba(244,194,77,0.3)',
                      }}
                    >
                      iOS 安装指南
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
                      className='inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold text-sm transition-all duration-200 hover:scale-[1.02] hover:shadow-lg active:scale-[0.98] overflow-hidden'
                      style={{
                        background: 'linear-gradient(135deg, #f4c24d, #dba52b)',
                        color: '#1a1a1a',
                        boxShadow: '0 4px 16px rgba(244,194,77,0.3)',
                      }}
                    >
                      <Download className='w-4 h-4 shrink-0' />
                      <span>
                        下载 {selectedPlatform === 'android' ? 'Android' : 'TV'}{' '}
                        版
                      </span>
                    </a>
                  )}
                  <Link
                    href='/'
                    className='inline-flex items-center justify-center gap-2 px-7 py-3 rounded-lg font-semibold text-sm whitespace-nowrap transition-all duration-150'
                    style={{
                      background: 'rgba(255,255,255,0.06)',
                      color: '#d4d4d4',
                      border: '1px solid rgba(255,255,255,0.1)',
                    }}
                  >
                    网页版体验
                  </Link>
                </div>

                {/* Architecture selector */}
                {selectedPlatform !== 'ios' && (
                  <div className='mb-6 flex flex-wrap gap-2 justify-center lg:justify-start'>
                    <span
                      className='inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold'
                      style={{
                        background: '#f4c24d',
                        color: '#1a1a1a',
                      }}
                    >
                      arm64-v8a 64位（推荐）
                    </span>
                    <a
                      href='/download/5572tv-android-armv7a.apk'
                      download
                      className='inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 hover:bg-white/10 hover:scale-[1.02] active:scale-[0.98] overflow-hidden'
                      style={{
                        background: 'rgba(255,255,255,0.06)',
                        color: '#a3a3a3',
                        border: '1px solid rgba(255,255,255,0.1)',
                      }}
                    >
                      armeabi-v7a 兼容版
                    </a>
                  </div>
                )}

                {/* QR Code */}
                <GlassPanel
                  className='!inline-flex items-center gap-4 !p-4 !rounded-xl !border-white/10 !bg-white/[0.03] !shadow-none group cursor-pointer hover:!bg-white/[0.06] transition-all duration-200'
                  onClick={() => setShowQRModal(true)}
                >
                  <div className='relative'>
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(selectedPlatform === 'ios' ? 'https://www.5572.net' : 'https://www.5572.net/download/5572tv-android.apk')}`}
                      alt='扫码下载'
                      className='w-28 h-28 rounded-lg transition-transform duration-300 group-hover:scale-105'
                    />
                    <div className='absolute inset-0 flex items-center justify-center bg-black/40 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200'>
                      <span className='text-xs text-white font-medium'>
                        点击放大
                      </span>
                    </div>
                  </div>
                  <div>
                    <p className='text-sm font-medium text-white'>扫码下载</p>
                    <p className='text-xs mt-1' style={{ color: '#767676' }}>
                      {selectedPlatform === 'ios'
                        ? '访问网站安装 PWA'
                        : `${APK_VERSION} · ${APK_SIZE}MB · arm64-v8a`}
                    </p>
                  </div>
                </GlassPanel>

                {/* QR Modal */}
                {showQRModal && (
                  <div
                    className='fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm'
                    onClick={() => setShowQRModal(false)}
                  >
                    <div
                      className='relative bg-[#1a1a1a] rounded-2xl p-6 shadow-2xl border border-white/10 max-w-sm w-full mx-4'
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => setShowQRModal(false)}
                        className='absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors'
                      >
                        <X className='w-4 h-4 text-white' />
                      </button>
                      <div className='text-center'>
                        <p className='text-sm font-medium text-white mb-4'>
                          扫码下载 5572 影视
                        </p>
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(selectedPlatform === 'ios' ? 'https://www.5572.net' : 'https://www.5572.net/download/5572tv-android.apk')}`}
                          alt='扫码下载'
                          className='w-64 h-64 mx-auto rounded-xl'
                        />
                        <p
                          className='text-xs mt-4'
                          style={{ color: '#767676' }}
                        >
                          {selectedPlatform === 'ios'
                            ? '使用 Safari 扫码访问网站'
                            : `${APK_VERSION} · ${APK_SIZE}MB · arm64-v8a`}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Right - Phone preview */}
              <FluentScaleIn delay={200} duration={500}>
                <div className='flex-1 flex justify-center lg:justify-end'>
                  <PhonePreview />
                </div>
              </FluentScaleIn>
            </div>
          </FluentFadeIn>
        </div>
      </section>

      {/* ── Features ── */}
      <FeatureShowcase />

      {/* ── Install Steps + Core Features ── */}
      <section
        className='py-16 px-5 sm:px-8 lg:px-16'
        style={{ background: '#0a0a0a' }}
      >
        <div className='max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-10'>
          <div>
            <h2 className='text-xl font-bold text-white mb-6'>
              {selectedPlatform === 'ios' ? 'iOS 安装' : '安装步骤'}
            </h2>
            <div className='space-y-5'>
              <FluentStagger staggerMs={80}>
                {steps.map((s, i) => (
                  <div key={i} className='flex gap-4 items-start'>
                    <div
                      className='w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0'
                      style={{
                        background: 'linear-gradient(135deg, #f4c24d, #dba52b)',
                        color: '#1a1a1a',
                        boxShadow: '0 4px 12px rgba(244,194,77,0.3)',
                      }}
                    >
                      {i + 1}
                    </div>
                    <div>
                      <p className='text-sm font-medium text-white mb-0.5'>
                        {s.title}
                      </p>
                      <p className='text-xs' style={{ color: '#767676' }}>
                        {s.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </FluentStagger>
            </div>
          </div>

          <FluentFadeIn delay={200}>
            <div>
              <h2 className='text-xl font-bold text-white mb-6'>核心功能</h2>
              <div className='space-y-2'>
                <FluentStagger staggerMs={60}>
                  {[
                    '多源聚合播放',
                    'AI智能搜索推荐',
                    '弹幕互动',
                    '离线缓存',
                    '多端同步',
                  ].map((f) => (
                    <GlassPanel
                      key={f}
                      className='!flex items-center gap-3 !px-3 !py-2.5 !rounded-lg !border-white/5 !bg-white/[0.02] !shadow-none hover:!bg-white/[0.04] transition-colors duration-150'
                    >
                      <Check
                        className='w-4 h-4 flex-shrink-0'
                        style={{ color: '#f4c24d' }}
                      />
                      <span className='text-sm' style={{ color: '#d4d4d4' }}>
                        {f}
                      </span>
                    </GlassPanel>
                  ))}
                </FluentStagger>
              </div>
            </div>
          </FluentFadeIn>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer
        className='py-6 px-5 sm:px-8 lg:px-16'
        style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className='max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-3'>
          <div className='flex items-center gap-2'>
            <img
              src='/icons/icon.svg'
              alt='5572'
              width={20}
              height={20}
              className='rounded'
            />
            <span className='text-xs' style={{ color: '#767676' }}>
              5572 影视 © 2025
            </span>
          </div>
          <p className='text-xs' style={{ color: '#545454' }}>
            仅提供影视信息搜索服务
          </p>
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
