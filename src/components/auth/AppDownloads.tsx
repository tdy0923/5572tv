'use client';

import { Smartphone, Tv } from 'lucide-react';
import QRCodeLib from 'qrcode';
import { useEffect, useState } from 'react';

/**
 * 客户端下载引导。panel：卡片内横排（LOGO + 客户端下载按钮）；
 * footer：卡片下方的紧凑横条。二维码在本机用 qrcode 生成，不依赖外网。
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

  if (variant === 'footer') {
    return (
      <div className='flex flex-wrap items-center justify-center gap-3 text-xs text-gray-400'>
        <span>更多客户端：</span>
        <a
          href='https://github.com/MoonTechLab/Selene/releases'
          target='_blank'
          rel='noopener noreferrer'
          className='inline-flex items-center gap-1 font-semibold text-gray-300 transition-colors hover:text-[#f4c24d]'
        >
          <Smartphone className='h-3.5 w-3.5' />
          Selene（手机）
        </a>
        <span className='text-gray-600'>·</span>
        <a
          href='https://github.com/zimplexing/OrionTV'
          target='_blank'
          rel='noopener noreferrer'
          className='inline-flex items-center gap-1 font-semibold text-gray-300 transition-colors hover:text-[#f4c24d]'
        >
          <Tv className='h-3.5 w-3.5' />
          OrionTV（电视 / 平板）
        </a>
      </div>
    );
  }

  return (
    <div className='rounded-2xl border border-white/10 bg-white/[0.04] p-4'>
      <p className='text-center text-sm font-semibold text-gray-100'>
        下载客户端
      </p>
      <p className='mt-0.5 text-center text-xs text-gray-400'>
        扫码或点击下载，多端同步播放
      </p>
      <div className='mt-3 flex items-center justify-center gap-4'>
        {qrDataUrl && (
          <img
            src={qrDataUrl}
            alt='下载二维码'
            width={88}
            height={88}
            className='h-[5.5rem] w-[5.5rem] shrink-0 rounded-lg border border-white/10 bg-white p-1'
          />
        )}
        <div className='flex flex-col gap-2.5'>
          <a
            href='https://github.com/MoonTechLab/Selene/releases'
            target='_blank'
            rel='noopener noreferrer'
            className='inline-flex items-center gap-2 rounded-lg bg-white px-3.5 py-2 text-xs font-semibold text-gray-900 transition-colors hover:bg-gray-200'
          >
            <Smartphone className='h-4 w-4' />
            Selene
          </a>
          <a
            href='https://github.com/zimplexing/OrionTV'
            target='_blank'
            rel='noopener noreferrer'
            className='inline-flex items-center gap-2 rounded-lg border border-white/20 px-3.5 py-2 text-xs font-semibold text-gray-200 transition-colors hover:border-[#f4c24d]/60 hover:text-[#f4c24d]'
          >
            <Tv className='h-4 w-4' />
            OrionTV
          </a>
        </div>
      </div>
    </div>
  );
}
