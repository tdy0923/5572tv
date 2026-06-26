'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Play } from 'lucide-react';
import { processImageUrl } from '@/lib/utils';

interface MobileVideoCardProps {
  title: string;
  poster: string;
  href: string;
  subtitle?: string;
  badge?: string;
  priority?: boolean;
}

export default function MobileVideoCard({
  title,
  poster,
  href,
  subtitle,
  badge,
  priority = false,
}: MobileVideoCardProps) {
  return (
    <Link href={href} className="block">
      <div className="relative aspect-[2/3] overflow-hidden rounded-xl bg-gray-800">
        <Image
          src={processImageUrl(poster)}
          alt={title}
          fill
          sizes="50vw"
          className="object-cover"
          priority={priority}
        />
        
        {/* 播放按钮 */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center">
            <Play className="w-5 h-5 text-white ml-0.5" fill="white" />
          </div>
        </div>

        {/* 徽章 */}
        {badge && (
          <div className="absolute top-2 left-2 px-2 py-0.5 rounded text-[10px] font-medium bg-[#f4c24d] text-black">
            {badge}
          </div>
        )}
      </div>
      
      <div className="mt-2 px-0.5">
        <h3 className="text-sm font-medium text-white line-clamp-1">{title}</h3>
        {subtitle && (
          <p className="text-xs text-gray-400 line-clamp-1 mt-0.5">{subtitle}</p>
        )}
      </div>
    </Link>
  );
}
