'use client';

import { useQueryClient } from '@tanstack/react-query';
import { Clock, Trash2 } from 'lucide-react';
import { memo, useEffect, useState } from 'react';

import type { PlayRecord } from '@/lib/db.client';
import { savePlayRecord } from '@/lib/db.client';
import { resolveCardPosterUrl } from '@/lib/utils';
// 🚀 TanStack Query Queries
import {
  useContinueWatchingQuery,
  useWatchingUpdatesQuery,
} from '@/hooks/useContinueWatchingQueries';
// 🚀 TanStack Query Mutations
import { useClearPlayRecordsMutation } from '@/hooks/usePlayRecordsMutations';

import { ConfirmDialog } from '@/components/ConfirmDialog';
import ScrollableRow from '@/components/ScrollableRow';
import SectionTitle from '@/components/SectionTitle';
import VideoCard from '@/components/VideoCard';

interface ContinueWatchingProps {
  className?: string;
}

function parsePlayRecordKey(key: string) {
  const separatorIndex = key.indexOf('+');
  if (separatorIndex === -1) {
    return { source: '', id: key };
  }

  const source = key.slice(0, separatorIndex);
  const id = key.slice(separatorIndex + 1);
  return { source, id };
}

// 🚀 优化方案6：使用React.memo防止不必要的重渲染
function ContinueWatching({ className }: ContinueWatchingProps) {
  const [requireClearConfirmation] = useState(() => {
    if (typeof window === 'undefined') return false;

    const savedRequireClearConfirmation = localStorage.getItem(
      'requireClearConfirmation',
    );
    return savedRequireClearConfirmation !== null
      ? JSON.parse(savedRequireClearConfirmation)
      : false;
  });
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // 🚀 TanStack Query - 播放记录
  const { data: playRecords = [], isLoading: loading } =
    useContinueWatchingQuery();

  // 🚀 TanStack Query - 观看更新（仅当有播放记录时才查询）
  const { data: watchingUpdates = null } = useWatchingUpdatesQuery(
    !loading && playRecords.length > 0,
  );

  // 🚀 TanStack Query - 使用 useMutation 管理清空播放记录操作
  const clearPlayRecordsMutation = useClearPlayRecordsMutation();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (loading || playRecords.length === 0) return;

    const invalidRecords = playRecords.filter((record) => {
      const normalized = resolveCardPosterUrl(record.cover);
      return !record.cover || record.cover !== normalized;
    });

    if (invalidRecords.length === 0) return;

    const timer = window.setTimeout(() => {
      void (async () => {
        await Promise.all(
          invalidRecords.map(async (record) => {
            const { source, id } = parsePlayRecordKey(record.key);
            const fixedCover = resolveCardPosterUrl(record.cover);
            if (!fixedCover || fixedCover === record.cover) return;

            await savePlayRecord(source, id, {
              ...record,
              cover: fixedCover,
            });
          }),
        );

        queryClient.invalidateQueries({ queryKey: ['playRecords'] });
      })();
    }, 1200);

    return () => window.clearTimeout(timer);
  }, [loading, playRecords, queryClient]);

  // 如果没有播放记录，则不渲染组件
  if (!loading && playRecords.length === 0) {
    return null;
  }

  // 计算播放进度百分比
  const getProgress = (record: PlayRecord) => {
    if (record.total_time === 0) return 0;
    return (record.play_time / record.total_time) * 100;
  };

  // 从 key 中解析 source 和 id
  // 检查播放记录是否有新集数更新
  const getNewEpisodesCount = (
    record: PlayRecord & { key: string },
  ): number => {
    if (!watchingUpdates || !watchingUpdates.updatedSeries) return 0;

    const { source, id } = parsePlayRecordKey(record.key);

    // 在watchingUpdates中查找匹配的剧集
    const matchedSeries = watchingUpdates.updatedSeries.find(
      (series) =>
        series.sourceKey === source &&
        series.videoId === id &&
        series.hasNewEpisode,
    );

    return matchedSeries ? matchedSeries.newEpisodes || 0 : 0;
  };

  // 获取最新的总集数（用于显示，不修改原始数据）
  const getLatestTotalEpisodes = (
    record: PlayRecord & { key: string },
  ): number => {
    if (!watchingUpdates || !watchingUpdates.updatedSeries)
      return record.total_episodes;

    const { source, id } = parsePlayRecordKey(record.key);

    // 在watchingUpdates中查找匹配的剧集
    const matchedSeries = watchingUpdates.updatedSeries.find(
      (series) => series.sourceKey === source && series.videoId === id,
    );

    // 如果找到匹配的剧集且有最新集数信息，返回最新集数；否则返回原始集数
    return matchedSeries && matchedSeries.totalEpisodes
      ? matchedSeries.totalEpisodes
      : record.total_episodes;
  };

  // 处理清空所有记录
  const handleClearAll = () => {
    // 🚀 使用 mutation.mutate() 清空播放记录
    // 特性：立即清空 UI（乐观更新），失败时自动回滚
    clearPlayRecordsMutation.mutate();
    setShowConfirmDialog(false);
  };

  return (
    <section
      className={`mb-10 rounded-[30px] border border-black/6 bg-white/34 p-4 shadow-[0_16px_44px_rgba(15,23,42,0.05)] backdrop-blur-sm dark:border-white/8 dark:bg-white/[0.03] sm:p-5 ${className || ''}`}
    >
      <div className='mb-4 flex items-center justify-between'>
        <SectionTitle
          title='继续观看'
          icon={Clock}
          iconColor='text-green-500'
        />
        {!loading && playRecords.length > 0 && (
          <button
            className='inline-flex items-center gap-1.5 rounded-full border border-red-300 bg-white/72 px-3 py-1.5 text-sm font-medium text-red-600 shadow-sm transition-all duration-200 hover:border-red-600 hover:bg-red-600 hover:text-white hover:shadow-md dark:border-red-700 dark:bg-white/[0.04] dark:text-red-400 dark:hover:border-red-500 dark:hover:bg-red-500 dark:hover:text-white'
            onClick={() => {
              // 根据用户设置决定是否显示确认对话框
              if (requireClearConfirmation) {
                setShowConfirmDialog(true);
              } else {
                handleClearAll();
              }
            }}
          >
            <Trash2 className='w-4 h-4' />
            <span>清空</span>
          </button>
        )}
      </div>

      {/* 确认对话框 */}
      <ConfirmDialog
        isOpen={showConfirmDialog}
        title='确认清空'
        message={`确定要清空所有继续观看记录吗？\n\n这将删除 ${playRecords.length} 条播放记录，此操作无法撤销。`}
        confirmText='确认清空'
        cancelText='取消'
        variant='danger'
        onConfirm={handleClearAll}
        onCancel={() => setShowConfirmDialog(false)}
      />
      <ScrollableRow>
        {loading
          ? // 加载状态显示灰色占位数据
            Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className='min-w-[96px] w-24 sm:min-w-[180px] sm:w-44'
              >
                <div className='relative aspect-[2/3] w-full overflow-hidden rounded-lg bg-gray-200 animate-pulse dark:bg-gray-800'>
                  <div className='absolute inset-0 bg-gray-300 dark:bg-gray-700'></div>
                </div>
                <div className='mt-2 h-4 bg-gray-200 rounded animate-pulse dark:bg-gray-800'></div>
                <div className='mt-1 h-3 bg-gray-200 rounded animate-pulse dark:bg-gray-800'></div>
              </div>
            ))
          : // 显示真实数据
            playRecords.map((record, index) => {
              const { source, id } = parsePlayRecordKey(record.key);
              const newEpisodesCount = getNewEpisodesCount(record);
              const latestTotalEpisodes = getLatestTotalEpisodes(record);
              // 优先使用播放记录中保存的 type，否则根据集数判断
              const cardType =
                record.type || (latestTotalEpisodes > 1 ? 'tv' : '');
              return (
                <div
                  key={record.key}
                  className='min-w-[96px] w-24 sm:min-w-[180px] sm:w-44 relative group/card'
                >
                  <div className='relative group-hover/card:z-5 transition-all duration-300'>
                    <VideoCard
                      id={id}
                      title={record.title}
                      poster={resolveCardPosterUrl(record.cover)}
                      year={record.year}
                      source={source}
                      source_name={record.source_name}
                      progress={getProgress(record)}
                      episodes={latestTotalEpisodes}
                      currentEpisode={record.index}
                      query={record.search_title}
                      from='playrecord'
                      type={cardType}
                      remarks={record.remarks}
                      priority={index < 4}
                      douban_id={record.douban_id}
                    />
                  </div>
                  {/* 新集数徽章 - Netflix 统一风格 */}
                  {newEpisodesCount > 0 && (
                    <div className='absolute -right-2 -top-2 z-10 rounded-full border border-red-500/30 bg-red-600 px-2.5 py-1 text-xs font-bold text-white shadow-lg animate-pulse'>
                      +{newEpisodesCount}
                    </div>
                  )}
                </div>
              );
            })}
      </ScrollableRow>
    </section>
  );
}

export default memo(ContinueWatching);
