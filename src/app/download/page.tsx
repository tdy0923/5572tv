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
import { useEffect, useMemo, useRef, useState } from 'react';

import { browserDownload } from '@/lib/browser-download';

import InstallGuide from './components/InstallGuide';
import PhonePreview from './components/PhonePreview';
import { detectPlatform } from './utils';

const APK_SIZE = '55';
const APK_VERSION = 'v1.9.0';

function AnimatedStatCard({
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
      className='relative p-6 rounded-xl border transition-all duration-300 hover:scale-[1.03] hover:shadow-lg cursor-default group'
      style={{
        background: 'var(--color-background-subtle)',
        borderColor: 'var(--color-stroke-subtle)',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(12px)',
        transition: `opacity 400ms cubic-bezier(0,0,0,1) ${delay}ms, transform 400ms cubic-bezier(0,0,0,1) ${delay}ms`,
      }}
    >
      <div
        className='absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300'
        style={{
          background:
            'linear-gradient(135deg, rgba(244,194,77,0.06), transparent)',
        }}
      />
      <div className='relative z-10'>
        <div
          className='w-12 h-12 rounded-lg flex items-center justify-center mb-4 transition-transform duration-200 group-hover:scale-110'
          style={{ background: 'rgba(244,194,77,0.12)', color: '#f4c24d' }}
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
        <p
          className='text-sm'
          style={{ color: 'var(--color-foreground-muted)' }}
        >
          {desc}
        </p>
      </div>
    </div>
  );
}

function StepItem({
  step,
  index,
  delay,
}: {
  step: string;
  index: number;
  delay: number;
}) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  return (
    <div
      className='flex items-center gap-4'
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateX(0)' : 'translateX(-12px)',
        transition: `opacity 300ms cubic-bezier(0,0,0,1) ${delay}ms, transform 300ms cubic-bezier(0,0,0,1) ${delay}ms`,
      }}
    >
      <span
        className='w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0'
        style={{ background: 'rgba(244,194,77,0.2)', color: '#f4c24d' }}
      >
        {index + 1}
      </span>
      <span style={{ color: 'var(--color-foreground-subtle)' }}>{step}</span>
    </div>
  );
}

