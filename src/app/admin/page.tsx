import dynamic from 'next/dynamic';
import { Suspense } from 'react';

import { FluentLoadingPage } from '@/components/FluentSpinner';

const AdminContent = dynamic(() => import('./_content'));

function AdminPageSkeleton() {
  return (
    <div className='ui-page-width py-6'>
      <div className='mb-6 flex items-center gap-3'>
        <div className='h-7 w-32 rounded-full bg-[var(--color-background-muted)] animate-pulse' />
        <div className='h-6 w-20 rounded-full bg-[var(--color-background-muted)] animate-pulse opacity-60' />
      </div>
      <div className='grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]'>
        <div className='hidden lg:block ui-surface rounded-[var(--radius-2xl)] p-4 shadow-[var(--shadow-2)]'>
          <div className='space-y-3'>
            <div className='h-4 w-24 rounded-full bg-[var(--color-background-muted)] animate-pulse' />
            <div className='h-9 rounded-full bg-[var(--color-background-muted)] animate-pulse' />
            <div className='space-y-2 pt-2'>
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className='h-10 rounded-[var(--radius-xl)] bg-[var(--color-background-muted)] animate-pulse'
                  style={{ opacity: 1 - i * 0.08 }}
                />
              ))}
            </div>
          </div>
        </div>
        <div className='space-y-4'>
          <div className='ui-surface rounded-[var(--radius-2xl)] p-5 shadow-[var(--shadow-2)]'>
            <div className='h-3 w-20 rounded-full bg-[var(--color-background-muted)] animate-pulse' />
            <div className='mt-3 h-6 w-40 rounded-lg bg-[var(--color-background-muted)] animate-pulse' />
            <div className='mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4'>
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className='h-24 rounded-[var(--radius-2xl)] bg-[var(--color-background-muted)] animate-pulse'
                />
              ))}
            </div>
          </div>
          <div className='ui-surface rounded-[var(--radius-2xl)] p-6 shadow-[var(--shadow-2)]'>
            <div className='h-4 w-28 rounded-full bg-[var(--color-background-muted)] animate-pulse' />
            <div className='mt-4 h-40 rounded-[var(--radius-xl)] bg-[var(--color-background-muted)] animate-pulse' />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminPage() {
  return (
    <Suspense fallback={<AdminPageSkeleton />}>
      <AdminContent />
    </Suspense>
  );
}
