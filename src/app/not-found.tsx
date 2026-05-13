'use client';

import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-black px-4">
      <div className="text-center max-w-md">
        <div className="text-8xl font-bold text-gray-200 dark:text-gray-800 mb-4">
          404
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          页面未找到
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          您访问的页面不存在或已被移除
        </p>
        <Link
          href="/"
          className="inline-flex items-center px-6 py-3 bg-[#f4c24d] hover:bg-[#dba52b] text-[#111] font-semibold rounded-xl transition-colors"
        >
          返回首页
        </Link>
      </div>
    </div>
  );
}
