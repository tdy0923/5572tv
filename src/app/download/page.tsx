'use client';

import {
  Brain,
  Check,
  Download,
  Globe,
  RefreshCw,
  Smartphone,
  Sparkles,
  Star,
  Tv,
  Zap,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { browserDownload } from '@/lib/browser-download';

import InstallGuide from './components/InstallGuide';
import PhonePreview from './components/PhonePreview';
import { detectPlatform } from './utils';

const APK_SIZE = '53';
const APK_VERSION = 'v1.9.1';

/* ─── Feature Card ─── */
function FeatureCard({
  icon,
  title,
  desc,
  delay,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  delay: number;
}) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShow(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  return (
    <div
      className='relative p-6 rounded-xl overflow-hidden group cursor-default'
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.06)',
        opacity: show ? 1 : 0,
        transform: show ? 'translateY(0)' : 'translateY(16px)',
        transition: `all 350ms cubic-bezier(0,0,0,1) ${delay}ms`,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'rgba(244,194,77,0.3)';
        e.currentTarget.style.boxShadow = '0 0 40px rgba(244,194,77,0.08)';
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
        e.currentTarget.style.boxShadow = 'none';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      <div className='absolute inset-0 bg-gradient-to-br from-[#f4c24d]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500' />
      <div className='relative z-10'>
        <div
          className='w-11 h-11 rounded-lg flex items-center justify-center mb-4'
          style={{ background: 'rgba(244,194,77,0.1)', color: '#f4c24d' }}
        >
          {icon}
        </div>
        <h3 className='text-base font-semibold text-white mb-1.5'>{title}</h3>
        <p className='text-sm leading-relaxed' style={{ color: '#a3a3a3' }}>
          {desc}
        </p>
      </div>
    </div>
  );
}

/* ─── Step Card ─── */
function StepCard({
  num,
  title,
  desc,
  delay,
}: {
  num: number;
  title: string;
  desc: string;
  delay: number;
}) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShow(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  return (
    <div
      className='flex gap-4 items-start'
      style={{
        opacity: show ? 1 : 0,
        transform: show ? 'translateX(0)' : 'translateX(-16px)',
        transition: `all 300ms cubic-bezier(0,0,0,1) ${delay}ms`,
      }}
    >
      <div
        className='w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0'
        style={{
          background: 'linear-gradient(135deg, #f4c24d, #dba52b)',
          color: '#1a1a1a',
          boxShadow: '0 4px 12px rgba(244,194,77,0.3)',
        }}
      >
        {num}
      </div>
      <div>
        <p className='text-sm font-medium text-white mb-0.5'>{title}</p>
        <p className='text-xs' style={{ color: '#767676' }}>
          {desc}
        </p>
      </div>
    </div>
  );
}

