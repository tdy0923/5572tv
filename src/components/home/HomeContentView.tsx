'use client';

import { Calendar, ChevronRight, Film, Play, Sparkles, Tv } from 'lucide-react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { DoubanItem } from '@/lib/types';
import { ReleaseCalendarItem, ShortDramaItem } from '@/lib/types';
import { resolveCardPosterUrl, resolvePosterUrl } from '@/lib/utils';

import {
  FluentBadge,
  FluentButton,
  FluentCard,
  FluentEmptyState,
  FluentTag,
} from '@/components/FluentUI';
import HeroBanner from '@/components/HeroBanner';
import { duration, easing, radius, shadow } from '@/lib/fluent-tokens';
const ContinueWatching = dynamic(() => import('@/components/ContinueWatching'));
import PersonalRecommend from '@/components/home/PersonalRecommend';
import LazySection from '@/components/LazySection';
import ScrollableRow from '@/components/ScrollableRow';
import SectionTitle from '@/components/SectionTitle';
import SkeletonCard from '@/components/SkeletonCard';

const VideoCard = dynamic(() => import('@/components/VideoCard'), {
  ssr: false,
  loading: () => <SkeletonCard />,
});
const ShortDramaCard = dynamic(() => import('@/components/ShortDramaCard'), {
  ssr: false,
  loading: () => <SkeletonCard />,
});

interface HomeContentViewProps {
  hotMovies: DoubanItem[];
  hotTvShows: DoubanItem[];
  hotVarietyShows: DoubanItem[];
  hotAnime: DoubanItem[];
  hotShortDramas: ShortDramaItem[];
  upcomingReleases: ReleaseCalendarItem[];
  loading: boolean;
  upcomingFilter: 'all' | 'movie' | 'tv';
  setUpcomingFilter: (filter: 'all' | 'movie' | 'tv') => void;
  today: string;
}

