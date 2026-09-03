'use client';

import { X } from 'lucide-react';
import React, { useEffect, useRef } from 'react';

import { duration, easing, shadow } from '@/lib/fluent-tokens';

import { FluentButton } from './FluentButton';

interface FluentModalProps {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: string;
  maxHeight?: string;
  showClose?: boolean;
  closeOnOverlay?: boolean;
  className?: string;
}

export function FluentModal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  width = '480px',
  maxHeight = '80vh',
  showClose = true,
  closeOnOverlay = true,
  className = '',
}: FluentModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      className='fixed inset-0 z-[50] flex items-center justify-center'
      role='dialog'
      aria-modal='true'
    >
      <div
        className='absolute inset-0 bg-[rgba(0,0,0,0.6)] backdrop-blur-sm'
        onClick={closeOnOverlay ? onClose : undefined}
        aria-hidden='true'
      />
      <div
        className='relative z-10 w-full mx-4 max-w-md sm:max-w-lg rounded-xl border bg-white border-gray-200 dark:bg-neutral-900 dark:border-white/10'
        style={{
          maxWidth: width,
          maxHeight,
          boxShadow: shadow.shadow28,
          animation: `fluent2-modal-in ${duration.normal} ${easing.decelerateMin} forwards`,
        }}
      >
        <div className='flex flex-col max-h-full'>
          {(title || description) && (
            <div className='flex items-start justify-between p-5 pb-0'>
              <div className='flex flex-col gap-1'>
                {title && (
                  <h2 className='text-lg font-semibold text-gray-900 dark:text-white'>
                    {title}
                  </h2>
                )}
                {description && (
                  <p className='text-sm text-gray-600 dark:text-gray-400'>
                    {description}
                  </p>
                )}
              </div>
              {showClose && (
                <button
                  className='flex items-center justify-center w-8 h-8 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white transition-colors'
                  onClick={onClose}
                  aria-label='关闭'
                >
                  <X size={16} />
                </button>
              )}
            </div>
          )}

          <div className={`flex-1 overflow-y-auto p-5 ${className}`}>
            {children}
          </div>

          {footer && (
            <div className='flex items-center justify-end gap-2 p-4 pt-2 border-t border-gray-200 dark:border-white/10'>
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function FluentConfirm({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = '确认',
  cancelText = '取消',
  variant = 'primary',
  loading = false,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'primary' | 'danger';
  loading?: boolean;
}) {
  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <FluentModal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <div className='flex gap-2'>
          <FluentButton variant='ghost' onClick={onClose} size='md'>
            {cancelText}
          </FluentButton>
          <FluentButton
            variant={variant === 'danger' ? 'danger' : 'primary'}
            onClick={handleConfirm}
            loading={loading}
            size='md'
          >
            {confirmText}
          </FluentButton>
        </div>
      }
      width='400px'
    >
      <p className='text-sm text-gray-600 dark:text-gray-400 leading-relaxed'>
        {message}
      </p>
    </FluentModal>
  );
}
