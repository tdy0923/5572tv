'use client';

import { UseMutateFunction } from '@tanstack/react-query';
import { Heart, Trash2 } from 'lucide-react';
import dynamic from 'next/dynamic';
import React from 'react';

import {
  FluentBadge,
  FluentButton,
  FluentEmptyState,
  FluentTag,
} from '@/components/FluentUI';

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
  const [showNewGroupInput, setShowNewGroupInput] = React.useState(false);
  const [newGroupName, setNewGroupName] = React.useState('');

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return;
    try {
      await fetch('/api/favorites/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ group: newGroupName.trim(), action: 'add' }),
      });
      setNewGroupName('');
      setShowNewGroupInput(false);
      window.location.reload();
    } catch (e) {
      console.error('创建分组失败:', e);
    }
  };

  const handleDeleteGroup = async (group: string) => {
    if (!confirm(`确定删除分组"${group}"吗？`)) return;
    try {
      await fetch('/api/favorites/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ group, action: 'delete' }),
      });
      if (favoriteGroupFilter === group) {
        setFavoriteGroupFilter('全部');
      }
      window.location.reload();
    } catch (e) {
      console.error('删除分组失败:', e);
    }
  };
  return (
    <section
      className='mb-8 overflow-hidden rounded-2xl border bg-white p-4 shadow-sm sm:p-5 dark:bg-white/[0.03] sm:rounded-2xl'
      style={{ borderColor: 'var(--color-stroke-subtle)' }}
    >
      <div className='mb-4 flex items-center justify-between'>
        <h2
          className='text-[15px] font-semibold'
          style={{ color: 'var(--color-foreground)' }}
        >
          我的收藏
        </h2>
        {favoriteItems.length > 0 && (
          <FluentButton
            variant='ghost'
            size='sm'
            icon={<Trash2 className='h-4 w-4' />}
            onClick={() => {
              if (requireClearConfirmation) {
                setShowClearFavoritesDialog(true);
              } else {
                clearFavoritesMutation();
              }
            }}
            className='rounded-full border-red-200 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10'
          >
            清空收藏
          </FluentButton>
        )}
      </div>

      {favoriteStats && (
        <div className='mb-4 flex flex-wrap gap-2'>
          <FluentBadge variant='default' size='md' rounded>
            共 <strong>{favoriteStats.total}</strong> 项
          </FluentBadge>
          {favoriteStats.movie > 0 && (
            <FluentBadge variant='info' size='md' rounded>
              电影 {favoriteStats.movie}
            </FluentBadge>
          )}
          {favoriteStats.tv > 0 && (
            <FluentBadge variant='default' size='md' rounded>
              剧集 {favoriteStats.tv}
            </FluentBadge>
          )}
          {favoriteStats.anime > 0 && (
            <FluentBadge variant='default' size='md' rounded>
              动漫 {favoriteStats.anime}
            </FluentBadge>
          )}
          {favoriteStats.shortdrama > 0 && (
            <FluentBadge variant='warning' size='md' rounded>
              短剧 {favoriteStats.shortdrama}
            </FluentBadge>
          )}
          {favoriteStats.live > 0 && (
            <FluentBadge variant='error' size='md' rounded>
              直播 {favoriteStats.live}
            </FluentBadge>
          )}
          {favoriteStats.variety > 0 && (
            <FluentBadge variant='warning' size='md' rounded>
              综艺 {favoriteStats.variety}
            </FluentBadge>
          )}
        </div>
      )}

      {favoriteItems.length > 0 && (
        <div className='mb-4'>
          <div className='flex flex-wrap gap-2'>
            <FluentTag
              label='全部'
              active={favoriteGroupFilter === '全部'}
              variant='primary'
              onClick={() => setFavoriteGroupFilter('全部')}
            />
            {favoriteGroups
              .filter((g) => g !== '默认')
              .map((g) => (
                <div key={g} className='group relative'>
                  <FluentTag
                    label={g}
                    active={favoriteGroupFilter === g}
                    variant='primary'
                    onClick={() => setFavoriteGroupFilter(g)}
                    onRemove={() => handleDeleteGroup(g)}
                  />
                </div>
              ))}
            <FluentTag
              label='+ 新建'
              variant='default'
              onClick={() => setShowNewGroupInput(true)}
            />
          </div>
          {showNewGroupInput && (
            <div className='mt-2 flex items-center gap-2'>
              <input
                type='text'
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder='输入分组名称'
                className='flex-1 px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500'
                onKeyDown={(e) => e.key === 'Enter' && handleCreateGroup()}
                autoFocus
              />
              <button
                onClick={handleCreateGroup}
                className='px-3 py-2 text-sm font-medium rounded-lg bg-primary-500 text-[#171717] hover:bg-primary-600 transition-colors'
              >
                创建
              </button>
              <button
                onClick={() => {
                  setShowNewGroupInput(false);
                  setNewGroupName('');
                }}
                className='px-3 py-2 text-sm font-medium rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors'
              >
                取消
              </button>
            </div>
          )}
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
            <FluentTag
              key={key}
              label={label}
              active={favoriteFilter === key}
              variant='primary'
              onClick={() => setFavoriteFilter(key)}
            />
          ))}
        </div>
      )}

      {favoriteItems.length > 0 && (
        <div className='mb-4 flex flex-wrap items-center gap-2 text-sm'>
          <span style={{ color: 'var(--color-foreground-muted)' }}>排序：</span>
          <div className='flex gap-2'>
            {[
              { key: 'recent' as const, label: '最近添加' },
              { key: 'title' as const, label: '标题 A-Z' },
            ].map(({ key, label }) => (
              <FluentTag
                key={key}
                label={label}
                active={favoriteSortBy === key}
                variant='primary'
                onClick={() => setFavoriteSortBy(key)}
              />
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
              <div className='col-span-full'>
                <FluentEmptyState
                  icon={
                    <Heart className='h-6 w-6' style={{ color: '#f87171' }} />
                  }
                  title='收藏夹空空如也'
                  description='快去发现喜欢的影视作品，点击爱心添加到收藏吧！'
                />
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
