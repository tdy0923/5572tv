'use client';

import React, { ComponentType } from 'react';

type IconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface FluentIconProps {
  icon?: ComponentType<any> | React.ReactNode;
  size?: IconSize;
  color?: string;
  className?: string;
  decorative?: boolean;
  label?: string;
}

const sizeMap: Record<IconSize, number> = {
  xs: 12,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
};

export function FluentIcon({
  icon,
  size = 'md',
  color = 'currentColor',
  className = '',
  decorative = true,
  label,
}: FluentIconProps) {
  const px = sizeMap[size];
  const IconComponent =
    typeof icon === 'function' && !(icon as any).defaultProps ? icon : null;

  if (IconComponent) {
    return (
      <IconComponent
        width={px}
        height={px}
        size={px}
        color={color}
        className={className}
        aria-hidden={decorative}
        aria-label={decorative ? undefined : label}
      />
    );
  }

  if (React.isValidElement(icon) || typeof icon === 'string') {
    return (
      <span
        className={`flex items-center justify-center ${className}`}
        style={{
          width: px,
          height: px,
          color,
          display: 'inline-flex',
        }}
        aria-hidden={decorative}
        aria-label={decorative ? undefined : label}
      >
        {icon}
      </span>
    );
  }

  return (
    <span
      className={`flex items-center justify-center ${className}`}
      style={{ width: px, height: px }}
      aria-hidden='true'
    />
  );
}

export function FluentIconRow({
  icon,
  size = 'md',
  color = 'currentColor',
  children,
  gap = '8px',
  className = '',
}: {
  icon?: FluentIconProps['icon'];
  size?: IconSize;
  color?: string;
  children: React.ReactNode;
  gap?: string;
  className?: string;
}) {
  return (
    <div
      className={`inline-flex items-center gap-[${gap}] ${className}`}
      style={{ gap }}
    >
      <FluentIcon icon={icon} size={size} color={color} />
      <span className='flex-1'>{children}</span>
    </div>
  );
}
