'use client';

import { Film, Search, Zap } from 'lucide-react';
import { memo } from 'react';

import { FluentSpinner } from '@/components/FluentUI';
import PageLayout from '@/components/PageLayout';

import LoadingProgressIndicator from './LoadingProgressIndicator';
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
}

const stageConfig: Record<
  LoadingScreenProps['loadingStage'],
  { icon: React.ReactNode; badge: string; color: string }
> = {
  searching: {
    icon: <Search size={24} />,
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

          <div className='text-center flex flex-col gap-2'>
            <LoadingProgressIndicator loadingStage={loadingStage} />
            <p
              className='text-base font-medium animate-[fluent2-shimmer_2s_ease-in-out_infinite]'
              style={{ color: 'var(--color-foreground-subtle)' }}
            >
              {loadingMessage}
            </p>
            {speedTestProgress && (
              <SpeedTestProgress progress={speedTestProgress} />
            )}
          </div>
        </div>
      </div>
    </PageLayout>
  );
});

export default LoadingScreen;
