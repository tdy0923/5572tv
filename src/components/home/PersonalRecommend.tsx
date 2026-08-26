'use client';

import { Sparkles } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { getAuthInfoFromBrowserCookie } from '@/lib/auth';
import { resolveCardPosterUrl } from '@/lib/utils';

import LazySection from '@/components/LazySection';
import ScrollableRow from '@/components/ScrollableRow';
import SectionTitle from '@/components/SectionTitle';
import VideoCard from '@/components/VideoCard';

interface RecommendItem {
  id: string;
  title: string;
  year: string;
  poster: string;
  type: string;
  rating: number;
}

export default function PersonalRecommend() {
  const [items, setItems] = useState<RecommendItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    const auth = getAuthInfoFromBrowserCookie();
    if (!auth?.username) {
      setLoading(false);
      return;
    }
    try {
      const res = await fetch('/api/recommend/personal');
      const data = await res.json();
      setItems(Array.isArray(data.list) ? data.list : []);
    } catch {
      // 静默
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) return null;
  if (items.length === 0) return null;

  return (
    <LazySection>
      <section className='mb-8 md:mb-10 home-section'>
        <div className='mb-4 flex items-center justify-between'>
          <SectionTitle
            title='猜你喜欢'
            icon={Sparkles}
            iconColor='text-purple-500'
            kicker='Personalized'
            index='01'
          />
        </div>
        <ScrollableRow enableVirtualization={true}>
          {items.map((item, index) => (
            <div
              key={item.id}
              className='min-w-[120px] w-[120px] sm:min-w-[180px] sm:w-44'
            >
              <VideoCard
                from='douban'
                source='douban'
                id={item.id}
                source_name='豆瓣'
                title={item.title}
                poster={resolveCardPosterUrl(item.poster)}
                douban_id={Number(item.id)}
                year={item.year}
                type={item.type as 'movie' | 'tv' | 'anime'}
                priority={index < 3}
              />
            </div>
          ))}
        </ScrollableRow>
      </section>
    </LazySection>
  );
}