export default function HomeContentView({
  hotMovies,
  hotTvShows,
  hotVarietyShows,
  hotAnime,
  hotShortDramas,
  upcomingReleases,
  loading,
  upcomingFilter,
  setUpcomingFilter,
  today,
}: HomeContentViewProps) {
  // 移动端不自动播放 hero 预告片（省流量），仅桌面启用
  const [heroVideoEnabled, setHeroVideoEnabled] = useState(false);
  useEffect(() => {
    const isMobile =
      typeof window !== 'undefined' &&
      window.matchMedia('(max-width: 767px)').matches;
    const disabledByConfig = (window as any).RUNTIME_CONFIG
      ?.DISABLE_HERO_TRAILER;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHeroVideoEnabled(!isMobile && !disabledByConfig);
  }, []);

  return (
    <>
      {(hotMovies.length > 0 ||
        hotTvShows.length > 0 ||
        hotVarietyShows.length > 0 ||
        hotShortDramas.length > 0) && (
        <section
          className='mb-6 -mx-3 overflow-hidden sm:mx-0 md:mb-10'
          style={{
            borderRadius: radius.xl,
            boxShadow: shadow.deep,
            transition: `box-shadow ${duration.normal} ${easing.standard}`,
          }}
        >
          <HeroBanner
            items={[
              ...hotMovies.slice(0, 2).map((movie) => ({
                id: movie.id,
                title: movie.title,
                poster: resolveCardPosterUrl(movie.poster),
                backdrop: movie.backdrop || resolveCardPosterUrl(movie.poster),
                trailerUrl: movie.trailerUrl || undefined,
                description: movie.plot_summary || undefined,
                year: movie.year,
                rate: movie.rate,
                douban_id: Number(movie.id),
                type: 'movie',
              })),
              ...hotTvShows.slice(0, 2).map((show) => ({
                id: show.id,
                title: show.title,
                poster: resolveCardPosterUrl(show.poster),
                backdrop: show.backdrop || resolveCardPosterUrl(show.poster),
                trailerUrl: show.trailerUrl || undefined,
                description: show.plot_summary || undefined,
                year: show.year,
                rate: show.rate,
                douban_id: Number(show.id),
                type: 'tv',
              })),
              ...hotVarietyShows.slice(0, 1).map((show) => ({
                id: show.id,
                title: show.title,
                poster: resolveCardPosterUrl(show.poster),
                backdrop: show.backdrop || resolveCardPosterUrl(show.poster),
                trailerUrl: show.trailerUrl || undefined,
                description: show.plot_summary || undefined,
                year: show.year,
                rate: show.rate,
                douban_id: Number(show.id),
                type: 'variety',
              })),
              ...hotAnime.slice(0, 1).map((anime) => ({
                id: anime.id,
                title: anime.title,
                poster: resolveCardPosterUrl(anime.poster),
                backdrop: anime.backdrop || resolveCardPosterUrl(anime.poster),
                trailerUrl: anime.trailerUrl || undefined,
                description: anime.plot_summary || undefined,
                year: anime.year,
                rate: anime.rate,
                douban_id: Number(anime.id),
                type: 'anime',
              })),
            ]}
            autoPlayInterval={8000}
            showControls={true}
            showIndicators={true}
            enableVideo={heroVideoEnabled}
          />
        </section>
      )}

      {/* 继续观看：有播放记录才渲染（空态自返回 null） */}
      <div className='mb-8 md:mb-10'>
        <ContinueWatching />
      </div>

      {/* 猜你喜欢：基于播放历史的主流类型推荐（未登录/无记录自动隐藏） */}
      <PersonalRecommend />

      <LazySection fallbackHeight={280}>
        <FluentCard
          variant='default'
          className='mb-8 md:mb-10 !p-0 !overflow-hidden'
          padding='0'
        >
          <section className='p-4 sm:p-5'>
            <div className='mb-4 flex items-center justify-between'>
              <SectionTitle
                title='即将上映'
                icon={Calendar}
                iconColor='text-orange-500'
                kicker='Coming Soon'
                index='01'
              />
              <Link href='/release-calendar'>
                <FluentButton
                  variant='ghost'
                  size='sm'
                  icon={<ChevronRight className='h-4 w-4' />}
                >
                  更多内容
                </FluentButton>
              </Link>
            </div>

          <div className='mb-4 flex flex-wrap gap-2'>
            {[
              { key: 'all', label: '全部', count: upcomingReleases.length },
              {
                key: 'movie',
                label: '电影',
                count: upcomingReleases.filter((r) => r.type === 'movie')
                  .length,
              },
              {
                key: 'tv',
                label: '电视剧',
                count: upcomingReleases.filter((r) => r.type === 'tv').length,
              },
            ].map(({ key, label, count }) => (
              <FluentTag
                key={key}
                label={`${label}${count > 0 ? ` (${count})` : ''}`}
                active={upcomingFilter === key}
                variant={upcomingFilter === key ? 'primary' : 'default'}
                onClick={() => setUpcomingFilter(key as 'all' | 'movie' | 'tv')}
              />
            ))}
          </div>

          <ScrollableRow enableVirtualization={true}>
            {upcomingReleases
              .filter(
                (release) =>
                  upcomingFilter === 'all' || release.type === upcomingFilter,
              )
              .map((release, index) => {
                const releaseDate = release.releaseDate;

                let remarksText;
                if (releaseDate < today) {
                  const releaseParts = releaseDate.split('-').map(Number);
                  const todayParts = today.split('-').map(Number);
                  const releaseMs = new Date(
                    releaseParts[0],
                    releaseParts[1] - 1,
                    releaseParts[2],
                  ).getTime();
                  const todayMs = new Date(
                    todayParts[0],
                    todayParts[1] - 1,
                    todayParts[2],
                  ).getTime();
                  const daysAgo = Math.floor(
                    (todayMs - releaseMs) / (1000 * 60 * 60 * 24),
                  );
                  remarksText = `已上映${daysAgo}天`;
                } else if (releaseDate === today) {
                  remarksText = '今日上映';
                } else {
                  const releaseParts = releaseDate.split('-').map(Number);
                  const todayParts = today.split('-').map(Number);
                  const releaseMs = new Date(
                    releaseParts[0],
                    releaseParts[1] - 1,
                    releaseParts[2],
                  ).getTime();
                  const todayMs = new Date(
                    todayParts[0],
                    todayParts[1] - 1,
                    todayParts[2],
                  ).getTime();
                  const daysUntil = Math.ceil(
                    (releaseMs - todayMs) / (1000 * 60 * 60 * 24),
                  );
                  remarksText = `${daysUntil}天后上映`;
                }

                return (
                  <div
                    key={`${release.id}-${index}`}
                    className='min-w-[120px] w-[120px] sm:min-w-[180px] sm:w-44'
                  >
                    <VideoCard
                      source='upcoming_release'
                      id={release.id}
                      source_name='即将上映'
                      from='douban'
                      title={release.title}
                      poster={resolvePosterUrl(
                        release.cover,
                        '/placeholder-poster.jpg',
                      )}
                      year={release.releaseDate.split('-')[0]}
                      type={release.type}
                      remarks={remarksText}
                      releaseDate={release.releaseDate}
                      query={release.title}
                      episodes={
                        release.episodes ||
                        (release.type === 'tv' ? undefined : 1)
                      }
                    />
                  </div>
                );
              })}
          </ScrollableRow>
          </section>
        </FluentCard>
      </LazySection>
      <FluentCard variant='default' className='mb-8 md:mb-10 home-section !p-0 !overflow-hidden' padding='0'>
        <section className='p-4 sm:p-5'>
        <div className='mb-4 flex items-center justify-between'>
          <SectionTitle
            title='热门电影'
            icon={Film}
            iconColor='text-red-500'
            kicker='Trending'
            index='02'
          />
          <Link href='/douban?type=movie'>
            <FluentButton variant='ghost' size='sm' icon={<ChevronRight className='h-4 w-4' />}>
              更多内容
            </FluentButton>
          </Link>
        </div>
        <ScrollableRow enableVirtualization={true}>
          {loading
            ? Array.from({ length: 4 }).map((_, index) => (
                <SkeletonCard key={index} />
              ))
            : hotMovies.map((movie, index) => (
                <div
                  key={movie.id}
                  className='min-w-[120px] w-[120px] sm:min-w-[180px] sm:w-44'
                >
                  <VideoCard
                    from='douban'
                    source='douban'
                    id={movie.id}
                    source_name='豆瓣'
                    title={movie.title}
                    poster={resolveCardPosterUrl(movie.poster)}
                    douban_id={Number(movie.id)}
                    year={movie.year}
                    type='movie'
                    priority={index < 3}
                  />
                </div>
              ))}
        </ScrollableRow>
        </section>
      </FluentCard>
      <LazySection>
        <FluentCard variant='default' className='mb-8 md:mb-10 home-section !p-0 !overflow-hidden' padding='0'>
          <section className='p-4 sm:p-5'>
          <div className='mb-4 flex items-center justify-between'>
            <SectionTitle
              title='热门剧集'
              icon={Tv}
              iconColor='text-blue-500'
              kicker='Series'
              index='03'
            />
            <Link href='/douban?type=tv'>
              <FluentButton variant='ghost' size='sm' icon={<ChevronRight className='h-4 w-4' />}>
                更多内容
              </FluentButton>
            </Link>
          </div>
          <ScrollableRow enableVirtualization={true}>
            {loading
              ? Array.from({ length: 4 }).map((_, index) => (
                  <SkeletonCard key={index} />
                ))
              : hotTvShows.map((show, index) => (
                  <div
                    key={show.id}
                    className='min-w-[120px] w-[120px] sm:min-w-[180px] sm:w-44'
                  >
                    <VideoCard
                      from='douban'
                      source='douban'
                      id={show.id}
                      source_name='豆瓣'
                      title={show.title}
                      poster={resolveCardPosterUrl(show.poster)}
                      douban_id={Number(show.id)}
                      year={show.year}
                      type='tv'
                      priority={index < 3}
                    />
                  </div>
                ))}
          </ScrollableRow>
          </section>
        </FluentCard>
      </LazySection>
      <LazySection>
        <FluentCard variant='default' className='mb-8 home-section !p-0 !overflow-hidden' padding='0'>
          <section className='p-4 sm:p-5'>
          <div className='mb-4 flex items-center justify-between'>
            <SectionTitle
              title='热门短剧'
              icon={Play}
              iconColor='text-orange-500'
              kicker='Short Drama'
              index='04'
            />
            <Link href='/shortdrama'>
              <FluentButton variant='ghost' size='sm' icon={<ChevronRight className='h-4 w-4' />}>
                更多内容
              </FluentButton>
            </Link>
          </div>
          <ScrollableRow enableVirtualization={true}>
            {loading
              ? Array.from({ length: 4 }).map((_, index) => (
                  <SkeletonCard key={index} />
                ))
              : hotShortDramas.map((drama, index) => (
                  <ShortDramaCard
                    key={drama.id}
                    drama={drama}
                    className='min-w-[120px] w-[120px] sm:min-w-[180px] sm:w-44'
                    disableEpisodeFetch
                    priority={index < 3}
                  />
                ))}
          </ScrollableRow>
          </section>
        </FluentCard>
      </LazySection>
      <LazySection>
        <FluentCard variant='default' className='mb-8 md:mb-10 home-section !p-0 !overflow-hidden' padding='0'>
          <section className='p-4 sm:p-5'>
          <div className='mb-4 flex items-center justify-between'>
            <SectionTitle
              title='热门综艺'
              icon={Sparkles}
              iconColor='text-pink-500'
              kicker='Variety'
              index='05'
            />
            <Link href='/douban?type=show'>
              <FluentButton variant='ghost' size='sm' icon={<ChevronRight className='h-4 w-4' />}>
                更多内容
              </FluentButton>
            </Link>
          </div>
          <ScrollableRow enableVirtualization={true}>
            {loading
              ? Array.from({ length: 4 }).map((_, index) => (
                  <SkeletonCard key={index} />
                ))
              : hotVarietyShows.map((show, index) => (
                  <div
                    key={show.id}
                    className='min-w-[120px] w-[120px] sm:min-w-[180px] sm:w-44'
                  >
                    <VideoCard
                      from='douban'
                      source='douban'
                      id={show.id}
                      source_name='豆瓣'
                      title={show.title}
                      poster={resolveCardPosterUrl(show.poster)}
                      douban_id={Number(show.id)}
                      year={show.year}
                      type='variety'
                      priority={index < 3}
                    />
                  </div>
                ))}
          </ScrollableRow>
          </section>
        </FluentCard>
      </LazySection>
      <LazySection>
        <FluentCard variant='default' className='mb-8 md:mb-10 home-section !p-0 !overflow-hidden' padding='0'>
          <section className='p-4 sm:p-5'>
          <div className='mb-4 flex items-center justify-between'>
            <SectionTitle
              title='新番放送'
              icon={Calendar}
              iconColor='text-purple-500'
              kicker='Anime'
              index='06'
            />
            <Link href='/douban?type=anime'>
              <FluentButton variant='ghost' size='sm' icon={<ChevronRight className='h-4 w-4' />}>
                更多内容
              </FluentButton>
            </Link>
          </div>
          <ScrollableRow enableVirtualization={true}>
            {loading
              ? Array.from({ length: 4 }).map((_, index) => (
                  <SkeletonCard key={index} />
                ))
              : hotAnime.map((anime, index) => (
                  <div
                    key={`${anime.id}-${index}`}
                    className='min-w-[120px] w-[120px] sm:min-w-[180px] sm:w-44'
                  >
                    <VideoCard
                      from='douban'
                      source='douban'
                      id={anime.id}
                      source_name='豆瓣'
                      title={anime.title}
                      poster={resolveCardPosterUrl(anime.poster)}
                      douban_id={Number(anime.id)}
                      rate={(anime as any).rate || ''}
                      year={anime.year}
                      type='movie'
                    />
                  </div>
                ))}
          </ScrollableRow>
          </section>
        </FluentCard>
      </LazySection>

      {/* 下载 CTA — FluentCard brand depth */}
      <FluentCard
        variant='filled'
        hoverable
        className='mb-6 -mx-3 sm:mx-0 sm:mb-8 !p-0 overflow-hidden'
        padding='0'
      >
        <a
          href='/download'
          className='flex items-center justify-between p-4 sm:p-5 text-white'
          style={{
            background: 'linear-gradient(135deg, #f4c24d 0%, #d89c18 100%)',
            borderRadius: radius.xl,
            transition: `transform ${duration.fast} ${easing.standard}`,
          }}
        >
          <div className='flex items-center gap-3'>
            <div
              className='flex h-10 w-10 items-center justify-center bg-white/20 backdrop-blur-sm'
              style={{ borderRadius: radius.lg, boxShadow: shadow.light }}
            >
              <img src='/icons/icon.svg' alt='5572' className='h-7 w-7 rounded' />
            </div>
            <div>
              <h3 className='text-sm font-bold text-[#171717] sm:text-base'>
                下载 5572 影视 APP
              </h3>
              <p className='text-xs text-[#171717]/70'>更好的观影体验，支持离线缓存</p>
            </div>
          </div>
          <FluentBadge variant='default' size='sm' rounded>
            <ChevronRight className='h-4 w-4' />
          </FluentBadge>
        </a>
      </FluentCard>
    </>
  );
}
