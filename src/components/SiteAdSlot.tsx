'use client';

import { Volume2 } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { type AdPosition, isAdSettingRenderable } from '@/lib/ad-settings';

import { useSite } from './SiteProvider';

// 安全说明：广告字段（title/content/imageUrl/linkUrl 等）在前台一律按纯文本渲染
// React 会自动转义文本，禁止使用 dangerouslySetInnerHTML 直接渲染 HTML。
// 如未来需支持富文本 HTML，必须先用 DOMPurify 等库消毒后再渲染。
function isSafeHttpUrl(url: string | undefined): boolean {
  if (!url) return false;
  try {
    const u = new URL(url, 'http://dummy-base');
    // 仅允许 http/https；相对路径（无协议）视为不安全，交给调用方判断
    // 若 url 为相对路径，new URL 会以 dummy-base 补全为 http，需额外判断原串是否以 / 或 http 开头
    if (url.startsWith('/') && !url.startsWith('//')) return true;
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

function sanitizeHref(url: string | undefined): string | undefined {
  if (!url) return undefined;
  const trimmed = url.trim();
  if (!trimmed) return undefined;
  // 拒绝 javascript:, data:, vbscript: 等危险协议
  if (/^\s*javascript:/i.test(trimmed) || /^\s*data:/i.test(trimmed) || /^\s*vbscript:/i.test(trimmed)) return undefined;
  if (isSafeHttpUrl(trimmed)) return trimmed;
  // 允许站内相对路径 /xxx
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) return trimmed;
  return undefined;
}

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
    ? 'rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-md  dark:border-gray-700 dark:bg-gray-800'
    : isFooterSlot
      ? 'rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-md  dark:border-gray-700 dark:bg-gray-800'
      : isPlayerRowSlot
        ? 'rounded-xl border border-gray-200 dark:border-gray-700 bg-white shadow-md dark:border-gray-700 dark:bg-gray-800'
        : 'rounded-2xl border border-gray-200 dark:border-gray-700 bg-white shadow-md dark:border-gray-700 dark:bg-gray-800';
  const imageContainerClass = isSidebarSlot
    ? 'mx-auto overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-700 bg-black/5'
    : 'overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-700 bg-black/5';

  const textContent = (content || title || '').slice(0, maxTextLength);
  const textAds = (content || title || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 8);

  const safeLinkUrl = sanitizeHref(linkUrl);
  const safeImageUrl = isSafeHttpUrl(imageUrl) || (imageUrl && imageUrl.startsWith('/') && !imageUrl.startsWith('//')) ? imageUrl : undefined;

  const wrap = (node: ReactNode) => {
    if (!safeLinkUrl) return node;
    return (
      <Link href={safeLinkUrl} target={target} rel={rel} className='block'>
        {node}
      </Link>
    );
  };

  if (style === 'image' && safeImageUrl) {
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
          overflow: 'hidden',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={safeImageUrl}
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
        <div className='flex items-center gap-2 text-xs uppercase tracking-[0.12em] text-gray-500 dark:text-gray-400'>
          <Volume2 className='h-3.5 w-3.5' />
          <span>广告</span>
        </div>
        {textAds.length > 0 && (
          <div
            className={`mt-3 grid gap-2 ${position === 'search_top' ? 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3' : 'grid-cols-1'}`}
          >
            {textAds.map((line, index) => {
              const [label, maybeUrl, desc] = line
                .split('|')
                .map((v) => v.trim());
              const safeMaybeUrl = sanitizeHref(maybeUrl);
              const node = (
                <div className='w-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-white px-3 py-2 text-gray-800 shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100'>
                  <div className='text-sm font-medium'>
                    {(label || line).slice(0, maxTextLength)}
                  </div>
                  {desc && (
                    <div className='mt-1 text-xs leading-relaxed text-gray-500 dark:text-gray-400'>
                      {desc.slice(0, maxTextLength)}
                    </div>
                  )}
                </div>
              );
              if (safeMaybeUrl) {
                return (
                  <Link
                    key={`${label}-${index}`}
                    href={safeMaybeUrl}
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
        {safeImageUrl && (
          <div
            className={`${isFooterSlot ? 'h-16 w-24' : 'h-20 w-28'} shrink-0 overflow-hidden rounded-xl bg-black/5`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={safeImageUrl}
              alt={altText || title || '广告'}
              className='h-full w-full object-cover'
            />
          </div>
        )}
        <div className='min-w-0 flex-1'>
          <div className='flex items-center gap-2 text-xs uppercase tracking-[0.12em] text-gray-500 dark:text-gray-400'>
            <Volume2 className='h-3.5 w-3.5' />
            <span>广告</span>
          </div>
          {title && (
            <div
              className={`mt-1 font-medium text-gray-900 dark:text-gray-100 ${isHeroSlot ? 'text-lg sm:text-xl' : 'text-base'}`}
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
