'use client';

import { Download, Pause, Play, Trash2 } from 'lucide-react';
import React from 'react';

import { M3U8DownloadTask } from '@/lib/download';
import { getStreamModeIcon, getStreamModeName } from '@/lib/download';
import { formatTime } from '@/lib/time';

import {
  FluentBadge,
  FluentButton,
  FluentEmptyState,
  FluentProgress,
} from '@/components/FluentUI';

import { useDownload } from '@/contexts/DownloadContext';

import { DownloadSettingsModal } from './DownloadSettingsModal';

export function DownloadPanel() {
  const {
    tasks,
    showDownloadPanel,
    setShowDownloadPanel,
    startTask,
    pauseTask,
    cancelTask,
    retryFailedSegments,
    getProgress,
    settings,
    setSettings,
    streamModeSupport,
  } = useDownload();
  const [showSettings, setShowSettings] = React.useState(false);

  if (!showDownloadPanel) {
    return null;
  }

  const getStatusText = (status: M3U8DownloadTask['status']) => {
    switch (status) {
      case 'ready':
        return '等待中';
      case 'downloading':
        return '下载中';
      case 'pause':
        return '已暂停';
      case 'done':
        return '已完成';
      case 'error':
        return '错误';
      default:
        return '未知';
    }
  };

  const getStatusVariant = (
    status: M3U8DownloadTask['status'],
  ): 'default' | 'info' | 'warning' | 'success' | 'error' => {
    switch (status) {
      case 'ready':
        return 'default';
      case 'downloading':
        return 'info';
      case 'pause':
        return 'warning';
      case 'done':
        return 'success';
      case 'error':
        return 'error';
      default:
        return 'default';
    }
  };

  // 计算下载范围的时间信息
  const getTimeRangeInfo = (task: M3U8DownloadTask) => {
    if (!task.segmentDurations || task.segmentDurations.length === 0) {
      return null;
    }

    const { startSegment, endSegment } = task.rangeDownload;

    // 计算开始时间（累加前面的片段）
    let startTime = 0;
    for (let i = 0; i < startSegment - 1; i++) {
      startTime += task.segmentDurations[i] || 0;
    }

    // 计算结束时间（累加到结束片段）
    let endTime = 0;
    for (let i = 0; i < endSegment; i++) {
      endTime += task.segmentDurations[i] || 0;
    }

    return {
      startTime,
      endTime,
      startFormatted: formatTime(startTime),
      endFormatted: formatTime(endTime),
    };
  };

  return (
    <div className='fixed inset-0 z-65 overflow-y-auto'>
      <div className='flex items-end md:items-center justify-center min-h-screen md:min-h-full p-0 md:p-4'>
        {/* 背景遮罩 */}
        <div
          className='fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity'
          onClick={() => setShowDownloadPanel(false)}
        />

        {/* 模态框内容 */}
        <div className='relative bg-white dark:bg-gray-800 rounded-t-2xl md:rounded-lg shadow-2xl w-full md:max-w-4xl h-fit max-h-[80vh] md:max-h-[85vh] flex flex-col border-t md:border border-gray-200 dark:border-gray-700 overflow-hidden'>
          {/* 标题栏 */}
          <div className='flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700 shrink-0'>
            <h2 className='text-lg sm:text-xl font-bold text-gray-900 dark:text-white'>
              下载任务列表
            </h2>
            <div className='flex items-center gap-2'>
              {/* 设置按钮 */}
              <button
                onClick={() => setShowSettings(true)}
                className='text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors active:scale-95'
                title='下载设置'
              >
                <svg
                  className='w-5 h-5 sm:w-6 sm:h-6'
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth='2'
                    d='M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z'
                  />
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth='2'
                    d='M15 12a3 3 0 11-6 0 3 3 0 016 0z'
                  />
                </svg>
              </button>
              {/* 关闭按钮 */}
              <button
                onClick={() => setShowDownloadPanel(false)}
                className='p-2 rounded-full text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors active:bg-gray-100 dark:active:bg-gray-700 active:scale-95'
              >
                <svg
                  className='w-5 h-5 sm:w-6 sm:h-6'
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth='2'
                    d='M6 18L18 6M6 6l12 12'
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* 任务列表 */}
          <div className='flex-1 overflow-y-auto px-4 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))] space-y-3 sm:px-6 sm:pt-6'>
            {tasks.length === 0 ? (
              <FluentEmptyState
                icon={
                  <Download className='h-6 w-6' style={{ color: '#9ca3af' }} />
                }
                title='暂无下载任务'
                description='在播放页选择“下载”即可离线缓存'
              />
            ) : (
              tasks.map((task) => {
                const progress = getProgress(task.id);
                const timeRange = getTimeRangeInfo(task);
                return (
                  <div
                    key={task.id}
                    className='bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600'
                  >
                    {/* 任务信息 */}
                    <div className='flex items-start justify-between mb-3'>
                      <div className='flex-1 min-w-0'>
                        <h3 className='text-sm font-medium text-gray-900 dark:text-white truncate mb-1'>
                          {task.title}
                        </h3>
                        <p className='text-xs text-gray-500 dark:text-gray-400 truncate'>
                          {task.url}
                        </p>
                      </div>
                      <div className='flex items-center gap-2 ml-4 flex-wrap'>
                        <FluentBadge
                          variant={getStatusVariant(task.status)}
                          size='sm'
                          rounded
                        >
                          {getStatusText(task.status)}
                        </FluentBadge>
                        <span
                          className='text-xs'
                          style={{ color: 'var(--color-foreground-muted)' }}
                        >
                          {task.type}
                        </span>
                        <FluentBadge variant='info' size='sm' rounded>
                          {getStreamModeIcon(settings.streamMode)}{' '}
                          {getStreamModeName(settings.streamMode)}
                        </FluentBadge>
                      </div>
                    </div>

                    <FluentProgress
                      value={progress}
                      max={100}
                      label={
                        task.progress?.message ||
                        `${task.finishNum} / ${task.rangeDownload.targetSegment} 片段` +
                          (timeRange
                            ? task.rangeDownload.startSegment > 1 ||
                              task.rangeDownload.endSegment <
                                task.tsUrlList.length
                              ? ` (范围: ${task.rangeDownload.startSegment}-${task.rangeDownload.endSegment} | 时长: ${timeRange.startFormatted} ~ ${timeRange.endFormatted})`
                              : ` (总时长: ${timeRange.endFormatted})`
                            : '')
                      }
                      showValue={false}
                      size='sm'
                      color={
                        task.status === 'done'
                          ? '#22c55e'
                          : task.status === 'error'
                            ? '#ef4444'
                            : undefined
                      }
                    />
                    <div className='mb-3 mt-1 flex justify-end'>
                      <span
                        className='text-xs font-mono'
                        style={{ color: 'var(--color-foreground-muted)' }}
                      >
                        {progress.toFixed(1)}%
                      </span>
                    </div>

                    {/* 错误信息 */}
                    {task.errorNum > 0 && (
                      <div className='mb-3 flex items-center justify-between'>
                        <div className='text-xs text-red-500 dark:text-red-400'>
                          {task.errorNum} 个片段下载失败
                        </div>
                        <button
                          onClick={() => retryFailedSegments(task.id)}
                          className='text-xs text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 underline'
                        >
                          重试失败片段
                        </button>
                      </div>
                    )}

                    <div className='flex items-center gap-2'>
                      {task.status === 'downloading' && (
                        <FluentButton
                          variant='secondary'
                          size='sm'
                          onClick={() => pauseTask(task.id)}
                          icon={<Pause className='h-3.5 w-3.5' />}
                        >
                          暂停
                        </FluentButton>
                      )}
                      {(task.status === 'pause' ||
                        task.status === 'ready' ||
                        task.status === 'error') && (
                        <FluentButton
                          variant='primary'
                          size='sm'
                          onClick={() => startTask(task.id)}
                          icon={<Play className='h-3.5 w-3.5' />}
                        >
                          {task.status === 'error'
                            ? '重试'
                            : task.status === 'pause'
                              ? '继续'
                              : '开始'}
                        </FluentButton>
                      )}
                      <FluentButton
                        variant='danger'
                        size='sm'
                        onClick={() => cancelTask(task.id)}
                        icon={<Trash2 className='h-3.5 w-3.5' />}
                      >
                        删除
                      </FluentButton>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* 底部统计 */}
          {tasks.length > 0 && (
            <div className='p-4 sm:p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30 shrink-0'>
              <div className='flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm text-gray-600 dark:text-gray-300'>
                <span>总任务数: {tasks.length}</span>
                <span>
                  下载中:{' '}
                  {tasks.filter((t) => t.status === 'downloading').length}
                </span>
                <span>
                  已完成: {tasks.filter((t) => t.status === 'done').length}
                </span>
                <span>
                  已暂停: {tasks.filter((t) => t.status === 'pause').length}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 下载设置模态框 */}
      <DownloadSettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        settings={settings}
        setSettings={setSettings}
        streamModeSupport={streamModeSupport}
      />
    </div>
  );
}
