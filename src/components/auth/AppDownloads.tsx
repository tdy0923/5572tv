'use client';

import { Smartphone, Tv } from 'lucide-react';

/**
 * 客户端下载引导。panel：品牌面板中的完整卡片（含二维码）；
 * footer：移动端卡片下方的紧凑横条。
 */
export function AppDownloads({
  variant = 'panel',
}: {
  variant?: 'panel' | 'footer';
}) {
  const qrUrl =
    typeof window !== 'undefined'
      ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
          `${window.location.origin}/download`,
        )}`
      : '';

  if (variant === 'footer') {
    return (
      <div className='flex flex-wrap items-center justify-center gap-3 text-xs text-gray-500 dark:text-gray-400'>
        <span>更多客户端：</span>
        <a
          href='https://github.com/MoonTechLab/Selene/releases'
          target='_blank'
          rel='noopener noreferrer'
          className='inline-flex items-center gap-1 font-semibold text-gray-600 transition-colors hover:text-[#f4c24d] dark:text-gray-300'
        >
          <Smartphone className='h-3.5 w-3.5' />
          Selene（手机）
        </a>
        <span className='text-gray-300 dark:text-gray-600'>·</span>
        <a
          href='https://github.com/zimplexing/OrionTV'
          target='_blank'
          rel='noopener noreferrer'
          className='inline-flex items-center gap-1 font-semibold text-gray-600 transition-colors hover:text-[#f4c24d] dark:text-gray-300'
        >
          <Tv className='h-3.5 w-3.5' />
          OrionTV（电视 / 平板）
        </a>
      </div>
    );
  }

  return (
    <div className='rounded-2xl border border-gray-200/70 bg-white/70 p-5 backdrop-blur-md dark:border-white/10 dark:bg-white/[0.04]'>
      <p className='text-center text-sm font-semibold text-gray-800 dark:text-gray-100'>
        下载客户端
      </p>
      <p className='mt-1 text-center text-xs text-gray-500 dark:text-gray-400'>
        扫码或点击下载，多端同步播放
      </p>
      <div className='mt-4 flex items-start justify-center gap-5'>
        <img
          src={qrUrl}
          alt='下载二维码'
          width={96}
          height={96}
          className='h-24 w-24 rounded-lg border border-gray-200 bg-white dark:border-white/10'
        />
        <div className='flex flex-col gap-2.5'>
          <a
            href='https://github.com/MoonTechLab/Selene/releases'
            target='_blank'
            rel='noopener noreferrer'
            className='inline-flex items-center gap-2 rounded-lg bg-gray-900 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-gray-700 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200'
          >
            <Smartphone className='h-4 w-4' />
            Selene
          </a>
          <a
            href='https://github.com/zimplexing/OrionTV'
            target='_blank'
            rel='noopener noreferrer'
            className='inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3.5 py-2 text-xs font-semibold text-gray-700 transition-colors hover:border-[#f4c24d] hover:text-[#d89c18] dark:border-white/15 dark:text-gray-200 dark:hover:text-[#f4c24d]'
          >
            <Tv className='h-4 w-4' />
            OrionTV
          </a>
        </div>
      </div>
    </div>
  );
}
