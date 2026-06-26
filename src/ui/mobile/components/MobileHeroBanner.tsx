'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { processImageUrl } from '@/lib/utils';

interface MobileHeroBannerProps {
  items: { poster: string; title: string; href: string; subtitle?: string }[];
  autoPlayInterval?: number;
}

export default function MobileHeroBanner({ 
  items, 
  autoPlayInterval = 5000 
}: MobileHeroBannerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  // 自动轮播
  useEffect(() => {
    if (items.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % items.length);
    }, autoPlayInterval);
    return () => clearInterval(timer);
  }, [items.length, autoPlayInterval]);

  // 手势处理
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const deltaX = touchStartX.current - e.changedTouches[0].clientX;
    const deltaY = touchStartY.current - e.changedTouches[0].clientY;
    
    // 只在水平滑动时切换（避免与垂直滚动冲突）
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
      if (deltaX > 0) {
        setCurrentIndex((prev) => (prev + 1) % items.length);
      } else {
        setCurrentIndex((prev) => (prev - 1 + items.length) % items.length);
      }
    }
  }, [items.length]);

  if (items.length === 0) return null;

  const currentItem = items[currentIndex];

  return (
    <Link href={currentItem.href} className="block">
      <div 
        className="relative w-full h-[60vh] min-h-[400px] overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* 背景图片 */}
        {items.map((item, index) => (
          <div
            key={index}
            className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
              index === currentIndex ? 'opacity-100 z-10' : 'opacity-0 z-0'
            }`}
          >
            <Image
              src={processImageUrl(item.poster)}
              alt={item.title}
              fill
              className="object-cover"
              priority={index === 0}
            />
          </div>
        ))}
        
        {/* 渐变遮罩 */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent z-20" />
        
        {/* 内容信息 - 底部 */}
        <div className="absolute bottom-0 left-0 right-0 p-5 z-30">
          <div className="max-w-lg">
            <h2 className="text-2xl font-bold text-white mb-2 line-clamp-2">
              {currentItem.title}
            </h2>
            {currentItem.subtitle && (
              <p className="text-sm text-gray-300 mb-4 line-clamp-1">
                {currentItem.subtitle}
              </p>
            )}
            <div className="flex items-center gap-3">
              <span className="px-4 py-2 bg-[#f4c24d] text-black rounded-lg font-semibold text-sm">
                立即播放
              </span>
            </div>
          </div>
        </div>

        {/* 小圆点指示器 - 右侧竖排 */}
        {items.length > 1 && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col gap-1.5 z-30">
            {items.map((_, index) => (
              <div
                key={index}
                className={`rounded-full transition-all duration-300 ${
                  index === currentIndex 
                    ? 'w-1.5 h-4 bg-[#f4c24d]' 
                    : 'w-1.5 h-1.5 bg-white/40'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}
