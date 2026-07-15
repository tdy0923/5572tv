'use client';

import React from 'react';

interface AnimatedCardGridProps {
  children: React.ReactNode;
  className?: string;
}

export default function AnimatedCardGrid({
  children,
  className = '',
}: AnimatedCardGridProps) {
  return (
    <div className={className}>
      {React.Children.map(children, (child, index) => (
        <div
          key={`card-${index}`}
          className='inline-block animate-on-mount'
          style={{ animationDelay: `${index * 50}ms` }}
        >
          {child}
        </div>
      ))}
    </div>
  );
}