export default function DownloadPage() {
  const platform = useMemo(() => detectPlatform(), []);
  const [showGuide, setShowGuide] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<
    'android' | 'ios' | 'tv'
  >(platform === 'ios' ? 'ios' : platform === 'tv' ? 'tv' : 'android');
  const [heroVisible, setHeroVisible] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setHeroVisible(true), 100);
    return () => clearTimeout(t);
  }, []);

  const features = [
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
    <div
      className='min-h-screen text-white'
      style={{ background: 'var(--color-background)' }}
    >
      {/* Hero Section */}
      <section
        className='relative min-h-[100dvh] flex items-center'
        style={{ background: '#0a0a0a' }}
      >
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

        <div
          ref={heroRef}
          className='relative z-10 w-full max-w-7xl mx-auto px-6 sm:px-12 lg:px-20 py-16'
        >
          <div className='flex flex-col lg:flex-row items-center gap-12 lg:gap-20'>
            {/* Left content */}
            <div
              className='flex-1 text-center lg:text-left'
              style={{
                opacity: heroVisible ? 1 : 0,
                transform: heroVisible ? 'translateY(0)' : 'translateY(24px)',
                transition:
                  'opacity 600ms cubic-bezier(0,0,0,1), transform 600ms cubic-bezier(0,0,0,1)',
              }}
            >
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
                  <div
                    className='flex items-center gap-2 text-sm'
                    style={{ color: 'var(--color-foreground-muted)' }}
                  >
                    <Star
                      className='w-3 h-3 fill-yellow-400'
                      style={{ color: '#f4c24d' }}
                    />
                    <span>4.8</span>
                    <span>·</span>
                    <span>10万+用户</span>
                  </div>
                </div>
              </div>

              <h1 className='text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-4 leading-tight'>
                想看的，
                <br />
                <span style={{ color: '#f4c24d' }}>这里都有</span>
              </h1>

              <p
                className='text-lg mb-6 max-w-lg'
                style={{ color: 'var(--color-foreground-muted)' }}
              >
                海量影视资源聚合，AI智能搜索推荐。支持手机、平板、电视全平台。
              </p>

              {/* Stats */}
              <div className='flex gap-6 mb-8 justify-center lg:justify-start'>
                {[
                  { value: '100万+', label: '影视资源' },
                  { value: '50+', label: '播放源' },
                  { value: '24h', label: '实时更新' },
                ].map((stat) => (
                  <div key={stat.label} className='text-center'>
                    <div
                      className='text-xl font-bold'
                      style={{ color: '#f4c24d' }}
                    >
                      {stat.value}
                    </div>
                    <div
                      className='text-xs'
                      style={{ color: 'var(--color-foreground-muted)' }}
                    >
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>

              {/* Platform tabs */}
              <div className='flex gap-2 mb-6 justify-center lg:justify-start'>
                {(['android', 'ios', 'tv'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setSelectedPlatform(tab)}
                    className='flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all duration-200'
                    style={{
                      background:
                        selectedPlatform === tab
                          ? '#f4c24d'
                          : 'rgba(255,255,255,0.1)',
                      color:
                        selectedPlatform === tab
                          ? '#1a1a1a'
                          : 'var(--color-foreground-muted)',
                      boxShadow:
                        selectedPlatform === tab ? 'var(--shadow-2)' : 'none',
                    }}
                  >
                    {tab === 'tv' ? (
                      <Tv className='w-5 h-5' />
                    ) : (
                      <Smartphone className='w-5 h-5' />
                    )}
                    {tab === 'android'
                      ? 'Android'
                      : tab === 'ios'
                        ? 'iOS'
                        : 'TV'}
                  </button>
                ))}
              </div>

              {/* Download buttons */}
              <div className='flex flex-col sm:flex-row gap-3 justify-center lg:justify-start'>
                {selectedPlatform === 'ios' ? (
                  <>
                    <button
                      onClick={() => setShowGuide(true)}
                      className='inline-flex items-center justify-center gap-2 px-8 py-4 rounded-lg font-semibold transition-all duration-200'
                      style={{
                        background: '#f4c24d',
                        color: '#1a1a1a',
                        boxShadow: 'var(--shadow-2)',
                      }}
                    >
                      <Smartphone className='w-5 h-5' /> iOS 安装指南
                    </button>
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
                      className='inline-flex items-center justify-center gap-2 px-8 py-4 rounded-lg font-semibold transition-all duration-200'
                      style={{
                        background: 'rgba(255,255,255,0.1)',
                        color: 'white',
                        border: '1px solid var(--color-stroke)',
                        boxShadow: 'var(--shadow-2)',
                      }}
                    >
                      <Download className='w-5 h-5' /> 下载 APK
                    </a>
                  </>
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
                    className='inline-flex items-center justify-center gap-2 px-8 py-4 rounded-lg font-semibold transition-all duration-200'
                    style={{
                      background: '#f4c24d',
                      color: '#1a1a1a',
                      boxShadow: 'var(--shadow-4)',
                    }}
                  >
                    <Download className='w-5 h-5' />
                    下载 {selectedPlatform === 'android' ? 'Android' : 'TV'}
                  </a>
                )}
                <Link
                  href='/'
                  className='inline-flex items-center justify-center gap-2 px-8 py-4 rounded-lg font-semibold transition-all duration-200'
                  style={{
                    background: 'rgba(255,255,255,0.1)',
                    color: 'white',
                    border: '1px solid var(--color-stroke)',
                    boxShadow: 'var(--shadow-2)',
                  }}
                >
                  网页版体验
                </Link>
              </div>

              {/* QR Code */}
              {selectedPlatform !== 'ios' && (
                <div
                  className='mt-8 inline-flex flex-col items-center gap-3 p-5 rounded-xl border'
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    borderColor: 'rgba(255,255,255,0.08)',
                  }}
                >
                  <div
                    className='p-2 bg-white rounded-lg'
                    style={{ boxShadow: 'var(--shadow-4)' }}
                  >
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent('https://www.5572.net/static/download/5572tv-android.apk')}`}
                      alt='扫码下载'
                      className='w-[100px] h-[100px]'
                      width={100}
                      height={100}
                    />
                  </div>
                  <p
                    className='text-sm font-medium'
                    style={{ color: 'var(--color-foreground-muted)' }}
                  >
                    手机扫码下载
                  </p>
                  <p
                    className='text-xs'
                    style={{
                      color: 'var(--color-foreground-muted)',
                      opacity: 0.6,
                    }}
                  >
                    {APK_VERSION} · {APK_SIZE} MB · Android 5.0+
                  </p>
                </div>
              )}
            </div>

            {/* Phone preview */}
            <div
              className='flex-1 flex justify-center lg:justify-end'
              style={{
                opacity: heroVisible ? 1 : 0,
                transform: heroVisible ? 'translateY(0)' : 'translateY(24px)',
                transition:
                  'opacity 600ms cubic-bezier(0,0,0,1) 200ms, transform 600ms cubic-bezier(0,0,0,1) 200ms',
              }}
            >
              <PhonePreview />
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section
        className='py-20 px-6 sm:px-12 lg:px-20'
        style={{ background: 'var(--color-background)' }}
      >
        <div className='max-w-6xl mx-auto'>
          <div className='text-center mb-12'>
            <h2
              className='text-3xl font-bold mb-3'
              style={{ color: 'var(--color-foreground)' }}
            >
              为什么选择 5572
            </h2>
            <p style={{ color: 'var(--color-foreground-muted)' }}>
              为极致观影体验而生
            </p>
          </div>
          <div className='grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6'>
            {features.map((f, i) => (
              <AnimatedStatCard
                key={f.desc}
                icon={f.icon}
                value={f.value}
                unit={f.unit}
                desc={f.desc}
                delay={i * 100}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Install steps */}
      <section
        className='py-16 px-6 sm:px-12 lg:px-20'
        style={{ background: 'var(--color-background-subtle)' }}
      >
        <div className='max-w-6xl mx-auto'>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-8'>
            <div>
              <h2
                className='text-2xl font-bold mb-6'
                style={{ color: 'var(--color-foreground)' }}
              >
                {selectedPlatform === 'ios' ? 'iOS 安装' : '安装步骤'}
              </h2>
              <div className='space-y-4'>
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
                  <StepItem key={i} step={step} index={i} delay={i * 80} />
                ))}
              </div>
            </div>
            <div>
              <h2
                className='text-2xl font-bold mb-6'
                style={{ color: 'var(--color-foreground)' }}
              >
                核心功能
              </h2>
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
                    className='flex items-center gap-3'
                    style={{ color: 'var(--color-foreground-subtle)' }}
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
        </div>
      </section>

      {/* Footer */}
      <footer
        className='py-8 px-6 sm:px-12 lg:px-20'
        style={{ borderTop: '1px solid var(--color-stroke-subtle)' }}
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
            <span
              className='text-sm'
              style={{ color: 'var(--color-foreground-muted)' }}
            >
              5572 影视 © 2025
            </span>
          </div>
          <p
            className='text-xs'
            style={{ color: 'var(--color-foreground-muted)', opacity: 0.6 }}
          >
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
