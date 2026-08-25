'use client';

import { ArrowLeft, Check, Download, X } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { DEFAULT_APK_INFO } from '@/lib/app-release';
import { browserDownload } from '@/lib/browser-download';

import { FluentFadeIn, FluentStagger } from '@/components/FluentTransition';
import { GlassPanel } from '@/components/ui-surface';

import InstallGuide from './components/InstallGuide';
import PlatformTabs from './components/PlatformTabs';
import PosterWall from './components/PosterWall';
import { detectPlatform } from './utils';

const DEFAULT_APK = DEFAULT_APK_INFO;

const FEATURES = [
  {
    icon: '⚡',
    title: '极速播放',
    desc: '多源聚合，秒开无缓冲',
  },
  {
    icon: '🔁',
    title: '多端同步',
    desc: '播放记录、收藏跨设备同步',
  },
  {
    icon: '📺',
    title: '直播电视',
    desc: '内置直播源与 EPG 节目单',
  },
  {
    icon: '🎬',
    title: '资源丰富',
    desc: '电影、剧集、短剧、动漫全都有',
  },
];

const STATS = [
  { v: '100万+', l: '影视资源' },
  { v: '50+', l: '播放源' },
  { v: '24h', l: '实时更新' },
];

export default function DownloadPage() {
  const platform = useMemo(() => detectPlatform(), []);
  const [showGuide, setShowGuide] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [apkInfo, setApkInfo] = useState(DEFAULT_APK);
  const [selectedPlatform, setSelectedPlatform] = useState<
    'android' | 'ios' | 'tv'
  >(platform === 'ios' ? 'ios' : platform === 'tv' ? 'tv' : 'android');

  const goBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = '/';
    }
  };

  useEffect(() => {
    fetch('/api/version-check')
      .then((r) => r.json())
      .then((d) => {
        if (d?.version) {
          setApkInfo({
            version: `v${d.version}`,
            sizeMb: String(d.sizeMb ?? DEFAULT_APK.sizeMb),
          });
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div className='min-h-screen bg-gray-950 text-white'>
      {/* 返回按钮：全屏落地页没有导航，提供回退路径 */}
      <button
        type='button'
        onClick={goBack}
        aria-label='返回'
        className='fixed left-3 top-3 z-30 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-md transition-colors hover:bg-white/20'
        style={{ top: 'calc(0.75rem + env(safe-area-inset-top))' }}
      >
        <ArrowLeft className='h-5 w-5' />
      </button>

      {/* ── 全屏 Hero：海报墙背景 ── */}
      <section
        className='relative flex min-h-screen items-center overflow-hidden'
        style={{ minHeight: '100dvh' }}
      >
        <PosterWall />

        <div className='relative z-10 mx-auto w-full max-w-4xl px-5 py-16 text-center sm:px-8'>
          <FluentStagger staggerMs={110}>
            {/* 品牌 */}
            <div className='mb-6 flex items-center justify-center gap-3'>
              <div className='relative'>
                <img
                  src='/icons/icon.svg'
                  alt='5572'
                  width={52}
                  height={52}
                  className='rounded-xl'
                  style={{ boxShadow: '0 4px 20px rgba(244,194,77,0.35)' }}
                />
              </div>
              <div className='text-left'>
                <div className='text-lg font-bold text-white'>5572 影视</div>
                <div className='mt-0.5 flex items-center gap-1.5 text-xs text-gray-400'>
                  <span className='text-primary-400'>★</span>
                  <span>4.8</span>
                  <span className='text-gray-600'>·</span>
                  <span>10万+用户</span>
                </div>
              </div>
            </div>

            {/* 主标题 */}
            <h1 className='mb-4 text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl'>
              想看的，
              <span className='bg-linear-to-b from-primary-200 via-primary-400 to-primary-600 bg-clip-text text-transparent'>
                这里都有
              </span>
            </h1>

            <p className='mx-auto mb-8 max-w-xl text-base text-gray-300'>
              海量影视资源聚合，AI 智能搜索推荐。
              <br className='hidden sm:block' />
              支持手机、平板、电视全平台。
            </p>

            {/* 数据 */}
            <div className='mb-8 flex items-center justify-center gap-8'>
              {STATS.map((s) => (
                <div key={s.l}>
                  <div className='text-lg font-bold text-primary-400 sm:text-xl'>
                    {s.v}
                  </div>
                  <div className='text-xs text-gray-400'>{s.l}</div>
                </div>
              ))}
            </div>

            {/* 平台选择 */}
            <PlatformTabs
              selected={selectedPlatform}
              onSelect={setSelectedPlatform}
              className='mb-8'
            />

            {/* CTA */}
            <div className='mb-6 flex flex-col items-center justify-center gap-3 sm:flex-row'>
              {selectedPlatform === 'ios' ? (
                <button
                  type='button'
                  onClick={() => setShowGuide(true)}
                  className='group relative inline-flex items-center justify-center gap-2.5 overflow-hidden rounded-xl px-8 py-4 text-sm font-semibold text-gray-950 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_40px_-8px_rgba(244,194,77,0.5)] active:translate-y-0 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950'
                  style={{
                    background: 'linear-gradient(135deg, #f4c24d, #dba52b)',
                  }}
                >
                  <span className='pointer-events-none absolute inset-0 -translate-x-full bg-linear-to-r from-transparent via-white/40 to-transparent transition-transform duration-700 group-hover:translate-x-full' />
                  iOS 安装指南
                </button>
              ) : (
                <a
                  href='/static/download/5572tv-android.apk'
                  download='5572tv-android.apk'
                  onClick={(e) => {
                    e.preventDefault();
                    browserDownload(
                      '/static/download/5572tv-android.apk',
                      '5572tv-android.apk',
                    );
                  }}
                  className='group relative inline-flex items-center justify-center gap-2.5 overflow-hidden rounded-xl px-8 py-4 text-sm font-semibold text-gray-950 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_40px_-8px_rgba(244,194,77,0.5)] active:translate-y-0 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950'
                  style={{
                    background: 'linear-gradient(135deg, #f4c24d, #dba52b)',
                  }}
                >
                  <span className='pointer-events-none absolute inset-0 -translate-x-full bg-linear-to-r from-transparent via-white/40 to-transparent transition-transform duration-700 group-hover:translate-x-full' />
                  <Download className='h-4 w-4 shrink-0 transition-transform duration-300 group-hover:translate-y-0.5' />
                  <span>
                    下载 {selectedPlatform === 'android' ? 'Android' : 'TV'} 版
                  </span>
                </a>
              )}
              <Link
                href='/'
                className='inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.06] px-8 py-4 text-sm font-semibold text-gray-300 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary-400/40 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400/60'
              >
                网页版体验
              </Link>
            </div>

            {/* 架构选择 */}
            {selectedPlatform !== 'ios' && (
              <div className='mb-6 flex flex-wrap items-center justify-center gap-2'>
                <span className='inline-flex items-center gap-1.5 rounded-lg bg-primary-500 px-3 py-1.5 text-xs font-semibold text-gray-950'>
                  arm64-v8a 64位（推荐）
                </span>
                <a
                  href='/static/download/5572tv-android-armv7a.apk'
                  download
                  className='inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.06] px-3 py-1.5 text-xs font-medium text-gray-300 transition-all duration-200 hover:border-primary-400/40 hover:text-white'
                >
                  armeabi-v7a 兼容版
                </a>
              </div>
            )}

            {/* 扫码 */}
            <GlassPanel
              className='group !mx-auto !inline-flex !cursor-pointer !items-center gap-4 !rounded-2xl !border-white/10 !bg-white/[0.03] !p-4 !shadow-none transition-all duration-300 hover:!border-primary-400/30 hover:!bg-white/[0.06]'
              onClick={() => setShowQRModal(true)}
            >
              <div className='relative'>
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(selectedPlatform === 'ios' ? 'https://www.5572.net' : 'https://www.5572.net/download/5572tv-android.apk')}`}
                  alt='扫码下载'
                  className='w-28 h-28 rounded-xl transition-transform duration-300 group-hover:scale-105'
                />
                <div className='absolute inset-0 flex items-center justify-center rounded-xl bg-black/40 opacity-0 transition-opacity duration-200 group-hover:opacity-100'>
                  <span className='text-xs font-medium text-white'>
                    点击放大
                  </span>
                </div>
              </div>
              <div className='text-left'>
                <p className='text-sm font-medium text-white'>扫码下载</p>
                <p className='mt-1 text-xs text-gray-400'>
                  {selectedPlatform === 'ios'
                    ? '访问网站安装 PWA'
                    : `${apkInfo.version} · ${apkInfo.sizeMb}MB · arm64-v8a`}
                </p>
              </div>
            </GlassPanel>
          </FluentStagger>
        </div>

        {/* 滚动提示 */}
        <FluentFadeIn delay={900}>
          <div className='absolute bottom-6 left-1/2 z-10 -translate-x-1/2 animate-bounce text-gray-500'>
            <svg
              className='h-5 w-5'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeWidth='2'
              strokeLinecap='round'
              strokeLinejoin='round'
            >
              <path d='M12 5v14' />
              <path d='m19 12-7 7-7-7' />
            </svg>
          </div>
        </FluentFadeIn>
      </section>

      {/* ── 特性条 ── */}
      <section className='relative bg-gray-950 py-20'>
        <div className='mx-auto max-w-5xl px-5 sm:px-8'>
          <div className='mb-12 text-center'>
            <p className='mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-primary-400'>
              Why 5572
            </p>
            <h2 className='text-2xl font-bold sm:text-3xl'>为什么选择 5572</h2>
            <p className='mt-2 text-sm text-gray-500'>
              不只是播放器，更是你的私人影视管家
            </p>
          </div>

          <FluentStagger
            staggerMs={90}
            className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4'
          >
            {FEATURES.map((f) => (
              <GlassPanel
                key={f.title}
                className='group !rounded-2xl !border-white/5 !bg-white/[0.03] !p-6 !shadow-none transition-all duration-300 hover:-translate-y-1 hover:!border-primary-400/25 hover:!bg-white/[0.05] hover:!shadow-[0_16px_40px_-16px_rgba(244,194,77,0.25)]'
              >
                <div className='mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary-500/10 text-lg transition-transform duration-300 group-hover:scale-110'>
                  {f.icon}
                </div>
                <h3 className='mb-1.5 text-sm font-semibold text-white'>
                  {f.title}
                </h3>
                <p className='text-xs leading-relaxed text-gray-500'>
                  {f.desc}
                </p>
              </GlassPanel>
            ))}
          </FluentStagger>

          <FluentFadeIn delay={150}>
            <div className='mt-12 flex flex-wrap items-center justify-center gap-x-6 gap-y-2'>
              {[
                '多源聚合播放',
                '倍速控制',
                '直播电视',
                '播放记录同步',
                '多端同步',
              ].map((f) => (
                <span
                  key={f}
                  className='inline-flex items-center gap-1.5 text-xs text-gray-500'
                >
                  <Check className='h-3.5 w-3.5 text-primary-400' />
                  {f}
                </span>
              ))}
            </div>
          </FluentFadeIn>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className='border-t border-white/[0.06] bg-gray-950 py-6'>
        <div className='mx-auto flex max-w-5xl flex-col items-center justify-between gap-3 px-5 sm:flex-row sm:px-8'>
          <div className='flex items-center gap-2'>
            <Image
              src='/icons/icon.svg'
              alt='5572'
              width={20}
              height={20}
              className='rounded'
            />
            <span className='text-xs text-gray-500'>
              5572 影视 © {new Date().getFullYear()}
            </span>
          </div>
          <p className='text-xs text-gray-600'>仅提供影视信息搜索服务</p>
        </div>
      </footer>

      {/* ── Modals ── */}
      {showQRModal && (
        <div
          className='fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm'
          onClick={() => setShowQRModal(false)}
        >
          <div
            className='relative w-full max-w-sm rounded-2xl border border-white/10 bg-[#1a1a1a] p-6 shadow-2xl'
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type='button'
              onClick={() => setShowQRModal(false)}
              className='absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-white/20'
            >
              <X className='h-4 w-4 text-white' />
            </button>
            <div className='text-center'>
              <p className='mb-4 text-sm font-medium text-white'>
                扫码下载 5572 影视
              </p>
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(selectedPlatform === 'ios' ? 'https://www.5572.net' : 'https://www.5572.net/download/5572tv-android.apk')}`}
                alt='扫码下载'
                className='mx-auto w-64 h-64 rounded-xl'
              />
              <p className='mt-4 text-xs text-gray-500'>
                {selectedPlatform === 'ios'
                  ? '使用 Safari 扫码访问网站'
                  : `${apkInfo.version} · ${apkInfo.sizeMb}MB · arm64-v8a`}
              </p>
            </div>
          </div>
        </div>
      )}

      {showGuide && (
        <InstallGuide
          platform={selectedPlatform}
          onClose={() => setShowGuide(false)}
        />
      )}
    </div>
  );
}
