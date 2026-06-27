'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function ProfilePage() {
  const router = useRouter();

  useEffect(() => {
    // 重定向到首页并激活我的tab
    router.replace('/?tab=profile');
  }, [router]);

  return (
    <div className='flex min-h-screen items-center justify-center'>
      <div className='text-center'>
        <div className='mb-4 text-4xl'>⏳</div>
        <p className='text-gray-500'>正在跳转到个人中心...</p>
      </div>
    </div>
  );
}
