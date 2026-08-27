'use client';

import React from 'react';

import { duration, easing, radius } from '@/lib/fluent-tokens';

interface FluentSelectProps extends Omit<
  React.SelectHTMLAttributes<HTMLSelectElement>,
  'prefix' | 'suffix' | 'style'
> {
  variant?: 'default' | 'filled';
  label?: string;
  error?: string;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
  fullWidth?: boolean;
  options: Array<{ value: string; label: React.ReactNode; disabled?: boolean }>;
}

export function FluentSelect({
  variant = 'default',
  label,
  error,
  prefix,
  suffix,
  fullWidth = false,
  options,
  className = '',
  id,
  ...props
}: FluentSelectProps) {
  const selectId =
    id || (label ? `fluent-select-${label.replace(/\s+/g, '-')}` : undefined);
  const isError = Boolean(error);

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {label && (
        <label
          htmlFor={selectId}
          className='text-sm font-medium text-[#9ca3af]'
        >
          {label}
        </label>
      )}
      <div className='relative flex items-center'>
        {prefix && (
          <span className='absolute left-3 text-[#9ca3af] flex items-center z-10'>
            {prefix}
          </span>
        )}
        <select
          id={selectId}
          className={`
            block w-full border
            appearance-none
            pr-8
            focus:outline-none focus:ring-2 focus:ring-offset-1
            disabled:opacity-50 disabled:cursor-not-allowed
            cursor-pointer
            ${isError ? 'border-[#ef4444]' : ''}
          `}
          style={{
            padding: `${prefix ? '10px 14px 10px 2.5rem' : '10px 14px'}`,
            fontSize: '14px',
            color: '#ffffff',
            borderRadius: radius.lg,
            borderColor: isError ? '#ef4444' : 'rgba(255,255,255,0.12)',
            backgroundColor:
              variant === 'filled'
                ? 'rgba(255,255,255,0.08)'
                : 'rgba(255,255,255,0.05)',
            transition: `all ${duration.fast} ${easing.standard}`,
            width: fullWidth ? '100%' : undefined,
            paddingRight: suffix ? '2.5rem' : '2rem',
          }}
          aria-invalid={isError ? 'true' : 'false'}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} disabled={opt.disabled}>
              {String(opt.label)}
            </option>
          ))}
        </select>
        {suffix ? (
          <span className='absolute right-3 text-[#9ca3af] flex items-center pointer-events-none'>
            {suffix}
          </span>
        ) : (
          <span className='absolute right-3 text-[#9ca3af] flex items-center pointer-events-none'>
            <svg
              width='12'
              height='8'
              viewBox='0 0 12 8'
              fill='none'
              stroke='currentColor'
              strokeWidth='1.5'
              strokeLinecap='round'
              strokeLinejoin='round'
            >
              <path d='M1 1.5l5 5 5-5' />
            </svg>
          </span>
        )}
      </div>
      {error && (
        <span
          id={`${selectId}-error`}
          className='text-xs text-[#ef4444]'
          role='alert'
        >
          {error}
        </span>
      )}
    </div>
  );
}
