'use client';

import { Apple, Smartphone, Tv } from 'lucide-react';
import QRCodeLib from 'qrcode';
import { useEffect, useState } from 'react';

/**
 * 客户端下载引导（登录卡片下方）。
 * 二维码指向 APK 直链（扫码即下载），链接覆盖安卓 / 电视 / iOS。
 * 二维码在本机用 qrcode 生成，不依赖外网。
 */
export function AppDownloads() {
  const [qrDataUrl, setQrDataUrl] = useState('');

  useEffect(() => {
    let alive = true;
    const target =
      typeof window !== 'undefined'
        ? `${window.location.origin}/download/5572tv-android.apk`
        : '';
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
    'inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors';
  const primaryClass =
    'bg-gray-900 text-white hover:bg-gray-700 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200';
  const ghostClass =
    'border border-gray-300 text-gray-700 hover:border-[#f4c24d] hover:text-[#d89c18] dark:border-white/15 dark:text-gray-200 dark:hover:border-[#f4c24d]/60 dark:hover:text-[#f4c24d]';

  return (
    <div className='flex flex-wrap items-center justify-center gap-4'>
      <div className='flex items-center gap-3'>
        {qrDataUrl && (
          <img
            src={qrDataUrl}
            alt='下载二维码'
            width={84}
            height={84}
            className='h-[5.25rem] w-[5.25rem] shrink-0 rounded-xl border border-gray-200 bg-white p-1 dark:border-white/10'
          />
        )}
        <div>
          <p className='text-sm font-semibold text-gray-800 dark:text-gray-100'>
            下载客户端
          </p>
          <p className='mt-0.5 text-xs text-gray-500 dark:text-gray-400'>
            扫码或点击下载，多端同步播放
          </p>
        </div>
      </div>

      <div className='flex flex-col gap-2'>
        <a
          href='/download/5572tv-android.apk'
          download
          className={`${linkClass} ${primaryClass}`}
        >
          <Smartphone className='h-4 w-4' />
          安卓版
        </a>
        <a
          href='/download/5572tv-android.apk'
          download
          className={`${linkClass} ${ghostClass}`}
        >
          <Tv className='h-4 w-4' />
          电视版
        </a>
        <a href='/download' className={`${linkClass} ${ghostClass}`}>
          <Apple className='h-4 w-4' />
          iOS 版
        </a>
      </div>
    </div>
  );
}
