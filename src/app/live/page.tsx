import dynamic from 'next/dynamic';
import { Suspense } from 'react';

const LiveContent = dynamic(() => import('./_content'));

export default function LivePage() {
  return (
    <Suspense
      fallback={
        <div className='min-h-screen flex items-center justify-center text-gray-500'>
          加载中...
        </div>
      }
    >
      <LiveContent />
    </Suspense>
  );
}
