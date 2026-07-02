'use client';

import { useEffect, useState } from 'react';

interface FluentFadeInProps {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  className?: string;
}

export function FluentFadeIn({
  children,
  delay = 0,
  duration = 250,
  className = '',
}: FluentFadeInProps) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(8px)',
        transition: `opacity ${duration}ms cubic-bezier(0, 0, 0, 1), transform ${duration}ms cubic-bezier(0, 0, 0, 1)`,
      }}
    >
      {children}
    </div>
  );
}

export function FluentSlideUp({
  children,
  delay = 0,
  duration = 300,
  className = '',
}: FluentFadeInProps) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(16px)',
        transition: `opacity ${duration}ms cubic-bezier(0, 0, 0, 1), transform ${duration}ms cubic-bezier(0, 0, 0, 1)`,
      }}
    >
      {children}
    </div>
  );
}

export function FluentScaleIn({
  children,
  delay = 0,
  duration = 200,
  className = '',
}: FluentFadeInProps) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'scale(1)' : 'scale(0.95)',
        transition: `opacity ${duration}ms cubic-bezier(0, 0, 0, 1), transform ${duration}ms cubic-bezier(0, 0, 0, 1)`,
      }}
    >
      {children}
    </div>
  );
}

export function FluentStagger({
  children,
  staggerMs = 50,
  className = '',
}: {
  children: React.ReactNode[];
  staggerMs?: number;
  className?: string;
}) {
  return (
    <div className={className}>
      {Array.isArray(children)
        ? children.map((child, i) => (
            <FluentFadeIn key={i} delay={i * staggerMs}>
              {child}
            </FluentFadeIn>
          ))
        : children}
    </div>
  );
}
