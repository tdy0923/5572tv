import { memo, useCallback, useEffect, useRef, useState } from 'react';

interface ScrollableRowProps {
  children: React.ReactNode;
  scrollDistance?: number;
  enableAnimation?: boolean;
  enableVirtualization?: boolean;
}

function ScrollableRow({
  children,
  scrollDistance = 1000,
  enableAnimation,
  enableVirtualization,
}: ScrollableRowProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(false);

  const updateButtons = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setShowLeft(scrollLeft > 2);
    setShowRight(scrollLeft + clientWidth < scrollWidth - 2);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    updateButtons();
    el.addEventListener('scroll', updateButtons, { passive: true });
    const ro = new ResizeObserver(updateButtons);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', updateButtons);
      ro.disconnect();
    };
  }, [updateButtons]);

  const scrollBy = useCallback(
    (direction: 'left' | 'right') => {
      const prefersReducedMotion =
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      containerRef.current?.scrollBy({
        left: direction === 'right' ? scrollDistance : -scrollDistance,
        behavior: prefersReducedMotion ? 'auto' : 'smooth',
      });
    },
    [scrollDistance],
  );

  return (
    <div className='ui-rail relative group px-1 py-1 sm:px-2 sm:py-2'>
      <div
        ref={containerRef}
        className='flex space-x-4 overflow-x-auto scrollbar-hide snap-x snap-mandatory [&>*]:snap-start px-3 pb-6 pt-3 sm:space-x-6 sm:px-5 sm:pb-12 sm:pt-4'
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {children}
      </div>

      {/* 左箭头按钮 */}
      <button
        onClick={() => scrollBy('left')}
        className={`pointer-coarse:hidden absolute left-1 sm:left-2 top-1/2 -translate-y-1/2 z-50 w-11 h-11 rounded-full bg-white/80 dark:bg-gray-800/80 text-gray-800 dark:text-white shadow-lg flex items-center justify-center transition-opacity duration-200 hover:bg-white dark:hover:bg-gray-700 focus:outline-none ${
          showLeft
            ? 'opacity-100 pointer-events-auto'
            : 'opacity-0 pointer-events-none'
        }`}
        aria-label='向左滚动'
      >
        <svg
          xmlns='http://www.w3.org/2000/svg'
          className='w-5 h-5 sm:w-6 sm:h-6'
          fill='none'
          viewBox='0 0 24 24'
          stroke='currentColor'
          strokeWidth={2}
        >
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            d='M15 19l-7-7 7-7'
          />
        </svg>
      </button>

      {/* 右箭头按钮 */}
      <button
        onClick={() => scrollBy('right')}
        className={`pointer-coarse:hidden absolute right-1 sm:right-2 top-1/2 -translate-y-1/2 z-50 w-11 h-11 rounded-full bg-white/80 dark:bg-gray-800/80 text-gray-800 dark:text-white shadow-lg flex items-center justify-center transition-opacity duration-200 hover:bg-white dark:hover:bg-gray-700 focus:outline-none ${
          showRight
            ? 'opacity-100 pointer-events-auto'
            : 'opacity-0 pointer-events-none'
        }`}
        aria-label='向右滚动'
      >
        <svg
          xmlns='http://www.w3.org/2000/svg'
          className='w-5 h-5 sm:w-6 sm:h-6'
          fill='none'
          viewBox='0 0 24 24'
          stroke='currentColor'
          strokeWidth={2}
        >
          <path strokeLinecap='round' strokeLinejoin='round' d='M9 5l7 7-7 7' />
        </svg>
      </button>
    </div>
  );
}

export default memo(ScrollableRow);
