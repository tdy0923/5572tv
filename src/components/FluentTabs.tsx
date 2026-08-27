'use client';

import React, { useState } from 'react';

interface FluentTab {
  id: string;
  label: React.ReactNode;
  disabled?: boolean;
}

interface FluentTabsProps {
  tabs: FluentTab[];
  defaultValue?: string;
  value?: string;
  onChange?: (id: string) => void;
  className?: string;
  variant?: 'default' | 'pills' | 'underlined';
}

export function FluentTabs({
  tabs,
  defaultValue,
  value: controlledValue,
  onChange,
  className = '',
  variant = 'default',
}: FluentTabsProps) {
  const [internalValue, setInternalValue] = useState(
    defaultValue ?? tabs[0]?.id ?? '',
  );
  const activeId = controlledValue ?? internalValue;

  const handleSelect = (id: string) => {
    setInternalValue(id);
    onChange?.(id);
  };

  return (
    <div
      className={`flex items-center gap-1 rounded-lg p-1 ${className}`}
      style={{
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderColor: 'rgba(255,255,255,0.08)',
        borderWidth: '1px',
        borderRadius: '8px',
      }}
      role='tablist'
    >
      {tabs.map((tab) => {
        const isActive = activeId === tab.id;
        return (
          <button
            key={tab.id}
            role='tab'
            aria-selected={isActive}
            disabled={tab.disabled}
            onClick={() => !tab.disabled && handleSelect(tab.id)}
            className={`
              relative px-3 py-1.5 rounded-md text-sm font-medium
              transition-all duration-150
              cursor-pointer
              disabled:opacity-40 disabled:cursor-not-allowed
              ${variant === 'pills' && isActive ? 'rounded-full' : ''}
            `}
            style={{
              backgroundColor: isActive
                ? 'rgba(244,194,77,0.12)'
                : 'transparent',
              color: isActive ? '#f4c24d' : '#9ca3af',
              transition: 'all 150ms cubic-bezier(0, 0, 0, 1)',
            }}
          >
            {tab.label}
            {variant === 'underlined' && isActive && (
              <span
                className='absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 rounded-full'
                style={{
                  width: '60%',
                  backgroundColor: '#f4c24d',
                }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
