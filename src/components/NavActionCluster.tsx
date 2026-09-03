'use client';

import { Bell } from 'lucide-react';

import { ThemeToggle } from './ThemeToggle';
import { UserMenu } from './UserMenu';

type NavActionClusterProps = {
  onAnnouncementClick?: () => void;
  hasUnreadAnnouncement?: boolean;
  announcementLabel?: string;
  compact?: boolean;
};

export function NavActionCluster({
  onAnnouncementClick,
  hasUnreadAnnouncement = false,
  announcementLabel = '公告',
}: NavActionClusterProps) {
  const actionButtonClass =
    'nav-cluster-btn bg-transparent text-gray-700 hover:bg-black/[0.05] dark:text-gray-100 dark:hover:bg-white/[0.08]';

  return (
    <div className='flex items-center gap-1'>
      {onAnnouncementClick && (
        <button
          onClick={onAnnouncementClick}
          className={actionButtonClass}
          aria-label={announcementLabel}
          title={announcementLabel}
        >
          <Bell
            className={hasUnreadAnnouncement ? 'text-amber-500' : ''}
            strokeWidth={2.5}
          />
          {hasUnreadAnnouncement && (
            <span className='absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white dark:ring-[#0c0f14]' />
          )}
        </button>
      )}
      <ThemeToggle />
      <UserMenu />
    </div>
  );
}
