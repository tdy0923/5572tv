'use client';

import { Apple, Smartphone, Tv } from 'lucide-react';
import QRCodeLib from 'qrcode';
import { useEffect, useState } from 'react';

/**
 * 客户端下载引导。panel：卡片内横排（二维码 + 下载按钮）；
 * footer：卡片下方紧凑横条。二维码在本机用 qrcode 生成，不依赖外网。
 * 全部指向自有客户端：安卓 / 电视（APK）与 iOS（PWA 指南）。
 */
export function AppDownloads({
  variant = 'panel',
}: {
  variant?: 'panel' | 'footer';
}) {
  const [qrDataUrl, setQrDataUrl] = useState('');

  useEffect(() => {
    let alive = true;
    const target =
      typeof window !== 'undefined' ? `${window.location.origin}/download` : '';
    QRCodeLib.toDataURL(target, {
      width: 256,
      margin: 1,
      color: { dark: '#0f1117', light: '#ffffff' },
    })
      .then((url) => {
        if (alive) setQrDataUrl(url);
      })
      .catch(() => {
        /* 生成失败时静默隐藏二维码 */
      });
    return () => {
      alive = false;
    };
  }, []);

  const linkClass =
    'inline-flex items-center gap-1 font-semibold text-gray-700 transition-colors hover:text-[#d89c18] dark:text-gray-200 dark:hover:text-[#f4c24d]';

  if (variant === 'footer') {
    return (
      <div className='flex flex-wrap items-center justify-center gap-2 text-xs text-gray-500 dark:text-gray-400'>
        <span>更多平台：</span>
        <a
          href='/static/download/5572tv-android.apk'
          download
          className={linkClass}
        >
          <Smartphone className='h-3.5 w-3.5' />
          安卓版
        </a>
        <span className='text-gray-300 dark:text-gray-600'>·</span>
        <a
          href='/static/download/5572tv-android.apk'
          download
          className={linkClass}
        >
          <Tv className='h-3.5 w-3.5' />
          电视版
        </a>
        <span className='text-gray-300 dark:text-gray-600'>·</span>
        <a href='/download' className={linkClass}>
          <Apple className='h-3.5 w-3.5' />
          iOS 版
        </a>
      </div>
    );
  }

  return (
    <div className='rounded-2xl border border-gray-200/80 bg-gray-50/60 p-4 dark:border-white/10 dark:bg-white/[0.04]'>
      <p className='text-center text-sm font-semibold text-gray-800 dark:text-gray-100'>
        下载客户端
      </p>
      <p className='mt-0.5 text-center text-xs text-gray-500 dark:text-gray-400'>
        扫码或点击下载，多端同步播放
      </p>
      <div className='mt-3 flex items-center justify-center gap-5'>
        {qrDataUrl && (
          <img
            src={qrDataUrl}
            alt='下载二维码'
            width={92}
            height={92}
            className='h-[5.75rem] w-[5.75rem] shrink-0 rounded-xl border border-gray-200 bg-white p-1 dark:border-white/10'
          />
        )}
        <div className='flex flex-col gap-2.5'>
          <a
            href='/static/download/5572tv-android.apk'
            download
            className='inline-flex items-center gap-2 rounded-lg bg-gray-900 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-gray-700 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200'
          >
            <Smartphone className='h-4 w-4' />
            安卓版
          </a>
          <a
            href='/static/download/5572tv-android.apk'
            download
            className='inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3.5 py-2 text-xs font-semibold text-gray-700 transition-colors hover:border-[#f4c24d] hover:text-[#d89c18] dark:border-white/15 dark:text-gray-200 dark:hover:border-[#f4c24d]/60 dark:hover:text-[#f4c24d]'
          >
            <Tv className='h-4 w-4' />
            电视版
          </a>
          <a
            href='/download'
            className='inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3.5 py-2 text-xs font-semibold text-gray-700 transition-colors hover:border-[#f4c24d] hover:text-[#d89c18] dark:border-white/15 dark:text-gray-200 dark:hover:border-[#f4c24d]/60 dark:hover:text-[#f4c24d]'
          >
            <Apple className='h-4 w-4' />
            iOS 版
          </a>
        </div>
      </div>
    </div>
  );
}
