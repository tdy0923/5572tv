'use client';

import { Heart } from 'lucide-react';
import { memo } from 'react';

interface FavoriteButtonProps {
  favorited: boolean;
  onToggle: () => void;
}

/**
 * 收藏按钮组件 - 独立拆分以优化性能
 * 使用 React.memo 防止不必要的重新渲染
 */
const FavoriteButton = memo(function FavoriteButton({
  favorited,
  onToggle,
}: FavoriteButtonProps) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      className='group relative inline-flex shrink-0 items-center justify-center rounded-full border border-black/6 bg-white/72 p-2 text-gray-700 shadow-[0_10px_24px_rgba(15,23,42,0.06)] transition-all duration-300 hover:scale-105 dark:border-white/8 dark:bg-white/[0.05] dark:text-gray-200'
      title={favorited ? '取消收藏' : '添加收藏'}
    >
      <FavoriteIcon filled={favorited} />
    </button>
  );
});

/**
 * 收藏图标组件
 */
const FavoriteIcon = ({ filled }: { filled: boolean }) => {
  if (filled) {
    return (
      <Heart className='h-6 w-6 fill-red-500 stroke-red-500 stroke-[1.5]' />
    );
  }
  return (
    <Heart className='h-6 w-6 stroke-[1.5] text-gray-600 dark:text-gray-300' />
  );
};

export default FavoriteButton;
