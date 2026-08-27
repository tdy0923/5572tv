'use client';

import React from 'react';

interface FluentEmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function FluentEmptyState({
  icon,
  title,
  description,
  action,
  className = '',
}: FluentEmptyStateProps) {
  return (
    <div
      className={`
        flex flex-col items-center justify-center
        gap-3 py-8 px-4 text-center
        ${className}
      `}
    >
      {icon && (
        <div
          className='flex items-center justify-center w-12 h-12 rounded-xl mb-1'
          style={{
            backgroundColor: 'rgba(255,255,255,0.05)',
            borderColor: 'rgba(255,255,255,0.08)',
            borderWidth: '1px',
          }}
        >
          {icon}
        </div>
      )}
      <h3 className='text-sm font-medium' style={{ color: '#9ca3af' }}>
        {title}
      </h3>
      {description && (
        <p
          className='text-xs max-w-xs leading-relaxed'
          style={{ color: '#6b7280' }}
        >
          {description}
        </p>
      )}
      {action && <div className='mt-2'>{action}</div>}
    </div>
  );
}
