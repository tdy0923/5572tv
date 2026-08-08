import FluentSkeleton from '@/components/FluentSkeleton';

const shimmer = 'animate-[fluent2-shimmer_1.5s_ease-in-out_infinite]';

export default function Loading() {
  return (
    <div className='space-y-6' aria-label='页面加载中'>
      {/* 顶部横幅区域骨架 */}
      <div className='space-y-3'>
        <div
          className={`h-5 w-40 rounded-md bg-gray-200 dark:bg-gray-700 ${shimmer}`}
        />
        <div className='flex h-12 items-center rounded-xl border bg-white px-4 dark:border-gray-700 dark:bg-gray-800'>
          <FluentSkeleton width='32px' height='20px' />
          <FluentSkeleton width='160px' height='16px' className='ml-3' />
        </div>
        <div className='flex gap-2'>
          <FluentSkeleton width='72px' height='28px' borderRadius='9999px' />
          <FluentSkeleton width='96px' height='28px' borderRadius='9999px' />
          <FluentSkeleton width='72px' height='28px' borderRadius='9999px' />
          <FluentSkeleton width='72px' height='28px' borderRadius='9999px' />
        </div>
      </div>

      {/* Hero 横幅骨架 */}
      <div
        className={`relative h-[50vh] overflow-hidden rounded-xl bg-gray-200 dark:bg-gray-800 ${shimmer}`}
      />

      {/* 内容区骨架：标题 + 卡片网格 */}
      <div className='space-y-4'>
        <div className='flex items-center justify-between'>
          <div
            className={`h-5 w-24 rounded-md bg-gray-200 dark:bg-gray-700 ${shimmer}`}
          />
          <div
            className={`h-4 w-16 rounded-md bg-gray-200 dark:bg-gray-700 ${shimmer}`}
          />
        </div>
        <div className='grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8'>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className='space-y-2'>
              <FluentSkeleton width='100%' height='150px' borderRadius='12px' />
              <FluentSkeleton width='80%' height='14px' />
            </div>
          ))}
        </div>
      </div>

      <div className='space-y-4'>
        <div className='flex items-center justify-between'>
          <div
            className={`h-5 w-24 rounded-md bg-gray-200 dark:bg-gray-700 ${shimmer}`}
          />
          <div
            className={`h-4 w-16 rounded-md bg-gray-200 dark:bg-gray-700 ${shimmer}`}
          />
        </div>
        <div className='grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8'>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className='space-y-2'>
              <FluentSkeleton width='100%' height='150px' borderRadius='12px' />
              <FluentSkeleton width='80%' height='14px' />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
