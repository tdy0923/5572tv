'use client';

import { useMemo } from 'react';
import MobileLayout from '@/ui/mobile/layouts/MobileLayout';
import MobileHeroBanner from '@/ui/mobile/components/MobileHeroBanner';
import MobileVideoCard from '@/ui/mobile/components/MobileVideoCard';
import { useHomePageQueries } from '@/hooks/useHomePageQueries';
import { resolveCardPosterUrl } from '@/lib/utils';

/**
 * 移动端首页
 * 使用Mobile UI组件，提供原生APP级体验
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
    }));
  }, [data]);

  // 准备内容区块
  const sections = useMemo(() => {
    const result = [];
    
    if (data?.hotMovies) {
      result.push({
        title: '热门电影',
        items: data.hotMovies.slice(0, 10).map((item) => ({
          poster: resolveCardPosterUrl(item.poster),
          title: item.title,
          href: `/play?source=douban&id=${item.id}`,
          subtitle: item.year || '',
        })),
      });
    }

    if (data?.hotTvShows) {
      result.push({
        title: '热播剧集',
        items: data.hotTvShows.slice(0, 10).map((item) => ({
          poster: resolveCardPosterUrl(item.poster),
          title: item.title,
          href: `/play?source=douban&id=${item.id}`,
          subtitle: item.year || '',
        })),
      });
    }

    if (data?.hotAnime) {
      result.push({
        title: '动漫',
        items: data.hotAnime.slice(0, 10).map((item) => ({
          poster: resolveCardPosterUrl(item.poster),
          title: item.title,
          href: `/play?source=douban&id=${item.id}`,
          subtitle: item.year || '',
        })),
      });
    }

    if (data?.hotShortDramas) {
      result.push({
        title: '短剧',
        items: data.hotShortDramas.slice(0, 10).map((item) => ({
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
      {/* Hero Banner */}
      <MobileHeroBanner items={heroItems} />

      {/* 内容区块 */}
      {sections.map((section, sIndex) => (
        <section key={sIndex} className="py-4">
          <div className="flex items-center justify-between px-4 mb-3">
            <h2 className="text-lg font-bold text-white">{section.title}</h2>
            <button className="text-sm text-[#f4c24d]">更多</button>
          </div>
          
          <div className="flex gap-3 overflow-x-auto px-4 pb-2 snap-x snap-mandatory">
            {section.items.map((item, iIndex) => (
              <div key={iIndex} className="flex-shrink-0 w-[45vw] snap-start">
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

      {/* 加载状态 */}
      {isLoading && (
        <div className="flex justify-center py-8">
          <div className="w-8 h-8 border-2 border-[#f4c24d] border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </MobileLayout>
  );
}
