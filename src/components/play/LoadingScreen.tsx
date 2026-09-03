'use client';

import { RefreshCw } from 'lucide-react';
import { memo } from 'react';

import { FluentButton, FluentSpinner } from '@/components/FluentUI';
import PageLayout from '@/components/PageLayout';

import SpeedTestProgress from './SpeedTestProgress';

interface LoadingScreenProps {
  loadingStage: 'searching' | 'preferring' | 'fetching' | 'ready';
  loadingMessage: string;
  speedTestProgress?: {
    current: number;
    total: number;
    currentSource: string;
    result?: string;
  } | null;
  onRetry?: () => void;
  hasTimedOut?: boolean;
}

// 全站统一：加载态只保留一个 Fluent2 动画（FluentSpinner），阶段信息由 loadingMessage 文案承载
const LoadingScreen = memo(function LoadingScreen({
  loadingMessage,
  speedTestProgress,
  onRetry,
  hasTimedOut,
}: LoadingScreenProps) {
  return (
    <PageLayout activePath='/play'>
      <div className='flex items-center justify-center min-h-screen bg-transparent px-4'>
        <div className='flex flex-col items-center gap-6 max-w-sm w-full'>
          <FluentSpinner size='large' />

          <div className='text-center flex flex-col gap-2 w-full'>
            <p
              className='text-base font-medium'
              style={{ color: 'var(--color-foreground-subtle)' }}
            >
              {loadingMessage}
            </p>
            {speedTestProgress && (
              <SpeedTestProgress progress={speedTestProgress} />
            )}
            <div className='flex justify-center gap-3 mt-2'>
              {onRetry && (
                <FluentButton
                  variant='secondary'
                  size='sm'
                  onClick={onRetry}
                  icon={<RefreshCw size={14} />}
                >
                  {hasTimedOut ? '重试' : '取消'}
                </FluentButton>
              )}
              {hasTimedOut && (
                <p className='text-xs text-amber-500 w-full text-center'>
                  搜索时间较长，可尝试重试
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
});

export default LoadingScreen;
