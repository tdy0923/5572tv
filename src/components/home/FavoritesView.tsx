'use client';

import { UseMutateFunction } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';
import dynamic from 'next/dynamic';

const VideoCard = dynamic(() => import('@/components/VideoCard'), {
  ssr: false,
  loading: () => (
    <div className='aspect-[2/3] rounded-xl bg-gray-200 dark:bg-gray-700 animate-[fluent2-shimmer_1.5s_ease-in-out_infinite]' />
  ),
});
const ConfirmDialog = dynamic(() =>
  import('@/components/ConfirmDialog').then((m) => ({
    default: m.ConfirmDialog,
  })),
);

export interface FavoriteItem {
  id: string;
  source: string;
  title: string;
  year?: string;
  poster: string;
  episodes: number;
  source_name: string;
  currentEpisode?: number;
  search_title?: string;
  origin?: 'vod' | 'live';
  type?: string;
  releaseDate?: string;
  remarks?: string;
  group?: string;
}

interface FavoriteStats {
  total: number;
  movie: number;
  tv: number;
  anime: number;
  shortdrama: number;
  live: number;
  variety: number;
}

interface FavoritesViewProps {
  favoriteItems: FavoriteItem[];
  favoriteFilter:
    | 'all'
    | 'movie'
    | 'tv'
    | 'anime'
    | 'shortdrama'
    | 'live'
    | 'variety';
  setFavoriteFilter: (
    filter:
      | 'all'
      | 'movie'
      | 'tv'
      | 'anime'
      | 'shortdrama'
      | 'live'
      | 'variety',
  ) => void;
  favoriteSortBy: 'recent' | 'title' | 'rating';
  setFavoriteSortBy: (sort: 'recent' | 'title' | 'rating') => void;
  favoriteGroupFilter: string;
  setFavoriteGroupFilter: (group: string) => void;
  favoriteGroups: string[];
  favoriteStats: FavoriteStats | null;
  today: string;
  clearFavoritesMutation: UseMutateFunction<any, Error, void, unknown>;
  showClearFavoritesDialog: boolean;
  setShowClearFavoritesDialog: (show: boolean) => void;
  requireClearConfirmation: boolean;
  favoritesLoading: boolean;
}

