'use client';

import Image from 'next/image';
import Link from 'next/link';
import { memo } from 'react';
import { processImageUrl } from '@/lib/utils';

interface TVVideoCardProps {
  title: string;
  poster: string;
  href: string;
  subtitle?: string;
  badge?: string;
  isFocused?: boolean;
}

const TVVideoCard = memo(function TVVideoCard({
  title,
  poster,
  href,
  subtitle,
  badge,
  isFocused = false,
}: TVVideoCardProps) {
  return (
    <Link
      href={href}
      className={`group block transition-all duration-200 ${
        isFocused ? 'scale-105 z-10' : 'scale-100'
      }`}
      style={
        isFocused
          ? {
              outline: '3px solid white',
              outlineOffset: '4px',
              borderRadius: '12px',
            }
          : {}
      }
    >
      <div className="relative aspect-[2/3] overflow-hidden rounded-lg bg-gray-800">
        <Image
          src={processImageUrl(poster)}
          alt={title}
          fill
          sizes="200px"
          className="object-cover"
          quality={80}
        />
        
        {/* 焦点高亮效果 */}
        {isFocused && (
          <div className="absolute inset-0 bg-white/10 pointer-events-none" />
        )}
        
        {/* 徽章 */}
        {badge && (
          <div className="absolute top-2 left-2 px-2 py-1 rounded text-xs font-medium bg-green-600 text-white">
            {badge}
          </div>
        )}
      </div>
      
      <div className="mt-2 px-1">
        <h3
          className={`text-lg font-medium line-clamp-1 ${
            isFocused
              ? 'text-white'
              : 'text-gray-300 group-hover:text-white'
          }`}
        >
          {title}
        </h3>
        {subtitle && (
          <p className="text-sm text-gray-400 line-clamp-1 mt-0.5">
            {subtitle}
          </p>
        )}
      </div>
    </Link>
  );
});

export default TVVideoCard;
