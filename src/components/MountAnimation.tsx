'use client';

interface MountAnimationProps {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}

export default function MountAnimation({
  children,
  delay = 0,
  className = '',
}: MountAnimationProps) {
  return (
    <div
      className={`animate-on-mount ${className}`}
      style={delay ? { animationDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}
