'use client';

import React from 'react';

interface FluentAvatarProps {
  src?: string;
  name?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showStatus?: 'online' | 'offline' | 'busy';
  className?: string;
  onClick?: React.MouseEventHandler<HTMLDivElement>;
}

const sizeMap: Record<
  FluentAvatarProps['size'],
  { size: number; fontSize: number }
> = {
  xs: { size: 20, fontSize: 9 },
  sm: { size: 28, fontSize: 11 },
  md: { size: 36, fontSize: 13 },
  lg: { size: 48, fontSize: 16 },
  xl: { size: 64, fontSize: 20 },
};

export function FluentAvatar({
  src,
  name,
  size = 'md',
  showStatus,
  className = '',
  onClick,
}: FluentAvatarProps) {
  const { size: px, fontSize } = sizeMap[size];

  const initials = name
    ? name
        .split(' ')
        .map((w) => w[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : '';

  const statusColors: Record<
    NonNullable<FluentAvatarProps['showStatus']>,
    string
  > = {
    online: '#22c55e',
    offline: '#6b7280',
    busy: '#ef4444',
  };

  return (
    <div
      className={`relative flex-shrink-0 ${className}`}
      style={{
        width: px,
        height: px,
        borderRadius: '50%',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        backgroundColor: 'rgba(244,194,77,0.12)',
        color: '#f4c24d',
        fontSize,
        fontWeight: 600,
        cursor: onClick ? 'pointer' : 'default',
      }}
      onClick={onClick}
    >
      {src ? (
        <img
          src={src}
          alt={name || 'avatar'}
          className='w-full h-full object-cover'
          style={{ display: 'block' }}
        />
      ) : (
        <span className='leading-none select-none'>{initials}</span>
      )}
      {showStatus && (
        <span
          className='absolute bottom-0 right-0 rounded-full border-2 border-[#111]'
          style={{
            width: Math.max(6, px * 0.25),
            height: Math.max(6, px * 0.25),
            backgroundColor: statusColors[showStatus],
          }}
        />
      )}
    </div>
  );
}

export function FluentAvatarGroup({
  avatars,
  max = 4,
  size = 'md',
  className = '',
}: {
  avatars: Array<{ src?: string; name?: string }>;
  max?: number;
  size?: FluentAvatarProps['size'];
  className?: string;
}) {
  const visible = avatars.slice(0, max);
  const remaining = avatars.length - max;

  return (
    <div className={`flex items-center -space-x-2 ${className}`}>
      {visible.map((avatar, i) => (
        <div
          key={i}
          style={{
            border: '2px solid #111',
            borderRadius: '50%',
          }}
        >
          <FluentAvatar {...avatar} size={size} />
        </div>
      ))}
      {remaining > 0 && (
        <div
          className='flex items-center justify-center flex-shrink-0'
          style={{
            width: sizeMap[size].size,
            height: sizeMap[size].size,
            borderRadius: '50%',
            backgroundColor: 'rgba(255,255,255,0.08)',
            borderColor: '#111',
            borderWidth: '2px',
            color: '#9ca3af',
            fontSize: sizeMap[size].fontSize,
            fontWeight: 500,
          }}
        >
          +{remaining}
        </div>
      )}
    </div>
  );
}
