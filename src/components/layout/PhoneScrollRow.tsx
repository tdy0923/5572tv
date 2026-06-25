'use client';

import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { ReactNode, useRef } from 'react';

interface PhoneScrollRowProps {
  title: string;
  href?: string;
  children: ReactNode;
}

export default function PhoneScrollRow({ title, href, children }: PhoneScrollRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <section className="py-3">
      {/* 标题栏 */}
      <div className="flex items-center justify-between px-4 mb-2">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white">
          {title}
        </h2>
        {href && (
          <Link
            href={href}
            className="flex items-center gap-0.5 text-sm text-green-600 dark:text-green-500"
          >
            更多
            <ChevronRight className="h-4 w-4" />
          </Link>
        )}
      </div>

      {/* 横向滚动区域 */}
      <div
        ref={scrollRef}
        className="flex gap-2 overflow-x-auto px-4 scrollbar-hide snap-x snap-mandatory"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {children}
      </div>
    </section>
  );
}
