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
  /** 品牌区扩展内容（卡片下方，如 App 下载入口） */
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
      className={`flex items-center justify-center bg-linear-to-br from-[#f4c24d] via-[#f0b938] to-[#d89c18] text-[#171717] ${sizes[size]}`}
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
      className='relative min-h-dvh w-full overflow-hidden'
    >
      {/* 沉浸式科技背景 */}
      <AuthBackground />

      {/* 主题切换 */}
      <div
        className='absolute right-3 top-3 z-30 sm:right-4 sm:top-4'
        style={{ marginTop: 'env(safe-area-inset-top)' }}
      >
        <ThemeToggle />
      </div>

      {/* 居中玻璃卡片 */}
      <div className='relative z-10 flex min-h-dvh items-center justify-center px-4 py-10 sm:px-6'>
        <div className='flex w-full max-w-sm flex-col items-center'>
          {/* 品牌 */}
          <FluentFadeIn>
            <div className='mb-8 flex flex-col items-center text-center'>
              <div className='relative'>
                <div className='absolute -inset-3 rounded-3xl bg-[#f4c24d]/20 blur-2xl auth-logo-pulse' />
                <LogoMark size={isTV ? 'lg' : 'md'}>{icon}</LogoMark>
              </div>
              <h2 className='mt-5 text-2xl font-bold tracking-tight text-gray-100'>
                {siteName}
              </h2>
            </div>
          </FluentFadeIn>

          {/* 玻璃卡片 */}
          <FluentFadeIn delay={80} className='w-full'>
            <div className='auth-card auth-card-halo relative w-full rounded-3xl border border-white/12 bg-white/[0.06] p-6 backdrop-blur-xl sm:p-8'>
              {/* 顶部渐变高光 */}
              <div className='pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#f4c24d]/70 to-transparent' />
              {/* 左上角玻璃高光 */}
              <div className='pointer-events-none absolute -left-px -top-px h-20 w-20 rounded-tl-3xl bg-gradient-to-br from-white/10 to-transparent blur-[1px]' />

              <div className='mb-6 text-center sm:mb-7'>
                <h1 className='text-xl font-semibold tracking-tight text-gray-100 sm:text-2xl'>
                  {title}
                </h1>
                {subtitle && (
                  <p className='mt-1.5 text-xs leading-relaxed text-gray-400 sm:text-sm'>
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
