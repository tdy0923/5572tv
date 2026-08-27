'use client';

interface FluentDividerProps {
  orientation?: 'horizontal' | 'vertical';
  className?: string;
  size?: string;
}

export function FluentDivider({
  orientation = 'horizontal',
  className = '',
  size = '1px',
}: FluentDividerProps) {
  if (orientation === 'horizontal') {
    return (
      <hr
        className={`
          border-0 h-[1px]
          bg-[rgba(255,255,255,0.08)]
          my-4
          ${className}
        `}
        style={{ height: size }}
      />
    );
  }

  return (
    <div
      className={`
        w-[1px] h-full
        bg-[rgba(255,255,255,0.08)]
        mx-3
        ${className}
      `}
      style={{ width: size }}
    />
  );
}
