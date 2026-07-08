import { Share2 } from 'lucide-react';
import { useState } from 'react';

interface ShareButtonProps {
  title?: string;
  url: string;
}

export default function ShareButton({ title, url }: ShareButtonProps) {
  const [open, setOpen] = useState(false);

  const shareData = { title: title || '', url };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {}
    } else {
      setOpen(!open);
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setOpen(false);
    } catch {}
  };

  return (
    <div className='relative shrink-0'>
      <button
        onClick={handleNativeShare}
        className='flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors'
        title='分享'
      >
        <Share2 className='w-4 h-4' />
        <span className='hidden sm:inline'>分享</span>
      </button>

      {open && !navigator.share && (
        <>
          <div className='fixed inset-0 z-40' onClick={() => setOpen(false)} />
          <div className='absolute right-0 top-full mt-1 z-50 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 p-2 min-w-[160px]'>
            <button
              onClick={copyLink}
              className='w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200'
            >
              复制链接
            </button>
            <a
              href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(title || '')}&url=${encodeURIComponent(url)}`}
              target='_blank'
              rel='noopener noreferrer'
              onClick={() => setOpen(false)}
              className='block w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200'
            >
              Twitter
            </a>
          </div>
        </>
      )}
    </div>
  );
}
