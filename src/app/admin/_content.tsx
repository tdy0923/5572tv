/* eslint-disable react-hooks/exhaustive-deps */

/* eslint-disable unused-imports/no-unused-vars */

'use client';

import {
  Activity,
  AlertTriangle,
  Brain,
  ChevronLeft,
  Database,
  Download,
  FileText,
  FolderOpen,
  Search,
  Settings,
  Shield,
  TestTube,
  Ticket,
  Tv,
  Users,
  Video,
} from 'lucide-react';
import { KeyRound, LayoutTemplate, MessageSquare, Palette } from 'lucide-react';
import dynamic from 'next/dynamic';
import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

import { AdminConfig, AdminConfigResult } from '@/lib/admin.types';

import PerformanceMonitor from '@/components/admin/PerformanceMonitor';
import PerformanceSummaryCards from '@/components/admin/PerformanceSummaryCards';
import ThemeEditor from '@/components/admin/ThemeEditor';
import AIRecommendConfig from '@/components/AIRecommendConfig';
import CacheManager from '@/components/CacheManager';
import CustomAdFilterConfig from '@/components/CustomAdFilterConfig';
import DanmuApiConfig from '@/components/DanmuApiConfig';
import DataMigration from '@/components/DataMigration';
import EmbyConfig from '@/components/EmbyConfig';
import { FluentLoadingPage } from '@/components/FluentSpinner';
import InviteCodeManager from '@/components/InviteCodeManager';
import DownloadConfig from '@/components/OfflineDownloadConfig';
import { OIDCAuthConfig } from '@/components/OIDCAuthConfig';
import PageLayout from '@/components/PageLayout';
import SourceTestModule from '@/components/SourceTestModule';
import { TelegramAuthConfig } from '@/components/TelegramAuthConfig';
import TrustedNetworkConfig from '@/components/TrustedNetworkConfig';
import TVBoxSecurityConfig from '@/components/TVBoxSecurityConfig';
import WatchRoomConfig from '@/components/WatchRoomConfig';

import {
  AlertModal,
  buttonStyles,
  showError,
  showSuccess,
  useAlertModal,
  useLoadingState,
} from './admin-utils';
import CategoryConfig from './sections/category-config';
import ConfigFileComponent from './sections/config-file';
import NetDiskConfig from './sections/netdisk-config';
import SiteConfigComponent from './sections/site-config';
const LiveSourceConfig = dynamic(
  () => import('./sections/live-source-config'),
  {
    loading: () => (
      <div className='flex justify-center py-12'>
        <div className='h-6 w-6 animate-spin rounded-full border-2 border-[var(--color-primary-500)] border-t-transparent' />
      </div>
    ),
  },
);
const SourceScripts = dynamic(() => import('./sections/source-scripts'), {
  loading: () => (
    <div className='flex justify-center py-12'>
      <div className='h-6 w-6 animate-spin rounded-full border-2 border-[var(--color-primary-500)] border-t-transparent' />
    </div>
  ),
});
const UserConfig = dynamic(() => import('./sections/user-config'), {
  loading: () => (
    <div className='flex justify-center py-12'>
      <div className='h-6 w-6 animate-spin rounded-full border-2 border-[var(--color-primary-500)] border-t-transparent' />
    </div>
  ),
});
const VideoSourceConfig = dynamic(
  () => import('./sections/video-source-config'),
  {
    loading: () => (
      <div className='flex justify-center py-12'>
        <div className='h-6 w-6 animate-spin rounded-full border-2 border-[var(--color-primary-500)] border-t-transparent' />
      </div>
    ),
  },
);
function AdminMetricCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: string | number;
  helper?: string;
}) {
  return (
    <div className='ui-surface rounded-[var(--radius-2xl)] px-5 py-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-8)]'>
      <div className='text-[11px] uppercase tracking-[0.18em] text-[var(--color-foreground-muted)]'>
        {label}
      </div>
      <div className='mt-2 text-2xl font-semibold text-[var(--color-foreground)]'>
        {value}
      </div>
      {helper && (
        <div className='mt-1 text-xs text-[var(--color-foreground-subtle)]'>
          {helper}
        </div>
      )}
    </div>
  );
}

function AdminModulePanel({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className='space-y-4'>
      <div className='flex items-center gap-3 px-1'>
        <div className='flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--color-primary-50)] text-[var(--color-primary-600)] dark:bg-[var(--color-primary-500)]/15 dark:text-[var(--color-primary-300)]'>
          {icon}
        </div>
        <h3 className='text-[15px] font-semibold tracking-tight text-[var(--color-foreground)]'>
          {title}
        </h3>
      </div>
      <div>{children}</div>
    </div>
  );
}

