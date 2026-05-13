'use client';

export default function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse ${className}`}>
      <div className="aspect-[2/3] rounded-xl bg-gray-200 dark:bg-gray-800" />
      <div className="mt-2 space-y-2">
        <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-3/4" />
        <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-1/2" />
      </div>
    </div>
  );
}
