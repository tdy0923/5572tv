'use client';

import { Film } from 'lucide-react';

import { FluentEmptyState } from '@/components/FluentUI';
import { useIsHorizontalRail } from '@/components/rail-context';
import ScrollableRow from '@/components/ScrollableRow';

interface HistoryViewProps {
  historyTimeline: Record<string, any[]>;
}

/**
 * 轨道内封面：必须在 ScrollableRow 内部读取 inRail，
 * 外层组件读到的是轨道外的 context（恒 false），故单独成组件。
 */
function HistoryCover({ cover, title }: { cover: string; title: string }) {
  // 轨道内被裁切的图片原生 lazy 不触发（与 VideoCard 同因），必须 eager
  const inRail = useIsHorizontalRail();
  if (!cover) {
    return (
      <div
        className='flex h-full w-full items-center justify-center'
        style={{
          background: 'var(--color-background-subtle)',
        }}
      >
        <Film className='h-8 w-8' style={{ color: '#9ca3af' }} />
      </div>
    );
  }
  return (
    <img
      src={cover}
      alt={title}
      loading={inRail ? 'eager' : 'lazy'}
      className='h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]'
      onError={(e) => {
        // 封面失败兜底，避免破图图标（守卫防止循环触发）
        if (!e.currentTarget.src.endsWith('placeholder-cover.jpg')) {
          e.currentTarget.src = '/placeholder-cover.jpg';
        }
      }}
    />
  );
}

export default function HistoryView({ historyTimeline }: HistoryViewProps) {
  const entries = Object.entries(historyTimeline);

  return (
    <section
      className='mb-8 overflow-hidden rounded-2xl border bg-white p-4 shadow-sm sm:p-5 dark:bg-white/[0.03] sm:rounded-2xl'
      style={{ borderColor: 'var(--color-stroke-subtle)' }}
    >
      <div className='flex items-center justify-between pb-3'>
        <h2
          className='text-[15px] font-semibold'
          style={{ color: 'var(--color-foreground)' }}
        >
          观看历史
        </h2>
        <span
          className='text-xs'
          style={{ color: 'var(--color-foreground-muted)' }}
        >
          {entries.length > 0
            ? `${entries.reduce((a, [, items]) => a + items.length, 0)} 部`
            : ''}
        </span>
      </div>
      {entries.length === 0 ? (
        <FluentEmptyState
          icon={<Film className='h-6 w-6' style={{ color: '#9ca3af' }} />}
          title='暂无播放记录'
          description='观看过的影视会显示在这里'
        />
      ) : (
        <div className='px-4 sm:px-0 mt-2 space-y-5'>
          {entries.map(([date, items]) => (
            <div key={date}>
              <div className='flex items-center gap-2 mb-3 px-1'>
                <span
                  className='h-2 w-2 rounded-full'
                  style={{ background: '#f4c24d' }}
                />
                <h3
                  className='text-xs font-semibold tracking-wide'
                  style={{ color: 'var(--color-foreground-muted)' }}
                >
                  {date}
                </h3>
                <span className='h-px flex-1 bg-gray-200 dark:bg-white/5' />
                <span
                  className='text-xs'
                  style={{ color: 'var(--color-foreground-muted)' }}
                >
                  {items.length} 部
                </span>
              </div>
              <ScrollableRow>
                {items.map((item) => (
                  <a
                    key={item.key}
                    href={`/play?source=${encodeURIComponent(item.source || item.key.split('+')[0])}&id=${encodeURIComponent(item.id || item.key.split('+').slice(1).join('+'))}&title=${encodeURIComponent(item.title || '')}`}
                    className='group min-w-[100px] w-[100px] sm:min-w-[180px] sm:w-44'
                  >
                    <div
                      className='aspect-[2/3] overflow-hidden rounded-xl border bg-white dark:bg-gray-800 transition-all duration-250 ease-out group-hover:-translate-y-0.5 group-hover:shadow-md'
                      style={{
                        borderColor: 'var(--color-stroke-subtle)',
                        boxShadow: 'var(--shadow-2)',
                      }}
                    >
                      <HistoryCover cover={item.cover} title={item.title} />
                    </div>
                    <p
                      className='mt-2 truncate text-xs font-medium transition-colors group-hover:text-primary-600 dark:group-hover:text-primary-400'
                      style={{ color: 'var(--color-foreground)' }}
                    >
                      {item.title}
                    </p>
                  </a>
                ))}
              </ScrollableRow>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