export default function FavoritesView({
  favoriteItems,
  favoriteFilter,
  setFavoriteFilter,
  favoriteSortBy,
  setFavoriteSortBy,
  favoriteGroupFilter,
  setFavoriteGroupFilter,
  favoriteGroups,
  favoriteStats,
  today,
  clearFavoritesMutation,
  showClearFavoritesDialog,
  setShowClearFavoritesDialog,
  requireClearConfirmation,
  favoritesLoading,
}: FavoritesViewProps) {
  return (
    <section className='mb-8 rounded-xl sm:rounded-[24px] border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-md backdrop-blur-sm sm:p-5'>
      <div className='mb-6 flex items-center justify-between'>
        <h2 className='text-xl font-bold text-gray-800 dark:text-gray-200'>
          我的收藏
        </h2>
        {favoriteItems.length > 0 && (
          <button
            className='ui-control flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-600 hover:text-white dark:text-red-400 dark:hover:bg-red-500 dark:hover:text-white'
            onClick={() => {
              if (requireClearConfirmation) {
                setShowClearFavoritesDialog(true);
              } else {
                clearFavoritesMutation();
              }
            }}
          >
            <Trash2 className='w-4 h-4' />
            <span>清空收藏</span>
          </button>
        )}
      </div>

      {favoriteStats && (
        <div className='mb-4 flex flex-wrap gap-2 text-sm text-gray-600 dark:text-gray-400'>
          <span className='rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1'>
            共{' '}
            <strong className='text-gray-900 dark:text-gray-100'>
              {favoriteStats.total}
            </strong>{' '}
            项
          </span>
          {favoriteStats.movie > 0 && (
            <span className='rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-blue-700 dark:border-blue-800/50 dark:bg-blue-900/20 dark:text-blue-300'>
              电影 {favoriteStats.movie}
            </span>
          )}
          {favoriteStats.tv > 0 && (
            <span className='rounded-full border border-purple-200 bg-purple-50 px-3 py-1 text-purple-700 dark:border-purple-800/50 dark:bg-purple-900/20 dark:text-purple-300'>
              剧集 {favoriteStats.tv}
            </span>
          )}
          {favoriteStats.anime > 0 && (
            <span className='rounded-full border border-pink-200 bg-pink-50 px-3 py-1 text-pink-700 dark:border-pink-800/50 dark:bg-pink-900/20 dark:text-pink-300'>
              动漫 {favoriteStats.anime}
            </span>
          )}
          {favoriteStats.shortdrama > 0 && (
            <span className='rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-rose-700 dark:border-rose-800/50 dark:bg-rose-900/20 dark:text-rose-300'>
              短剧 {favoriteStats.shortdrama}
            </span>
          )}
          {favoriteStats.live > 0 && (
            <span className='rounded-full border border-red-200 bg-red-50 px-3 py-1 text-red-700 dark:border-red-800/50 dark:bg-red-900/20 dark:text-red-300'>
              直播 {favoriteStats.live}
            </span>
          )}
          {favoriteStats.variety > 0 && (
            <span className='rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-orange-700 dark:border-orange-800/50 dark:bg-orange-900/20 dark:text-orange-300'>
              综艺 {favoriteStats.variety}
            </span>
          )}
        </div>
      )}

      {favoriteItems.length > 0 && (
        <div className='mb-4 flex flex-wrap gap-2'>
          <button
            onClick={() => setFavoriteGroupFilter('全部')}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-200 ${
              favoriteGroupFilter === '全部'
                ? 'bg-linear-to-r from-[#a78bfa] via-[#8b5cf6] to-[#7c3aed] text-white shadow-md'
                : 'border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white'
            }`}
          >
            全部
          </button>
          {favoriteGroups.map((g) => (
            <button
              key={g}
              onClick={() => setFavoriteGroupFilter(g)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-200 ${
                favoriteGroupFilter === g
                  ? 'bg-linear-to-r from-[#a78bfa] via-[#8b5cf6] to-[#7c3aed] text-white shadow-md'
                  : 'border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white'
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      )}

      {favoriteItems.length > 0 && (
        <div className='mb-4 flex flex-wrap gap-2'>
          {[
            { key: 'all' as const, label: '全部' },
            { key: 'movie' as const, label: '电影' },
            { key: 'tv' as const, label: '剧集' },
            { key: 'anime' as const, label: '动漫' },
            { key: 'shortdrama' as const, label: '短剧' },
            { key: 'live' as const, label: '直播' },
            { key: 'variety' as const, label: '综艺' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFavoriteFilter(key)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-200 ${
                favoriteFilter === key
                  ? 'bg-linear-to-r from-[#f4c24d] via-[#f0b938] to-[#d89c18] text-[#171717] shadow-md'
                  : 'border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {favoriteItems.length > 0 && (
        <div className='mb-4 flex flex-wrap items-center gap-2 text-sm'>
          <span className='text-gray-600 dark:text-gray-400'>排序：</span>
          <div className='flex gap-2'>
            {[
              { key: 'recent' as const, label: '最近添加' },
              { key: 'title' as const, label: '标题 A-Z' },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFavoriteSortBy(key)}
                className={`rounded-full px-3 py-1.5 transition-colors ${
                  favoriteSortBy === key
                    ? 'bg-linear-to-r from-[#f4c24d] via-[#f0b938] to-[#d89c18] text-[#171717] shadow-md'
                    : 'border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className='justify-start grid grid-cols-2 sm:grid-cols-3 gap-x-2 gap-y-6 sm:gap-y-10 px-2 sm:px-2 sm:grid-cols-[repeat(auto-fill,_minmax(11rem,_1fr))] sm:gap-x-8'>
        {favoritesLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className='aspect-[2/3] rounded-xl bg-gray-200 dark:bg-gray-700 animate-[fluent2-shimmer_1.5s_ease-in-out_infinite]'
            />
          ))
        ) : (
          <>
            {(() => {
              let filtered = favoriteItems;
              if (favoriteGroupFilter !== '全部') {
                filtered = filtered.filter(
                  (item) => (item.group || '默认') === favoriteGroupFilter,
                );
              }
              if (favoriteFilter === 'movie') {
                filtered = filtered.filter((item) => {
                  if (item.type) return item.type === 'movie';
                  if (
                    item.source === 'shortdrama' ||
                    item.source_name === '短剧'
                  )
                    return false;
                  if (item.source === 'bangumi') return false;
                  if (item.origin === 'live') return false;
                  return item.episodes === 1;
                });
              } else if (favoriteFilter === 'tv') {
                filtered = filtered.filter((item) => {
                  if (item.type) return item.type === 'tv';
                  if (
                    item.source === 'shortdrama' ||
                    item.source_name === '短剧'
                  )
                    return false;
                  if (item.source === 'bangumi') return false;
                  if (item.origin === 'live') return false;
                  return item.episodes > 1;
                });
              } else if (favoriteFilter === 'anime') {
                filtered = filtered.filter((item) => {
                  if (item.type) return item.type === 'anime';
                  return item.source === 'bangumi';
                });
              } else if (favoriteFilter === 'shortdrama') {
                filtered = filtered.filter((item) => {
                  if (item.type) return item.type === 'shortdrama';
                  return (
                    item.source === 'shortdrama' || item.source_name === '短剧'
                  );
                });
              } else if (favoriteFilter === 'live') {
                filtered = filtered.filter((item) => item.origin === 'live');
              } else if (favoriteFilter === 'variety') {
                filtered = filtered.filter((item) => {
                  if (item.type) return item.type === 'variety';
                  return false;
                });
              }

              if (favoriteSortBy === 'title') {
                filtered = [...filtered].sort((a, b) =>
                  a.title.localeCompare(b.title, 'zh-CN'),
                );
              }

              return filtered.map((item) => {
                let calculatedRemarks = item.remarks;

                if (item.releaseDate) {
                  const releaseDate = item.releaseDate;

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
                    calculatedRemarks = `已上映${daysAgo}天`;
                  } else if (releaseDate === today) {
                    calculatedRemarks = '今日上映';
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
                    calculatedRemarks = `${daysUntil}天后上映`;
                  }
                }

                return (
                  <div key={item.id + item.source} className='w-full'>
                    <VideoCard
                      query={item.search_title}
                      {...item}
                      from='favorite'
                      remarks={calculatedRemarks}
                    />
                  </div>
                );
              });
            })()}
            {favoriteItems.length === 0 && (
              <div className='col-span-full flex flex-col items-center justify-center py-16 px-4'>
                <div className='mb-6 relative'>
                  <div className='absolute inset-0 bg-linear-to-r from-pink-300 to-purple-300 dark:from-pink-600 dark:to-purple-600 opacity-20 blur-3xl rounded-full animate-[fluent2-shimmer_1.5s_ease-in-out_infinite]'></div>
                  <svg
                    className='w-32 h-32 relative z-10'
                    viewBox='0 0 200 200'
                    fill='none'
                    xmlns='http://www.w3.org/2000/svg'
                  >
                    <path
                      d='M100 170C100 170 30 130 30 80C30 50 50 30 70 30C85 30 95 40 100 50C105 40 115 30 130 30C150 30 170 50 170 80C170 130 100 170 100 170Z'
                      className='fill-gray-300 dark:fill-gray-600 stroke-gray-400 dark:stroke-gray-500 transition-colors duration-300'
                      strokeWidth='3'
                    />
                    <path
                      d='M100 170C100 170 30 130 30 80C30 50 50 30 70 30C85 30 95 40 100 50C105 40 115 30 130 30C150 30 170 50 170 80C170 130 100 170 100 170Z'
                      fill='none'
                      stroke='currentColor'
                      strokeWidth='2'
                      strokeDasharray='5,5'
                      className='text-gray-400 dark:text-gray-500'
                    />
                  </svg>
                </div>

                <h3 className='text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2'>
                  收藏夹空空如也
                </h3>
                <p className='text-sm text-gray-500 dark:text-gray-400 text-center max-w-xs'>
                  快去发现喜欢的影视作品，点击 ❤️ 添加到收藏吧！
                </p>
              </div>
            )}
          </>
        )}
      </div>

      <ConfirmDialog
        isOpen={showClearFavoritesDialog}
        title='确认清空收藏'
        message={`确定要清空所有收藏吗？\n\n这将删除 ${favoriteItems.length} 项收藏，此操作无法撤销。`}
        confirmText='确认清空'
        cancelText='取消'
        variant='danger'
        onConfirm={() => {
          clearFavoritesMutation();
          setShowClearFavoritesDialog(false);
        }}
        onCancel={() => setShowClearFavoritesDialog(false)}
      />
    </section>
  );
}
