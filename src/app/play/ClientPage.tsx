'use client';

import dynamic from 'next/dynamic';

const PlayPageClient = dynamic(() => import('./PlayPageClient'), {
  ssr: false,
});

export default function ClientPage() {
  return <PlayPageClient />;
}
