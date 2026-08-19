'use client';

import { useInView } from '@/hooks/useInView';

interface LazySectionProps {
  children: React.ReactNode;
  className?: string;
  /** 未进入视口时的占位高度，避免滚动条跳动 */
  fallbackHeight?: number;
}

/**
 * 懒加载区块：滚到视口前约 600px 才挂载真实内容，
 * 减少首屏渲染与水合开销。占位在视口之外，挂载时的
 * 高度变化不会引起用户可见的布局跳动。
 */
export default function LazySection({
  children,
  className,
  fallbackHeight = 240,
}: LazySectionProps) {
  const { ref, isInView } = useInView<HTMLDivElement>({
    rootMargin: '600px 0px',
    threshold: 0,
    triggerOnce: true,
  });

  return (
    <div ref={ref} className={className}>
      {isInView ? children : <div style={{ height: fallbackHeight }} />}
    </div>
  );
}
