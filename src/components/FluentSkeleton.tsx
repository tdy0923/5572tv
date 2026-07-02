'use client';

interface FluentSkeletonProps {
  width?: string;
  height?: string;
  borderRadius?: string;
  lines?: number;
  circle?: boolean;
  className?: string;
}

export default function FluentSkeleton({
  width = '100%',
  height = '20px',
  borderRadius = '4px',
  lines = 1,
  circle = false,
  className = '',
}: FluentSkeletonProps) {
  if (circle) {
    return (
      <div
        className={`animate-[fluent2-shimmer_1.5s_ease-in-out_infinite] ${className}`}
        style={{
          width,
          height: height || width,
          borderRadius: '50%',
          background:
            'linear-gradient(90deg, var(--color-background-muted) 25%, var(--color-background-subtle) 50%, var(--color-background-muted) 75%)',
          backgroundSize: '200% 100%',
        }}
      />
    );
  }

  if (lines <= 1) {
    return (
      <div
        className={`animate-[fluent2-shimmer_1.5s_ease-in-out_infinite] ${className}`}
        style={{
          width,
          height,
          borderRadius,
          background:
            'linear-gradient(90deg, var(--color-background-muted) 25%, var(--color-background-subtle) 50%, var(--color-background-muted) 75%)',
          backgroundSize: '200% 100%',
        }}
      />
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className='animate-[fluent2-shimmer_1.5s_ease-in-out_infinite]'
          style={{
            width: i === lines - 1 ? '60%' : '100%',
            height,
            borderRadius,
            background:
              'linear-gradient(90deg, var(--color-background-muted) 25%, var(--color-background-subtle) 50%, var(--color-background-muted) 75%)',
            backgroundSize: '200% 100%',
          }}
        />
      ))}
    </div>
  );
}

export function FluentSkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div className={`space-y-3 ${className}`}>
      <FluentSkeleton height='200px' borderRadius='8px' />
      <FluentSkeleton width='70%' height='16px' borderRadius='4px' />
      <FluentSkeleton width='40%' height='12px' borderRadius='4px' />
    </div>
  );
}

export function FluentSkeletonAvatar({
  size = 40,
  className = '',
}: {
  size?: number;
  className?: string;
}) {
  return (
    <FluentSkeleton
      width={`${size}px`}
      height={`${size}px`}
      circle
      className={className}
    />
  );
}

export function FluentSkeletonText({
  lines = 3,
  className = '',
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <FluentSkeleton
      lines={lines}
      height='14px'
      borderRadius='4px'
      className={className}
    />
  );
}
