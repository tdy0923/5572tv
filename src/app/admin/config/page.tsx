import dynamic from 'next/dynamic';
import { Suspense } from 'react';

const ConfigFileSection = dynamic(() => import('./config-content'));

export default function ConfigPage() {
  return (
    <div className='p-6 max-w-4xl mx-auto'>
      <h1 className='text-xl font-bold mb-4'>配置文件</h1>
      <Suspense fallback={<div className='text-gray-500'>加载中...</div>}>
        <ConfigFileSection />
      </Suspense>
    </div>
  );
}
