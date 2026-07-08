import { Suspense } from 'react';

import PlayPageClientWrapper from './PlayPageClient';

export default function PlayPage() {
  return (
    <Suspense
      fallback={
        <div className='flex items-center justify-center min-h-screen text-white'>
          加载中...
        </div>
      }
    >
      <PlayPageClientWrapper />
    </Suspense>
  );
}
