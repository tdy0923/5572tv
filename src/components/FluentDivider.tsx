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
          bg-gray-200 dark:bg-white/10
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
        bg-gray-200 dark:bg-white/10
        mx-3
        ${className}
      `}
      style={{ width: size }}
    />
  );
}
