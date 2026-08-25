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
}: NavActionClusterProps) {
  const actionHeight = 'h-11';
  // 图标用 strokeWidth 2.5 提升小尺寸清晰度，避免线条过细看不清楚
  const iconClass = 'h-8 w-8';
  const actionButtonClass = `relative flex ${actionHeight} w-11 items-center justify-center rounded-full bg-transparent text-gray-700 transition-all duration-200 hover:bg-black/[0.05] active:scale-95 dark:text-gray-100 dark:hover:bg-white/[0.08]`;

  return (
    <div className='flex items-center gap-1'>
      {showAIButton && onAIButtonClick && (
        <button
          onClick={onAIButtonClick}
          className={`relative flex ${actionHeight} w-11 items-center justify-center rounded-full bg-linear-to-br from-blue-500 to-purple-600 text-white shadow-lg shadow-blue-500/20 transition-all duration-200 hover:from-blue-600 hover:to-purple-700 hover:shadow-blue-500/30 active:scale-95`}
          aria-label='AI 推荐'
          title='AI 推荐'
        >
          <Sparkles
            className={`${iconClass} transition-transform duration-300`}
            strokeWidth={2.5}
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
            strokeWidth={2.5}
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