/* ─── Main Page ─── */
export default function DownloadPage() {
  const platform = useMemo(() => detectPlatform(), []);
  const [showGuide, setShowGuide] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<
    'android' | 'ios' | 'tv'
  >(platform === 'ios' ? 'ios' : platform === 'tv' ? 'tv' : 'android');
  const [heroReady, setHeroReady] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setHeroReady(true));
  }, []);

  const features = [
    {
      icon: <Zap className='w-5 h-5' />,
      title: '极速播放',
      desc: '多源聚合，智能切换最快线路，秒级加载',
    },
    {
      icon: <Brain className='w-5 h-5' />,
      title: 'AI 推荐',
      desc: '基于观影习惯的个性化推荐，越用越懂你',
    },
    {
      icon: <Globe className='w-5 h-5' />,
      title: '全平台覆盖',
      desc: '手机、平板、电视，随时随地畅享',
    },
    {
      icon: <RefreshCw className='w-5 h-5' />,
      title: '多端同步',
      desc: '收藏、历史、进度云端同步，无缝切换',
    },
    {
      icon: <Sparkles className='w-5 h-5' />,
      title: '弹幕互动',
      desc: '实时弹幕，与百万影迷一起追剧',
    },
    {
      icon: <Download className='w-5 h-5' />,
      title: '离线缓存',
      desc: '支持下载缓存，无网络也能观看',
    },
  ];

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
    <div className='min-h-screen' style={{ background: '#0a0a0a' }}>
      {/* ── Hero ── */}
      <section className='relative min-h-[100dvh] flex items-center overflow-hidden'>
        {/* Background layers */}
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
          {/* Glow effect */}
          <div
            className='absolute top-1/4 left-1/4 w-96 h-96 rounded-full opacity-10'
            style={{
              background: 'radial-gradient(circle, #f4c24d, transparent 70%)',
              filter: 'blur(80px)',
            }}
          />
        </div>

        <div className='relative z-10 w-full max-w-7xl mx-auto px-5 sm:px-8 lg:px-16 py-10'>
          <div
            className='flex flex-col lg:flex-row items-center gap-10 lg:gap-16'
            style={{
              opacity: heroReady ? 1 : 0,
              transform: heroReady ? 'translateY(0)' : 'translateY(24px)',
              transition: 'all 600ms cubic-bezier(0,0,0,1)',
            }}
          >
            {/* Left */}
            <div className='flex-1 text-center lg:text-left'>
              <div className='flex items-center gap-3 mb-5 justify-center lg:justify-start'>
                <Image
                  src='/icons/icon-192x192.png'
                  alt='5572'
                  width={40}
                  height={40}
                  className='rounded-lg'
                />
                <div>
                  <span className='text-lg font-bold text-white'>
                    5572 影视
                  </span>
                  <div
                    className='flex items-center gap-1.5 text-xs'
                    style={{ color: '#a3a3a3' }}
                  >
                    <Star
                      className='w-3 h-3 fill-current'
                      style={{ color: '#f4c24d' }}
                    />
                    <span>4.8</span>
                    <span style={{ color: '#545454' }}>·</span>
                    <span>10万+用户</span>
                  </div>
                </div>
              </div>

              <h1 className='text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-3 leading-tight'>
                想看的，
                <span style={{ color: '#f4c24d' }}>这里都有</span>
              </h1>
              <p
                className='text-base mb-5 max-w-md'
                style={{ color: '#a3a3a3' }}
              >
                海量影视资源聚合，AI智能搜索推荐。支持手机、平板、电视全平台。
              </p>

              <div className='flex gap-6 mb-5 justify-center lg:justify-start'>
                {[
                  { v: '100万+', l: '影视资源' },
                  { v: '50+', l: '播放源' },
                  { v: '24h', l: '实时更新' },
                ].map((s) => (
                  <div key={s.l} className='text-center'>
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

              {/* Platform selector - segmented control */}
              <div className='flex mb-5 justify-center lg:justify-start'>
                <div
                  className='inline-flex rounded-lg p-0.5'
                  style={{ background: 'rgba(255,255,255,0.06)' }}
                >
                  {[
                    {
                      key: 'android' as const,
                      icon: <Smartphone className='w-4 h-4' />,
                      label: 'Android',
                    },
                    {
                      key: 'ios' as const,
                      icon: <Smartphone className='w-4 h-4' />,
                      label: 'iOS',
                    },
                    {
                      key: 'tv' as const,
                      icon: <Tv className='w-4 h-4' />,
                      label: 'TV',
                    },
                  ].map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setSelectedPlatform(tab.key)}
                      className='flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-150'
                      style={{
                        background:
                          selectedPlatform === tab.key
                            ? '#f4c24d'
                            : 'transparent',
                        color:
                          selectedPlatform === tab.key ? '#1a1a1a' : '#a3a3a3',
                        boxShadow:
                          selectedPlatform === tab.key
                            ? '0 2px 8px rgba(244,194,77,0.3)'
                            : 'none',
                      }}
                    >
                      {tab.icon}
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* CTA */}
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
                    <Smartphone className='w-4 h-4' /> iOS 安装指南
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
                    className='inline-flex items-center justify-center gap-2 px-7 py-3 rounded-lg font-semibold text-sm whitespace-nowrap transition-all duration-150'
                    style={{
                      background: 'linear-gradient(135deg, #f4c24d, #dba52b)',
                      color: '#1a1a1a',
                      boxShadow: '0 4px 16px rgba(244,194,77,0.3)',
                    }}
                  >
                    <Download className='w-4 h-4' /> 下载{' '}
                    {selectedPlatform === 'android' ? 'Android' : 'TV'}
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

              {/* QR */}
              <div
                className='inline-flex items-center gap-4 p-4 rounded-lg transition-all duration-200 group cursor-pointer'
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(244,194,77,0.3)';
                  e.currentTarget.style.boxShadow =
                    '0 0 30px rgba(244,194,77,0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(selectedPlatform === 'ios' ? 'https://www.5572.net' : 'https://www.5572.net/download/5572tv-android.apk')}`}
                  alt='扫码下载'
                  className='w-24 h-24 rounded-md transition-transform duration-300 group-hover:scale-110'
                  width={96}
                  height={96}
                  loading='lazy'
                />
                <div>
                  <p className='text-sm font-medium text-white'>扫码下载</p>
                  <p className='text-xs mt-1' style={{ color: '#767676' }}>
                    {selectedPlatform === 'ios'
                      ? '访问网站安装 PWA'
                      : `${APK_VERSION} · ${APK_SIZE}MB`}
                  </p>
                </div>
              </div>
            </div>

            {/* Right - Phone preview */}
            <div className='flex-1 flex justify-center lg:justify-end'>
              <PhonePreview />
            </div>
          </div>
        </div>
      </section>

      {/* ── Features Grid ── */}
      <section
        className='py-16 px-5 sm:px-8 lg:px-16'
        style={{ background: '#0f0f0f' }}
      >
        <div className='max-w-6xl mx-auto'>
          <div className='text-center mb-10'>
            <h2 className='text-2xl font-bold text-white mb-2'>
              为什么选择 5572
            </h2>
            <p className='text-sm' style={{ color: '#767676' }}>
              为极致观影体验而生
            </p>
          </div>
          <div className='grid grid-cols-2 md:grid-cols-3 gap-4'>
            {features.map((f, i) => (
              <FeatureCard
                key={f.title}
                icon={f.icon}
                title={f.title}
                desc={f.desc}
                delay={i * 60}
              />
            ))}
          </div>
        </div>
      </section>

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
              {steps.map((s, i) => (
                <StepCard
                  key={i}
                  num={i + 1}
                  title={s.title}
                  desc={s.desc}
                  delay={i * 60}
                />
              ))}
            </div>
          </div>
          <div>
            <h2 className='text-xl font-bold text-white mb-6'>核心功能</h2>
            <div className='space-y-0'>
              {[
                '多源聚合播放',
                'AI智能搜索推荐',
                '弹幕互动',
                '离线缓存',
                '多端同步',
              ].map((f) => (
                <div
                  key={f}
                  className='flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors duration-150 cursor-default'
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <Check
                    className='w-4 h-4 flex-shrink-0'
                    style={{ color: '#f4c24d' }}
                  />
                  <span className='text-sm' style={{ color: '#d4d4d4' }}>
                    {f}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer
        className='py-6 px-5 sm:px-8 lg:px-16'
        style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className='max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-3'>
          <div className='flex items-center gap-2'>
            <Image
              src='/icons/icon-192x192.png'
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
