'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { processImageUrl } from '@/lib/utils';

interface MobileHeroBannerProps {
  items: { poster: string; title: string; href: string }[];
  autoPlayInterval?: number;
}

export default function MobileHeroBanner({ 
  items, 
  autoPlayInterval = 5000 
}: MobileHeroBannerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [touchStart, setTouchStart] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % items.length);
    }, autoPlayInterval);
    return () => clearInterval(timer);
  }, [items.length, autoPlayInterval]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX);
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const touchEnd = e.changedTouches[0].clientX;
    const diff = touchStart - touchEnd;
    
    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        setCurrentIndex((prev) => (prev + 1) % items.length);
      } else {
        setCurrentIndex((prev) => (prev - 1 + items.length) % items.length);
      }
    }
  }, [touchStart, items.length]);

  if (items.length === 0) return null;

  return (
    <div 
      className="relative w-full h-[50vh] overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {items.map((item, index) => (
        <div
          key={index}
          className={`absolute inset-0 transition-opacity duration-500 ${
            index === currentIndex ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <Image
            src={processImageUrl(item.poster)}
            alt={item.title}
            fill
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
        </div>
      ))}
      
      {/* 指示器 */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
        {items.map((_, index) => (
          <div
            key={index}
            className={`w-2 h-2 rounded-full transition-all ${
              index === currentIndex ? 'bg-[#f4c24d] w-6' : 'bg-white/50'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
