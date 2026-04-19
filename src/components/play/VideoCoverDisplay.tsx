'use client';

import { resolveCardPosterUrl } from '@/lib/utils';

interface VideoCoverDisplayProps {
  videoCover: string;
  bangumiDetails: {
    images?: {
      large?: string;
      common?: string;
      medium?: string;
    };
  } | null;
  videoTitle: string;
  videoDoubanId: number;
}

export default function VideoCoverDisplay({
  videoCover,
  bangumiDetails,
  videoTitle,
  videoDoubanId,
}: VideoCoverDisplayProps) {
  const coverSrc = resolveCardPosterUrl(
    bangumiDetails?.images?.large,
    bangumiDetails?.images?.common,
    bangumiDetails?.images?.medium,
    videoCover,
  );
  const resolvedCover = coverSrc;

  return (
    <div className='hidden md:block md:col-span-1 md:order-first'>
      <div className='py-4 pr-6'>
        <div className='group relative flex aspect-[2/3] items-center justify-center overflow-hidden rounded-[22px] border border-black/6 bg-linear-to-br from-gray-100 to-gray-200 shadow-[0_18px_44px_rgba(15,23,42,0.08)] dark:border-white/8 dark:from-gray-800 dark:to-gray-700'>
          {coverSrc ? (
            <>
              <img
                src={resolvedCover}
                alt={videoTitle}
                className='h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]'
                referrerPolicy='no-referrer'
                onError={(e) => {
                  const img = e.currentTarget;
                  if (!img.dataset.fallbackApplied) {
                    img.dataset.fallbackApplied = 'true';
                    img.src = '/placeholder-cover.jpg';
                  } else {
                    img.src =
                      'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="320" height="480" viewBox="0 0 320 480"%3E%3Crect width="320" height="480" rx="28" fill="%23111827"/%3E%3Crect x="48" y="72" width="224" height="280" rx="18" fill="none" stroke="%236b7280" stroke-width="8" stroke-dasharray="14 12"/%3E%3Ccircle cx="160" cy="176" r="38" fill="%236b7280"/%3E%3Cpath d="M108 286c14-34 34-52 52-52s38 18 52 52" fill="%236b7280"/%3E%3Ctext x="160" y="410" font-family="Arial" font-size="22" fill="%239ca3af" text-anchor="middle"%3E封面暂不可用%3C/text%3E%3C/svg%3E';
                  }
                }}
              />

              <div className='absolute inset-0 bg-linear-to-t from-black/40 via-black/0 to-black/0 opacity-0 transition-opacity duration-500 group-hover:opacity-100'></div>

              {videoDoubanId !== 0 && (
                <a
                  href={
                    bangumiDetails
                      ? `https://bgm.tv/subject/${videoDoubanId.toString()}`
                      : `https://movie.douban.com/subject/${videoDoubanId.toString()}`
                  }
                  target='_blank'
                  rel='noopener noreferrer'
                  className='absolute left-3 top-3 z-20'
                >
                  <div className='inline-flex items-center gap-2 rounded-full border border-white/18 bg-black/35 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-md transition-all duration-300 hover:bg-black/50'>
                    <svg
                      width='14'
                      height='14'
                      viewBox='0 0 24 24'
                      fill='none'
                      stroke='currentColor'
                      strokeWidth='2'
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      className='relative z-10'
                    >
                      <path d='M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71'></path>
                      <path d='M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71'></path>
                    </svg>
                    <span>{bangumiDetails ? 'Bangumi' : '豆瓣'}</span>
                  </div>
                </a>
              )}
            </>
          ) : (
            <span className='text-gray-600 dark:text-gray-400'>封面图片</span>
          )}
        </div>
      </div>
    </div>
  );
}
