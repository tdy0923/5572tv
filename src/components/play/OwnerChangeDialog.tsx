'use client';

import PlayConfirmDialogShell from './PlayConfirmDialogShell';

interface OwnerChangeDialogProps {
  show: boolean;
  videoName: string;
  episode: number;
  onConfirm: () => void;
  onReject: () => void;
}

export default function OwnerChangeDialog({
  show,
  videoName,
  episode,
  onConfirm,
  onReject,
}: OwnerChangeDialogProps) {
  if (!show) return null;

  return (
    <PlayConfirmDialogShell
      show={show}
      icon={
        <svg
          className='w-6 h-6 text-blue-500'
          fill='none'
          stroke='currentColor'
          viewBox='0 0 24 24'
        >
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth={2}
            d='M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z'
          />
        </svg>
      }
      title='房主切换了内容'
      description='房主正在观看：'
      body={
        <>
          <p className='mb-1 text-base font-medium text-gray-900 dark:text-white'>
            {videoName || '未知视频'}
          </p>
          <p className='text-xs text-gray-500 dark:text-gray-400'>
            第 {episode + 1} 集
          </p>
        </>
      }
      cancelLabel='自由观看'
      confirmLabel='跟随房主'
      onCancel={onReject}
      onConfirm={onConfirm}
    />
  );
}
