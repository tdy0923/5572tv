'use client';

import { useRippleEffect } from '@/hooks/useRippleEffect';

interface RippleButtonProps {
  children: React.ReactNode;
  className?: string;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  [key: string]: any;
}

export default function RippleButton({
  children,
  className = '',
  onClick,
  ...props
}: RippleButtonProps) {
  const { ripples, handlePointerDown } = useRippleEffect();

  return (
    <button
      className={`relative overflow-hidden ${className}`}
      onPointerDown={handlePointerDown}
      onClick={onClick}
      {...props}
    >
      {children}
      {ripples.map((r) => (
        <span
          key={r.id}
          className='pointer-events-none absolute rounded-full animate-ripple'
          style={{
            left: r.x,
            top: r.y,
            width: r.size,
            height: r.size,
            backgroundColor: 'rgba(244, 194, 77, 0.3)',
          }}
        />
      ))}
    </button>
  );
}
