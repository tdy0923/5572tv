'use client';

import type { ReactNode } from 'react';

import { useSite } from './SiteProvider';
import { ThemeToggle } from './ThemeToggle';

type AuthShellProps = {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  children: ReactNode;
};

export function AuthShell({ title, subtitle, icon, children }: AuthShellProps) {
  const { siteName } = useSite();

  return (
    <div className='relative min-h-screen overflow-x-hidden overflow-y-auto px-3 py-8 sm:px-4 sm:py-0'>
      <div className='absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(244,194,77,0.18),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(59,130,246,0.12),_transparent_28%),linear-gradient(180deg,_#f6f7fb,_#eef2f7)] dark:bg-[radial-gradient(circle_at_top,_rgba(244,194,77,0.1),_transparent_25%),radial-gradient(circle_at_bottom_right,_rgba(59,130,246,0.08),_transparent_20%),linear-gradient(180deg,_#0b0f14,_#111827)]' />

      <div className='absolute right-3 top-3 z-20 sm:right-4 sm:top-4'>
        <ThemeToggle />
      </div>

      <div className='relative z-10 flex min-h-[calc(100vh-4rem)] items-center justify-center sm:min-h-screen'>
        <div className='w-full max-w-md overflow-hidden rounded-[28px] border border-black/6 bg-white/82 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.12)] backdrop-blur-2xl dark:border-white/8 dark:bg-[#0f131a]/82 sm:p-10'>
          <div className='mb-8 text-center'>
            <div className='mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-linear-to-br from-[#f4c24d] via-[#f0b938] to-[#d89c18] text-[#171717] shadow-[0_12px_28px_rgba(244,194,77,0.22)]'>
              {icon}
            </div>
            <div className='text-3xl font-bold tracking-tight text-gray-900 dark:text-white'>
              {siteName}
            </div>
            <div className='mt-3 text-lg font-semibold text-gray-800 dark:text-gray-100'>
              {title}
            </div>
            {subtitle && (
              <p className='mt-2 text-sm text-gray-600 dark:text-gray-400'>
                {subtitle}
              </p>
            )}
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
