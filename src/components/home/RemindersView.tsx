'use client';

import { UseMutateFunction } from '@tanstack/react-query';
import { Bell, BellOff, Trash2 } from 'lucide-react';
import dynamic from 'next/dynamic';

import { requestNotificationPermission } from '@/lib/reminder-notification';
import { FluentButton, FluentEmptyState, FluentTag } from '@/components/FluentUI';
import { radius, shadow } from '@/lib/fluent-tokens';

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
    <section
      className='mb-8 overflow-hidden rounded-2xl border bg-white p-4 backdrop-blur-sm sm:p-5 dark:bg-white/[0.03] sm:rounded-2xl'
      style={{ borderColor: 'var(--color-stroke-subtle)', boxShadow: shadow.light, borderRadius: radius.xl }}
    >
      <div className='mb-6 flex items-center justify-between'>
        <div className='flex items-center gap-2'>
          <h2 className='text-[15px] font-semibold' style={{ color: 'var(--color-foreground)' }}>
            我想看
          </h2>
          {notifPermission !== 'unsupported' && (
            <button
              className={`rounded-full p-2 transition-colors ${
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
          <FluentButton
            variant='ghost'
            size='sm'
            icon={<Trash2 className='h-4 w-4' />}
            onClick={() => {
              if (requireClearConfirmation) {
                setShowClearRemindersDialog(true);
              } else {
                clearRemindersMutation();
              }
            }}
            className='rounded-full border-red-200 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10'
          >
            清空想看
          </FluentButton>
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
            <FluentTag
              key={key}
              label={label}
              active={reminderFilter === key}
              variant='primary'
              onClick={() => setReminderFilter(key)}
            />
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
          <div className='col-span-full'>
            <FluentEmptyState
              icon={<Bell className='h-6 w-6' style={{ color: '#9ca3af' }} />}
              title='暂无想看内容'
              description='发现即将上映的内容，点击 🔔 标记想看吧！'
            />
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
