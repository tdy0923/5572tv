'use client';

import React from 'react';

import { brandColor, duration, easing } from '@/lib/fluent-tokens';

interface FluentCheckboxProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'type' | 'prefix' | 'suffix' | 'size'
> {
  label?: React.ReactNode;
  error?: string;
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeStyles: Record<
  FluentCheckboxProps['size'],
  { box: string; gap: string }
> = {
  sm: { box: '14px', gap: '8px' },
  md: { box: '18px', gap: '10px' },
  lg: { box: '22px', gap: '12px' },
};

export function FluentCheckbox({
  label,
  error,
  checked,
  onCheckedChange,
  size = 'md',
  className = '',
  id,
  ...props
}: FluentCheckboxProps) {
  const checkboxId =
    id || (typeof label === 'string' ? label.replace(/\s+/g, '-') : undefined);
  const { box, gap } = sizeStyles[size];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.checked;
    if (onCheckedChange) onCheckedChange(newValue);
    props.onChange?.(e);
  };

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <label
        htmlFor={checkboxId}
        className='flex items-center gap-[var(--gap)] cursor-pointer'
        style={{ gap }}
      >
        <span
          className='relative flex items-center justify-center shrink-0 border rounded transition-all'
          style={{
            width: box,
            height: box,
            borderColor: 'rgba(255,255,255,0.2)',
            backgroundColor: checked ? brandColor.gold : 'transparent',
            transition: `all ${duration.fast} ${easing.standard}`,
          }}
        >
          {checked && (
            <svg
              width='10'
              height='8'
              viewBox='0 0 10 8'
              fill='none'
              stroke='#000'
              strokeWidth='2'
              strokeLinecap='round'
              strokeLinejoin='round'
            >
              <path d='M1 4.5l2.5 2.5L9 1.5' />
            </svg>
          )}
        </span>
        <input
          id={checkboxId}
          type='checkbox'
          className='sr-only'
          checked={checked}
          onChange={handleChange}
          aria-invalid={Boolean(error)}
          {...props}
        />
        {label && <span className='text-sm text-[#e5e7eb]'>{label}</span>}
      </label>
      {error && (
        <span
          className='text-xs text-[#ef4444] ml-[calc(var(--box)+var(--gap))]'
          role='alert'
        >
          {error}
        </span>
      )}
    </div>
  );
}

interface FluentRadioProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'type' | 'prefix' | 'suffix' | 'size'
> {
  label?: React.ReactNode;
  value?: string;
  groupName: string;
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function FluentRadio({
  label,
  value,
  groupName,
  checked,
  onCheckedChange,
  size = 'md',
  className = '',
  id,
  ...props
}: FluentRadioProps) {
  const radioId = id || `${groupName}-${value}`;
  const { box, gap } = sizeStyles[size];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.checked;
    if (onCheckedChange) onCheckedChange(newValue);
    props.onChange?.(e);
  };

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <label
        htmlFor={radioId}
        className='flex items-center gap-[var(--gap)] cursor-pointer'
        style={{ gap }}
      >
        <span
          className='relative flex items-center justify-center shrink-0 border rounded-full transition-all'
          style={{
            width: box,
            height: box,
            borderColor: 'rgba(255,255,255,0.2)',
            transition: `all ${duration.fast} ${easing.standard}`,
          }}
        >
          {checked && (
            <span
              className='rounded-full'
              style={{
                width: '8px',
                height: '8px',
                backgroundColor: brandColor.gold,
              }}
            />
          )}
        </span>
        <input
          id={radioId}
          type='radio'
          name={groupName}
          value={value}
          className='sr-only'
          checked={checked}
          onChange={handleChange}
          {...props}
        />
        {label && <span className='text-sm text-[#e5e7eb]'>{label}</span>}
      </label>
    </div>
  );
}
