'use client';

import {
  type ComponentPropsWithoutRef,
  forwardRef,
  type ReactNode,
} from 'react';

import { cn } from '@/lib/utils';

export const GlassPanel = forwardRef<
  HTMLDivElement,
  ComponentPropsWithoutRef<'div'>
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        'rounded-[28px] border border-black/6 bg-white/70 shadow-[0_20px_50px_rgba(15,23,42,0.08)] backdrop-blur-xl dark:border-white/8 dark:bg-white/[0.05]',
        className,
      )}
      {...props}
    />
  );
});

GlassPanel.displayName = 'GlassPanel';

export function PillGroup({
  className,
  ...props
}: ComponentPropsWithoutRef<'div'>) {
  return (
    <div
      className={cn(
        'inline-flex max-w-full items-center gap-1 rounded-full border border-black/6 bg-white/50 p-1 shadow-[0_10px_22px_rgba(15,23,42,0.05)] backdrop-blur-md dark:border-white/8 dark:bg-white/5',
        className,
      )}
      {...props}
    />
  );
}

type PillButtonProps = ComponentPropsWithoutRef<'button'> & {
  active?: boolean;
};

export function PillButton({
  active = false,
  className,
  type = 'button',
  ...props
}: PillButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'rounded-full px-4 py-2 text-sm font-medium transition-all duration-200',
        active
          ? 'bg-linear-to-r from-[#f4c24d] via-[#f0b938] to-[#d89c18] text-[#171717] shadow-[0_10px_24px_rgba(244,194,77,0.28)]'
          : 'border border-black/6 bg-white/75 text-gray-700 hover:bg-gray-100 dark:border-white/8 dark:bg-white/6 dark:text-gray-300 dark:hover:bg-white/10',
        className,
      )}
      {...props}
    />
  );
}

export function PanelField({
  className,
  ...props
}: ComponentPropsWithoutRef<'input'>) {
  return (
    <input
      className={cn(
        'w-full rounded-2xl border border-black/6 bg-white/85 px-4 py-3 text-sm text-gray-700 shadow-[0_12px_28px_rgba(15,23,42,0.08)] transition-all duration-300 placeholder:text-gray-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-green-400 dark:border-white/8 dark:bg-white/8 dark:text-gray-300 dark:placeholder:text-gray-500 dark:focus:ring-green-500',
        className,
      )}
      {...props}
    />
  );
}

export function PanelSelect({
  className,
  children,
  ...props
}: ComponentPropsWithoutRef<'select'> & { children: ReactNode }) {
  return (
    <select
      className={cn(
        'w-full rounded-2xl border border-black/6 bg-white/85 px-4 py-3 text-sm text-gray-700 shadow-[0_12px_28px_rgba(15,23,42,0.08)] transition-all duration-300 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-green-400 dark:border-white/8 dark:bg-white/8 dark:text-gray-300 dark:focus:ring-green-500',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}
