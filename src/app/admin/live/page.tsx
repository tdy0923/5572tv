import dynamic from 'next/dynamic';
import { Suspense } from 'react';

const LiveContent = dynamic(() => import('./live-content'));

export default function LivePage() {
  return (
    <div className='p-6 max-w-4xl mx-auto'>
      <Suspense fallback={<div className='text-gray-500'>加载中...</div>}>
        <LiveContent />
      </Suspense>
    </div>
  );
}
