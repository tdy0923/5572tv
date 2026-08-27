'use client';

import React from 'react';

import {
  brandColor,
  duration,
  easing,
  radius,
  shadow,
} from '@/lib/fluent-tokens';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface FluentButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  children: React.ReactNode;
  icon?: React.ReactNode;
}

const variantStyles: Record<ButtonVariant, React.CSSProperties> = {
  primary: {
    backgroundColor: brandColor.gold,
    color: '#000000',
    borderColor: brandColor.gold,
    boxShadow: shadow.medium,
  },
  secondary: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    color: '#ffffff',
    borderColor: 'rgba(255,255,255,0.12)',
  },
  ghost: {
    backgroundColor: 'transparent',
    color: '#ffffff',
    borderColor: 'rgba(255,255,255,0.2)',
  },
  danger: {
    backgroundColor: '#ef4444',
    color: '#ffffff',
    borderColor: '#ef4444',
  },
};

const sizeStyles: Record<ButtonSize, React.CSSProperties> = {
  sm: {
    padding: '6px 12px',
    fontSize: '12px',
    borderRadius: radius.md,
    minHeight: '28px',
  },
  md: {
    padding: '10px 18px',
    fontSize: '14px',
    borderRadius: radius.lg,
    minHeight: '36px',
  },
  lg: {
    padding: '12px 24px',
    fontSize: '16px',
    borderRadius: radius.xl,
    minHeight: '44px',
  },
};

export function FluentButton({
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  children,
  icon,
  disabled,
  className = '',
  style,
  ...props
}: FluentButtonProps) {
  return (
    <button
      className={`
        inline-flex items-center justify-center gap-2
        font-semibold
        border
        cursor-pointer
        select-none
        focus:outline-none focus:ring-2 focus:ring-offset-2
        disabled:opacity-40 disabled:cursor-not-allowed
        touch-manipulation
        ${className}
      `}
      style={{
        transition: `all ${duration.fast} ${easing.standard}`,
        width: fullWidth ? '100%' : undefined,
        ...(disabled ? { opacity: 0.5, cursor: 'not-allowed' } : {}),
        ...variantStyles[variant],
        ...sizeStyles[size],
        ...style,
      }}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span
          className='inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent'
          aria-hidden='true'
        />
      ) : icon ? (
        <span className='flex items-center'>{icon}</span>
      ) : null}
      <span className='whitespace-nowrap'>{children}</span>
    </button>
  );
}

export function FluentButtonGroup({
  children,
  className = '',
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`flex items-center gap-2 flex-wrap ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
