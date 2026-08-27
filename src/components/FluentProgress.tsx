'use client';

import React from 'react';

import { brandColor } from '@/lib/fluent-tokens';

interface FluentProgressProps {
  value: number;
  max?: number;
  label?: string;
  showValue?: boolean;
  className?: string;
  color?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function FluentProgress({
  value,
  max = 100,
  label,
  showValue = true,
  className = '',
  color,
  size = 'md',
}: FluentProgressProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  const trackColor = color || brandColor.gold;

  const heightMap: Record<FluentProgressProps['size'], string> = {
    sm: '3px',
    md: '5px',
    lg: '8px',
  };

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {label && (
        <div className='flex items-center justify-between'>
          <span className='text-xs font-medium' style={{ color: '#9ca3af' }}>
            {label}
          </span>
          {showValue && (
            <span className='text-xs font-mono' style={{ color: '#6b7280' }}>
              {value} / {max}
            </span>
          )}
        </div>
      )}
      <div
        className='w-full rounded-full overflow-hidden bg-gray-200 dark:bg-white/10'
        style={{
          height: heightMap[size],
          position: 'relative',
        }}
      >
        <div
          className='h-full rounded-full transition-all duration-150'
          style={{
            width: `${percentage}%`,
            backgroundColor: trackColor,
            transition: 'width 150ms cubic-bezier(0, 0, 0, 1)',
          }}
        />
      </div>
    </div>
  );
}
