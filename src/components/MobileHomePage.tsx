'use client';

import { useMemo } from 'react';
import MobileLayout from '@/ui/mobile/layouts/MobileLayout';
import MobileHeroBanner from '@/ui/mobile/components/MobileHeroBanner';
import MobileVideoCard from '@/ui/mobile/components/MobileVideoCard';
import MobileContentSection from '@/ui/mobile/components/MobileContentSection';
import { useHomePageQueries } from '@/hooks/useHomePageQueries';
import { resolveCardPosterUrl } from '@/lib/utils';

/**
 * 移动端首页 - Netflix风格
 * 垂直滚动 + 分类区块
 */
export default function MobileHomePage() {
  const { data, isLoading } = useHomePageQueries();

  // 准备Hero数据
  const heroItems = useMemo(() => {
    if (!data?.hotMovies) return [];
    return data.hotMovies.slice(0, 5).map((item) => ({
      poster: resolveCardPosterUrl(item.poster),
      title: item.title,
      href: `/play?source=douban&id=${item.id}`,
      subtitle: item.year ? `${item.year} · ${item.rate || ''}` : item.rate || '',
    }));
  }, [data]);

  // 准备内容区块
  const sections = useMemo(() => {
    const result: { title: string; href: string; items: { poster: string; title: string; href: string; subtitle?: string }[] }[] = [];
    
    if (data?.hotMovies?.length) {
      result.push({
        title: '热门电影',
        href: '/search?type=movie',
        items: data.hotMovies.slice(0, 12).map((item) => ({
          poster: resolveCardPosterUrl(item.poster),
          title: item.title,
          href: `/play?source=douban&id=${item.id}`,
          subtitle: item.year || '',
        })),
      });
    }

    if (data?.hotTvShows?.length) {
      result.push({
        title: '热播剧集',
        href: '/search?type=tv',
        items: data.hotTvShows.slice(0, 12).map((item) => ({
          poster: resolveCardPosterUrl(item.poster),
          title: item.title,
          href: `/play?source=douban&id=${item.id}`,
          subtitle: item.year || '',
        })),
      });
    }

    if (data?.hotAnime?.length) {
      result.push({
        title: '动漫',
        href: '/search?type=anime',
        items: data.hotAnime.slice(0, 12).map((item) => ({
          poster: resolveCardPosterUrl(item.poster),
          title: item.title,
          href: `/play?source=douban&id=${item.id}`,
          subtitle: item.year || '',
        })),
      });
    }

    if (data?.hotShortDramas?.length) {
      result.push({
        title: '短剧',
        href: '/shortdrama',
        items: data.hotShortDramas.slice(0, 12).map((item) => ({
          poster: item.cover || '',
          title: item.name,
          href: `/play?source=shortdrama&id=${item.id}`,
          subtitle: `${item.episode_count}集`,
        })),
      });
    }

    return result;
  }, [data]);

  return (
    <MobileLayout>
      {/* Hero Banner - 全屏大图 */}
      <MobileHeroBanner items={heroItems} />

      {/* 内容区块 - 垂直滚动 */}
      <div className="pb-4">
        {sections.map((section, sIndex) => (
          <MobileContentSection 
            key={sIndex} 
            title={section.title}
            href={section.href}
          >
            {section.items.map((item, iIndex) => (
              <div key={iIndex} className="flex-shrink-0 w-[40vw] snap-start">
                <MobileVideoCard
                  title={item.title}
                  poster={item.poster}
                  href={item.href}
                  subtitle={item.subtitle}
                  priority={sIndex === 0 && iIndex < 3}
                />
              </div>
            ))}
          </MobileContentSection>
        ))}
      </div>

      {/* 加载状态 */}
      {isLoading && (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-[#f4c24d] border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </MobileLayout>
  );
}
