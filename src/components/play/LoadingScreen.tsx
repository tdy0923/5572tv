'use client';

import { Clapperboard, Film, RefreshCw, Zap } from 'lucide-react';
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

const stageConfig: Record<
  LoadingScreenProps['loadingStage'],
  { icon: React.ReactNode; badge: string; color: string }
> = {
  searching: {
    icon: <Clapperboard size={24} />,
    badge: '搜索中',
    color: '#3b82f6',
  },
  preferring: {
    icon: <Zap size={24} />,
    badge: '优选中',
    color: '#f4c24d',
  },
  fetching: {
    icon: <Film size={24} />,
    badge: '获取中',
    color: '#22c55e',
  },
  ready: {
    icon: <Film size={24} />,
    badge: '准备就绪',
    color: '#f4c24d',
  },
};

const LoadingScreen = memo(function LoadingScreen({
  loadingStage,
  loadingMessage,
  speedTestProgress,
  onRetry,
  hasTimedOut,
}: LoadingScreenProps) {
  const config = stageConfig[loadingStage];

  return (
    <PageLayout activePath='/play'>
      <div className='flex items-center justify-center min-h-screen bg-transparent px-4'>
        <div className='flex flex-col items-center gap-6 max-w-sm w-full'>
          <div className='relative flex flex-col items-center gap-4'>
            <div
              className='w-20 h-20 rounded-2xl flex items-center justify-center shadow-xl'
              style={{
                backgroundColor: `${config.color}15`,
                borderColor: `${config.color}30`,
                borderWidth: '1px',
              }}
            >
              <span style={{ color: config.color }}>{config.icon}</span>
            </div>
            <span
              className='px-2 py-0.5 rounded-full text-[10px] font-medium'
              style={{
                backgroundColor: `${config.color}15`,
                color: config.color,
                borderColor: `${config.color}30`,
                borderWidth: '1px',
              }}
            >
              {config.badge}
            </span>
          </div>

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
