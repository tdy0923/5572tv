import dynamic from 'next/dynamic';
import { Suspense } from 'react';

const UsersContent = dynamic(() => import('./users-content'));

export default function UsersPage() {
  return (
    <div className='p-6 max-w-4xl mx-auto'>
      <Suspense fallback={<div className='text-gray-500'>加载中...</div>}>
        <UsersContent />
      </Suspense>
    </div>
  );
}
