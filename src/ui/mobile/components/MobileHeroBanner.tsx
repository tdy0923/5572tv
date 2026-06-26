'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Play } from 'lucide-react';
import { processImageUrl } from '@/lib/utils';

interface HeroItem {
  poster: string;
  title: string;
  href: string;
  subtitle?: string;
  rate?: string;
}

interface MobileHeroBannerProps {
  items: HeroItem[];
  autoPlayInterval?: number;
}

export default function MobileHeroBanner({ 
  items, 
  autoPlayInterval = 6000 
}: MobileHeroBannerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const touchStartX = useRef(0);

  // 自动轮播
  useEffect(() => {
    if (items.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % items.length);
    }, autoPlayInterval);
    return () => clearInterval(timer);
  }, [items.length, autoPlayInterval]);

  // 手势：左右滑动切换
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const delta = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(delta) > 60) {
      setCurrentIndex((prev) => 
        delta > 0 
          ? (prev + 1) % items.length 
          : (prev - 1 + items.length) % items.length
      );
    }
  }, [items.length]);

  if (items.length === 0) return null;
  const item = items[currentIndex];

  return (
    <Link href={item.href} className="block relative">
      <div 
        className="relative w-full h-[65vh] min-h-[420px] overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* 背景图 */}
        <Image
          src={processImageUrl(item.poster)}
          alt={item.title}
          fill
          className="object-cover"
          priority
        />
        
        {/* 渐变遮罩 */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
        
        {/* 内容 */}
        <div className="absolute bottom-0 left-0 right-0 p-5 pb-8">
          <div className="max-w-lg">
            {item.rate && (
              <span className="inline-block px-2 py-0.5 bg-[#f4c24d]/20 text-[#f4c24d] text-xs font-medium rounded mb-2">
                ⭐ {item.rate}
              </span>
            )}
            <h2 className="text-2xl font-bold text-white mb-2">{item.title}</h2>
            {item.subtitle && (
              <p className="text-sm text-gray-300 mb-4">{item.subtitle}</p>
            )}
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-2 px-5 py-2.5 bg-[#f4c24d] text-black rounded-xl font-semibold text-sm min-h-[44px]">
                <Play className="w-4 h-4" fill="black" />
                立即播放
              </span>
            </div>
          </div>
        </div>

        {/* 竖排小圆点 */}
        {items.length > 1 && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col gap-1 z-30">
            {items.map((_, i) => (
              <div
                key={i}
                className={`rounded-full transition-all duration-300 ${
                  i === currentIndex 
                    ? 'w-1 h-5 bg-[#f4c24d]' 
                    : 'w-1 h-1 bg-white/40'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}
