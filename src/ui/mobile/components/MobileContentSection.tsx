'use client';

import { ReactNode, useRef, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import Link from 'next/link';

interface MobileContentSectionProps {
  title: string;
  href?: string;
  children: ReactNode;
  variant?: 'grid' | 'scroll';
}

/**
 * 移动端内容区块
 * 支持网格和横向滚动两种布局
 */
export default function MobileContentSection({ 
  title, 
  href, 
  children, 
  variant = 'scroll' 
}: MobileContentSectionProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <section className="py-4">
      {/* 标题栏 */}
      <div className="flex items-center justify-between px-4 mb-3">
        <h2 className="text-lg font-bold text-white">{title}</h2>
        {href && (
          <Link href={href} className="flex items-center gap-1 text-sm text-[#f4c24d]">
            更多
            <ChevronRight className="w-4 h-4" />
          </Link>
        )}
      </div>

      {/* 内容区域 */}
      {variant === 'scroll' ? (
        <div 
          ref={scrollRef}
          className="flex gap-3 overflow-x-auto px-4 pb-2 snap-x snap-mandatory scrollbar-hide"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {children}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 px-4">
          {children}
        </div>
      )}
    </section>
  );
}
