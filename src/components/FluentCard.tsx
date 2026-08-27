'use client';

import React from 'react';

import { radius, shadow } from '@/lib/fluent-tokens';

export type CardVariant = 'default' | 'glass' | 'bordered' | 'filled';

interface FluentCardProps {
  variant?: CardVariant;
  children: React.ReactNode;
  className?: string;
  padding?: string;
  hoverable?: boolean;
}

export function FluentCard({
  variant = 'default',
  children,
  className = '',
  padding = '16px',
  hoverable = false,
  ...props
}: FluentCardProps & React.HTMLAttributes<HTMLDivElement>) {
  const baseStyle: React.CSSProperties = {
    borderRadius: radius.xl,
    padding,
    transition: 'all 250ms cubic-bezier(0, 0, 0, 1)',
  };

  const variantStyleMap: Record<CardVariant, React.CSSProperties> = {
    default: {
      background: 'rgba(255,255,255,0.03)',
      borderColor: 'rgba(255,255,255,0.05)',
      boxShadow: shadow.light,
    },
    glass: {
      background: 'rgba(255,255,255,0.05)',
      backdropFilter: 'blur(12px)',
      borderColor: 'rgba(255,255,255,0.1)',
      boxShadow: shadow.light,
    },
    bordered: {
      background: 'transparent',
      borderColor: 'rgba(255,255,255,0.1)',
      boxShadow: 'none',
    },
    filled: {
      background: '#ffffff',
      borderColor: '#e8e8e8',
      boxShadow: shadow.medium,
    },
  };

  return (
    <div
      className={`
        border
        overflow-hidden
        transition-[all]
        duration-250
        ease-out
        ${hoverable ? 'cursor-pointer hover:-translate-y-[1px] active:scale-[0.98]' : ''}
        ${className}
      `}
      style={{
        ...baseStyle,
        ...variantStyleMap[variant],
      }}
      {...props}
    >
      {children}
    </div>
  );
}

interface FluentCardHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export function FluentCardHeader({
  children,
  className = '',
}: FluentCardHeaderProps) {
  return (
    <div
      className={`flex items-center justify-between pb-3 mb-3 border-b border-[rgba(255,255,255,0.06)] ${className}`}
    >
      {children}
    </div>
  );
}

interface FluentCardFooterProps {
  children: React.ReactNode;
  className?: string;
}

export function FluentCardFooter({
  children,
  className = '',
}: FluentCardFooterProps) {
  return (
    <div
      className={`flex items-center justify-between pt-3 mt-3 border-t border-[rgba(255,255,255,0.06)] ${className}`}
    >
      {children}
    </div>
  );
}
