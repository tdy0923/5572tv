import dynamic from 'next/dynamic';
import { Suspense } from 'react';

const NetDiskContent = dynamic(() => import('./netdisk-content'));

export default function NetDiskPage() {
  return (
    <div className='p-6 max-w-4xl mx-auto'>
      <Suspense fallback={<div className='text-gray-500'>加载中...</div>}>
        <NetDiskContent />
      </Suspense>
    </div>
  );
}
