'use client';

import { Search } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { isAIRecommendFeatureDisabled } from '@/lib/ai-recommend.client';

import AIRecommendModal from './AIRecommendModal';
import { BackButton } from './BackButton';
import ModernNav from './ModernNav';
import { NavActionCluster } from './NavActionCluster';
import { SiteAdSlot } from './SiteAdSlot';
import { useSite } from './SiteProvider';

interface PageLayoutProps {
  children: React.ReactNode;
  activePath?: string;
  useModernNav?: boolean; // 新增：是否使用2025现代化导航
  onAnnouncementClick?: () => void;
  hasUnreadAnnouncement?: boolean;
}

const PageLayout = ({
  children,
  activePath = '/',
  useModernNav = true,
  onAnnouncementClick,
  hasUnreadAnnouncement = false,
}: PageLayoutProps) => {
  const { siteName } = useSite();

  // ✨ AI 推荐功能 - 全局管理
  const [showAIRecommendModal, setShowAIRecommendModal] = useState(false);
  const [aiEnabled, setAiEnabled] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAiEnabled(!isAIRecommendFeatureDisabled());
  }, []);

  if (useModernNav) {
    // 2025 Modern Navigation Layout
    return (
      <>
        <div className='ui-shell w-full min-h-screen'>
          {/* Modern Navigation - Top (Desktop) & Bottom (Mobile) */}
          <ModernNav
            showAIButton={aiEnabled ?? false}
            onAIButtonClick={() => setShowAIRecommendModal(true)}
            onAnnouncementClick={onAnnouncementClick}
            hasUnreadAnnouncement={hasUnreadAnnouncement}
          />

          {/* 移动端头部 - 搜索、Logo和用户菜单 */}
          <div
            className='ui-nav-surface md:hidden fixed top-0 left-0 right-0 z-40'
            style={{ paddingTop: 'env(safe-area-inset-top)' }}
          >
            <div className='flex items-center justify-between h-11 px-4'>
              {/* 左侧：搜索 + 返回按钮 */}
              <div className='flex shrink-0 items-center gap-1'>
                <Link
                  href='/search'
                  className='flex h-11 w-11 items-center justify-center rounded-full text-gray-700 transition-all duration-150 hover:bg-black/[0.05] active:scale-95 dark:text-gray-100 dark:hover:bg-white/[0.08]'
                  aria-label='搜索'
                  title='搜索'
                >
                  <Search className='h-5 w-5' />
                </Link>
                {activePath !== '/' && <BackButton />}
              </div>

              {/* 中间：Logo（播放/直播页留空） */}
              {['/play', '/live'].includes(activePath) ? (
                <div className='flex-1' />
              ) : (
                <div className='flex-1 text-center text-sm sm:text-base font-bold bg-linear-to-r from-[#111111] via-[#2a2a2a] to-[#b78415] dark:from-white dark:via-[#f4f4f4] dark:to-[#f4c24d] bg-clip-text text-transparent truncate'>
                  {siteName}
                </div>
              )}

              {/* 右侧操作区 */}
              <NavActionCluster
                showAIButton={aiEnabled ?? false}
                onAIButtonClick={() => setShowAIRecommendModal(true)}
                onAnnouncementClick={onAnnouncementClick}
                hasUnreadAnnouncement={hasUnreadAnnouncement}
                compact
              />
            </div>
          </div>

          {/* Main Content - 移动端44px顶部+安全区 + 底部导航栏空间，桌面端64px */}
          <main
            className='w-full min-h-screen pb-16 pt-[calc(44px+env(safe-area-inset-top))] md:pb-8 md:pt-16'
            style={{
              paddingBottom: 'calc(4rem + env(safe-area-inset-bottom))',
            }}
          >
            <div className='ui-page-frame px-3 sm:px-5 md:px-8 lg:px-12 xl:px-16 2xl:px-20'>
              <div className='ui-page-container px-3 py-4 sm:px-5 sm:py-5 md:px-6 md:py-6 lg:px-8 lg:py-7'>
                {children}
                <SiteAdSlot position='footer' className='mt-8' />
              </div>
            </div>
          </main>
        </div>

        {/* ✨ AI 推荐弹窗 */}
        <AIRecommendModal
          isOpen={showAIRecommendModal}
          onClose={() => setShowAIRecommendModal(false)}
        />
      </>
    );
  }
};

export default PageLayout;
