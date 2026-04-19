'use client';

import { memo } from 'react';

import CommentItem from './CommentItem';

interface CommentSectionProps {
  comments: any[];
  loading: boolean;
  error: string | null;
  videoDoubanId?: string | number;
}

/**
 * 评论区组件 - 独立拆分以优化性能
 * 使用 React.memo 防止不必要的重新渲染
 */
const CommentSection = memo(function CommentSection({
  comments,
  loading,
  error,
  videoDoubanId,
}: CommentSectionProps) {
  // 如果正在加载、有错误或没有评论，不显示
  if (loading || error || !comments || comments.length === 0) {
    return null;
  }

  return (
    <div className='mt-6 border-t border-gray-200 pt-6 dark:border-gray-700'>
      <div className='mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
        <div className='flex items-center gap-3'>
          <h3 className='text-lg font-semibold text-gray-800 dark:text-gray-200'>
            豆瓣短评
          </h3>
          <span className='rounded-full border border-black/6 bg-white/70 px-3 py-1 text-xs text-gray-600 dark:border-white/8 dark:bg-white/6 dark:text-gray-300'>
            {comments.length} 条
          </span>
        </div>
      </div>
      <div className='space-y-4'>
        {comments.slice(0, 10).map((comment: any, index: number) => (
          <CommentItem key={index} comment={comment} />
        ))}
      </div>

      {/* 查看更多链接 */}
      {videoDoubanId && (
        <div className='mt-4 text-center'>
          <a
            href={`https://movie.douban.com/subject/${videoDoubanId}/comments?status=P`}
            target='_blank'
            rel='noopener noreferrer'
            className='inline-flex items-center gap-2 rounded-full border border-black/6 bg-white/70 px-4 py-2 text-sm text-gray-700 transition-colors hover:text-blue-600 dark:border-white/8 dark:bg-white/6 dark:text-gray-300 dark:hover:text-blue-400'
          >
            查看更多短评
            <svg
              className='w-4 h-4'
              fill='none'
              stroke='currentColor'
              viewBox='0 0 24 24'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14'
              />
            </svg>
          </a>
        </div>
      )}
    </div>
  );
});

export default CommentSection;
