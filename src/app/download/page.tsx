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
import { useEffect, useMemo, useState } from 'react';

import { browserDownload } from '@/lib/browser-download';

import InstallGuide from './components/InstallGuide';
import PhonePreview from './components/PhonePreview';
import { detectPlatform } from './utils';

const APK_SIZE = '55';
const APK_VERSION = 'v1.9.0';

/* ─── Fluent 2 Stat Card ─── */
function StatCard({
  icon,
  value,
  unit,
  desc,
  delay = 0,
}: {
  icon: React.ReactNode;
  value: string;
  unit: string;
  desc: string;
  delay?: number;
}) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  return (
    <div
      className='relative p-6 rounded-lg border group cursor-default'
      style={{
        background: '#1a1a1a',
        borderColor: '#3d3d3d',
        boxShadow: visible ? 'var(--shadow-2)' : 'none',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(8px)',
        transition: `opacity 250ms cubic-bezier(0,0,0,1) ${delay}ms, transform 250ms cubic-bezier(0,0,0,1) ${delay}ms, box-shadow 150ms cubic-bezier(0.33,0,0.67,1)`,
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--shadow-4)';
        (e.currentTarget as HTMLDivElement).style.borderColor =
          'rgba(244,194,77,0.3)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--shadow-2)';
        (e.currentTarget as HTMLDivElement).style.borderColor = '#3d3d3d';
      }}
    >
      <div
        className='w-12 h-12 rounded-lg flex items-center justify-center mb-3'
        style={{ background: 'rgba(244,194,77,0.1)', color: '#f4c24d' }}
      >
        {icon}
      </div>
      <div className='flex items-baseline gap-1 mb-1'>
        <span className='text-3xl font-bold' style={{ color: '#f4c24d' }}>
          {value}
        </span>
        <span className='text-lg' style={{ color: 'rgba(244,194,77,0.7)' }}>
          {unit}
        </span>
      </div>
      <p className='text-sm' style={{ color: '#a3a3a3' }}>
        {desc}
      </p>
    </div>
  );
}

/* ─── Fluent 2 Step Indicator ─── */
function StepIndicator({
  step,
  index,
  total,
}: {
  step: string;
  index: number;
  total: number;
}) {
  return (
    <div className='flex items-center gap-4 group'>
      <div
        className='relative flex items-center justify-center'
        style={{ width: 32, height: 32 }}
      >
        <div
          className='absolute inset-0 rounded-full'
          style={{ background: 'rgba(244,194,77,0.12)' }}
        />
        <span
          className='relative text-sm font-semibold'
          style={{ color: '#f4c24d' }}
        >
          {index + 1}
        </span>
        {index < total - 1 && (
          <div
            className='absolute top-full left-1/2 -translate-x-1/2 w-px'
            style={{
              height: 20,
              background: '#3d3d3d',
            }}
          />
        )}
      </div>
      <span className='text-sm' style={{ color: '#d4d4d4' }}>
        {step}
      </span>
    </div>
  );
}

/* ─── Fluent 2 Primary Button ─── */
function PrimaryButton({
  children,
  onClick,
  href,
  className = '',
}: {
  children: React.ReactNode;
  onClick?: () => void;
  href?: string;
  className?: string;
}) {
  const [pressed, setPressed] = useState(false);
  const Tag = href ? 'a' : 'button';

  return (
    <Tag
      href={href}
      onClick={(e) => {
        if (onClick) onClick();
        if (href) {
          e.preventDefault();
          browserDownload(href, '5572tv-android.apk');
        }
      }}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onMouseLeave={() => setPressed(false)}
      className={`inline-flex items-center justify-center gap-2 px-8 py-4 rounded-lg font-semibold whitespace-nowrap transition-all duration-150 ${className}`}
      style={{
        background: '#f4c24d',
        color: '#1a1a1a',
        boxShadow: pressed ? 'var(--shadow-2)' : 'var(--shadow-4)',
        transform: pressed ? 'scale(0.98)' : 'scale(1)',
      }}
    >
      {children}
    </Tag>
  );
}

/* ─── Fluent 2 Secondary Button ─── */
function SecondaryButton({
  children,
  onClick,
  href,
  className = '',
}: {
  children: React.ReactNode;
  onClick?: () => void;
  href?: string;
  className?: string;
}) {
  const [pressed, setPressed] = useState(false);
  const Tag = href ? 'a' : 'button';

  return (
    <Tag
      href={href}
      onClick={(e) => {
        if (onClick) onClick();
        if (href) {
          e.preventDefault();
          browserDownload(href, '5572tv-android.apk');
        }
      }}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onMouseLeave={() => setPressed(false)}
      className={`inline-flex items-center justify-center gap-2 px-8 py-4 rounded-lg font-semibold whitespace-nowrap transition-all duration-150 ${className}`}
      style={{
        background: '#111111',
        color: '#ffffff',
        border: '1px solid #545454',
        boxShadow: pressed ? 'none' : 'var(--shadow-2)',
        transform: pressed ? 'scale(0.98)' : 'scale(1)',
      }}
    >
      {children}
    </Tag>
  );
}

