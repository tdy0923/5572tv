'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  threshold?: number;
}

export default function PullToRefresh({
  onRefresh,
  children,
  threshold = 80,
}: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [dragging, setDragging] = useState(false);

  const startY = useRef(0);
  const tracking = useRef(false);
  const pullRef = useRef(0);
  const refreshingRef = useRef(false);
  const thresholdRef = useRef(threshold);
  const onRefreshRef = useRef(onRefresh);

  useEffect(() => {
    onRefreshRef.current = onRefresh;
    thresholdRef.current = threshold;
  }, [onRefresh, threshold]);

  const applyDistance = useCallback((v: number) => {
    // 值未变化时跳过 setState：滚动期间 touchmove 每帧触发，
    // 无差别 setState 会造成整页级联渲染（上滑卡顿元凶之一）
    if (pullRef.current === v) return;
    pullRef.current = v;
    setPullDistance(v);
  }, []);

  useEffect(() => {
    const atTop = () => window.scrollY <= 0;

    const onTouchStart = (e: TouchEvent) => {
      if (refreshingRef.current) return;
      // 仅页面在顶部时开始跟踪下拉手势
      if (!atTop()) return;
      startY.current = e.touches[0].clientY;
      tracking.current = true;
      // 延迟到真正下拉时再置 dragging，避免每次点按/上滑都触发渲染
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!tracking.current || refreshingRef.current) return;
      const diff = e.touches[0].clientY - startY.current;
      if (diff > 0) {
        // 拉到一半页面滚动了，放弃接管，交给原生滚动
        if (!atTop()) {
          tracking.current = false;
          applyDistance(0);
          setDragging(false);
          return;
        }
        // 主动接管手势，阻止原生滚动/回弹，避免与下拉冲突
        e.preventDefault();
        if (!dragging) setDragging(true);
        applyDistance(Math.min(diff * 0.5, thresholdRef.current * 1.5));
      } else {
        // 上滑：一次性复位并停止跟踪，之后交给原生滚动
        tracking.current = false;
        setDragging(false);
        applyDistance(0);
      }
    };

    const finishPull = async () => {
      if (!tracking.current) return;
      tracking.current = false;
      setDragging(false);
      const dist = pullRef.current;
      if (dist >= thresholdRef.current && !refreshingRef.current) {
        refreshingRef.current = true;
        setRefreshing(true);
        applyDistance(48);
        try {
          await onRefreshRef.current();
        } finally {
          refreshingRef.current = false;
          setRefreshing(false);
          applyDistance(0);
        }
      } else {
        applyDistance(0);
      }
    };

    const onTouchEnd = () => {
      void finishPull();
    };
    const onTouchCancel = () => {
      tracking.current = false;
      setDragging(false);
      applyDistance(0);
    };

    // React 17+ 将 touchmove 以 passive 方式挂载，preventDefault 无效，
    // 因此这里用原生非 passive 监听器接管手势
    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('touchend', onTouchEnd);
    document.addEventListener('touchcancel', onTouchCancel);
    return () => {
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
      document.removeEventListener('touchcancel', onTouchCancel);
    };
  }, [applyDistance]);

  const progress = Math.min(pullDistance / threshold, 1);

  return (
    <div className='relative'>
      {/* 下拉提示：拖动时跟手，释放/刷新时平滑回弹 */}
      <div
        className='flex items-center justify-center overflow-hidden'
        style={{
          height: refreshing ? 48 : pullDistance,
          transition: dragging ? 'none' : 'height 0.3s ease-out',
        }}
      >
        {refreshing ? (
          <div className='flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400'>
            <svg
              className='animate-spin h-4 w-4'
              viewBox='0 0 24 24'
              fill='none'
            >
              <circle
                className='opacity-25'
                cx='12'
                cy='12'
                r='10'
                stroke='currentColor'
                strokeWidth='4'
              />
              <path
                className='opacity-75'
                fill='currentColor'
                d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z'
              />
            </svg>
            正在刷新...
          </div>
        ) : pullDistance > 10 ? (
          <div
            className='text-sm text-gray-400 dark:text-gray-500 transition-transform'
            style={{ transform: `rotate(${progress * 180}deg)` }}
          >
            <svg
              width='20'
              height='20'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeWidth='2'
              strokeLinecap='round'
              strokeLinejoin='round'
            >
              <polyline points='6 9 12 15 18 9' />
            </svg>
          </div>
        ) : null}
      </div>
      {children}
    </div>
  );
}
