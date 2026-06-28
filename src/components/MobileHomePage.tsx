'use client';

import { ChevronRight } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { processImageUrl, resolveCardPosterUrl } from '@/lib/utils';
import { useHomePageQueries } from '@/hooks/useHomePageQueries';

function HeroSlide({
  item,
  onTouchStart,
  onTouchEnd,
}: {
  item: {
    poster: string;
    title: string;
    href: string;
    subtitle?: string;
    rate?: string;
  };
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchEnd: (e: React.TouchEvent) => void;
}) {
  return (
    <Link href={item.href} className='block relative'>
      <div
        className='relative w-full h-[45vh] min-h-[280px] overflow-hidden'
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <Image
          src={processImageUrl(item.poster)}
          alt={item.title}
          fill
          className='object-cover'
          priority
        />
        <div className='absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent' />
        <div className='absolute bottom-0 left-0 right-0 p-5 pb-8'>
          <div className='max-w-lg'>
            {item.rate && (
              <span className='inline-block px-2 py-0.5 bg-[#f4c24d]/20 text-[#f4c24d] text-xs font-medium rounded mb-2'>
                ⭐ {item.rate}
              </span>
            )}
            <h2 className='text-2xl font-bold text-white mb-2'>{item.title}</h2>
            {item.subtitle && (
              <p className='text-sm text-gray-300 mb-4'>{item.subtitle}</p>
            )}
            <span className='inline-flex items-center gap-2 px-5 py-2.5 bg-[#f4c24d] text-black rounded-xl font-semibold text-sm'>
              ▶ 立即播放
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

function VideoCard({
  title,
  poster,
  href,
  subtitle,
  priority,
}: {
  title: string;
  poster: string;
  href: string;
  subtitle?: string;
  priority?: boolean;
}) {
  return (
    <Link href={href} className='flex-shrink-0 w-[42vw] snap-start block'>
      <div className='relative w-full aspect-[2/3] rounded-xl overflow-hidden bg-white/5'>
        <Image
          src={resolveCardPosterUrl(poster)}
          alt={title}
          fill
          className='object-cover'
          sizes='168px'
          priority={priority}
        />
      </div>
      <p className='mt-1.5 text-sm text-white font-medium line-clamp-1'>
        {title}
      </p>
      {subtitle && (
        <p className='text-xs text-gray-500 line-clamp-1'>{subtitle}</p>
      )}
    </Link>
  );
}

export default function MobileHomePage() {
  const { data, isLoading } = useHomePageQueries();
  const [upcoming, setUpcoming] = useState<any[]>([]);
  const [heroIndex, setHeroIndex] = useState(0);
  const touchStartX = useRef(0);

  useEffect(() => {
    fetch('/api/release-calendar?limit=10')
      .then((res) => res.json())
      .then((d) => setUpcoming(d.items || []))
      .catch(() => {});
  }, []);

  const heroItems = useMemo(() => {
    if (!data?.hotMovies) return [];
    return data.hotMovies.slice(0, 5).map((item) => ({
      poster: resolveCardPosterUrl(item.poster),
      title: item.title,
      href: `/play?source=${item.source || 'unknown'}&id=${item.id}&title=${encodeURIComponent(item.title || '')}`,
      subtitle: item.year || '',
      rate: (item as any).rate || '',
    }));
  }, [data]);

  useEffect(() => {
    if (heroItems.length <= 1) return;
    const t = setInterval(
      () => setHeroIndex((p) => (p + 1) % heroItems.length),
      6000,
    );
    return () => clearInterval(t);
  }, [heroItems.length]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      const delta = touchStartX.current - e.changedTouches[0].clientX;
      if (Math.abs(delta) > 60) {
        setHeroIndex((p) =>
          delta > 0
            ? (p + 1) % heroItems.length
            : (p - 1 + heroItems.length) % heroItems.length,
        );
      }
    },
    [heroItems.length],
  );

  const sections = useMemo(() => {
    const result: {
      title: string;
      href: string;
      items: {
        poster: string;
        title: string;
        href: string;
        subtitle?: string;
      }[];
    }[] = [];
    if (data?.hotMovies?.length) {
      result.push({
        title: '热门电影',
        href: '/search?type=movie',
        items: data.hotMovies.slice(0, 10).map((item) => ({
          poster: resolveCardPosterUrl(item.poster),
          title: item.title,
          href: `/play?source=${item.source || 'unknown'}&id=${item.id}&title=${encodeURIComponent(item.title || '')}`,
          subtitle: item.year || '',
        })),
      });
    }
    if (data?.hotTvShows?.length) {
      result.push({
        title: '热播剧集',
        href: '/search?type=tv',
        items: data.hotTvShows.slice(0, 10).map((item) => ({
          poster: resolveCardPosterUrl(item.poster),
          title: item.title,
          href: `/play?source=${item.source || 'unknown'}&id=${item.id}&title=${encodeURIComponent(item.title || '')}`,
          subtitle: item.year || '',
        })),
      });
    }
    if (data?.hotAnime?.length) {
      result.push({
        title: '动漫',
        href: '/search?type=anime',
        items: data.hotAnime.slice(0, 10).map((item) => ({
          poster: resolveCardPosterUrl(item.poster),
          title: item.title,
          href: `/play?source=${item.source || 'unknown'}&id=${item.id}&title=${encodeURIComponent(item.title || '')}`,
          subtitle: item.year || '',
        })),
      });
    }
    if (data?.hotShortDramas?.length) {
      result.push({
        title: '短剧',
        href: '/shortdrama',
        items: data.hotShortDramas.slice(0, 10).map((item) => ({
          poster: item.cover || '',
          title: item.name,
          href: `/play?source=shortdrama&id=${item.id}`,
          subtitle: `${item.episode_count}集`,
        })),
      });
    }
    if (upcoming.length > 0) {
      result.push({
        title: '即将上映',
        href: '/release-calendar',
        items: upcoming.slice(0, 10).map((item: any) => ({
          poster: resolveCardPosterUrl(item.cover || ''),
          title: item.title || item.name,
          href: `/play?source=douban&id=${item.id || ''}&title=${encodeURIComponent(item.title || item.name || '')}`,
          subtitle: item.date || '',
        })),
      });
    }
    return result;
  }, [data, upcoming]);

  if (isLoading && sections.length === 0) {
    return (
      <div className='px-4 py-4 space-y-6'>
        <div className='w-full h-[45vh] min-h-[280px] bg-white/5 rounded-2xl animate-pulse' />
        {[1, 2, 3].map((i) => (
          <div key={i}>
            <div className='h-5 w-24 bg-white/10 rounded mb-3' />
            <div className='flex gap-3 overflow-hidden'>
              {[1, 2, 3, 4].map((j) => (
                <div key={j} className='flex-shrink-0 w-[42vw]'>
                  <div className='w-full aspect-[2/3] bg-white/5 rounded-xl animate-pulse' />
                  <div className='h-3 bg-white/5 rounded mt-2 w-3/4' />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className='pb-20'>
      {heroItems.length > 0 && (
        <div className='relative'>
          <HeroSlide
            item={heroItems[heroIndex]}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          />
          {heroItems.length > 1 && (
            <div className='absolute right-3 top-1/2 -translate-y-1/2 flex flex-col gap-1 z-30'>
              {heroItems.map((_, i) => (
                <div
                  key={i}
                  className={`rounded-full transition-all duration-300 ${
                    i === heroIndex
                      ? 'w-1 h-5 bg-[#f4c24d]'
                      : 'w-1 h-1 bg-white/40'
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      )}

      <div className='pb-4'>
        {sections.map((section, sIndex) => (
          <section key={sIndex} className='py-4'>
            <div className='flex items-center justify-between px-4 mb-3'>
              <h2 className='text-lg font-bold text-gray-900 dark:text-white'>
                {section.title}
              </h2>
              {section.href && (
                <Link
                  href={section.href}
                  className='flex items-center gap-1 text-sm text-[#f4c24d]'
                >
                  更多 <ChevronRight className='w-4 h-4' />
                </Link>
              )}
            </div>
            <div className='flex gap-3 overflow-x-auto px-4 pb-2 snap-x snap-mandatory scrollbar-hide'>
              {section.items.map((item, iIndex) => (
                <VideoCard
                  key={iIndex}
                  title={item.title}
                  poster={item.poster}
                  href={item.href}
                  subtitle={item.subtitle}
                  priority={sIndex === 0 && iIndex < 3}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
