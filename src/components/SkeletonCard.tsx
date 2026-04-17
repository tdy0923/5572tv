export default function SkeletonCard() {
  return (
    <div className='min-w-[96px] w-24 sm:min-w-[180px] sm:w-44'>
      {/* 海报骨架 */}
      <div className='relative aspect-[2/3] w-full overflow-hidden rounded-[22px] border border-black/6 bg-white/60 shadow-[0_18px_40px_rgba(15,23,42,0.08)] dark:border-white/8 dark:bg-white/6'>
        {/* Shimmer 效果 */}
        <div
          className='absolute inset-0 -translate-x-full animate-shimmer bg-linear-to-r from-transparent via-white/20 to-transparent'
          style={{
            animationDuration: '1.5s',
            animationIterationCount: 'infinite',
          }}
        />
        <div className='absolute inset-0 bg-gray-300 dark:bg-gray-700'></div>
      </div>

      {/* 标题骨架 */}
      <div className='mt-3 space-y-2 px-1'>
        <div className='relative h-4 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800'>
          <div
            className='absolute inset-0 -translate-x-full animate-shimmer bg-linear-to-r from-transparent via-white/20 to-transparent'
            style={{
              animationDuration: '1.5s',
              animationIterationCount: 'infinite',
              animationDelay: '0.1s',
            }}
          />
        </div>
        <div className='relative h-3 w-3/4 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800'>
          <div
            className='absolute inset-0 -translate-x-full animate-shimmer bg-linear-to-r from-transparent via-white/20 to-transparent'
            style={{
              animationDuration: '1.5s',
              animationIterationCount: 'infinite',
              animationDelay: '0.2s',
            }}
          />
        </div>
      </div>
    </div>
  );
}
