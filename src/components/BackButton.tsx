import { ArrowLeft } from 'lucide-react';

export function BackButton() {
  return (
    <button
      onClick={() => window.history.back()}
      className='ui-control ui-control-icon text-gray-600 dark:text-gray-300'
      aria-label='Back'
    >
      <ArrowLeft className='h-5 w-5' />
    </button>
  );
}
