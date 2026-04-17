import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  Children,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import AnimatedCardGrid from '@/components/AnimatedCardGrid';

interface ScrollableRowProps {
  children: React.ReactNode;
  scrollDistance?: number;
  enableAnimation?: boolean;
  enableVirtualization?: boolean; // 启用虚拟化（仅当子元素很多时）
}

function ScrollableRow({
  children,
  scrollDistance = 1000,
  enableAnimation = false,
  enableVirtualization = false,
}: ScrollableRowProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [showLeftScroll, setShowLeftScroll] = useState(false);
  const [showRightScroll, setShowRightScroll] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const checkScrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 20 });

  // 使用 useMemo 缓存 children 数量，减少不必要的 effect 触发
  const childrenCount = useMemo(() => Children.count(children), [children]);

  const checkScroll = useCallback(() => {
    if (containerRef.current) {
      const { scrollWidth, clientWidth, scrollLeft } = containerRef.current;

      // 计算是否需要左右滚动按钮
      const threshold = 1; // 容差值，避免浮点误差
      const canScrollRight =
        scrollWidth - (scrollLeft + clientWidth) > threshold;
      const canScrollLeft = scrollLeft > threshold;

      setShowRightScroll((prev) =>
        prev !== canScrollRight ? canScrollRight : prev,
      );
      setShowLeftScroll((prev) =>
        prev !== canScrollLeft ? canScrollLeft : prev,
      );

      // 虚拟化：精确计算可见范围（参考 react-window 实现）
      if (enableVirtualization && containerRef.current.children.length > 0) {
        const overscan = 2;
        const viewportStart = scrollLeft;
        const viewportEnd = scrollLeft + clientWidth;

        let startIndexVisible = 0;
        let stopIndexVisible = childrenCount - 1;

        // 查找第一个可见元素
        for (let i = 0; i < containerRef.current.children.length; i++) {
          const child = containerRef.current.children[i] as HTMLElement;
          const offsetLeft = child.offsetLeft;
          const offsetWidth = child.offsetWidth;

          if (offsetLeft + offsetWidth > viewportStart) {
            startIndexVisible = i;
            break;
          }
        }

        // 查找最后一个可见元素
        for (
          let i = startIndexVisible;
          i < containerRef.current.children.length;
          i++
        ) {
          const child = containerRef.current.children[i] as HTMLElement;
          const offsetLeft = child.offsetLeft;

          if (offsetLeft >= viewportEnd) {
            stopIndexVisible = i - 1;
            break;
          }
        }

        const start = Math.max(0, startIndexVisible - overscan);
        const end = Math.min(childrenCount, stopIndexVisible + overscan + 1);

        setVisibleRange((prev) => {
          if (prev.start !== start || prev.end !== end) {
            return { start, end };
          }
          return prev;
        });
      }
    }
  }, [enableVirtualization, childrenCount]);

  // 虚拟化：只渲染可见范围内的子元素
  const visibleChildren = useMemo(() => {
    if (!enableVirtualization || childrenCount <= 20) {
      return children; // 少于20个元素，不需要虚拟化
    }

    const childArray = Children.toArray(children);
    return childArray.slice(visibleRange.start, visibleRange.end);
  }, [enableVirtualization, children, childrenCount, visibleRange]);

  useEffect(() => {
    // 延迟检查，确保内容已完全渲染
    if (checkScrollTimeoutRef.current) {
      clearTimeout(checkScrollTimeoutRef.current);
      checkScrollTimeoutRef.current = null;
    }
    checkScrollTimeoutRef.current = setTimeout(() => {
      checkScroll();
    }, 100);

    // 监听窗口大小变化（使用防抖）
    let resizeTimeout: ReturnType<typeof setTimeout> | undefined;
    const handleResize = () => {
      if (resizeTimeout) {
        clearTimeout(resizeTimeout);
      }
      resizeTimeout = setTimeout(checkScroll, 200); // 增加防抖时间从150ms到200ms
    };

    window.addEventListener('resize', handleResize, { passive: true }); // 使用 passive 优化

    // 只在子元素超过20个时才使用 ResizeObserver（减少性能开销）
    let resizeObserver: ResizeObserver | null = null;
    if (childrenCount > 20) {
      resizeObserver = new ResizeObserver(() => {
        // 使用防抖来减少不必要的检查
        if (checkScrollTimeoutRef.current) {
          clearTimeout(checkScrollTimeoutRef.current);
          checkScrollTimeoutRef.current = null;
        }
        checkScrollTimeoutRef.current = setTimeout(checkScroll, 150);
      });

      if (containerRef.current) {
        resizeObserver.observe(containerRef.current);
      }
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      resizeObserver?.disconnect();
      if (resizeTimeout) {
        clearTimeout(resizeTimeout);
      }
      if (checkScrollTimeoutRef.current) {
        clearTimeout(checkScrollTimeoutRef.current);
      }
    };
  }, [childrenCount, checkScroll]);

  const handleScrollRightClick = useCallback(() => {
    if (containerRef.current) {
      containerRef.current.scrollBy({
        left: scrollDistance,
        behavior: 'smooth',
      });
    }
  }, [scrollDistance]);

  const handleScrollLeftClick = useCallback(() => {
    if (containerRef.current) {
      containerRef.current.scrollBy({
        left: -scrollDistance,
        behavior: 'smooth',
      });
    }
  }, [scrollDistance]);

  return (
    <div
      className='ui-rail relative px-1 py-1 sm:px-2 sm:py-2'
      onMouseEnter={() => {
        setIsHovered(true);
        // 当鼠标进入时重新检查一次
        checkScroll();
      }}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        ref={containerRef}
        className='flex space-x-4 overflow-x-auto scrollbar-hide px-3 pb-10 pt-3 sm:space-x-6 sm:px-5 sm:pb-12 sm:pt-4'
        onScroll={checkScroll}
        style={{
          WebkitOverflowScrolling: 'touch', // iOS 惯性滚动
          willChange: 'scroll-position', // 提示浏览器优化滚动
          transform: 'translateZ(0)', // 启用 GPU 硬件加速
        }}
      >
        {enableAnimation ? (
          <AnimatedCardGrid className='flex space-x-6'>
            {visibleChildren}
          </AnimatedCardGrid>
        ) : (
          visibleChildren
        )}
      </div>
      {showLeftScroll && (
        <div
          className={`hidden sm:flex absolute left-0 top-0 bottom-0 w-16 items-center justify-center z-600 transition-opacity duration-200 ${
            isHovered ? 'opacity-100' : 'opacity-0'
          }`}
          style={{
            background: 'transparent',
            pointerEvents: 'none', // 允许点击穿透
          }}
        >
          <div
            className='absolute inset-0 flex items-center justify-center'
            style={{
              top: '40%',
              bottom: '60%',
              left: '-4.5rem',
              pointerEvents: isHovered ? 'auto' : 'none', // 隐藏时禁用pointer事件
            }}
          >
            <button
              onClick={handleScrollLeftClick}
              className='flex h-12 w-12 items-center justify-center rounded-full border border-black/6 bg-white/90 shadow-[0_18px_36px_rgba(15,23,42,0.14)] transition-transform hover:scale-105 hover:bg-white dark:border-white/10 dark:bg-[#161b23]/92 dark:hover:bg-[#1c2430]'
            >
              <ChevronLeft className='w-6 h-6 text-gray-600 dark:text-gray-300' />
            </button>
          </div>
        </div>
      )}

      {showRightScroll && (
        <div
          className={`hidden sm:flex absolute right-0 top-0 bottom-0 w-16 items-center justify-center z-600 transition-opacity duration-200 ${
            isHovered ? 'opacity-100' : 'opacity-0'
          }`}
          style={{
            background: 'transparent',
            pointerEvents: 'none', // 允许点击穿透
          }}
        >
          <div
            className='absolute inset-0 flex items-center justify-center'
            style={{
              top: '40%',
              bottom: '60%',
              right: '-4.5rem',
              pointerEvents: isHovered ? 'auto' : 'none', // 隐藏时禁用pointer事件
            }}
          >
            <button
              onClick={handleScrollRightClick}
              className='flex h-12 w-12 items-center justify-center rounded-full border border-black/6 bg-white/90 shadow-[0_18px_36px_rgba(15,23,42,0.14)] transition-transform hover:scale-105 hover:bg-white dark:border-white/10 dark:bg-[#161b23]/92 dark:hover:bg-[#1c2430]'
            >
              <ChevronRight className='w-6 h-6 text-gray-600 dark:text-gray-300' />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default memo(ScrollableRow);
