'use client';

import { Calendar, ChevronRight, Film, Play, Sparkles, Tv } from 'lucide-react';
import dynamic from 'next/dynamic';
import Link from 'next/link';

import { DoubanItem } from '@/lib/types';
import { ReleaseCalendarItem, ShortDramaItem } from '@/lib/types';
import { resolveCardPosterUrl, resolvePosterUrl } from '@/lib/utils';

import ContinueWatching from '@/components/ContinueWatching';
import HeroBanner from '@/components/HeroBanner';
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
  username: string;
  aiRecommendations: any[];
  aiRecommendLoading: boolean;
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
  username,
  aiRecommendations,
  aiRecommendLoading,
  upcomingFilter,
  setUpcomingFilter,
  today,
}: HomeContentViewProps) {
  return (
    <>
      {(hotMovies.length > 0 ||
        hotTvShows.length > 0 ||
        hotVarietyShows.length > 0 ||
        hotShortDramas.length > 0) && (
        <section className='mb-8 md:mb-10'>
          <HeroBanner
            items={[
              ...hotMovies.slice(0, 2).map((movie) => ({
                id: movie.id,
                title: movie.title,
                poster: resolveCardPosterUrl(movie.poster),
                year: movie.year,
                douban_id: Number(movie.id),
                type: 'movie',
              })),
              ...hotTvShows.slice(0, 2).map((show) => ({
                id: show.id,
                title: show.title,
                poster: resolveCardPosterUrl(show.poster),
                year: show.year,
                douban_id: Number(show.id),
                type: 'tv',
              })),
              ...hotVarietyShows.slice(0, 1).map((show) => ({
                id: show.id,
                title: show.title,
                poster: resolveCardPosterUrl(show.poster),
                year: show.year,
                douban_id: Number(show.id),
                type: 'variety',
              })),
              ...hotAnime.slice(0, 1).map((anime) => ({
                id: anime.id,
                title: anime.title,
                poster: resolveCardPosterUrl(anime.poster),
                year: anime.year,
                douban_id: Number(anime.id),
                type: 'anime',
              })),
            ]}
            autoPlayInterval={8000}
            showControls={true}
            showIndicators={true}
            enableVideo={!(window as any).RUNTIME_CONFIG?.DISABLE_HERO_TRAILER}
          />
        </section>
      )}

      <a
        href='/download'
        className='mb-6 flex items-center justify-between rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 p-4 text-white shadow-lg transition-transform hover:scale-[1.02] sm:mb-8 sm:rounded-2xl sm:p-5'
      >
        <div className='flex items-center gap-3'>
          <div className='flex h-10 w-10 items-center justify-center rounded-lg bg-white dark:bg-gray-800'>
            <Film className='h-5 w-5' />
          </div>
          <div>
            <h3 className='text-sm font-bold sm:text-base'>
              下载 5572 影视 APP
            </h3>
            <p className='text-xs text-white/80'>
              更好的观影体验，支持离线缓存
            </p>
          </div>
        </div>
        <ChevronRight className='h-5 w-5' />
      </a>

      <div className='relative mb-6 sm:mb-10' id='continue-watching'>
        <div className='pointer-events-none absolute inset-x-8 -top-5 h-12 rounded-full bg-linear-to-r from-transparent via-primary-400/10 to-transparent blur-2xl dark:via-primary-300/10' />
        <ContinueWatching className='mb-0' />
      </div>

      {username && (
        <section className='mb-8 md:mb-10'>
          <div className='mb-4 flex items-center justify-between'>
            <SectionTitle
              title='猜你想看'
              icon={Sparkles}
              iconColor='text-purple-500'
            />
            <span className='text-xs text-gray-400 dark:text-gray-500'>
              AI 推荐
            </span>
          </div>
          {aiRecommendLoading ? (
            <ScrollableRow>
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={`skeleton-${i}`}
                  className='min-w-[100px] w-[100px] sm:min-w-[180px] sm:w-44'
                >
                  <div className='aspect-[2/3] rounded-xl bg-gray-200 dark:bg-gray-700 animate-pulse' />
                  <div className='mt-2 h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-3/4' />
                </div>
              ))}
            </ScrollableRow>
          ) : aiRecommendations.length > 0 ? (
            <ScrollableRow>
              {aiRecommendations.map((item: any, index: number) => (
                <div
                  key={item.id || index}
                  className='min-w-[100px] w-[100px] sm:min-w-[180px] sm:w-44'
                >
                  <VideoCard
                    title={item.title || item}
                    poster={item.poster || ''}
                    year={item.year || ''}
                    rate={item.rate || ''}
                    from='douban'
                    source={item.source || 'douban'}
                    id={item.id || ''}
                    type={item.type || 'movie'}
                  />
                </div>
              ))}
            </ScrollableRow>
          ) : (
            <div className='rounded-xl border border-dashed border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-8 text-center'>
              <Sparkles className='mx-auto mb-3 w-8 h-8 text-purple-400/50' />
              <p className='text-sm text-gray-500 dark:text-gray-400'>
                多看几部影片，AI 就会为你推荐
              </p>
            </div>
          )}
        </section>
      )}

      {upcomingReleases.length > 0 && (
        <section className='mb-8 md:mb-10'>
          <div className='mb-4 flex items-center justify-between'>
            <SectionTitle
              title='即将上映'
              icon={Calendar}
              iconColor='text-orange-500'
            />
            <Link
              href='/release-calendar'
              className='flex items-center text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors'
            >
              更多内容
              <ChevronRight className='w-4 h-4 ml-1' />
            </Link>
          </div>

          <div className='mb-4 flex flex-wrap gap-2'>
            {[
              {
                key: 'all',
                label: '全部',
                count: upcomingReleases.length,
              },
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
              <button
                key={key}
                onClick={() => setUpcomingFilter(key as 'all' | 'movie' | 'tv')}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-200 ${
                  upcomingFilter === key
                    ? 'bg-linear-to-r from-[#f4c24d] via-[#f0b938] to-[#d89c18] text-[#171717] shadow-md'
                    : 'border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white'
                }`}
              >
                {label}
                {count > 0 && (
                  <span
                    className={`ml-1.5 text-xs ${
                      upcomingFilter === key
                        ? 'text-white/80'
                        : 'text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    ({count})
                  </span>
                )}
              </button>
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
                    className='min-w-[100px] w-[100px] sm:min-w-[180px] sm:w-44'
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
      )}

      <section className='mb-8 md:mb-10 home-section'>
        <div className='mb-4 flex items-center justify-between'>
          <SectionTitle title='热门电影' icon={Film} iconColor='text-red-500' />
          <Link
            href='/douban?type=movie'
            className='flex items-center text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors'
          >
            更多内容
            <ChevronRight className='w-4 h-4 ml-1' />
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
                  className='min-w-[100px] w-[100px] sm:min-w-[180px] sm:w-44'
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

      <section className='mb-8 md:mb-10 home-section'>
        <div className='mb-4 flex items-center justify-between'>
          <SectionTitle title='热门剧集' icon={Tv} iconColor='text-blue-500' />
          <Link
            href='/douban?type=tv'
            className='flex items-center text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors'
          >
            更多内容
            <ChevronRight className='w-4 h-4 ml-1' />
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
                  className='min-w-[100px] w-[100px] sm:min-w-[180px] sm:w-44'
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

      <section className='mb-8 md:mb-10 home-section'>
        <div className='mb-4 flex items-center justify-between'>
          <SectionTitle
            title='新番放送'
            icon={Calendar}
            iconColor='text-purple-500'
          />
          <Link
            href='/douban?type=anime'
            className='flex items-center text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors'
          >
            更多内容
            <ChevronRight className='w-4 h-4 ml-1' />
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
                  className='min-w-[100px] w-[100px] sm:min-w-[180px] sm:w-44'
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

      <section className='mb-8 md:mb-10 home-section'>
        <div className='mb-4 flex items-center justify-between'>
          <SectionTitle
            title='热门综艺'
            icon={Sparkles}
            iconColor='text-pink-500'
          />
          <Link
            href='/douban?type=show'
            className='flex items-center text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors'
          >
            更多内容
            <ChevronRight className='w-4 h-4 ml-1' />
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
                  className='min-w-[100px] w-[100px] sm:min-w-[180px] sm:w-44'
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

      <section className='mb-8 home-section'>
        <div className='mb-4 flex items-center justify-between'>
          <SectionTitle
            title='热门短剧'
            icon={Play}
            iconColor='text-orange-500'
          />
          <Link
            href='/shortdrama'
            className='flex items-center text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors'
          >
            更多内容
            <ChevronRight className='w-4 h-4 ml-1' />
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
                  className='min-w-[100px] w-[100px] sm:min-w-[180px] sm:w-44'
                  disableEpisodeFetch
                  priority={index < 3}
                />
              ))}
        </ScrollableRow>
      </section>
    </>
  );
}
