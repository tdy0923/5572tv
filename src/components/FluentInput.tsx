'use client';

import React from 'react';

import { motion } from '@/lib/fluent-alias';
import { radius } from '@/lib/fluent-tokens';

export type InputVariant = 'default' | 'filled' | 'underlined';

interface FluentInputProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'prefix' | 'suffix'
> {
  variant?: InputVariant;
  label?: string;
  error?: string;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
  fullWidth?: boolean;
}

export function FluentInput({
  variant = 'default',
  label,
  error,
  prefix,
  suffix,
  fullWidth = false,
  className = '',
  style,
  id,
  ...props
}: FluentInputProps) {
  const inputId =
    id || (label ? `fluent-input-${label.replace(/\s+/g, '-')}` : undefined);

  const baseStyle: React.CSSProperties = {
    borderRadius: radius.lg,
    fontSize: '14px',
    transition: motion.color,
    width: fullWidth ? '100%' : undefined,
  };

  const variantStyleMap: Record<InputVariant, React.CSSProperties> = {
    default: {
      padding: '10px 14px',
      borderWidth: '1px',
    },
    filled: {
      padding: '10px 14px',
      borderWidth: '1px',
      borderColor: 'transparent',
    },
    underlined: {
      padding: '10px 0',
      borderRadius: '0',
      borderWidth: '0 0 1px 0',
    },
  };

  const isError = Boolean(error);

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {label && (
        <label htmlFor={inputId} className='text-sm font-medium text-gray-400'>
          {label}
        </label>
      )}
      <div className='relative flex items-center'>
        {prefix && (
          <span className='absolute left-3 text-gray-400 flex items-center'>
            {prefix}
          </span>
        )}
        <input
          id={inputId}
          className={`
            block w-full border
            bg-white dark:bg-white/5
            text-gray-900 dark:text-white
            border-gray-200 dark:border-white/10
            focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1
            disabled:opacity-50 disabled:cursor-not-allowed
            placeholder:text-gray-400 dark:placeholder:text-gray-500
            ${variant === 'filled' ? '!bg-gray-50 dark:!bg-white/[0.08] !border-transparent' : ''}
            ${variant === 'underlined' ? '!bg-transparent !rounded-none border-b dark:!border-white/20' : ''}
            ${isError ? '!border-red-500' : ''}
          `}
          style={{
            ...baseStyle,
            ...variantStyleMap[variant],
            ...(prefix ? { paddingLeft: '2.5rem' } : {}),
            ...(suffix ? { paddingRight: '2.5rem' } : {}),
            ...style,
          }}
          aria-invalid={isError ? 'true' : 'false'}
          aria-describedby={isError ? `${inputId}-error` : undefined}
          {...props}
        />
        {suffix && (
          <span className='absolute right-3 text-gray-400 flex items-center'>
            {suffix}
          </span>
        )}
      </div>
      {error && (
        <span
          id={`${inputId}-error`}
          className='text-xs text-red-500'
          role='alert'
        >
          {error}
        </span>
      )}
    </div>
  );
}

export function FluentTextArea({
  label,
  error,
  className = '',
  rows = 4,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
  error?: string;
}) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {label && (
        <label htmlFor={props.id} className='text-sm font-medium text-gray-400'>
          {label}
        </label>
      )}
      <textarea
        rows={rows}
        className={`
          w-full rounded-lg border
          bg-white dark:bg-white/5
          border-gray-200 dark:border-white/10
          text-gray-900 dark:text-white
          px-4 py-3 text-sm
          focus:outline-none focus:ring-2 focus:ring-primary-500
          placeholder:text-gray-400 dark:placeholder:text-gray-500
          ${error ? '!border-red-500' : ''}
        `}
        style={{
          transition: motion.color,
        }}
        {...props}
      />
      {error && (
        <span className='text-xs text-red-500' role='alert'>
          {error}
        </span>
      )}
    </div>
  );
}