/* ─── Fluent 2 Tab Selector ─── */
function PlatformTabs({
  selected,
  onSelect,
}: {
  selected: 'android' | 'ios' | 'tv';
  onSelect: (p: 'android' | 'ios' | 'tv') => void;
}) {
  const tabs = [
    {
      key: 'android' as const,
      icon: <Smartphone className='w-5 h-5' />,
      label: 'Android',
    },
    {
      key: 'ios' as const,
      icon: <Smartphone className='w-5 h-5' />,
      label: 'iOS',
    },
    { key: 'tv' as const, icon: <Tv className='w-5 h-5' />, label: 'TV' },
  ];

  return (
    <div
      className='inline-flex rounded-lg p-1'
      style={{ background: '#1a1a1a' }}
    >
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onSelect(tab.key)}
          className='flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-150'
          style={{
            background: selected === tab.key ? '#f4c24d' : 'transparent',
            color: selected === tab.key ? '#1a1a1a' : '#a3a3a3',
            boxShadow: selected === tab.key ? 'var(--shadow-2)' : 'none',
          }}
        >
          {tab.icon}
          {tab.label}
        </button>
      ))}
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

  const stats = [
    {
      icon: <Zap className='w-6 h-6' />,
      value: '0.5',
      unit: '秒',
      desc: '平均加载时间',
    },
    {
      icon: <Download className='w-6 h-6' />,
      value: '100',
      unit: '万+',
      desc: '已缓存内容',
    },
    {
      icon: <RefreshCw className='w-6 h-6' />,
      value: '3',
      unit: '台',
      desc: '设备同时在线',
    },
    {
      icon: <Brain className='w-6 h-6' />,
      value: '98',
      unit: '%',
      desc: '推荐准确率',
    },
  ];

  return (
    <div className='min-h-screen' style={{ background: '#111111' }}>
      {/* ── Hero ── */}
      <section
        className='relative min-h-[100dvh] flex items-center'
        style={{ background: '#0a0a0a' }}
      >
        <div className='absolute inset-0'>
          <Image
            src='/images/agnes/epic-bg.png'
            alt=''
            fill
            className='object-cover opacity-25'
            priority
          />
          <div className='absolute inset-0 bg-gradient-to-b from-[#0a0a0a]/80 via-[#0a0a0a]/60 to-[#0a0a0a]' />
        </div>

        <div className='relative z-10 w-full max-w-7xl mx-auto px-6 sm:px-12 lg:px-20 py-20'>
          <div className='flex flex-col lg:flex-row items-center gap-10 lg:gap-16'>
            {/* Left */}
            <div
              className='flex-1 text-center lg:text-left'
              style={{
                opacity: heroReady ? 1 : 0,
                transform: heroReady ? 'translateY(0)' : 'translateY(20px)',
                transition: 'all 500ms cubic-bezier(0,0,0,1)',
              }}
            >
              {/* Logo row */}
              <div className='flex items-center gap-3 mb-3 justify-center lg:justify-start'>
                <Image
                  src='/icons/icon-192x192.png'
                  alt='5572'
                  width={44}
                  height={44}
                  className='rounded-lg'
                />
                <div>
                  <div className='text-lg font-semibold text-white'>
                    5572 影视
                  </div>
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

              {/* Headline */}
              <h1 className='text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-3 leading-tight'>
                想看的，
                <br />
                <span style={{ color: '#f4c24d' }}>这里都有</span>
              </h1>
              <p className='text-lg mb-3 max-w-lg' style={{ color: '#a3a3a3' }}>
                海量影视资源聚合，AI智能搜索推荐。支持手机、平板、电视全平台。
              </p>

              {/* Stats row */}
              <div className='flex gap-8 mb-3 justify-center lg:justify-start'>
                {[
                  { v: '100万+', l: '影视资源' },
                  { v: '50+', l: '播放源' },
                  { v: '24h', l: '实时更新' },
                ].map((s) => (
                  <div key={s.l} className='text-center'>
                    <div
                      className='text-xl font-bold'
                      style={{ color: '#f4c24d' }}
                    >
                      {s.v}
                    </div>
                    <div
                      className='text-xs mt-0.5'
                      style={{ color: '#a3a3a3' }}
                    >
                      {s.l}
                    </div>
                  </div>
                ))}
              </div>

              {/* Platform tabs */}
              <div className='mb-3 flex justify-center lg:justify-start'>
                <PlatformTabs
                  selected={selectedPlatform}
                  onSelect={setSelectedPlatform}
                />
              </div>

              {/* CTA buttons */}
              <div className='flex flex-col sm:flex-row gap-3 justify-center lg:justify-start mb-3'>
                {selectedPlatform === 'ios' ? (
                  <PrimaryButton onClick={() => setShowGuide(true)}>
                    <Smartphone className='w-5 h-5' /> iOS 安装指南
                  </PrimaryButton>
                ) : (
                  <PrimaryButton href='/download/5572tv-android.apk'>
                    <Download className='w-5 h-5' />
                    下载 {selectedPlatform === 'android' ? 'Android' : 'TV'}
                  </PrimaryButton>
                )}
                <SecondaryButton href='/'>网页版体验</SecondaryButton>
              </div>

              {/* QR */}
              {selectedPlatform !== 'ios' && (
                <div
                  className='inline-flex flex-col items-center gap-3 p-5 rounded-lg border'
                  style={{
                    background: '#1a1a1a',
                    borderColor: '#3d3d3d',
                    boxShadow: 'var(--shadow-2)',
                  }}
                >
                  <div
                    className='p-2 bg-white rounded-md'
                    style={{ boxShadow: 'var(--shadow-2)' }}
                  >
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent('https://www.5572.net/static/download/5572tv-android.apk')}`}
                      alt='扫码下载'
                      className='w-[100px] h-[100px]'
                      width={100}
                      height={100}
                    />
                  </div>
                  <div className='text-center'>
                    <p
                      className='text-sm font-medium'
                      style={{ color: '#d4d4d4' }}
                    >
                      手机扫码下载
                    </p>
                    <p className='text-xs mt-0.5' style={{ color: '#a3a3a3' }}>
                      {APK_VERSION} · {APK_SIZE} MB · Android 7.0+
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Phone preview */}
            <div
              className='flex-1 flex justify-center lg:justify-end'
              style={{
                opacity: heroReady ? 1 : 0,
                transform: heroReady ? 'translateY(0)' : 'translateY(20px)',
                transition: 'all 500ms cubic-bezier(0,0,0,1) 150ms',
              }}
            >
              <PhonePreview />
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section
        className='py-14 px-6 sm:px-12 lg:px-20'
        style={{ background: '#111111' }}
      >
        <div className='max-w-6xl mx-auto'>
          <div className='text-center mb-3'>
            <h2
              className='text-3xl font-bold mb-3'
              style={{ color: '#ffffff' }}
            >
              为什么选择 5572
            </h2>
            <p style={{ color: '#a3a3a3' }}>为极致观影体验而生</p>
          </div>
          <div className='grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4'>
            {stats.map((s, i) => (
              <StatCard
                key={s.desc}
                icon={s.icon}
                value={s.value}
                unit={s.unit}
                desc={s.desc}
                delay={i * 80}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ── Install Steps ── */}
      <section
        className='py-14 px-6 sm:px-12 lg:px-20'
        style={{ background: '#1a1a1a' }}
      >
        <div className='max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8'>
          <div>
            <h2
              className='text-2xl font-bold mb-3'
              style={{ color: '#ffffff' }}
            >
              {selectedPlatform === 'ios' ? 'iOS 安装' : '安装步骤'}
            </h2>
            <div className='space-y-1'>
              {(selectedPlatform === 'ios'
                ? [
                    '用 Safari 打开 https://www.5572.net',
                    '点击底部「分享」按钮',
                    '选择「添加到主屏幕」',
                    '点击右上角「添加」确认',
                    '回到主屏幕打开 5572 影视',
                  ]
                : [
                    '点击下载按钮',
                    '打开下载的文件',
                    '点击「仍然安装」',
                    '安装完成，打开使用',
                  ]
              ).map((step, i) => (
                <StepIndicator key={i} step={step} index={i} total={4} />
              ))}
            </div>
          </div>
          <div>
            <h2
              className='text-2xl font-bold mb-3'
              style={{ color: '#ffffff' }}
            >
              核心功能
            </h2>
            <div className='space-y-4'>
              {[
                '多源聚合播放',
                'AI智能搜索推荐',
                '弹幕互动',
                '离线缓存',
                '多端同步',
              ].map((feature) => (
                <div
                  key={feature}
                  className='flex items-center gap-3 px-4 py-3 rounded-lg transition-colors duration-150'
                  style={{ color: '#d4d4d4' }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLDivElement).style.background =
                      '#111111';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLDivElement).style.background =
                      'transparent';
                  }}
                >
                  <Check
                    className='w-5 h-5 flex-shrink-0'
                    style={{ color: '#f4c24d' }}
                  />
                  {feature}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer
        className='py-8 px-6 sm:px-12 lg:px-20'
        style={{ borderTop: '1px solid #3d3d3d' }}
      >
        <div className='max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4'>
          <div className='flex items-center gap-2'>
            <Image
              src='/icons/icon-192x192.png'
              alt='5572'
              width={24}
              height={24}
              className='rounded'
            />
            <span className='text-sm' style={{ color: '#a3a3a3' }}>
              5572 影视 © 2025
            </span>
          </div>
          <p className='text-xs' style={{ color: '#a3a3a3', opacity: 0.6 }}>
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
