'use client';

import dynamic from 'next/dynamic';

import { FluentSpinner } from '@/components/FluentSpinner';

const PlayPageClient = dynamic(() => import('./PlayPageClient'), {
  ssr: false,
  loading: () => (
    <div className='flex min-h-[60vh] items-center justify-center p-4'>
      <FluentSpinner size='large' label='加载播放器...' />
    </div>
  ),
});

export default function ClientPage() {
  return <PlayPageClient />;
}
