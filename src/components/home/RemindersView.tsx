'use client';

import { UseMutateFunction } from '@tanstack/react-query';
import { Bell, BellOff, Trash2 } from 'lucide-react';
import dynamic from 'next/dynamic';

import { requestNotificationPermission } from '@/lib/reminder-notification';

const VideoCard = dynamic(() => import('@/components/VideoCard'), {
  ssr: false,
  loading: () => (
    <div className='aspect-[2/3] rounded-xl bg-gray-200 dark:bg-gray-700 animate-pulse' />
  ),
});
const ConfirmDialog = dynamic(() =>
  import('@/components/ConfirmDialog').then((m) => ({
    default: m.ConfirmDialog,
  })),
);

export interface ReminderItem {
  id: string;
  source: string;
  title: string;
  year?: string;
  poster: string;
  episodes: number;
  source_name: string;
  search_title?: string;
  origin?: 'vod' | 'live' | 'shortdrama';
  type?: string;
  releaseDate?: string;
  remarks?: string;
}

interface RemindersViewProps {
  reminderItems: ReminderItem[];
  reminderFilter: 'all' | 'upcoming' | 'today' | 'released';
  setReminderFilter: (
    filter: 'all' | 'upcoming' | 'today' | 'released',
  ) => void;
  today: string;
  notifPermission: NotificationPermission | 'unsupported';
  clearRemindersMutation: UseMutateFunction<any, Error, void, unknown>;
  showClearRemindersDialog: boolean;
  setShowClearRemindersDialog: (show: boolean) => void;
  requireClearConfirmation: boolean;
}

export default function RemindersView({
  reminderItems,
  reminderFilter,
  setReminderFilter,
  today,
  notifPermission,
  clearRemindersMutation,
  showClearRemindersDialog,
  setShowClearRemindersDialog,
  requireClearConfirmation,
}: RemindersViewProps) {
  return (
    <section className='mb-8 rounded-xl sm:rounded-[24px] border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-md backdrop-blur-sm sm:p-5'>
      <div className='mb-6 flex items-center justify-between'>
        <div className='flex items-center gap-2'>
          <h2 className='text-xl font-bold text-gray-800 dark:text-gray-200'>
            我想看
          </h2>
          {notifPermission !== 'unsupported' && (
            <button
              className={`rounded-full p-1.5 transition-colors ${
                notifPermission === 'granted'
                  ? 'text-green-500'
                  : 'text-gray-400 hover:text-amber-500'
              }`}
              onClick={async () => {
                await requestNotificationPermission();
              }}
              title={
                notifPermission === 'granted'
                  ? '浏览器通知已开启'
                  : notifPermission === 'denied'
                    ? '浏览器通知已关闭，请在浏览器设置中开启'
                    : '点击开启浏览器通知'
              }
            >
              {notifPermission === 'granted' ? (
                <Bell className='h-4 w-4' />
              ) : (
                <BellOff className='h-4 w-4' />
              )}
            </button>
          )}
        </div>
        {reminderItems.length > 0 && (
          <button
            className='ui-control flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-600 hover:text-white dark:text-red-400 dark:hover:bg-red-500 dark:hover:text-white'
            onClick={() => {
              if (requireClearConfirmation) {
                setShowClearRemindersDialog(true);
              } else {
                clearRemindersMutation();
              }
            }}
          >
            <Trash2 className='w-4 h-4' />
            <span>清空想看</span>
          </button>
        )}
      </div>

      {reminderItems.length > 0 && (
        <div className='mb-4 flex flex-wrap gap-2'>
          {[
            { key: 'all' as const, label: '全部' },
            { key: 'upcoming' as const, label: '即将上映' },
            { key: 'today' as const, label: '今日上映' },
            { key: 'released' as const, label: '已上映' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setReminderFilter(key)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-200 ${
                reminderFilter === key
                  ? 'bg-linear-to-r from-[#f4c24d] via-[#f0b938] to-[#d89c18] text-[#171717] shadow-md'
                  : 'border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-white dark:bg-gray-800'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      <div className='justify-start grid grid-cols-2 sm:grid-cols-3 gap-x-2 gap-y-6 sm:gap-y-10 px-2 sm:px-2 sm:grid-cols-[repeat(auto-fill,_minmax(11rem,_1fr))] sm:gap-x-8'>
        {(() => {
          let filtered = reminderItems;
          if (reminderFilter === 'upcoming') {
            filtered = reminderItems.filter((item) => {
              if (!item.releaseDate) return false;
              return item.releaseDate > today;
            });
          } else if (reminderFilter === 'today') {
            filtered = reminderItems.filter((item) => {
              if (!item.releaseDate) return false;
              return item.releaseDate === today;
            });
          } else if (reminderFilter === 'released') {
            filtered = reminderItems.filter((item) => {
              if (!item.releaseDate) return false;
              return item.releaseDate < today;
            });
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
                  from='reminder'
                  remarks={calculatedRemarks}
                  releaseDate={item.releaseDate}
                />
              </div>
            );
          });
        })()}
        {reminderItems.length === 0 && (
          <div className='col-span-full flex flex-col items-center justify-center py-16 px-4'>
            <div className='mb-6 relative'>
              <div className='absolute inset-0 bg-linear-to-r from-orange-300 to-red-300 dark:from-orange-600 dark:to-red-600 opacity-20 blur-3xl rounded-full animate-pulse'></div>
              <svg
                className='w-32 h-32 relative z-10'
                viewBox='0 0 200 200'
                fill='none'
                xmlns='http://www.w3.org/2000/svg'
              >
                <path
                  d='M100 50 L100 120 M100 50 L130 80'
                  className='stroke-gray-400 dark:stroke-gray-500'
                  strokeWidth='8'
                  strokeLinecap='round'
                  strokeLinejoin='round'
                />
                <circle
                  cx='100'
                  cy='100'
                  r='70'
                  className='fill-gray-300 dark:fill-gray-600 stroke-gray-400 dark:stroke-gray-500'
                  strokeWidth='3'
                />
                <path
                  d='M100 50 L100 120 M100 50 L130 80'
                  fill='none'
                  stroke='currentColor'
                  strokeWidth='2'
                  strokeDasharray='5,5'
                  className='text-gray-400 dark:text-gray-500'
                />
              </svg>
            </div>

            <h3 className='text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2'>
              暂无想看内容
            </h3>
            <p className='text-sm text-gray-500 dark:text-gray-400 text-center max-w-xs'>
              发现即将上映的内容，点击 🔔 标记想看吧！
            </p>
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={showClearRemindersDialog}
        title='确认清空想看'
        message={`确定要清空所有想看内容吗？\n\n这将删除 ${reminderItems.length} 项内容，此操作无法撤销。`}
        confirmText='确认清空'
        cancelText='取消'
        variant='danger'
        onConfirm={() => {
          clearRemindersMutation();
          setShowClearRemindersDialog(false);
        }}
        onCancel={() => setShowClearRemindersDialog(false)}
      />
    </section>
  );
}
