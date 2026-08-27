'use client';

import React from 'react';

import { easing, radius } from '@/lib/fluent-tokens';

interface FluentTooltipProps {
  content: React.ReactNode;
  children: React.ReactElement;
  position?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
  className?: string;
}

export function FluentTooltip({
  content,
  children,
  position = 'top',
  delay = 200,
  className = '',
}: FluentTooltipProps) {
  const [visible, setVisible] = React.useState(false);
  const [delayed, setDelayed] = React.useState(false);
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = () => {
    timerRef.current = setTimeout(() => {
      setDelayed(true);
      setVisible(true);
    }, delay);
  };

  const hide = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setVisible(false);
    setDelayed(false);
  };

  const positionClasses: Record<FluentTooltipProps['position'], string> = {
    top: 'bottom-full mb-1.5',
    bottom: 'top-full mt-1.5',
    left: 'right-full mr-1.5',
    right: 'left-full ml-1.5',
  };

  const arrowPositionClasses: Record<FluentTooltipProps['position'], string> = {
    top: 'bottom-0 translate-y-1/2',
    bottom: 'top-0 -translate-y-1/2',
    left: 'right-0 translate-x-1/2',
    right: 'left-0 -translate-x-1/2',
  };

  return (
    <div
      className={`relative inline-block ${className}`}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {React.cloneElement(
        children as React.ReactElement<React.AllHTMLAttributes<HTMLElement>>,
        {
          tabIndex: 0,
          'aria-describedby': visible ? 'fluent-tooltip' : undefined,
        },
      )}
      {visible && (
        <div
          id='fluent-tooltip'
          role='tooltip'
          className={`
            absolute z-[50] w-max max-w-xs
            px-2.5 py-1.5 rounded-lg
            text-xs font-medium
            transition-[opacity,transform]
            shadow-lg
            pointer-events-none
            ${positionClasses[position]}
            ${delayed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-0.5'}
            ${position === 'top' || position === 'bottom' ? 'left-1/2 -translate-x-1/2' : ''}
            ${position === 'left' || position === 'right' ? 'top-1/2 -translate-y-1/2' : ''}
          `}
          style={{
            backgroundColor: '#1f1f1f',
            color: '#ffffff',
            transitionDuration: '150ms',
            transitionTimingFunction: easing.standard,
            borderRadius: radius.md,
          }}
        >
          <div className='max-h-20 overflow-hidden'>{content}</div>
          <span
            className={`
              absolute w-2 h-2 rotate-45
              ${arrowPositionClasses[position]}
            `}
            style={{
              backgroundColor: '#1f1f1f',
            }}
          />
        </div>
      )}
    </div>
  );
}
