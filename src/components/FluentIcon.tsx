'use client';

import { type LucideIcon } from 'lucide-react';

/**
 * Fluent 2 Icon Component
 * Enforces consistent icon sizing per Fluent 2 design system:
 * - sm: 16px (inline text indicators only)
 * - md: 20px (default - navigation, buttons, controls)
 * - lg: 24px (feature icons, prominent actions)
 * - xl: 28px (hero elements)
 */
type IconSize = 'sm' | 'md' | 'lg' | 'xl';

const sizeMap: Record<IconSize, string> = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-6 w-6',
  xl: 'h-7 w-7',
};

interface FluentIconProps {
  icon: LucideIcon;
  size?: IconSize;
  className?: string;
  strokeWidth?: number;
}

export default function FluentIcon({
  icon: Icon,
  size = 'md',
  className = '',
  strokeWidth = 2,
}: FluentIconProps) {
  return (
    <Icon
      className={`${sizeMap[size]} shrink-0 ${className}`}
      strokeWidth={strokeWidth}
    />
  );
}
