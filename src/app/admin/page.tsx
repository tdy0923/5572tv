import dynamic from 'next/dynamic';
import { Suspense } from 'react';

const AdminContent = dynamic(() => import('./_content'));

export default function AdminPage() {
  return (
    <Suspense
      fallback={
        <div className='min-h-screen flex items-center justify-center text-gray-500'>
          加载中...
        </div>
      }
    >
      <AdminContent />
    </Suspense>
  );
}
