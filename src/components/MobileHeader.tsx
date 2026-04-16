'use client';

import Link from 'next/link';

import { BackButton } from './BackButton';
import { useSite } from './SiteProvider';
import { ThemeToggle } from './ThemeToggle';
import { UserMenu } from './UserMenu';

interface MobileHeaderProps {
  showBackButton?: boolean;
}

const MobileHeader = ({ showBackButton = false }: MobileHeaderProps) => {
  const { siteName } = useSite();
  return (
    <header className='md:hidden fixed top-0 left-0 right-0 z-999 w-full border-b border-black/6 bg-white/80 shadow-[0_12px_40px_rgba(15,23,42,0.08)] backdrop-blur-2xl dark:border-white/8 dark:bg-[#0b0d12]/76 dark:shadow-[0_18px_48px_rgba(0,0,0,0.35)]'>
      <div className='h-14 flex items-center justify-between px-4'>
        {/* 左侧：搜索按钮、返回按钮和设置按钮 */}
        <div className='flex items-center gap-2'>
          <Link
            href='/search'
            className='ui-control ui-control-icon text-[#171717] dark:text-[#fff6de]'
          >
            <svg
              className='h-5 w-5'
              fill='none'
              stroke='currentColor'
              viewBox='0 0 24 24'
              xmlns='http://www.w3.org/2000/svg'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z'
              />
            </svg>
          </Link>
          {showBackButton && <BackButton />}
        </div>

        {/* 右侧按钮 */}
        <div className='flex items-center gap-2'>
          <ThemeToggle />
          <UserMenu />
        </div>
      </div>

      {/* 中间：Logo（绝对居中） */}
      <div className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2'>
        <Link
          href='/'
          className='text-[1.35rem] font-black tracking-[-0.04em] text-[#171717] dark:text-[#fff6de] transition-opacity hover:opacity-80'
        >
          {siteName}
        </Link>
      </div>
    </header>
  );
};

export default MobileHeader;