function AdminPageClient() {
  const { alertModal, showAlert, hideAlert } = useAlertModal();
  const { isLoading, withLoading } = useLoadingState();
  const [config, setConfig] = useState<AdminConfig | null>(null);
  const [activeAdminSection, setActiveAdminSection] =
    useState('system-performance');
  const [activeAdminGroup, setActiveAdminGroup] = useState('总览');
  const [adminSearchQuery, setAdminSearchQuery] = useState('');
  const [isNavCollapsed, setIsNavCollapsed] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const adminSections = useMemo(
    () => [
      {
        group: '总览',
        items: [
          { id: 'system-performance', label: '统计中心', icon: Activity },
          { id: 'cache-tools', label: '缓存管理', icon: Database },
          { id: 'data-migration', label: '数据迁移', icon: Database },
        ],
      },
      {
        group: '站点与外观',
        items: [
          { id: 'site-config', label: '站点配置', icon: Settings },
          { id: 'theme-config', label: '主题定制', icon: Palette },
          { id: 'config-file', label: '配置文件', icon: FileText },
          { id: 'site-ads', label: '广告位配置', icon: LayoutTemplate },
        ],
      },
      {
        group: '用户与安全',
        items: [
          { id: 'user-config', label: '用户配置', icon: Users },
          { id: 'invite-tools', label: '邀请码', icon: Ticket },
          { id: 'security-tools', label: '安全配置', icon: Shield },
          { id: 'trusted-network', label: '信任网络', icon: Shield },
          { id: 'telegram-auth', label: 'Telegram 登录', icon: KeyRound },
          { id: 'oidc-auth', label: 'OIDC 登录', icon: KeyRound },
        ],
      },
      {
        group: '内容与发现',
        items: [
          { id: 'source-config', label: '视频源', icon: Video },
          { id: 'live-config', label: '直播源', icon: Tv },
          { id: 'source-scripts', label: '源脚本', icon: FileText },
          { id: 'system-tools', label: '源检测', icon: TestTube },
          { id: 'category-config', label: '分类配置', icon: FolderOpen },
          { id: 'netdisk-config', label: '网盘搜索', icon: Database },
          { id: 'ai-config', label: 'AI 推荐', icon: Brain },
        ],
      },
      {
        group: '播放与能力',
        items: [
          { id: 'media-tools', label: '媒体工具', icon: FolderOpen },
          { id: 'download-tools', label: '下载工具', icon: Download },
          { id: 'watchroom-tools', label: '观影室', icon: Users },
          { id: 'adfilter-tools', label: '去广告', icon: Video },
          { id: 'danmu-tools', label: '弹幕能力', icon: MessageSquare },
        ],
      },
    ],
    [],
  );
  const filteredAdminSections = useMemo(() => {
    if (!adminSearchQuery.trim()) return adminSections;
    const q = adminSearchQuery.toLowerCase();
    return adminSections
      .map((group) => ({
        ...group,
        items: group.items.filter(
          (item) =>
            item.label.toLowerCase().includes(q) ||
            item.id.toLowerCase().includes(q) ||
            group.group.toLowerCase().includes(q),
        ),
      }))
      .filter((group) => group.items.length > 0);
  }, [adminSections, adminSearchQuery]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        document.getElementById('admin-search-input')?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState<'owner' | 'admin' | null>(null);
  const [showResetConfigModal, setShowResetConfigModal] = useState(false);
  const [expandedTabs, setExpandedTabs] = useState<{ [key: string]: boolean }>({
    userConfig: false,
    videoSource: false,
    sourceTest: false,
    liveSource: false,
    siteConfig: false,
    categoryConfig: false,
    netdiskConfig: false,
    aiRecommendConfig: false,
    shortDramaConfig: false,
    embyConfig: false,
    downloadConfig: false,
    customAdFilter: false,
    watchRoomConfig: false,
    tvboxSecurityConfig: false,
    trustedNetworkConfig: false,
    danmuApiConfig: false,
    telegramAuthConfig: false,
    oidcAuthConfig: false,
    inviteCodeManager: false,
    configFile: false,
    cacheManager: false,
    dataMigration: false,
    performanceMonitor: false,
  });

  const adminSectionGroups = useMemo(
    () => ({
      总览: new Set(['system-performance', 'cache-tools', 'data-migration']),
      站点与外观: new Set([
        'site-config',
        'theme-config',
        'config-file',
        'site-ads',
      ]),
      用户与安全: new Set([
        'user-config',
        'invite-tools',
        'security-tools',
        'trusted-network',
        'telegram-auth',
        'oidc-auth',
      ]),
      内容源与发现: new Set([
        'source-config',
        'live-config',
        'source-scripts',
        'system-tools',
        'category-config',
        'netdisk-config',
        'ai-config',
      ]),
      播放与能力: new Set([
        'media-tools',
        'download-tools',
        'watchroom-tools',
        'adfilter-tools',
        'danmu-tools',
      ]),
    }),
    [],
  );

  const adminGroupDescriptions = useMemo(
    () => ({
      总览: '核心运营数据与系统健康一目了然。',
      站点与外观: '站点信息、主题、配置文件与广告位集中管理。',
      用户与安全: '用户、邀请码、登录方式、访问控制与安全。',
      内容与发现: '视频源、直播源、源脚本、源检测、分类、网盘与 AI 推荐。',
      播放与能力: '影库、下载、观影室、去广告与弹幕等播放能力。',
    }),
    [],
  );

  const activeAdminSectionMeta = useMemo(() => {
    for (const group of adminSections) {
      const found = group.items.find((item) => item.id === activeAdminSection);
      if (found) return found;
    }
    return null;
  }, [activeAdminSection, adminSections]);

  const activeAdminGroupMeta = useMemo(
    () => adminSections.find((group) => group.group === activeAdminGroup),
    [activeAdminGroup, adminSections],
  );

  // 获取管理员配置
  // showLoading 用于控制是否在请求期间显示整体加载骨架。
  const fetchConfig = useCallback(async (showLoading = false) => {
    try {
      if (showLoading) {
        setLoading(true);
      }

      const response = await fetch(`/api/admin/config`);

      if (!response.ok) {
        const data = (await response.json()) as any;
        throw new Error(`获取配置失败: ${data.error}`);
      }

      const data = (await response.json()) as AdminConfigResult;
      setConfig(data.Config);
      setRole(data.Role);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '获取配置失败';
      showError(msg, showAlert);
      setError(msg);
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    // 首次加载时显示骨架
    fetchConfig(true);
  }, [fetchConfig]);

  // 切换标签展开状态
  const toggleTab = (tabKey: string) => {
    setExpandedTabs((prev) => ({
      ...prev,
      [tabKey]: !prev[tabKey],
    }));
  };

  // 新增: 重置配置处理函数
  const handleResetConfig = () => {
    setShowResetConfigModal(true);
  };

  const handleConfirmResetConfig = async () => {
    await withLoading('resetConfig', async () => {
      try {
        const response = await fetch(`/api/admin/reset`);
        if (!response.ok) {
          throw new Error(`重置失败: ${response.status}`);
        }
        showSuccess('重置成功，请刷新页面！', showAlert);
        await fetchConfig();
        setShowResetConfigModal(false);
      } catch (err) {
        showError(err instanceof Error ? err.message : '重置失败', showAlert);
        throw err;
      }
    });
  };

  if (loading) {
    return (
      <PageLayout activePath='/admin'>
        <div className='-mt-6 md:mt-0'>
          <div className='ui-page-width'>
            <h1 className='text-2xl font-bold text-gray-900 dark:text-gray-100 mb-8'>
              管理员设置
            </h1>
            <div className='space-y-6'>
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={`skeleton-${index}`}
                  className='relative h-24 bg-linear-to-r from-[var(--color-background-subtle)] via-[var(--color-background-muted)] to-[var(--color-background-subtle)] rounded-[var(--radius-2xl)] overflow-hidden'
                >
                  <div className='absolute inset-0 -translate-x-full animate-[fluent2-shimmer_1.5s_ease-in-out_infinite] bg-linear-to-r from-transparent via-white/20 to-transparent'></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </PageLayout>
    );
  }

  if (error) {
    return (
      <PageLayout activePath='/admin'>
        <div className='-mt-6 md:mt-0'>
          <div className='ui-page-width pb-40 md:pb-safe-bottom'>
            <div className='ui-surface p-8 text-center'>
              <div className='text-lg font-semibold text-gray-900 dark:text-gray-100'>
                管理后台加载失败
              </div>
              <p className='mt-3 text-sm text-gray-500 dark:text-gray-400'>
                {error}
              </p>
              <button
                onClick={() => window.location.reload()}
                className='mt-6 ui-secondary-button'
              >
                重新加载
              </button>
            </div>
          </div>
        </div>
      </PageLayout>
    );
  }

  const isSectionActive = (sectionId: string) =>
    activeAdminSection === sectionId;

  return (
    <PageLayout activePath='/admin'>
      <div className='-mt-6 md:mt-0'>
        <div className='ui-page-width pb-40 md:pb-safe-bottom'>
          <div className='mb-8 flex items-center gap-2'>
            <h1 className='text-2xl font-bold text-gray-900 dark:text-gray-100'>
              管理员设置
            </h1>
            {config && role === 'owner' && (
              <button
                onClick={handleResetConfig}
                className={`rounded-md px-3 py-1 text-xs transition-colors ${buttonStyles.dangerSmall}`}
              >
                重置配置
              </button>
            )}
          </div>

          {/* 移动端抽屉触发栏 */}
          <div className='lg:hidden mb-4 flex items-center justify-between gap-3'>
            <button
              onClick={() => setIsMobileNavOpen(true)}
              className='inline-flex items-center gap-2 rounded-full border border-[var(--color-stroke)] bg-[var(--color-background)] px-4 py-2 text-sm font-medium text-[var(--color-foreground)] shadow-sm'
            >
              <span className='h-2 w-2 rounded-full bg-[var(--color-primary-500)]' />
              {activeAdminGroup} / {activeAdminSectionMeta?.label || '后台'}
            </button>
            <span className='text-xs text-[var(--color-foreground-muted)]'>
              {activeAdminGroupMeta?.items.length || 0} 项
            </span>
          </div>

          <div
            className={`grid gap-6 grid-cols-1 ${isNavCollapsed ? 'lg:grid-cols-[72px_minmax(0,1fr)]' : 'lg:grid-cols-[260px_minmax(0,1fr)]'}`}
          >
            {/* 移动端抽屉遮罩 */}
            {isMobileNavOpen && (
              <button
                aria-label='关闭导航'
                onClick={() => setIsMobileNavOpen(false)}
                className='fixed inset-0 z-40 bg-black/30 backdrop-blur-sm lg:hidden'
              />
            )}
            <aside
              className={`${isMobileNavOpen ? 'fixed inset-y-0 left-0 z-50 w-[86%] max-w-[320px] overflow-y-auto p-4 shadow-2xl' : 'hidden'} lg:sticky lg:top-24 lg:flex lg:h-fit lg:max-h-[calc(100vh-6rem)] lg:w-auto lg:translate-x-0 flex-col overflow-y-auto ${isNavCollapsed ? 'lg:p-2' : 'lg:p-4'} ui-screen`}
            >
              <div className='mb-3 flex items-center justify-between'>
                {!isNavCollapsed && (
                  <div>
                    <div className='text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-foreground-muted)]'>
                      Admin Console
                    </div>
                    <div className='mt-1 text-sm font-semibold text-[var(--color-foreground)]'>
                      后台导航
                    </div>
                  </div>
                )}
                <button
                  onClick={() => setIsNavCollapsed((v) => !v)}
                  className='hidden lg:inline-flex h-8 w-8 items-center justify-center rounded-full border border-[var(--color-stroke)] bg-[var(--color-background)] text-[var(--color-foreground-muted)] hover:bg-[var(--color-background-subtle)]'
                  aria-label={isNavCollapsed ? '展开导航' : '收起导航'}
                >
                  <ChevronLeft
                    size={16}
                    className={`transition-transform ${isNavCollapsed ? 'rotate-180' : ''}`}
                  />
                </button>
              </div>

              {!isNavCollapsed && (
                <div className='relative mb-3'>
                  <Search
                    size={14}
                    className='pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-foreground-muted)]'
                  />
                  <input
                    id='admin-search-input'
                    value={adminSearchQuery}
                    onChange={(e) => setAdminSearchQuery(e.target.value)}
                    placeholder='搜索模块 / 功能…  ⌘K'
                    className='w-full rounded-full border border-[var(--color-stroke)] bg-[var(--color-background)] py-2 pl-9 pr-8 text-sm text-[var(--color-foreground)] placeholder:text-[var(--color-foreground-muted)] focus:border-[var(--color-primary-400)] focus:outline-none'
                  />
                  {adminSearchQuery && (
                    <button
                      onClick={() => setAdminSearchQuery('')}
                      className='absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-[var(--color-foreground-muted)] hover:bg-[var(--color-background-subtle)]'
                    >
                      ×
                    </button>
                  )}
                </div>
              )}

              <div className='space-y-1'>
                {adminSearchQuery && filteredAdminSections.length === 0 && (
                  <div className='rounded-xl border border-dashed border-[var(--color-stroke)] p-4 text-center text-sm text-[var(--color-foreground-muted)]'>
                    无匹配结果
                  </div>
                )}
                {(adminSearchQuery ? filteredAdminSections : adminSections).map(
                  (group) => (
                    <div key={group.group}>
                      <button
                        onClick={() => {
                          setActiveAdminGroup(group.group);
                          const firstSection = group.items[0]?.id;
                          if (firstSection) {
                            setActiveAdminSection(firstSection);
                          }
                          setIsMobileNavOpen(false);
                        }}
                        className={`flex w-full items-center justify-between rounded-[var(--radius-xl)] px-3 py-2.5 text-left transition-all duration-200 ${
                          activeAdminGroup === group.group
                            ? 'bg-[var(--color-primary-50)] text-[var(--color-primary-700)] dark:bg-[var(--color-primary-500)]/15 dark:text-[var(--color-primary-300)] shadow-[var(--shadow-2)]'
                            : 'text-[var(--color-foreground-subtle)] hover:bg-[var(--color-background-subtle)] hover:text-[var(--color-foreground)] dark:hover:bg-white/5'
                        }`}
                      >
                        <span
                          className={`${isNavCollapsed ? 'text-center w-full' : 'text-sm font-semibold'}`}
                        >
                          {isNavCollapsed
                            ? group.group.slice(0, 1)
                            : group.group}
                        </span>
                        {!isNavCollapsed && (
                          <span className='text-xs opacity-60'>
                            {group.items.length}
                          </span>
                        )}
                      </button>
                    </div>
                  ),
                )}
              </div>
            </aside>

            <section className='space-y-6 min-w-0'>
              <nav className='flex items-center gap-1.5 text-xs text-[var(--color-foreground-muted)]'>
                <span>后台</span>
                <span className='opacity-40'>/</span>
                <span className='font-medium text-[var(--color-foreground)]'>
                  {activeAdminGroup}
                </span>
                {activeAdminSectionMeta && (
                  <>
                    <span className='opacity-40'>/</span>
                    <span className='font-medium text-[var(--color-primary-600)] dark:text-[var(--color-primary-400)]'>
                      {activeAdminSectionMeta.label}
                    </span>
                  </>
                )}
              </nav>
              <div className='ui-surface p-5'>
                <div className='text-xs font-semibold uppercase tracking-[0.24em] text-gray-500 dark:text-gray-400'>
                  {activeAdminGroup}
                </div>
                <div className='mt-2 text-2xl font-semibold text-gray-900 dark:text-gray-100'>
                  {activeAdminSectionMeta?.label || '后台工作区'}
                </div>
                {activeAdminGroupMeta && (
                  <div className='mt-5 border-t border-[var(--color-stroke-subtle)] pt-4'>
                    <div className='flex flex-wrap gap-2'>
                      {activeAdminGroupMeta.items.map((section) => {
                        const Icon = section.icon;
                        return (
                          <button
                            key={section.id}
                            onClick={() => setActiveAdminSection(section.id)}
                            className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium transition-all duration-200 ${
                              activeAdminSection === section.id
                                ? 'bg-[var(--color-primary-50)] text-[var(--color-primary-700)] dark:bg-[var(--color-primary-500)]/15 dark:text-[var(--color-primary-300)] shadow-[var(--shadow-2)]'
                                : 'border border-[var(--color-stroke)] bg-[var(--color-background)] text-[var(--color-foreground-subtle)] hover:bg-[var(--color-background-subtle)] hover:text-[var(--color-foreground)] dark:hover:bg-white/5'
                            }`}
                          >
                            <Icon size={16} />
                            <span>{section.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className='mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4'>
                  {activeAdminSection === 'site-config' && (
                    <>
                      <AdminMetricCard
                        label='站点名称'
                        value={config?.SiteConfig?.SiteName || '未设置'}
                        helper='前台显示'
                      />
                      <AdminMetricCard
                        label='公告状态'
                        value={
                          config?.SiteConfig?.Announcement ? '已启用' : '未配置'
                        }
                        helper='公告配置'
                      />
                      <AdminMetricCard
                        label='默认用户组'
                        value={config?.SiteConfig?.DefaultUserTags?.length || 0}
                        helper='默认分组'
                      />
                      <AdminMetricCard
                        label='豆瓣代理'
                        value={config?.SiteConfig?.DoubanProxyType || 'direct'}
                        helper='数据链路'
                      />
                    </>
                  )}

                  {activeAdminSection === 'user-config' && (
                    <>
                      <AdminMetricCard
                        label='用户总数'
                        value={config?.UserConfig?.Users?.length || 0}
                        helper='账号数'
                      />
                      <AdminMetricCard
                        label='管理员'
                        value={
                          config?.UserConfig?.Users?.filter(
                            (user) => user.role === 'admin',
                          ).length || 0
                        }
                        helper='不含站长'
                      />
                      <AdminMetricCard
                        label='站长'
                        value={
                          config?.UserConfig?.Users?.filter(
                            (user) => user.role === 'owner',
                          ).length || 0
                        }
                        helper='最高权限'
                      />
                      <AdminMetricCard
                        label='用户组'
                        value={config?.UserConfig?.Tags?.length || 0}
                        helper='权限分组'
                      />
                    </>
                  )}

                  {activeAdminSection === 'source-config' && (
                    <>
                      <AdminMetricCard
                        label='视频源总数'
                        value={config?.SourceConfig?.length || 0}
                        helper='视频源'
                      />
                      <AdminMetricCard
                        label='启用中'
                        value={
                          config?.SourceConfig?.filter(
                            (source) => !source.disabled,
                          ).length || 0
                        }
                        helper='已启用'
                      />
                      <AdminMetricCard
                        label='成人源'
                        value={
                          config?.SourceConfig?.filter(
                            (source) => source.is_adult,
                          ).length || 0
                        }
                        helper='成人源'
                      />
                      <AdminMetricCard
                        label='短剧源'
                        value={
                          config?.SourceConfig?.filter(
                            (source) => source.type === 'shortdrama',
                          ).length || 0
                        }
                        helper='短剧源'
                      />
                    </>
                  )}

                  {activeAdminSection === 'live-config' && (
                    <>
                      <AdminMetricCard
                        label='直播源总数'
                        value={config?.LiveConfig?.length || 0}
                        helper='直播源'
                      />
                      <AdminMetricCard
                        label='启用中'
                        value={
                          config?.LiveConfig?.filter(
                            (source) => !source.disabled,
                          ).length || 0
                        }
                        helper='已启用'
                      />
                      <AdminMetricCard
                        label='TVBox 源'
                        value={
                          config?.LiveConfig?.filter((source) => source.isTvBox)
                            .length || 0
                        }
                        helper='TVBox'
                      />
                      <AdminMetricCard
                        label='EPG 配置'
                        value={
                          config?.LiveConfig?.filter((source) => !!source.epg)
                            .length || 0
                        }
                        helper='EPG'
                      />
                    </>
                  )}

                  {activeAdminGroup === '系统运维' && (
                    <>
                      <AdminMetricCard
                        label='当前模块'
                        value={activeAdminSectionMeta?.label || '系统运维'}
                        helper='工作区'
                      />
                      <AdminMetricCard
                        label='缓存能力'
                        value='已启用'
                        helper='缓存'
                      />
                      <AdminMetricCard
                        label='迁移能力'
                        value='已启用'
                        helper='迁移'
                      />
                      <AdminMetricCard
                        label='性能监控'
                        value='可用'
                        helper='监控'
                      />
                    </>
                  )}

                  {activeAdminGroup === '系统运维' && (
                    <div className='sm:col-span-2 xl:col-span-4 grid gap-3 lg:grid-cols-3'>
                      <button
                        onClick={() => setActiveAdminSection('cache-tools')}
                        className='rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 text-left transition-colors hover:bg-white dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-white/[0.08]'
                      >
                        <div className='text-sm font-semibold text-gray-900 dark:text-gray-100'>
                          缓存管理
                        </div>
                        <div className='mt-1 text-xs text-gray-500 dark:text-gray-400'>
                          清理和统计缓存数据
                        </div>
                      </button>
                      <button
                        onClick={() => setActiveAdminSection('data-migration')}
                        className='rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 text-left transition-colors hover:bg-white dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-white/[0.08]'
                      >
                        <div className='text-sm font-semibold text-gray-900 dark:text-gray-100'>
                          数据迁移
                        </div>
                        <div className='mt-1 text-xs text-gray-500 dark:text-gray-400'>
                          导入、导出和升级数据
                        </div>
                      </button>
                      <button
                        onClick={() =>
                          setActiveAdminSection('system-performance')
                        }
                        className='rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 text-left transition-colors hover:bg-white dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-white/[0.08]'
                      >
                        <div className='text-sm font-semibold text-gray-900 dark:text-gray-100'>
                          统计中心
                        </div>
                        <div className='mt-1 text-xs text-gray-500 dark:text-gray-400'>
                          访问、来源和性能数据
                        </div>
                      </button>
                    </div>
                  )}

                  {activeAdminGroup === '内容源与发现' && (
                    <div className='sm:col-span-2 xl:col-span-4 grid gap-3 lg:grid-cols-4'>
                      <button
                        onClick={() => setActiveAdminSection('source-config')}
                        className='rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 text-left transition-colors hover:bg-white dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-white/[0.08]'
                      >
                        <div className='text-sm font-semibold text-gray-900 dark:text-gray-100'>
                          视频源
                        </div>
                        <div className='mt-1 text-xs text-gray-500 dark:text-gray-400'>
                          普通视频内容源管理
                        </div>
                      </button>
                      <button
                        onClick={() => setActiveAdminSection('live-config')}
                        className='rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 text-left transition-colors hover:bg-white dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-white/[0.08]'
                      >
                        <div className='text-sm font-semibold text-gray-900 dark:text-gray-100'>
                          直播源
                        </div>
                        <div className='mt-1 text-xs text-gray-500 dark:text-gray-400'>
                          频道与节目单配置
                        </div>
                      </button>
                      <button
                        onClick={() => setActiveAdminSection('category-config')}
                        className='rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 text-left transition-colors hover:bg-white dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-white/[0.08]'
                      >
                        <div className='text-sm font-semibold text-gray-900 dark:text-gray-100'>
                          分类配置
                        </div>
                        <div className='mt-1 text-xs text-gray-500 dark:text-gray-400'>
                          分类与展示结构
                        </div>
                      </button>
                      <button
                        onClick={() => setActiveAdminSection('netdisk-config')}
                        className='rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 text-left transition-colors hover:bg-white dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-white/[0.08]'
                      >
                        <div className='text-sm font-semibold text-gray-900 dark:text-gray-100'>
                          网盘搜索
                        </div>
                        <div className='mt-1 text-xs text-gray-500 dark:text-gray-400'>
                          网盘内容聚合入口
                        </div>
                      </button>
                    </div>
                  )}

                  {activeAdminGroup === '播放与媒体' && (
                    <div className='sm:col-span-2 xl:col-span-4 grid gap-3 lg:grid-cols-4'>
                      <button
                        onClick={() => setActiveAdminSection('media-tools')}
                        className='rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 text-left transition-colors hover:bg-white dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-white/[0.08]'
                      >
                        <div className='text-sm font-semibold text-gray-900 dark:text-gray-100'>
                          Emby 集成
                        </div>
                      </button>
                      <button
                        onClick={() => setActiveAdminSection('download-tools')}
                        className='rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 text-left transition-colors hover:bg-white dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-white/[0.08]'
                      >
                        <div className='text-sm font-semibold text-gray-900 dark:text-gray-100'>
                          下载中心
                        </div>
                      </button>
                      <button
                        onClick={() => setActiveAdminSection('watchroom-tools')}
                        className='rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 text-left transition-colors hover:bg-white dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-white/[0.08]'
                      >
                        <div className='text-sm font-semibold text-gray-900 dark:text-gray-100'>
                          观影室
                        </div>
                      </button>
                      <button
                        onClick={() => setActiveAdminSection('adfilter-tools')}
                        className='rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 text-left transition-colors hover:bg-white dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-white/[0.08]'
                      >
                        <div className='text-sm font-semibold text-gray-900 dark:text-gray-100'>
                          播放增强
                        </div>
                      </button>
                    </div>
                  )}

                  {activeAdminGroup === '系统运维' &&
                    activeAdminSection === 'system-performance' &&
                    role === 'owner' && <PerformanceSummaryCards />}
                </div>
              </div>

              <div className='space-y-6'>
                {/* 配置文件标签 - 仅站长可见 */}
                {role === 'owner' && isSectionActive('config-file') && (
                  <div id='config-file'>
                    <AdminModulePanel
                      title='配置文件'
                      icon={
                        <FileText
                          size={20}
                          className='text-gray-600 dark:text-gray-400'
                        />
                      }
                    >
                      <ConfigFileComponent
                        config={config}
                        refreshConfig={fetchConfig}
                      />
                    </AdminModulePanel>
                  </div>
                )}

                {/* 站点配置标签 */}
                {isSectionActive('site-config') && (
                  <div id='site-config'>
                    <AdminModulePanel
                      title='站点配置'
                      icon={
                        <Settings
                          size={20}
                          className='text-gray-600 dark:text-gray-400'
                        />
                      }
                    >
                      <SiteConfigComponent
                        config={config}
                        refreshConfig={fetchConfig}
                      />
                    </AdminModulePanel>
                  </div>
                )}

                {/* 主题定制标签 */}
                {isSectionActive('theme-config') && (
                  <div id='theme-config'>
                    <AdminModulePanel
                      title='主题定制'
                      icon={
                        <Palette
                          size={20}
                          className='text-purple-600 dark:text-purple-400'
                        />
                      }
                    >
                      <ThemeEditor
                        initialCustomCSS={config?.SiteConfig?.CustomCSS || ''}
                        onSave={async (css) => {
                          const response = await fetch('/api/theme/css', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ CustomCSS: css }),
                          });
                          if (!response.ok) {
                            let msg = `保存失败: ${response.status}`;
                            try {
                              const data = (await response.json()) as { error?: string };
                              if (data?.error) msg = data.error;
                            } catch {}
                            throw new Error(msg);
                          }
                          await fetchConfig();
                        }}
                      />
                    </AdminModulePanel>
                  </div>
                )}

                {isSectionActive('site-ads') && (
                  <div id='site-ads'>
                    <AdminModulePanel
                      title='广告位配置'
                      icon={
                        <LayoutTemplate
                          size={20}
                          className='text-gray-600 dark:text-gray-400'
                        />
                      }
                    >
                      <SiteConfigComponent
                        config={config}
                        refreshConfig={fetchConfig}
                        section='ads'
                      />
                    </AdminModulePanel>
                  </div>
                )}

                {/* 用户配置标签 */}
                {isSectionActive('user-config') && (
                  <div id='user-config'>
                    <AdminModulePanel
                      title='用户配置'
                      icon={
                        <Users
                          size={20}
                          className='text-gray-600 dark:text-gray-400'
                        />
                      }
                    >
                      <UserConfig
                        config={config}
                        role={role}
                        refreshConfig={fetchConfig}
                      />
                    </AdminModulePanel>
                  </div>
                )}

                {/* 邀请码管理标签 - 仅站长可见 */}
                {role === 'owner' && isSectionActive('invite-tools') && (
                  <div id='invite-tools'>
                    <AdminModulePanel
                      title='邀请码管理'
                      icon={
                        <Ticket
                          size={20}
                          className='text-blue-500 dark:text-blue-400'
                        />
                      }
                    >
                      <InviteCodeManager />
                    </AdminModulePanel>
                  </div>
                )}

                {/* 视频源配置标签 */}
                {isSectionActive('source-config') && (
                  <div id='source-config'>
                    <AdminModulePanel
                      title='视频源配置'
                      icon={
                        <Video
                          size={20}
                          className='text-gray-600 dark:text-gray-400'
                        />
                      }
                    >
                      <VideoSourceConfig
                        config={config}
                        refreshConfig={fetchConfig}
                      />
                    </AdminModulePanel>
                  </div>
                )}

                {/* 源检测标签 */}
                {isSectionActive('system-tools') && (
                  <div id='system-tools'>
                    <AdminModulePanel
                      title='源检测'
                      icon={
                        <TestTube
                          size={20}
                          className='text-gray-600 dark:text-gray-400'
                        />
                      }
                    >
                      <SourceTestModule />
                    </AdminModulePanel>
                  </div>
                )}

                {/* 直播源配置标签 */}
                {isSectionActive('live-config') && (
                  <div id='live-config'>
                    <AdminModulePanel
                      title='直播源配置'
                      icon={
                        <Tv
                          size={20}
                          className='text-gray-600 dark:text-gray-400'
                        />
                      }
                    >
                      <LiveSourceConfig
                        config={config}
                        refreshConfig={fetchConfig}
                      />
                    </AdminModulePanel>
                  </div>
                )}

                {/* 分类配置标签 */}
                {isSectionActive('category-config') && (
                  <AdminModulePanel
                    title='分类配置'
                    icon={
                      <FolderOpen
                        size={20}
                        className='text-gray-600 dark:text-gray-400'
                      />
                    }
                  >
                    <CategoryConfig
                      config={config}
                      refreshConfig={fetchConfig}
                    />
                  </AdminModulePanel>
                )}

                {/* 网盘搜索配置标签 */}
                {isSectionActive('netdisk-config') && (
                  <AdminModulePanel
                    title='网盘搜索配置'
                    icon={
                      <Database
                        size={20}
                        className='text-gray-600 dark:text-gray-400'
                      />
                    }
                  >
                    <NetDiskConfig
                      config={config}
                      refreshConfig={fetchConfig}
                    />
                  </AdminModulePanel>
                )}

                {/* 源脚本配置标签 */}
                {isSectionActive('source-scripts') && (
                  <AdminModulePanel
                    title='源脚本配置'
                    icon={
                      <FileText
                        size={20}
                        className='text-gray-600 dark:text-gray-400'
                      />
                    }
                  >
                    <SourceScripts />
                  </AdminModulePanel>
                )}

                {/* AI推荐配置标签 */}
                {isSectionActive('ai-config') && (
                  <AdminModulePanel
                    title='AI推荐配置'
                    icon={
                      <Brain
                        size={20}
                        className='text-gray-600 dark:text-gray-400'
                      />
                    }
                  >
                    <AIRecommendConfig
                      config={config}
                      refreshConfig={fetchConfig}
                    />
                  </AdminModulePanel>
                )}

                {/* 短剧API配置标签 - 暂时隐藏，代码保留以后有用再显示
            <AdminModulePanel
              title='短剧API配置'
              icon={
                <Video
                  size={20}
                  className='text-purple-600 dark:text-purple-400'
                />
              }
              isExpanded={expandedTabs.shortDramaConfig}
              onToggle={() => toggleTab('shortDramaConfig')}
            >
              <ShortDramaConfig config={config} refreshConfig={fetchConfig} />
            </CollapsibleTab>
            */}

                {/* Emby配置标签 */}
                {isSectionActive('media-tools') && (
                  <div id='media-tools'>
                    <AdminModulePanel
                      title='Emby私人影库'
                      icon={
                        <FolderOpen
                          size={20}
                          className='text-indigo-600 dark:text-indigo-400'
                        />
                      }
                    >
                      <EmbyConfig config={config} refreshConfig={fetchConfig} />
                    </AdminModulePanel>
                  </div>
                )}

                {/* 下载配置标签 */}
                {isSectionActive('download-tools') && (
                  <div id='download-tools'>
                    <AdminModulePanel
                      title='下载配置'
                      icon={
                        <Download
                          size={20}
                          className='text-green-600 dark:text-green-400'
                        />
                      }
                    >
                      <DownloadConfig
                        config={config}
                        refreshConfig={fetchConfig}
                      />
                    </AdminModulePanel>
                  </div>
                )}

                {/* 自定义去广告标签 */}
                {isSectionActive('adfilter-tools') && (
                  <AdminModulePanel
                    title='自定义去广告'
                    icon={
                      <Video
                        size={20}
                        className='text-purple-600 dark:text-purple-400'
                      />
                    }
                  >
                    <CustomAdFilterConfig
                      config={config}
                      refreshConfig={fetchConfig}
                    />
                  </AdminModulePanel>
                )}

                {/* 观影室配置标签 */}
                {isSectionActive('watchroom-tools') && (
                  <div id='watchroom-tools'>
                    <AdminModulePanel
                      title='观影室配置'
                      icon={
                        <Users
                          size={20}
                          className='text-indigo-600 dark:text-indigo-400'
                        />
                      }
                    >
                      <WatchRoomConfig
                        config={config}
                        refreshConfig={fetchConfig}
                      />
                    </AdminModulePanel>
                  </div>
                )}

                {/* TVBox安全配置标签 */}
                {isSectionActive('security-tools') && (
                  <div id='security-tools'>
                    <AdminModulePanel
                      title='TVBox安全配置'
                      icon={
                        <Settings
                          size={20}
                          className='text-gray-600 dark:text-gray-400'
                        />
                      }
                    >
                      <TVBoxSecurityConfig
                        config={config}
                        refreshConfig={fetchConfig}
                      />
                    </AdminModulePanel>
                  </div>
                )}

                {/* 信任网络配置 - 仅站长可见 */}
                {role === 'owner' && isSectionActive('trusted-network') && (
                  <AdminModulePanel
                    title='信任网络配置'
                    icon={
                      <Shield
                        size={20}
                        className='text-green-600 dark:text-green-400'
                      />
                    }
                  >
                    <TrustedNetworkConfig
                      config={config}
                      refreshConfig={fetchConfig}
                    />
                  </AdminModulePanel>
                )}

                {/* 弹幕API配置 - 仅站长可见 */}
                {role === 'owner' && isSectionActive('danmu-tools') && (
                  <div id='danmu-tools'>
                    <AdminModulePanel
                      title='弹幕API配置'
                      icon={
                        <MessageSquare
                          size={20}
                          className='text-purple-600 dark:text-purple-400'
                        />
                      }
                    >
                      <DanmuApiConfig
                        config={config}
                        refreshConfig={fetchConfig}
                      />
                    </AdminModulePanel>
                  </div>
                )}

                {/* Telegram 登录配置 - 仅站长可见 */}
                {role === 'owner' && isSectionActive('telegram-auth') && (
                  <div id='auth-tools'>
                    <TelegramAuthConfig
                      config={
                        config?.TelegramAuthConfig || {
                          enabled: false,
                          botToken: '',
                          botUsername: '',
                          autoRegister: true,
                          buttonSize: 'large',
                          showAvatar: true,
                          requestWriteAccess: false,
                        }
                      }
                      onSave={async (newConfig) => {
                        if (!config) return;
                        await fetch('/api/admin/config', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            ...config,
                            TelegramAuthConfig: newConfig,
                          }),
                        });
                        await fetchConfig();
                      }}
                    />
                  </div>
                )}

                {/* OIDC 登录配置 - 仅站长可见 */}
                {role === 'owner' && isSectionActive('oidc-auth') && (
                  <OIDCAuthConfig
                    config={
                      config?.OIDCAuthConfig || {
                        enabled: false,
                        enableRegistration: false,
                        issuer: '',
                        authorizationEndpoint: '',
                        tokenEndpoint: '',
                        userInfoEndpoint: '',
                        clientId: '',
                        clientSecret: '',
                        buttonText: '',
                        minTrustLevel: 0,
                      }
                    }
                    providers={config?.OIDCProviders || []}
                    onSave={async (newConfig) => {
                      if (!config) return;
                      await fetch('/api/admin/config', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          ...config,
                          OIDCAuthConfig: newConfig,
                        }),
                      });
                      await fetchConfig();
                    }}
                    onSaveProviders={async (newProviders) => {
                      if (!config) return;
                      const updatedConfig = {
                        ...config,
                        OIDCProviders: newProviders,
                      };
                      // 如果切换到多provider模式，删除旧的单provider配置
                      if (newProviders.length > 0) {
                        delete updatedConfig.OIDCAuthConfig;
                      }
                      await fetch('/api/admin/config', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(updatedConfig),
                      });
                      await fetchConfig();
                    }}
                  />
                )}

                {/* 缓存管理标签 - 仅站长可见 */}
                {role === 'owner' && isSectionActive('cache-tools') && (
                  <div id='cache-tools'>
                    <AdminModulePanel
                      title='缓存管理'
                      icon={
                        <Database
                          size={20}
                          className='text-gray-600 dark:text-gray-400'
                        />
                      }
                    >
                      <CacheManager />
                    </AdminModulePanel>
                  </div>
                )}

                {/* 数据迁移标签 - 仅站长可见 */}
                {role === 'owner' && isSectionActive('data-migration') && (
                  <div id='cache-tools'>
                    <AdminModulePanel
                      title='数据迁移'
                      icon={
                        <Database
                          size={20}
                          className='text-gray-600 dark:text-gray-400'
                        />
                      }
                    >
                      <DataMigration onRefreshConfig={fetchConfig} />
                    </AdminModulePanel>
                  </div>
                )}

                {/* 性能监控标签 - 仅站长可见 */}
                {role === 'owner' && isSectionActive('system-performance') && (
                  <div id='system-performance'>
                    <AdminModulePanel
                      title='性能监控'
                      icon={
                        <Activity
                          size={20}
                          className='text-gray-600 dark:text-gray-400'
                        />
                      }
                    >
                      <PerformanceMonitor />
                    </AdminModulePanel>
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      </div>

      {/* 通用弹窗组件 */}
      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={hideAlert}
        type={alertModal.type}
        title={alertModal.title}
        message={alertModal.message}
        timer={alertModal.timer}
        showConfirm={alertModal.showConfirm}
      />

      {/* 重置配置确认弹窗 */}
      {showResetConfigModal &&
        createPortal(
          <div
            className='fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4'
            onClick={() => setShowResetConfigModal(false)}
          >
            <div
              className='bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full'
              onClick={(e) => e.stopPropagation()}
            >
              <div className='p-6'>
                <div className='flex items-center justify-between mb-6'>
                  <h3 className='text-xl font-semibold text-gray-900 dark:text-gray-100'>
                    确认重置配置
                  </h3>
                  <button
                    onClick={() => setShowResetConfigModal(false)}
                    className='text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors'
                  >
                    <svg
                      className='w-6 h-6'
                      fill='none'
                      stroke='currentColor'
                      viewBox='0 0 24 24'
                    >
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={2}
                        d='M6 18L18 6M6 6l12 12'
                      />
                    </svg>
                  </button>
                </div>

                <div className='mb-6'>
                  <div className='bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-4'>
                    <div className='flex items-center space-x-2 mb-2'>
                      <svg
                        className='w-5 h-5 text-yellow-600 dark:text-yellow-400'
                        fill='none'
                        stroke='currentColor'
                        viewBox='0 0 24 24'
                      >
                        <path
                          strokeLinecap='round'
                          strokeLinejoin='round'
                          strokeWidth={2}
                          d='M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
                        />
                      </svg>
                      <span className='text-sm font-medium text-yellow-800 dark:text-yellow-300 flex items-center gap-1'>
                        <AlertTriangle className='w-4 h-4' /> 危险操作警告
                      </span>
                    </div>
                    <p className='text-sm text-yellow-700 dark:text-yellow-400'>
                      此操作将重置用户封禁和管理员设置、自定义视频源，站点配置将重置为默认值，是否继续？
                    </p>
                  </div>
                </div>

                {/* 操作按钮 */}
                <div className='flex justify-end space-x-3'>
                  <button
                    onClick={() => setShowResetConfigModal(false)}
                    className={`px-6 py-2.5 text-sm font-medium ${buttonStyles.secondary}`}
                  >
                    取消
                  </button>
                  <button
                    onClick={handleConfirmResetConfig}
                    disabled={isLoading('resetConfig')}
                    className={`px-6 py-2.5 text-sm font-medium ${isLoading('resetConfig') ? buttonStyles.disabled : buttonStyles.danger}`}
                  >
                    {isLoading('resetConfig') ? '重置中...' : '确认重置'}
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </PageLayout>
  );
}

export default function AdminPage() {
  return (
    <Suspense fallback={<FluentLoadingPage />}>
      <AdminPageClient />
    </Suspense>
  );
}
