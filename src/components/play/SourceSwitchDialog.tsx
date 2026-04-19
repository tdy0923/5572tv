'use client';

import PlayConfirmDialogShell from './PlayConfirmDialogShell';

interface SourceSwitchDialogProps {
  show: boolean;
  ownerSource: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function SourceSwitchDialog({
  show,
  ownerSource,
  onConfirm,
  onCancel,
}: SourceSwitchDialogProps) {
  if (!show) return null;

  return (
    <PlayConfirmDialogShell
      show={show}
      icon={
        <svg
          className='w-6 h-6 text-yellow-500'
          fill='none'
          stroke='currentColor'
          viewBox='0 0 24 24'
        >
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth={2}
            d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z'
          />
        </svg>
      }
      title='播放源不同'
      description='房主使用的播放源与您不同，是否切换到房主的播放源？'
      body={
        <>
          <p className='mb-1 text-base font-medium text-gray-900 dark:text-white'>
            房主播放源
          </p>
          <p className='mb-3 font-mono text-sm text-blue-500 dark:text-blue-400'>
            {ownerSource}
          </p>
        </>
      }
      warning={
        <p className='rounded-2xl border border-yellow-200 bg-yellow-50 px-3 py-2 text-xs text-orange-500 dark:border-yellow-800/40 dark:bg-yellow-900/20 dark:text-orange-300'>
          保持当前源将无法与房主同步进度
        </p>
      }
      cancelLabel='保持当前源'
      confirmLabel='切换源'
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  );
}
