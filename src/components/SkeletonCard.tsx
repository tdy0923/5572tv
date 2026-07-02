'use client';

import FluentSkeleton from './FluentSkeleton';

export default function SkeletonCard({
  className = '',
}: {
  className?: string;
}) {
  return (
    <div className={`space-y-3 ${className}`}>
      <FluentSkeleton height='200px' borderRadius='8px' />
      <FluentSkeleton width='70%' height='16px' />
      <FluentSkeleton width='40%' height='12px' />
    </div>
  );
}
