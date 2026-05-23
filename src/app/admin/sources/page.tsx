import dynamic from 'next/dynamic';
import { Suspense } from 'react';

const SourcesContent = dynamic(() => import('./sources-content'));

export default function SourcesPage() {
  return (
    <div className='p-6 max-w-4xl mx-auto'>
      <Suspense fallback={<div className='text-gray-500'>加载中...</div>}>
        <SourcesContent />
      </Suspense>
    </div>
  );
}
