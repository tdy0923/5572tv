'use client';

import { Bell, Sparkles } from 'lucide-react';

import { ThemeToggle } from './ThemeToggle';
import { UserMenu } from './UserMenu';

type NavActionClusterProps = {
  showAIButton?: boolean;
  onAIButtonClick?: () => void;
  onAnnouncementClick?: () => void;
  hasUnreadAnnouncement?: boolean;
  announcementLabel?: string;
  compact?: boolean;
};

export function NavActionCluster({
  showAIButton = false,
  onAIButtonClick,
  onAnnouncementClick,
  hasUnreadAnnouncement = false,
  announcementLabel = '公告',
  compact = false,
}: NavActionClusterProps) {
  const actionHeight = compact ? 'h-9' : 'h-10';
  const iconClass = compact ? 'h-4 w-4' : 'h-[18px] w-[18px]';
  const actionButtonClass = `relative flex ${actionHeight} w-10 items-center justify-center rounded-full bg-transparent text-gray-700 transition-all duration-200 hover:bg-black/[0.05] active:scale-95 dark:text-gray-100 dark:hover:bg-white/[0.08]`;

  return (
    <div className='flex items-center gap-1'>
      {showAIButton && onAIButtonClick && (
        <button
          onClick={onAIButtonClick}
          className={`relative flex ${actionHeight} w-10 items-center justify-center rounded-full bg-linear-to-br from-[#f4c24d] to-[#dba52b] text-[#171717] transition-all duration-200 hover:from-[#ffd56f] hover:to-[#d39b1f] active:scale-95`}
          aria-label='AI 推荐'
        >
          <Sparkles
            className={`${iconClass} transition-transform duration-300`}
          />
        </button>
      )}
      {onAnnouncementClick && (
        <button
          onClick={onAnnouncementClick}
          className={actionButtonClass}
          aria-label={announcementLabel}
          title={announcementLabel}
        >
          <Bell
            className={`${iconClass} ${hasUnreadAnnouncement ? 'text-amber-500' : 'text-gray-500 dark:text-gray-300'}`}
          />
          {hasUnreadAnnouncement && (
            <span className='absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white dark:ring-[#0c0f14]' />
          )}
        </button>
      )}
      <ThemeToggle />
      <UserMenu />
    </div>
  );
}
