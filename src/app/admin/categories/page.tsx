import dynamic from 'next/dynamic';
import { Suspense } from 'react';

const CategoryContent = dynamic(() => import('./category-content'));

export default function CategoriesPage() {
  return (
    <div className='p-6 max-w-4xl mx-auto'>
      <Suspense fallback={<div className='text-gray-500'>加载中...</div>}>
        <CategoryContent />
      </Suspense>
    </div>
  );
}
