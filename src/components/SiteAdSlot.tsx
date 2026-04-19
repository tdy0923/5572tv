'use client';

import { Volume2 } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { type AdPosition, isAdSettingRenderable } from '@/lib/ad-settings';

import { useSite } from './SiteProvider';

type SiteAdSlotProps = {
  position: AdPosition;
  className?: string;
};

export function SiteAdSlot({ position, className = '' }: SiteAdSlotProps) {
  const { adSettings } = useSite();
  const settings = adSettings?.[position];

  if (!isAdSettingRenderable(settings)) return null;

  const {
    style = 'card',
    title,
    content,
    imageUrl,
    linkUrl,
    altText,
    maxWidth = 1200,
    maxHeight = 320,
    maxTextLength = 120,
    openInNewTab = true,
  } = settings;

  const target = openInNewTab ? '_blank' : '_self';
  const rel = openInNewTab ? 'noreferrer noopener' : undefined;
  const isCompactTextRow =
    style === 'text' &&
    (position === 'search_top' ||
      position === 'play_sidebar' ||
      position === 'footer');
  const isSidebarSlot = position === 'search_sidebar';
  const isHeroSlot = position === 'home_hero';
  const isFooterSlot = position === 'footer';
  const isPlayerRowSlot = position === 'play_sidebar';
  const containerClass = isHeroSlot
    ? 'rounded-[28px] border border-black/6 bg-white/78 shadow-[0_20px_50px_rgba(15,23,42,0.08)] backdrop-blur-xl dark:border-white/8 dark:bg-white/6'
    : isFooterSlot
      ? 'rounded-[24px] border border-black/6 bg-white/72 shadow-[0_16px_36px_rgba(15,23,42,0.06)] backdrop-blur-xl dark:border-white/8 dark:bg-white/6'
      : isPlayerRowSlot
        ? 'rounded-[24px] border border-black/6 bg-white/76 shadow-[0_18px_40px_rgba(15,23,42,0.08)] backdrop-blur-xl dark:border-white/8 dark:bg-white/6'
        : 'rounded-2xl border border-black/6 bg-white/75 shadow-[0_16px_36px_rgba(15,23,42,0.08)] backdrop-blur-xl dark:border-white/8 dark:bg-white/6';
  const imageContainerClass = isSidebarSlot
    ? 'mx-auto overflow-hidden rounded-2xl border border-black/6 bg-black/5'
    : 'overflow-hidden rounded-2xl border border-black/6 bg-black/5';

  const textContent = (content || title || '').slice(0, maxTextLength);
  const textAds = (content || title || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 8);

  const wrap = (node: ReactNode) => {
    if (!linkUrl) return node;
    return (
      <Link href={linkUrl} target={target} rel={rel} className='block'>
        {node}
      </Link>
    );
  };

  if (style === 'image' && imageUrl) {
    return wrap(
      <div
        className={`${imageContainerClass} ${className}`}
        style={{
          maxWidth: isSidebarSlot ? '100%' : maxWidth,
          width: isSidebarSlot ? '100%' : undefined,
          maxHeight,
          aspectRatio:
            maxWidth > 0 && maxHeight > 0
              ? `${maxWidth} / ${maxHeight}`
              : undefined,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt={altText || title || '广告'}
          className='h-full w-full object-cover'
          style={{ maxHeight, width: '100%' }}
        />
      </div>,
    );
  }

  if (style === 'text') {
    return wrap(
      <div
        className={`${containerClass} ${isCompactTextRow ? 'p-3 sm:p-4' : isHeroSlot ? 'p-4 sm:p-5' : 'p-4'} ${className}`}
        style={{
          maxWidth: '100%',
          width: '100%',
        }}
      >
        <div className='flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400'>
          <Volume2 className='h-3.5 w-3.5' />
          <span>广告</span>
        </div>
        {textAds.length > 0 && (
          <div className='mt-3 space-y-2'>
            {textAds.map((line, index) => {
              const [label, maybeUrl, desc] = line
                .split('|')
                .map((v) => v.trim());
              const node = (
                <div className='w-full rounded-2xl border border-black/6 bg-white/90 px-3 py-2 text-gray-800 shadow-sm dark:border-white/8 dark:bg-white/8 dark:text-gray-100'>
                  <div className='text-sm font-semibold'>
                    {(label || line).slice(0, maxTextLength)}
                  </div>
                  {desc && (
                    <div className='mt-1 text-xs leading-relaxed text-gray-500 dark:text-gray-400'>
                      {desc.slice(0, maxTextLength)}
                    </div>
                  )}
                </div>
              );
              if (maybeUrl) {
                return (
                  <Link
                    key={`${label}-${index}`}
                    href={maybeUrl}
                    target={target}
                    rel={rel}
                    className='block w-full'
                  >
                    {node}
                  </Link>
                );
              }
              return (
                <div key={`${label}-${index}`} className='w-full'>
                  {node}
                </div>
              );
            })}
          </div>
        )}
      </div>,
    );
  }

  return wrap(
    <div
      className={`${containerClass} ${isHeroSlot ? 'p-4 sm:p-5' : isFooterSlot ? 'p-4' : 'p-4'} ${className}`}
      style={{
        maxWidth: isSidebarSlot ? '100%' : maxWidth,
        width: isSidebarSlot ? '100%' : undefined,
      }}
    >
      <div
        className={`flex ${isFooterSlot ? 'items-center' : 'items-start'} gap-4`}
      >
        {imageUrl && (
          <div
            className={`${isFooterSlot ? 'h-16 w-24' : 'h-20 w-28'} shrink-0 overflow-hidden rounded-xl bg-black/5`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt={altText || title || '广告'}
              className='h-full w-full object-cover'
            />
          </div>
        )}
        <div className='min-w-0 flex-1'>
          <div className='flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400'>
            <Volume2 className='h-3.5 w-3.5' />
            <span>广告</span>
          </div>
          {title && (
            <div
              className={`mt-1 font-semibold text-gray-900 dark:text-gray-100 ${isHeroSlot ? 'text-lg sm:text-xl' : 'text-base'}`}
            >
              {title}
            </div>
          )}
          {textContent && (
            <div
              className={`mt-2 leading-relaxed text-gray-600 dark:text-gray-300 ${isFooterSlot ? 'text-sm' : 'text-sm sm:text-[15px]'}`}
            >
              {textContent}
            </div>
          )}
        </div>
      </div>
    </div>,
  );
}
