'use client';

import { Film } from 'lucide-react';

import ScrollableRow from '@/components/ScrollableRow';

interface HistoryViewProps {
  historyTimeline: Record<string, any[]>;
}

export default function HistoryView({ historyTimeline }: HistoryViewProps) {
  const entries = Object.entries(historyTimeline);

  return (
    <section className='mb-8 overflow-hidden rounded-xl sm:rounded-[24px] border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-md sm:p-5'>
      <div className='px-4 sm:px-0 pt-4 sm:pt-0 pb-1 flex items-center justify-between'>
        <h2 className='text-xl font-bold text-gray-800 dark:text-gray-200'>
          观看历史
        </h2>
      </div>
      {entries.length === 0 ? (
        <div className='flex flex-col items-center justify-center gap-3 py-12 text-center'>
          <Film className='h-10 w-10 text-gray-300 dark:text-gray-300' />
          <div className='text-sm text-gray-500 dark:text-gray-400'>
            暂无播放记录
          </div>
          <div className='text-xs text-gray-400 dark:text-gray-400'>
            观看过的影视会显示在这里
          </div>
        </div>
      ) : (
        <div className='px-4 sm:px-0 mt-2 space-y-5'>
          {entries.map(([date, items]) => (
            <div key={date}>
              <div className='flex items-center gap-2 mb-2 px-1'>
                <div className='w-2 h-2 rounded-full bg-[#f4c24d]' />
                <h3 className='text-sm font-medium text-gray-500 dark:text-gray-400'>
                  {date}
                </h3>
              </div>
              <ScrollableRow>
                {items.map((item) => (
                  <a
                    key={item.key}
                    href={`/play?source=${encodeURIComponent(item.source || item.key.split('+')[0])}&id=${encodeURIComponent(item.id || item.key.split('+').slice(1).join('+'))}&title=${encodeURIComponent(item.title || '')}`}
                    className='group min-w-[100px] w-[100px] sm:min-w-[180px] sm:w-44'
                  >
                    <div className='aspect-[2/3] rounded-lg bg-gray-100 dark:bg-gray-800 overflow-hidden'>
                      {item.cover ? (
                        <img
                          src={item.cover}
                          alt={item.title}
                          loading='lazy'
                          className='w-full h-full object-cover group-hover:scale-105 transition-transform'
                        />
                      ) : (
                        <div className='w-full h-full flex items-center justify-center text-gray-400'>
                          <Film className='w-8 h-8' />
                        </div>
                      )}
                    </div>
                    <p className='mt-1 text-xs text-gray-700 dark:text-gray-300 line-clamp-1'>
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
