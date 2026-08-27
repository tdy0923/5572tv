'use client';

interface FluentBadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info';
  size?: 'sm' | 'md' | 'lg';
  rounded?: boolean;
  className?: string;
  onClick?: React.MouseEventHandler<HTMLSpanElement>;
}

const variantColors: Record<
  NonNullable<FluentBadgeProps['variant']>,
  { bg: string; text: string; border: string }
> = {
  default: {
    bg: '#f3f4f6',
    text: '#6b7280',
    border: '#e5e7eb',
  },
  primary: {
    bg: '#f4c24d',
    text: '#000000',
    border: '#f4c24d',
  },
  success: {
    bg: 'rgba(34,197,94,0.15)',
    text: '#22c55e',
    border: 'rgba(34,197,94,0.3)',
  },
  warning: {
    bg: 'rgba(245,158,11,0.15)',
    text: '#f59e0b',
    border: 'rgba(245,158,11,0.3)',
  },
  error: {
    bg: 'rgba(239,68,68,0.15)',
    text: '#ef4444',
    border: 'rgba(239,68,68,0.3)',
  },
  info: {
    bg: 'rgba(59,130,246,0.15)',
    text: '#3b82f6',
    border: 'rgba(59,130,246,0.3)',
  },
};

const sizeStyles: Record<FluentBadgeProps['size'], string> = {
  sm: 'px-1.5 py-0.5 text-[10px]',
  md: 'px-2 py-0.5 text-xs',
  lg: 'px-3 py-1 text-sm',
};

export function FluentBadge({
  children,
  variant = 'default',
  size = 'md',
  rounded = false,
  className = '',
  onClick,
}: FluentBadgeProps) {
  const colors = variantColors[variant];
  return (
    <span
      className={`
        inline-flex items-center gap-1
        border
        font-medium
        shrink-0
        ${rounded ? 'rounded-full' : 'rounded'}
        ${sizeStyles[size]}
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `}
      style={{
        backgroundColor: colors.bg,
        color: colors.text,
        borderColor: colors.border,
        transition: 'all 150ms cubic-bezier(0, 0, 0, 1)',
      }}
      onClick={onClick}
    >
      {children}
    </span>
  );
}
