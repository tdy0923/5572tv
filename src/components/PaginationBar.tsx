'use client';

import React from 'react';

interface PaginationBarProps {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onChange: (page: number) => void;
}

/** 计算当前页附近的页码窗口（最多 5 个） */
function pageWindow(page: number, total: number): number[] {
  if (total <= 5) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const start = Math.max(1, Math.min(page - 2, total - 4));
  const end = Math.min(total, start + 4);
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

/**
 * 通用分页条（中性样式，浅色/深色均可用）。
 * 数据量不足一页时自动隐藏。
 */
const PaginationBar: React.FC<PaginationBarProps> = ({
  page,
  totalPages,
  total,
  pageSize,
  onChange,
}) => {
  if (total <= pageSize) return null;

  const numbers = pageWindow(page, totalPages);
  const btnBase =
    'min-w-8 h-8 px-2 inline-flex items-center justify-center rounded-lg text-sm transition-colors';
  const btnIdle =
    'border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:pointer-events-none';
  const btnActive = 'bg-blue-600 text-white border border-blue-600 font-medium';

  return (
    <div className='flex flex-wrap items-center justify-between gap-3 pt-2'>
      <div className='text-xs text-gray-500 dark:text-gray-400'>
        共 {total} 条 · 第 {page} / {totalPages} 页
      </div>
      <div className='flex items-center gap-1.5'>
        <button
          type='button'
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
          className={`${btnBase} ${btnIdle}`}
          aria-label='上一页'
        >
          ‹
        </button>
        {numbers[0] > 1 && (
          <>
            <button
              type='button'
              onClick={() => onChange(1)}
              className={`${btnBase} ${btnIdle}`}
            >
              1
            </button>
            {numbers[0] > 2 && (
              <span className='px-1 text-gray-400 dark:text-gray-500'>…</span>
            )}
          </>
        )}
        {numbers.map((n) => (
          <button
            type='button'
            key={n}
            onClick={() => onChange(n)}
            className={`${btnBase} ${n === page ? btnActive : btnIdle}`}
            aria-current={n === page ? 'page' : undefined}
          >
            {n}
          </button>
        ))}
        {numbers[numbers.length - 1] < totalPages && (
          <>
            {numbers[numbers.length - 1] < totalPages - 1 && (
              <span className='px-1 text-gray-400 dark:text-gray-500'>…</span>
            )}
            <button
              type='button'
              onClick={() => onChange(totalPages)}
              className={`${btnBase} ${btnIdle}`}
            >
              {totalPages}
            </button>
          </>
        )}
        <button
          type='button'
          disabled={page >= totalPages}
          onClick={() => onChange(page + 1)}
          className={`${btnBase} ${btnIdle}`}
          aria-label='下一页'
        >
          ›
        </button>
      </div>
    </div>
  );
};

export default PaginationBar;
