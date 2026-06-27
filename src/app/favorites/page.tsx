'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function FavoritesPage() {
  const router = useRouter();

  useEffect(() => {
    // 重定向到首页并激活收藏tab
    router.replace('/?tab=favorites');
  }, [router]);

  return (
    <div className='flex min-h-screen items-center justify-center'>
      <div className='text-center'>
        <div className='mb-4 text-4xl'>⏳</div>
        <p className='text-gray-500'>正在跳转到收藏页面...</p>
      </div>
    </div>
  );
}
