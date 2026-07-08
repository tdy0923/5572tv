'use client';

import { Film } from 'lucide-react';

interface VideoLoadingOverlayProps {
  isVisible: boolean;
  loadingStage: 'sourceChanging' | 'initing';
}

export default function VideoLoadingOverlay({
  isVisible,
  loadingStage,
}: VideoLoadingOverlayProps) {
  if (!isVisible) return null;

  return (
    <div className='absolute inset-0 bg-black/85 backdrop-blur-sm rounded-xl flex items-center justify-center z-40 transition-all duration-300'>
      <div className='text-center max-w-md mx-auto px-6'>
        {/* 动画影院图标 */}
        <div className='relative mb-8'>
          <div className='relative mx-auto w-24 h-24 bg-linear-to-r from-green-500 to-emerald-600 rounded-2xl shadow-2xl flex items-center justify-center transform hover:scale-105 transition-transform duration-300'>
            <Film className='text-white w-12 h-12' />
            {/* 旋转光环 */}
            <div className='absolute -inset-2 bg-linear-to-r from-green-500 to-emerald-600 rounded-2xl opacity-20 animate-spin'></div>
          </div>

          {/* 浮动粒子效果 */}
          <div className='absolute top-0 left-0 w-full h-full pointer-events-none'>
            <div className='absolute top-2 left-2 w-2 h-2 bg-green-400 rounded-full animate-bounce'></div>
            <div
              className='absolute top-4 right-4 w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce'
              style={{ animationDelay: '0.5s' }}
            ></div>
            <div
              className='absolute bottom-3 left-6 w-1 h-1 bg-lime-400 rounded-full animate-bounce'
              style={{ animationDelay: '1s' }}
            ></div>
          </div>
        </div>

        {/* 换源消息 */}
        <div className='space-y-2'>
          <p className='text-xl font-semibold text-white animate-[fluent2-shimmer_1.5s_ease-in-out_infinite]'>
            {loadingStage === 'sourceChanging'
              ? '🔄 切换播放源...'
              : '🔄 视频加载中...'}
          </p>
        </div>
      </div>
    </div>
  );
}
