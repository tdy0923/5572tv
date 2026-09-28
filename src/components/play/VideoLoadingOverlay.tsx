'use client';

import { Film, RotateCcw, X } from 'lucide-react';
import { useEffect, useState } from 'react';

interface VideoLoadingOverlayProps {
  isVisible: boolean;
  loadingStage: 'sourceChanging' | 'initing';
  onRetry?: () => void;
  onCancel?: () => void;
}

// 操作按钮延迟秒数：快加载不闪按钮，弱网卡住才给用户抓手
const ACTIONS_DELAY_MS = 6000;

export default function VideoLoadingOverlay({
  isVisible,
  loadingStage,
  onRetry,
  onCancel,
}: VideoLoadingOverlayProps) {
  const [showActions, setShowActions] = useState(false);

  // 父级以 visibility+stage 为 key 重挂载本组件（每次展示都是全新计时），
  // 因此 effect 内只需启动计时器，无需同步 reset state
  useEffect(() => {
    const timer = setTimeout(() => setShowActions(true), ACTIONS_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  if (!isVisible) return null;

  return (
    <div className='absolute inset-0 bg-black/85 backdrop-blur-sm rounded-xl flex items-center justify-center z-40 transition-all duration-300'>
      <div className='text-center max-w-md mx-auto px-6'>
        {/* 动画影院图标 */}
        <div className='relative mb-8'>
          <div className='relative mx-auto w-24 h-24 bg-linear-to-r from-green-500 to-emerald-600 rounded-2xl shadow-16 flex items-center justify-center transform  transition-transform duration-300'>
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

        {/* 长时间卡住才出现：重试 / 取消 */}
        {showActions && (onRetry || onCancel) && (
          <div className='mt-8 flex items-center justify-center gap-3'>
            {onCancel && (
              <button
                type='button'
                onClick={onCancel}
                className='inline-flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/20'
              >
                <X className='h-4 w-4' />
                取消
              </button>
            )}
            {onRetry && (
              <button
                type='button'
                onClick={onRetry}
                className='inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-500'
              >
                <RotateCcw className='h-4 w-4' />
                重试
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
