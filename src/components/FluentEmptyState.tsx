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
        <div className='flex items-center justify-center w-12 h-12 rounded-xl mb-1 border bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/5'>
          {icon}
        </div>
      )}
      <h3 className='text-sm font-medium text-gray-700 dark:text-gray-300'>
        {title}
      </h3>
      {description && (
        <p className='text-xs max-w-xs leading-relaxed text-gray-500 dark:text-gray-400'>
          {description}
        </p>
      )}
      {action && <div className='mt-2'>{action}</div>}
    </div>
  );
}
