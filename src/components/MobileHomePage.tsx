'use client';

import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { resolveCardPosterUrl } from '@/lib/utils';
import { useHomePageQueries } from '@/hooks/useHomePageQueries';

import MobileHeroBanner from '@/ui/mobile/components/MobileHeroBanner';
import MobileVideoCard from '@/ui/mobile/components/MobileVideoCard';
import MobileLayout from '@/ui/mobile/layouts/MobileLayout';

/**
 * 移动端首页 - Netflix风格
 * 垂直滚动 + 分类区块 + 横向卡片
 */
export default function MobileHomePage() {
  const { data, isLoading } = useHomePageQueries();
  const [upcoming, setUpcoming] = useState<any[]>([]);

  // 获取即将上映数据
  useEffect(() => {
    fetch('/api/release-calendar?limit=10')
      .then((res) => res.json())
      .then((d) => setUpcoming(d.items || []))
      .catch(() => {});
  }, []);

  // Hero数据
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

  // 内容区块
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

  return (
    <MobileLayout>
      {/* Hero */}
      <MobileHeroBanner items={heroItems} />

      {/* 分类区块 */}
      <div className='pb-4'>
        {sections.map((section, sIndex) => (
          <section key={sIndex} className='py-4'>
            <div className='flex items-center justify-between px-4 mb-3'>
              <h2 className='text-lg font-bold text-white'>{section.title}</h2>
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
                <div key={iIndex} className='flex-shrink-0 w-[40vw] snap-start'>
                  <MobileVideoCard
                    title={item.title}
                    poster={item.poster}
                    href={item.href}
                    subtitle={item.subtitle}
                    priority={sIndex === 0 && iIndex < 3}
                  />
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      {isLoading && (
        <div className='flex justify-center py-12'>
          <div className='w-8 h-8 border-2 border-[#f4c24d] border-t-transparent rounded-full animate-spin' />
        </div>
      )}
    </MobileLayout>
  );
}
