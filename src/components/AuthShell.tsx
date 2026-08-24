'use client';

import { Film, MonitorSmartphone, Sparkles, Zap } from 'lucide-react';
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
  /** 卡片下方内容（如 App 下载引导） */
  footer?: ReactNode;
};

const FEATURES = [
  { icon: Zap, title: '极速播放', desc: '多源聚合，秒开无缓冲' },
  {
    icon: MonitorSmartphone,
    title: '多端同步',
    desc: '手机、平板、电视无缝切换',
  },
  { icon: Sparkles, title: 'AI 推荐', desc: '智能分析你的观影喜好' },
  { icon: Film, title: '海量资源', desc: '想看的热门影视这里都有' },
];

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

      {/* 内容区：大屏左右分栏（左品牌 / 右登录卡），移动端堆叠 */}
      <div className='relative z-10 flex min-h-dvh items-center justify-center px-4 py-10 sm:px-6'>
        <div className='grid w-full max-w-5xl grid-cols-1 items-center gap-10 lg:grid-cols-[1fr_440px] lg:gap-16'>
          {/* 左栏：品牌 + 影视氛围（仅大屏） */}
          <FluentFadeIn className={isTV ? 'hidden' : 'hidden lg:block'}>
            <div className='max-w-md'>
              <div className='flex items-center gap-4'>
                <div className='relative'>
                  <div className='absolute -inset-3 rounded-3xl bg-[#f4c24d]/25 blur-2xl auth-logo-pulse dark:bg-[#f4c24d]/15' />
                  <LogoMark size='lg'>{icon}</LogoMark>
                </div>
                <h2 className='text-4xl font-black tracking-tight text-gray-900 dark:text-white'>
                  {siteName}
                </h2>
              </div>

              <p className='mt-6 text-lg leading-relaxed text-gray-600 dark:text-gray-300'>
                随时随地，畅享影音世界。聚合海量影视资源， AI
                智能推荐，手机、平板、电视全平台同步。
              </p>

              <div className='mt-9 grid grid-cols-2 gap-4'>
                {FEATURES.map((f) => (
                  <div
                    key={f.title}
                    className='group flex items-start gap-3 rounded-xl border border-gray-200/70 bg-white/50 p-3.5 transition-all duration-300 hover:-translate-y-0.5 hover:border-[#f4c24d]/50 hover:shadow-[0_10px_30px_-12px_rgba(244,194,77,0.4)] dark:border-white/10 dark:bg-white/[0.04]'
                  >
                    <div className='flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#f4c24d]/15 text-[#d89c18] transition-transform duration-300 group-hover:scale-110 dark:text-[#f4c24d]'>
                      <f.icon className='h-5 w-5' />
                    </div>
                    <div>
                      <div className='text-sm font-semibold text-gray-800 dark:text-gray-100'>
                        {f.title}
                      </div>
                      <div className='mt-0.5 text-xs leading-relaxed text-gray-500 dark:text-gray-400'>
                        {f.desc}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className='mt-9 flex items-center gap-3 text-xs text-gray-400 dark:text-gray-400'>
                <span className='h-px w-10 bg-gradient-to-r from-transparent to-[#f4c24d]/60' />
                登录后，多端同步你的片单与进度
              </div>
            </div>
          </FluentFadeIn>

          {/* 右栏：登录卡片 */}
          <div className='mx-auto w-full max-w-lg lg:mx-0'>
            {/* 移动端品牌（大屏隐藏） */}
            <FluentFadeIn className='mb-6 lg:hidden'>
              <div className='flex flex-col items-center text-center'>
                <div className='relative'>
                  <div className='absolute -inset-3 rounded-3xl bg-[#f4c24d]/20 blur-2xl auth-logo-pulse dark:bg-[#f4c24d]/15' />
                  <LogoMark size='md'>{icon}</LogoMark>
                </div>
                <h2 className='mt-4 text-2xl font-bold tracking-tight text-gray-900 dark:text-white'>
                  {siteName}
                </h2>
                <p className='mt-1.5 text-sm text-gray-500 dark:text-gray-400'>
                  随时随地，畅享影音世界
                </p>
              </div>
            </FluentFadeIn>

            <FluentFadeIn delay={80}>
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
    </div>
  );
}
