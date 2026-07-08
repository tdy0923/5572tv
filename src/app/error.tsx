'use client';

import { AlertTriangle } from 'lucide-react';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className='min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-black px-4'>
      <div className='text-center max-w-md'>
        <div className='text-6xl mb-4'>
          <AlertTriangle className='w-16 h-16 mx-auto text-yellow-500' />
        </div>
        <h1 className='text-2xl font-bold text-gray-900 dark:text-white mb-2'>
          出错了
        </h1>
        <p className='text-gray-600 dark:text-gray-400 mb-2'>
          页面加载时发生错误
        </p>
        {error.message && (
          <p className='text-sm text-gray-500 dark:text-gray-500 mb-6 font-mono bg-gray-100 dark:bg-gray-800 p-3 rounded-lg'>
            {error.message}
          </p>
        )}
        <div className='flex gap-3 justify-center'>
          <button
            onClick={() => reset()}
            className='px-6 py-3 bg-[#f4c24d] hover:bg-[#dba52b] text-[#111] font-semibold rounded-xl transition-colors'
          >
            重试
          </button>
          <Link
            href='/'
            className='px-6 py-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-semibold rounded-xl transition-colors'
          >
            返回首页
          </Link>
        </div>
      </div>
    </div>
  );
}
