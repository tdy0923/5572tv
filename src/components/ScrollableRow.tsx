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
  enableVirtualization?: boolean;
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
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 20 });

  const childrenCount = useMemo(() => Children.count(children), [children]);

  const rafRef = useRef<number | null>(null);

  const checkScroll = useCallback(() => {
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      if (containerRef.current) {
        const { scrollWidth, clientWidth, scrollLeft } = containerRef.current;
        const threshold = 1;
        const canScrollRight =
          scrollWidth - (scrollLeft + clientWidth) > threshold;
        const canScrollLeft = scrollLeft > threshold;

        setShowRightScroll((prev) =>
          prev !== canScrollRight ? canScrollRight : prev,
        );
        setShowLeftScroll((prev) =>
          prev !== canScrollLeft ? canScrollLeft : prev,
        );

        if (enableVirtualization && containerRef.current.children.length > 0) {
          const overscan = 2;
          const viewportStart = scrollLeft;
          const viewportEnd = scrollLeft + clientWidth;

          let startIndexVisible = 0;
          let stopIndexVisible = childrenCount - 1;

          for (let i = 0; i < containerRef.current.children.length; i++) {
            const child = containerRef.current.children[i] as HTMLElement;
            const offsetLeft = child.offsetLeft;
            const offsetWidth = child.offsetWidth;
            if (offsetLeft + offsetWidth > viewportStart) {
              startIndexVisible = i;
              break;
            }
          }

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
            if (prev.start !== start || prev.end !== end) return { start, end };
            return prev;
          });
        }
      }
    });
  }, [enableVirtualization, childrenCount]);

  const visibleChildren = useMemo(() => {
    if (!enableVirtualization || childrenCount <= 20) return children;
    const childArray = Children.toArray(children);
    return childArray.slice(visibleRange.start, visibleRange.end);
  }, [enableVirtualization, children, childrenCount, visibleRange]);

  useEffect(() => {
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(checkScroll, 100);

    let resizeTimeout: ReturnType<typeof setTimeout> | undefined;
    const handleResize = () => {
      if (resizeTimeout) clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(checkScroll, 200);
    };
    window.addEventListener('resize', handleResize, { passive: true });

    let resizeObserver: ResizeObserver | null = null;
    if (childrenCount > 20) {
      resizeObserver = new ResizeObserver(() => {
        if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
        scrollTimeoutRef.current = setTimeout(checkScroll, 150);
      });
      if (containerRef.current) resizeObserver.observe(containerRef.current);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      resizeObserver?.disconnect();
      if (resizeTimeout) clearTimeout(resizeTimeout);
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [childrenCount, checkScroll]);

  const scrollBy = useCallback(
    (direction: 'left' | 'right') => {
      if (containerRef.current) {
        containerRef.current.scrollBy({
          left: direction === 'right' ? scrollDistance : -scrollDistance,
          behavior: 'smooth',
        });
      }
    },
    [scrollDistance],
  );

  // 点击容器左右半区翻页
  const handleContainerClick = useCallback(
    (e: React.MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const midX = rect.width * 0.3;
      if (clickX < midX && showLeftScroll) {
        scrollBy('left');
      } else if (clickX > rect.width - midX && showRightScroll) {
        scrollBy('right');
      }
    },
    [showLeftScroll, showRightScroll, scrollBy],
  );

  // 滚轮横向滚动
  const handleWheel = useCallback((e: WheelEvent) => {
    if (containerRef.current && Math.abs(e.deltaY) > 0) {
      e.preventDefault();
      containerRef.current.scrollBy({
        left: e.deltaY * 1.5,
        behavior: 'auto',
      });
    }
  }, []);

  // 键盘左右键翻页
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' && showRightScroll) {
        e.preventDefault();
        scrollBy('right');
      } else if (e.key === 'ArrowLeft' && showLeftScroll) {
        e.preventDefault();
        scrollBy('left');
      }
    },
    [showLeftScroll, showRightScroll, scrollBy],
  );

  // 当 hover 或聚焦时绑定键盘/滚轮事件
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    if (isHovered) {
      el.addEventListener('wheel', handleWheel, { passive: false });
      el.addEventListener('keydown', handleKeyDown as EventListener);
      el.tabIndex = 0;
    }

    return () => {
      el.removeEventListener('wheel', handleWheel);
      el.removeEventListener('keydown', handleKeyDown as EventListener);
    };
  }, [isHovered, handleWheel, handleKeyDown]);

  // 首次加载时闪现提示可滚动
  const [firstShow, setFirstShow] = useState(true);
  useEffect(() => {
    if (showRightScroll && firstShow) {
      const timer = setTimeout(() => setFirstShow(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [showRightScroll, firstShow]);

  const showLeft = showLeftScroll && isHovered;
  const showRight = showRightScroll && (isHovered || firstShow);

  return (
    <div
      className='ui-rail relative px-1 py-1 sm:px-2 sm:py-2'
      onMouseEnter={() => {
        setIsHovered(true);
        checkScroll();
      }}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        ref={containerRef}
        className='flex space-x-4 overflow-x-auto scrollbar-hide px-3 pb-6 pt-3 sm:space-x-6 sm:px-5 sm:pb-12 sm:pt-4 cursor-pointer'
        onScroll={checkScroll}
        onClick={handleContainerClick}
        style={{
          WebkitOverflowScrolling: 'touch',
          scrollBehavior: 'smooth',
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

      {/* 左边缘渐变指示器 */}
      <div
        className={`hidden sm:block absolute left-0 top-0 bottom-0 w-16 z-60 transition-opacity duration-300 ${
          showLeft ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        style={{
          background:
            'linear-gradient(to right, rgba(0,0,0,0.4) 0%, transparent 100%)',
        }}
      />

      {/* 右边缘渐变指示器 */}
      <div
        className={`hidden sm:block absolute right-0 top-0 bottom-0 w-16 z-60 transition-opacity duration-300 ${
          showRight ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        style={{
          background:
            'linear-gradient(to left, rgba(0,0,0,0.4) 0%, transparent 100%)',
          animation:
            firstShow && showRightScroll
              ? 'fadeInOut 2s ease-in-out'
              : undefined,
        }}
      />
    </div>
  );
}

export default memo(ScrollableRow);
