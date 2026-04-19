'use client';

interface WatchRoomSyncBannerProps {
  show: boolean;
  onResumeSync: () => void;
}

export default function WatchRoomSyncBanner({
  show,
  onResumeSync,
}: WatchRoomSyncBannerProps) {
  if (!show) return null;

  return (
    <div className='fixed bottom-20 left-1/2 -translate-x-1/2 z-9998 animate-fade-in'>
      <div className='flex items-center gap-3 rounded-full border border-black/6 bg-white/78 px-4 py-2.5 shadow-[0_14px_34px_rgba(15,23,42,0.1)] backdrop-blur-md dark:border-white/8 dark:bg-[#171c24]/82'>
        <span className='text-sm font-medium text-gray-800 dark:text-gray-100'>
          已退出同步，自由观看中
        </span>
        <button
          onClick={onResumeSync}
          className='rounded-full bg-linear-to-r from-[#f4c24d] via-[#f0b938] to-[#d89c18] px-3 py-1 text-sm font-medium text-[#171717] shadow-[0_8px_20px_rgba(244,194,77,0.22)] transition-transform hover:scale-[1.02]'
        >
          重新同步
        </button>
      </div>
    </div>
  );
}
