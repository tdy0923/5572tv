'use client';

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
  /** 卡片下方扩展内容（如 App 下载入口） */
  brandExtra?: ReactNode;
  /** 卡片下方内容（如 App 下载横条） */
  footer?: ReactNode;
};

function LogoMark({
  size,
  children,
}: {
  size: 'md' | 'lg';
  children?: ReactNode;
}) {
  const sizes = {
    md: 'h-14 w-14 rounded-2xl [&_svg]:h-7 [&_svg]:w-7',
    lg: 'h-16 w-16 rounded-2xl [&_svg]:h-8 [&_svg]:w-8',
  };
  return (
    <div
      aria-hidden
      className={`flex items-center justify-center bg-linear-to-br from-[#f4c24d] via-[#f0b938] to-[#d89c18] text-[#171717] shadow-[0_10px_30px_rgba(244,194,77,0.35)] ${sizes[size]}`}
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

  return (
    <div
      data-auth-root
      data-tv={isTV || undefined}
      className='relative min-h-dvh w-full overflow-hidden bg-[#f4f6fa] dark:bg-[#05070d]'
    >
      {/* 影视感明暗自适应背景 */}
      <AuthBackground />

      {/* 主题切换 */}
      <div
        className='absolute right-3 top-3 z-30 sm:right-4 sm:top-4'
        style={{ marginTop: 'env(safe-area-inset-top)' }}
      >
        <ThemeToggle />
      </div>

      {/* 内容区：移动端靠上（避免矮内容垂直居中在顶部留大片空白），桌面端居中 */}
      <div className='relative z-10 flex min-h-dvh items-start justify-center px-4 pb-10 pt-12 sm:items-center sm:py-10 sm:px-6'>
        <div className='flex w-full max-w-lg flex-col items-center'>
          {/* 品牌 */}
          <FluentFadeIn>
            <div className='mb-7 flex flex-col items-center text-center'>
              <div className='relative'>
                <div className='absolute -inset-3 rounded-3xl bg-[#f4c24d]/20 blur-2xl auth-logo-pulse dark:bg-[#f4c24d]/15' />
                <LogoMark size={isTV ? 'lg' : 'md'}>{icon}</LogoMark>
              </div>
              <h2 className='mt-5 text-2xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-3xl'>
                {siteName}
              </h2>
              <p className='mt-1.5 text-sm text-gray-500 dark:text-gray-400 sm:text-base'>
                随时随地，畅享影音世界
              </p>
            </div>
          </FluentFadeIn>

          {/* 玻璃/白色卡片（明暗自适应，wider） */}
          <FluentFadeIn delay={80} className='w-full'>
            <div
              className={`auth-card relative w-full rounded-3xl border p-6 shadow-xl shadow-black/5 backdrop-blur-xl sm:p-9 ${
                isTV
                  ? 'border-white/10 bg-[#0d1117]/85'
                  : 'border-gray-200/80 bg-white/80 dark:border-white/10 dark:bg-white/[0.06] dark:shadow-[0_24px_80px_rgba(0,0,0,0.5)]'
              }`}
            >
              {/* 顶部金色高光 */}
              <div className='pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#f4c24d]/70 to-transparent' />

              <div className='mb-6 text-center sm:mb-7'>
                <h1 className='text-xl font-semibold tracking-tight text-gray-900 dark:text-gray-50 sm:text-2xl'>
                  {title}
                </h1>
                {subtitle && (
                  <p className='mt-1.5 text-xs leading-relaxed text-gray-500 dark:text-gray-400 sm:text-sm'>
                    {subtitle}
                  </p>
                )}
              </div>

              {children}

              {brandExtra && <div className='mt-6'>{brandExtra}</div>}
            </div>
          </FluentFadeIn>

          {footer && (
            <FluentFadeIn delay={160} className='mt-6 w-full'>
              {footer}
            </FluentFadeIn>
          )}
        </div>
      </div>
    </div>
  );
}
