'use client';

interface HistoryViewProps {
  historyTimeline: Record<string, any[]>;
}

export default function HistoryView({ historyTimeline }: HistoryViewProps) {
  return (
    <section className='mb-8 rounded-xl sm:rounded-[24px] border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-md backdrop-blur-sm sm:p-5'>
      <div className='mb-6 flex items-center justify-between'>
        <h2 className='text-xl font-bold text-gray-800 dark:text-gray-200'>
          观看历史
        </h2>
      </div>
      <div className='space-y-6'>
        {Object.entries(historyTimeline).length === 0 ? (
          <div className='text-center py-12 text-gray-500 dark:text-gray-400'>
            暂无播放记录
          </div>
        ) : (
          Object.entries(historyTimeline).map(([date, items]) => (
            <div key={date}>
              <div className='flex items-center gap-2 mb-3'>
                <div className='w-2 h-2 rounded-full bg-[#f4c24d]' />
                <h3 className='text-sm font-medium text-gray-500 dark:text-gray-400'>
                  {date}
                </h3>
              </div>
              <div className='grid grid-cols-3 gap-x-2 gap-y-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6'>
                {items.map((item) => (
                  <a
                    key={item.key}
                    href={`/play?source=${encodeURIComponent(item.source || item.key.split('+')[0])}&id=${encodeURIComponent(item.id || item.key.split('+').slice(1).join('+'))}&title=${encodeURIComponent(item.title || '')}`}
                    className='group'
                  >
                    <div className='aspect-[2/3] overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800'>
                      {item.cover ? (
                        <img
                          src={item.cover}
                          alt={item.title}
                          loading='lazy'
                          className='w-full h-full object-cover group-hover:scale-105 transition-transform'
                        />
                      ) : (
                        <div className='w-full h-full flex items-center justify-center text-gray-400 text-2xl'>
                          🎬
                        </div>
                      )}
                    </div>
                    <p className='mt-1 text-xs text-gray-700 dark:text-gray-300 line-clamp-1'>
                      {item.title}
                    </p>
                  </a>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
