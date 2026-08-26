'use client';

import SkeletonCard from './SkeletonCard';

/**
 * 海报网格加载骨架：与内容网格同布局（2/3/4/5/6 列），避免大转圈造成的突兀感
 */
export default function PosterGridSkeleton({
  count = 20,
  cols = 'grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6',
}: {
  count?: number;
  cols?: string;
}) {
  return (
    <div className={`grid gap-3 sm:gap-4 ${cols}`}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}
