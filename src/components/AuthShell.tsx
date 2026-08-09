'use client';

import { Layers, Play, Zap } from 'lucide-react';
import { type ReactNode, useMemo } from 'react';

import { detectTV } from '@/lib/device';

import { AuthBackground } from './auth/AuthBackground';
import { FluentFadeIn } from './FluentTransition';
import { useSite } from './SiteProvider';
import { ThemeToggle } from './ThemeToggle';

type AuthShellProps = {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  children: ReactNode;
  /** 品牌面板扩展内容（桌面端，如 App 下载卡片） */
  brandExtra?: ReactNode;
  /** 卡片下方内容（移动端，如 App 下载横条） */
  footer?: ReactNode;
};

const BRAND_FEATURES = [
  {
    icon: Play,
    title: '海量影视资源',
    desc: '电影、剧集、动漫、综艺一站看齐',
  },
  {
    icon: Layers,
    title: '多端同步',
    desc: '手机、电脑、电视播放记录无缝同步',
  },
  {
    icon: Zap,
    title: '高速稳定',
    desc: '多线路智能切换，流畅清晰播放',
  },
];

function LogoBadge({
  size,
  glow,
  children,
}: {
  size: 'md' | 'lg' | 'xl';
  glow?: boolean;
  children: ReactNode;
}) {
  const sizes = {
    md: 'h-12 w-12 rounded-2xl [&_svg]:h-6 [&_svg]:w-6',
    lg: 'h-16 w-16 rounded-3xl [&_svg]:h-8 [&_svg]:w-8',
    xl: 'h-20 w-20 rounded-3xl [&_svg]:h-10 [&_svg]:w-10',
  };
  return (
    <div
      className={`flex items-center justify-center bg-linear-to-br from-[#f4c24d] via-[#f0b938] to-[#d89c18] text-[#171717] ${sizes[size]} ${
        glow ? 'animate-[auth-glow_3.2s_ease-in-out_infinite]' : ''
      }`}
    >
      {children}
    </div>
  );
}

export function AuthShell({
  title,
  subtitle,
  icon,
  children,
  brandExtra,
  footer,
}: AuthShellProps) {
  const { siteName } = useSite();
  const isTV = useMemo(() => detectTV(), []);

  const brandPanel = (
    <div className='flex max-w-md flex-col items-center text-center'>
      <FluentFadeIn>
        <LogoBadge size='xl' glow>
          {icon}
        </LogoBadge>
      </FluentFadeIn>
      <FluentFadeIn delay={80}>
        <h2 className='mt-6 text-4xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-5xl'>
          {siteName}
        </h2>
        <p className='mt-3 text-base leading-relaxed text-gray-600 dark:text-gray-300'>
          随时随地，畅享影音世界
        </p>
      </FluentFadeIn>
      <FluentFadeIn delay={160}>
        <div className='mt-10 w-full space-y-3'>
          {BRAND_FEATURES.map((f) => (
            <div
              key={f.title}
              className='flex items-start gap-3 rounded-xl border border-gray-200/60 bg-white/60 px-4 py-3 text-left backdrop-blur-md dark:border-white/10 dark:bg-white/[0.03]'
            >
              <span className='mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#f4c24d]/15 text-[#d89c18] dark:text-[#f4c24d]'>
                <f.icon className='h-4 w-4' />
              </span>
              <span>
                <span className='block text-sm font-semibold text-gray-800 dark:text-gray-100'>
                  {f.title}
                </span>
                <span className='block text-xs text-gray-500 dark:text-gray-400'>
                  {f.desc}
                </span>
              </span>
            </div>
          ))}
        </div>
      </FluentFadeIn>
      {brandExtra && <div className='mt-10 w-full'>{brandExtra}</div>}
    </div>
  );

  const card = (
    <div className='auth-card relative overflow-hidden rounded-2xl border p-6 backdrop-blur-xl sm:p-10 border-gray-200/80 bg-white/85 shadow-[0_24px_64px_rgba(15,23,42,0.12)] dark:border-white/10 dark:bg-[#0d1117]/80 dark:shadow-[0_24px_64px_rgba(0,0,0,0.5)]'>
      <div className='pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#f4c24d]/70 to-transparent' />
      <FluentFadeIn>
        <div className='mb-6 text-center sm:mb-8'>
          <h1 className='text-2xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-3xl'>
            {title}
          </h1>
          {subtitle && (
            <p className='mt-2 text-sm leading-relaxed text-gray-500 dark:text-gray-400'>
              {subtitle}
            </p>
          )}
        </div>
      </FluentFadeIn>
      {children}
    </div>
  );

  return (
    <div
      data-auth-root
      data-tv={isTV || undefined}
      className='relative min-h-dvh w-full overflow-x-hidden bg-[#f6f7fb] dark:bg-[#0b0f16]'
    >
      <AuthBackground />

      <div
        className='absolute right-3 top-3 z-30 sm:right-4 sm:top-4'
        style={{ marginTop: 'env(safe-area-inset-top)' }}
      >
        <ThemeToggle />
      </div>

      {isTV ? (
        /* ── 电视端（10 尺 UI）：单栏居中、整体放大 ── */
        <div className='relative z-10 flex min-h-dvh items-center justify-center px-4 py-12'>
          <div className='w-full max-w-xl'>
            <div className='mb-8 flex flex-col items-center text-center'>
              <LogoBadge size='lg' glow>
                {icon}
              </LogoBadge>
              <h2 className='mt-4 text-3xl font-bold tracking-tight text-gray-900 dark:text-white'>
                {siteName}
              </h2>
            </div>
            {card}
            {brandExtra && <div className='mt-8'>{brandExtra}</div>}
          </div>
        </div>
      ) : (
        /* ── 桌面/平板双栏 + 移动单栏 ── */
        <div className='relative z-10 grid min-h-dvh w-full lg:grid-cols-2'>
          {/* 品牌面板（桌面端） */}
          <aside className='hidden items-center justify-center px-10 py-12 lg:flex'>
            {brandPanel}
          </aside>

          {/* 表单区 */}
          <div className='flex items-center justify-center px-4 py-10 sm:px-6'>
            <div className='w-full max-w-md'>
              {/* 移动端紧凑品牌头部 */}
              <div className='mb-8 flex flex-col items-center text-center lg:hidden'>
                <LogoBadge size='md' glow>
                  {icon}
                </LogoBadge>
                <h2 className='mt-4 text-2xl font-bold tracking-tight text-gray-900 dark:text-white'>
                  {siteName}
                </h2>
              </div>

              {card}

              {footer && <div className='mt-6 lg:hidden'>{footer}</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
