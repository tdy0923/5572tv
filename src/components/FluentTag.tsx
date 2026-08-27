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
  const isDefaultVariant = variant === 'default';
  const bg = active
    ? variant === 'primary'
      ? brandColor.gold
      : variant === 'success'
        ? '#22c55e'
        : undefined
    : undefined;
  const color = active
    ? variant === 'primary'
      ? '#000'
      : variant === 'success'
        ? '#fff'
        : undefined
    : undefined;

  const defaultClasses = isDefaultVariant
    ? active
      ? 'bg-gray-200 dark:bg-white/10 border-transparent text-gray-900 dark:text-white'
      : 'bg-gray-100 dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white'
    : '';

  return (
    <span
      onClick={onClick}
      className={`inline-flex items-center gap-1 border transition-colors cursor-pointer select-none ${isDefaultVariant ? defaultClasses : ''} ${className}`}
      style={{
        ...(bg ? { background: bg } : {}),
        ...(color ? { color } : {}),
        borderColor:
          !isDefaultVariant && active
            ? 'transparent'
            : !isDefaultVariant
              ? 'rgba(255,255,255,0.08)'
              : undefined,
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
