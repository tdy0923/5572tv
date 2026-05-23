import dynamic from 'next/dynamic';
import { Suspense } from 'react';

const SettingsContent = dynamic(() => import('./settings-content'));

export default function SettingsPage() {
  return (
    <div className='p-6 max-w-4xl mx-auto'>
      <Suspense fallback={<div className='text-gray-500'>加载中...</div>}>
        <SettingsContent />
      </Suspense>
    </div>
  );
}
