'use client';

import React from 'react';

import { motion, surface } from '@/lib/fluent-alias';
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
    transition: motion.rise,
  };

  const variantClassMap: Record<CardVariant, string> = {
    default: surface.card.className,
    glass: surface.glass.className,
    bordered: 'bg-transparent border-gray-200 dark:border-white/10',
    filled: 'bg-white dark:bg-white/[0.03] border-gray-200 dark:border-white/5',
  };

  // 卡片统一用 shadow8（Fluent elevation：卡片层）
  const shadowStyle: Record<CardVariant, React.CSSProperties> = {
    default: { boxShadow: shadow.shadow8 },
    glass: { boxShadow: shadow.shadow8 },
    bordered: { boxShadow: 'none' },
    filled: { boxShadow: shadow.medium },
  };

  return (
    <div
      className={`
        border overflow-hidden
        ${variantClassMap[variant]}
        ${hoverable ? 'cursor-pointer hover:-translate-y-[1px] active:scale-[0.98]' : ''}
        ${className}
      `}
      style={{
        ...baseStyle,
        ...shadowStyle[variant],
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
      className={`flex items-center justify-between pb-3 mb-3 border-b border-gray-200 dark:border-white/5 ${className}`}
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
      className={`flex items-center justify-between pt-3 mt-3 border-t border-gray-200 dark:border-white/5 ${className}`}
    >
      {children}
    </div>
  );
}
