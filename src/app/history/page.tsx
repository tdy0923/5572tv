'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function HistoryPage() {
  const router = useRouter();

  useEffect(() => {
    // 重定向到首页并激活历史tab
    router.replace('/?tab=history');
  }, [router]);

  return (
    <div className='flex min-h-screen items-center justify-center'>
      <div className='text-center'>
        <div className='mb-4 text-4xl'>⏳</div>
        <p className='text-gray-500'>正在跳转到历史页面...</p>
      </div>
    </div>
  );
}
