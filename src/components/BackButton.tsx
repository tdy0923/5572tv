'use client';

import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function BackButton() {
  const router = useRouter();

  return (
    <button
      type='button'
      onClick={() => {
        if (window.history.length > 1) {
          router.back();
        } else {
          router.push('/');
        }
      }}
      className='ui-control ui-control-icon text-gray-600 dark:text-gray-300'
      aria-label='返回'
    >
      <ArrowLeft className='h-5 w-5' />
    </button>
  );
}
