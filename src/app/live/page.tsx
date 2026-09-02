import dynamic from 'next/dynamic';
import { Suspense } from 'react';

import { FluentSpinner } from '@/components/FluentSpinner';

const LiveContent = dynamic(() => import('./_content'), {
  loading: () => (
    <div className='flex min-h-[40vh] items-center justify-center p-4'>
      <FluentSpinner size='large' label='加载直播...' />
    </div>
  ),
});

export default function LivePage() {
  return (
    <Suspense
      fallback={
        <div className='flex min-h-[40vh] items-center justify-center p-4'>
          <FluentSpinner size='large' label='加载直播...' />
        </div>
      }
    >
      <LiveContent />
    </Suspense>
  );
}
