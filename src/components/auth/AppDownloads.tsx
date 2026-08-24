'use client';

import { Apple, Download, Smartphone, Tv } from 'lucide-react';
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

  const versionClass =
    'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-200 active:scale-95';
  const primaryClass =
    'bg-gray-900 text-white shadow-md hover:bg-gray-700 hover:shadow-lg dark:bg-white dark:text-gray-100 dark:hover:bg-gray-200';
  const ghostClass =
    'border border-gray-300 bg-white text-gray-700 hover:border-[#f4c24d] hover:text-[#d89c18] dark:border-white/15 dark:bg-white/[0.04] dark:text-gray-200 dark:hover:border-[#f4c24d]/60 dark:hover:text-[#f4c24d]';

  return (
    <div className='w-full rounded-2xl border border-gray-200/80 bg-white/70 p-5 shadow-sm backdrop-blur-xl sm:p-6 dark:border-white/10 dark:bg-white/[0.05] dark:shadow-none'>
      <div className='flex flex-col items-center gap-4 sm:flex-row sm:justify-center sm:gap-5'>
        {qrDataUrl && (
          <img
            src={qrDataUrl}
            alt='下载二维码'
            width={112}
            height={112}
            className='h-28 w-28 shrink-0 rounded-2xl border border-gray-200 bg-white p-1.5 shadow-sm dark:border-white/10'
          />
        )}
        <div className='text-center sm:text-left'>
          <p className='text-base font-bold text-gray-900 dark:text-white'>
            下载客户端
          </p>
          <p className='mt-1 text-sm leading-relaxed text-gray-500 dark:text-gray-400'>
            扫码或点击下载
            <br className='sm:hidden' />
            <span className='hidden sm:inline'>，</span>
            多端同步播放
          </p>
          <p className='mt-1 text-xs text-gray-400 dark:text-gray-400'>
            手机 / 平板 / 电视无缝切换
          </p>
        </div>
      </div>

      <div className='mt-5 grid grid-cols-3 gap-2.5'>
        <a
          href='/download/5572tv-android.apk'
          download
          className={`${versionClass} ${primaryClass}`}
        >
          <Smartphone className='h-5 w-5 shrink-0' />
          <span className='truncate'>安卓版</span>
        </a>
        <a
          href='/download/5572tv-android.apk'
          download
          className={`${versionClass} ${ghostClass}`}
        >
          <Tv className='h-5 w-5 shrink-0' />
          <span className='truncate'>电视版</span>
        </a>
        <a href='/download' className={`${versionClass} ${ghostClass}`}>
          <Apple className='h-5 w-5 shrink-0' />
          <span className='truncate'>iOS 版</span>
        </a>
      </div>

      <p className='mt-3 flex items-center justify-center gap-1.5 text-center text-xs text-gray-400 dark:text-gray-400'>
        <Download className='h-3.5 w-3.5' />
        免费下载，极速安装
      </p>
    </div>
  );
}
