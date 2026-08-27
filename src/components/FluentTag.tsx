'use client';
import React from 'react';

import { brandColor } from '@/lib/fluent-tokens';

type TagVariant = 'default' | 'primary' | 'success';
interface FluentTagProps {
  label: React.ReactNode;
  active?: boolean;
  variant?: TagVariant;
  size?: 'sm' | 'md';
  onClick?: () => void;
  onRemove?: () => void;
  className?: string;
}
export function FluentTag({
  label,
  active,
  variant = 'default',
  size = 'md',
  onClick,
  onRemove,
  className = '',
}: FluentTagProps) {
  const bg = active
    ? variant === 'primary'
      ? brandColor.gold
      : variant === 'success'
        ? '#22c55e'
        : 'rgba(255,255,255,0.08)'
    : 'rgba(255,255,255,0.04)';
  const color = active
    ? variant === 'primary'
      ? '#000'
      : variant === 'success'
        ? '#fff'
        : '#fff'
    : '#9ca3af';
  return (
    <span
      onClick={onClick}
      className={`inline-flex items-center gap-1 border transition-colors cursor-pointer select-none ${className}`}
      style={{
        background: bg,
        color,
        borderColor: active ? 'transparent' : 'rgba(255,255,255,0.08)',
        borderRadius: 999,
        padding: size === 'sm' ? '4px 10px' : '6px 12px',
        fontSize: size === 'sm' ? 12 : 13,
        fontWeight: active ? 600 : 500,
      }}
    >
      {label}
      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          aria-label='remove'
          className='ml-1 rounded-full hover:bg-black/15 w-4 h-4 flex items-center justify-center'
        >
          ×
        </button>
      )}
    </span>
  );
}
