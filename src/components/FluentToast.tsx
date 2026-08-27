'use client';

import React, { useEffect, useState } from 'react';

import { easing } from '@/lib/fluent-tokens';

type ToastType = 'info' | 'success' | 'warning' | 'error';

interface ToastMessage {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
  action?: { label: string; onClick: () => void };
}

let toastQueue: ToastMessage[] = [];
let listeners: (() => void)[] = [];

const typeStyles: Record<ToastType, { icon: React.ReactNode; color: string }> =
  {
    info: {
      icon: (
        <svg
          width='16'
          height='16'
          viewBox='0 0 16 16'
          fill='none'
          stroke='#3b82f6'
          strokeWidth='2'
          strokeLinecap='round'
          strokeLinejoin='round'
        >
          <circle cx='8' cy='8' r='6' />
          <path d='M8 7v4M8 5.5v.01' />
        </svg>
      ),
      color: '#3b82f6',
    },
    success: {
      icon: (
        <svg
          width='16'
          height='16'
          viewBox='0 0 16 16'
          fill='none'
          stroke='#22c55e'
          strokeWidth='2'
          strokeLinecap='round'
          strokeLinejoin='round'
        >
          <circle cx='8' cy='8' r='6' />
          <path d='M5 8.5l2 2 4-4' />
        </svg>
      ),
      color: '#22c55e',
    },
    warning: {
      icon: (
        <svg
          width='16'
          height='16'
          viewBox='0 0 16 16'
          fill='none'
          stroke='#f59e0b'
          strokeWidth='2'
          strokeLinecap='round'
          strokeLinejoin='round'
        >
          <path d='M8 2.5L14 13H2L8 2.5z' />
          <path d='M8 7v3M8 11.5v.01' />
        </svg>
      ),
      color: '#f59e0b',
    },
    error: {
      icon: (
        <svg
          width='16'
          height='16'
          viewBox='0 0 16 16'
          fill='none'
          stroke='#ef4444'
          strokeWidth='2'
          strokeLinecap='round'
          strokeLinejoin='round'
        >
          <circle cx='8' cy='8' r='6' />
          <path d='M8 5v4M8 11v.01' />
        </svg>
      ),
      color: '#ef4444',
    },
  };

export function pushToast(
  type: ToastType,
  message: string,
  options?: {
    title?: string;
    duration?: number;
    action?: { label: string; onClick: () => void };
  },
): string {
  const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const toast: ToastMessage = {
    id,
    type,
    message,
    duration: options?.duration ?? 3500,
    ...(options?.title && { title: options.title }),
    ...(options?.action && { action: options.action }),
  };
  toastQueue.push(toast);
  listeners.forEach((fn) => fn());
  return id;
}

export function removeToast(id: string) {
  toastQueue = toastQueue.filter((t) => t.id !== id);
  listeners.forEach((fn) => fn());
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    const handler = () => setToasts([...toastQueue]);
    listeners.push(handler);
    return () => {
      listeners = listeners.filter((fn) => fn !== handler);
    };
  }, []);

  return (
    <>
      {children}
      <div
        className='fixed z-[80] top-4 right-4 flex flex-col gap-2 pointer-events-none max-w-[380px] w-full'
        style={{ position: 'fixed' }}
      >
        {toasts.map((toast) => (
          <ToastItem
            key={toast.id}
            toast={toast}
            onRemove={() => removeToast(toast.id)}
          />
        ))}
      </div>
    </>
  );
}

interface ToastItemProps {
  toast: ToastMessage;
  onRemove: () => void;
}

function ToastItem({ toast, onRemove }: ToastItemProps) {
  const [visible, setVisible] = useState(false);
  const { icon, color } = typeStyles[toast.type];

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onRemove, 300);
    }, toast.duration ?? 3500);
    return () => clearTimeout(timer);
  }, [toast, onRemove]);

  return (
    <div
      className='pointer-events-auto flex items-start gap-3 p-3 rounded-xl border shadow-lg'
      style={{
        borderColor: `${color}33`,
        background: '#1a1a1a',
        animation: visible
          ? `fluent2-slide-up 250ms ${easing.standard} forwards`
          : `fluent2-fade-in 250ms ${easing.standard} forwards`,
      }}
    >
      <span className='flex-shrink-0 mt-0.5'>{icon}</span>
      <div className='flex-1 min-w-0'>
        {toast.title && (
          <p className='text-sm font-medium text-white'>{toast.title}</p>
        )}
        <p
          className='text-xs'
          style={{ color: '#d1d5db', marginTop: toast.title ? '2px' : 0 }}
        >
          {toast.message}
        </p>
      </div>
      {toast.action && (
        <button
          className='flex-shrink-0 text-xs font-medium px-3 py-1.5 rounded-lg border transition-all'
          style={{
            borderColor: `${color}55`,
            color,
            backgroundColor: `${color}15`,
          }}
          onClick={toast.action.onClick}
        >
          {toast.action.label}
        </button>
      )}
      <button
        className='flex-shrink-0 text-[#6b7280] hover:text-white transition-colors p-1'
        onClick={() => {
          setVisible(false);
          setTimeout(onRemove, 300);
        }}
        aria-label='关闭'
      >
        <svg
          width='14'
          height='14'
          viewBox='0 0 14 14'
          fill='none'
          stroke='currentColor'
          strokeWidth='1.5'
          strokeLinecap='round'
        >
          <path d='M3 3l8 8M11 3l-8 8' />
        </svg>
      </button>
    </div>
  );
}

export function FluentToast({
  type = 'info',
  message,
  title,
  duration = 3500,
  action,
}: {
  type?: ToastType;
  message: string;
  title?: string;
  duration?: number;
  action?: { label: string; onClick: () => void };
}) {
  pushToast(type, message, { title, duration, action });
  return null;
}
