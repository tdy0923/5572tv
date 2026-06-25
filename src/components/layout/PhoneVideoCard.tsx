'use client';

import Image from 'next/image';
import Link from 'next/link';
import { memo } from 'react';
import { processImageUrl } from '@/lib/utils';

interface PhoneVideoCardProps {
  title: string;
  poster: string;
  href: string;
  subtitle?: string;
  badge?: string;
  priority?: boolean;
}

const PhoneVideoCard = memo(function PhoneVideoCard({
  title,
  poster,
  href,
  subtitle,
  badge,
  priority = false,
}: PhoneVideoCardProps) {
  return (
    <Link href={href} className="group block">
      <div className="relative aspect-[2/3] overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800">
        <Image
          src={processImageUrl(poster)}
          alt={title}
          fill
          sizes="(max-width: 640px) 50vw, 33vw"
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          priority={priority}
          quality={75}
        />
        
        {/* 渐变遮罩 */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        
        {/* 徽章 */}
        {badge && (
          <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-600 text-white">
            {badge}
          </div>
        )}
      </div>
      
      <div className="mt-1.5 px-0.5">
        <h3 className="text-sm font-medium text-gray-900 dark:text-white line-clamp-1">
          {title}
        </h3>
        {subtitle && (
          <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1 mt-0.5">
            {subtitle}
          </p>
        )}
      </div>
    </Link>
  );
});

export default PhoneVideoCard;
