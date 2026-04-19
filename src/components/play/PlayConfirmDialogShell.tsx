'use client';

import type { ReactNode } from 'react';

interface PlayConfirmDialogShellProps {
  show: boolean;
  icon: ReactNode;
  title: string;
  description?: string;
  body?: ReactNode;
  warning?: ReactNode;
  cancelLabel: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function PlayConfirmDialogShell({
  show,
  icon,
  title,
  description,
  body,
  warning,
  cancelLabel,
  confirmLabel,
  onCancel,
  onConfirm,
}: PlayConfirmDialogShellProps) {
  if (!show) return null;

  return (
    <div className='fixed inset-0 z-9999 flex items-center justify-center bg-black/60 backdrop-blur-sm'>
      <div className='mx-4 max-w-sm rounded-[28px] border border-black/6 bg-white/86 p-6 shadow-[0_28px_80px_rgba(15,23,42,0.18)] backdrop-blur-xl dark:border-white/8 dark:bg-[#151a22]/86'>
        <div className='text-center'>
          <div className='mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-white/70 dark:bg-white/10'>
            {icon}
          </div>
          <h3 className='mb-2 text-lg font-semibold text-gray-900 dark:text-white'>
            {title}
          </h3>
          {description && (
            <p className='mb-3 text-sm text-gray-500 dark:text-gray-400'>
              {description}
            </p>
          )}
          {body}
          {warning}
          <div className='mt-6 flex gap-3'>
            <button
              onClick={onCancel}
              className='flex-1 rounded-full border border-black/6 bg-white/72 px-4 py-2.5 font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:border-white/8 dark:bg-white/[0.05] dark:text-gray-300 dark:hover:bg-white/[0.08]'
            >
              {cancelLabel}
            </button>
            <button
              onClick={onConfirm}
              className='flex-1 rounded-full bg-linear-to-r from-[#f4c24d] via-[#f0b938] to-[#d89c18] px-4 py-2.5 font-medium text-[#171717] shadow-[0_10px_24px_rgba(244,194,77,0.22)] transition-transform hover:scale-[1.02]'
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
