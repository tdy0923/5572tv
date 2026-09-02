/* eslint-disable unused-imports/no-unused-vars */

'use client';

import {
  ExternalLink,
  Globe,
  Megaphone,
  Save,
  Settings2,
  Shield,
} from 'lucide-react';
import { useEffect, useState } from 'react';

import {
  AD_POSITION_META,
  AD_POSITIONS,
  type AdSettings,
  DEFAULT_AD_SETTINGS,
  mergeAdSettings,
} from '@/lib/ad-settings';
import { AdminConfig } from '@/lib/admin.types';

import {
  FluentBadge,
  FluentButton,
  FluentCard,
  FluentInput,
  FluentSelect,
  FluentTextArea,
} from '@/components/FluentUI';
import Toggle from '@/components/Toggle';

import {
  showError,
  showSuccess,
  useAlertModal,
  useLoadingState,
} from '../admin-utils';

interface SiteConfigComponentProps {
  config: AdminConfig | null;
  refreshConfig: () => Promise<void>;
  section?: 'general' | 'ads';
}

export default function SiteConfigComponent({
  config,
  refreshConfig,
  section = 'general',
}: SiteConfigComponentProps) {
  const { alertModal, showAlert, hideAlert } = useAlertModal();
  const { isLoading, withLoading } = useLoadingState();
  const [activeAdSlot, setActiveAdSlot] = useState<
    'home_hero' | 'search_top' | 'search_sidebar' | 'play_sidebar' | 'footer'
  >('home_hero');
  const activeAdMeta = AD_POSITION_META[activeAdSlot];

  const [siteSettings, setSiteSettings] = useState<any>({
    SiteName: '',
    AnnouncementTitle: '站点公告',
    Announcement: '',
    SearchDownstreamMaxPage: 1,
    SiteInterfaceCacheTime: 7200,
    DoubanProxyType: 'direct',
    DoubanProxy: '',
    DoubanImageProxyType: 'direct',
    DoubanImageProxy: '',
    EnableExternalPlayer: false,
  });
  const [adSettings, setAdSettings] = useState<AdSettings>(DEFAULT_AD_SETTINGS);
  const [openAsDialog, setOpenAsDialog] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [editDialog, setEditDialog] = useState<{
    isOpen: boolean;
    slot: string;
    ad: any;
  }>({
    isOpen: false,
    slot: '',
    ad: null,
  });

  useEffect(() => {
    if (!config?.SiteConfig) return;
    const s = config.SiteConfig as any;
    setSiteSettings({
      SiteName: s.SiteName || '',
      AnnouncementTitle: s.AnnouncementTitle || '站点公告',
      Announcement: s.Announcement || '',
      SearchDownstreamMaxPage: s.SearchDownstreamMaxPage || 1,
      SiteInterfaceCacheTime: s.SiteInterfaceCacheTime || 7200,
      DoubanProxyType: s.DoubanProxyType || 'direct',
      DoubanProxy: s.DoubanProxy || '',
      DoubanImageProxyType: s.DoubanImageProxyType || 'direct',
      DoubanImageProxy: s.DoubanImageProxy || '',
      EnableExternalPlayer: s.EnableExternalPlayer ?? false,
    });
    if (s.AdSettings) setAdSettings(mergeAdSettings(s.AdSettings));
  }, [config]);

  const handleSiteSave = async () => {
    await withLoading('saveSiteConfig', async () => {
      try {
        const body =
          section === 'ads'
            ? { key: 'SiteConfig.AdSettings', value: adSettings }
            : { key: 'SiteConfig', value: siteSettings };
        const resp = await fetch('/api/admin/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (!resp.ok) throw new Error('保存失败');
        setHasChanges(false);
        showSuccess('保存成功', showAlert);
        await refreshConfig();
      } catch (err) {
        showError('保存失败: ' + (err as Error).message, showAlert);
      }
    });
  };

  const handleAdEdit = (slot: string, ad: any) => {
    setEditDialog({ isOpen: true, slot, ad: { ...ad } });
  };
  const handleAdSave = () => {
    if (!editDialog.slot || !editDialog.ad) return;
    setAdSettings((prev) => {
      const slotAds = (prev as any)[editDialog.slot];
      const ads = Array.isArray(slotAds) ? slotAds : [slotAds];
      return {
        ...prev,
        [editDialog.slot]: ads.map((a: any) =>
          a.id === editDialog.ad.id ? editDialog.ad : a,
        ),
      };
    });
    setHasChanges(true);
    setEditDialog({ isOpen: false, slot: '', ad: null });
  };

  const adSlotTabs = AD_POSITIONS.map((key) => ({
    key,
    label: AD_POSITION_META[key].label,
  }));

  if (section === 'ads') {
    return (
      <div className='space-y-4'>
        {/* Header */}
        <div className='flex items-center justify-between gap-3'>
          <div>
            <h3
              className='text-[15px] font-semibold'
              style={{ color: 'var(--color-foreground)' }}
            >
              广告位配置
            </h3>
            <p
              className='text-xs mt-0.5'
              style={{ color: 'var(--color-foreground-muted)' }}
            >
              {activeAdMeta.description}
            </p>
          </div>
          <FluentBadge variant='info' size='sm' rounded>
            {AD_POSITIONS.length} 个位置
          </FluentBadge>
        </div>

        <div className='flex flex-wrap gap-2 p-1 rounded-xl border bg-white dark:bg-white/[0.03] border-gray-200 dark:border-white/5'>
          {adSlotTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveAdSlot(tab.key as any)}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all duration-250 ease-out ${
                activeAdSlot === tab.key
                  ? 'bg-[#f4c24d] text-black shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className='space-y-3'>
          {[adSettings[activeAdSlot]]
            .flat()
            .filter(Boolean)
            .map((ad: any, i: number) => (
              <FluentCard
                key={ad.id || i}
                hoverable
                padding='16px'
                className='space-y-3 transition-all duration-250 ease-out hover:-translate-y-[1px]'
              >
                <div className='flex items-center justify-between gap-2'>
                  <span className='text-sm font-semibold text-gray-900 dark:text-white truncate'>
                    {ad.name || `广告 ${i + 1}`}
                  </span>
                  <FluentBadge
                    variant={ad.enabled ? 'success' : 'default'}
                    size='sm'
                    rounded
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full inline-block ${ad.enabled ? 'bg-[#22c55e]' : 'bg-[#9ca3af]'}`}
                    />
                    {ad.enabled ? '启用' : '禁用'}
                  </FluentBadge>
                </div>
                <p className='text-xs leading-relaxed text-[#9ca3af] line-clamp-2 bg-gray-50 dark:bg-white/[0.03] rounded-lg px-3 py-2 border border-gray-200 dark:border-white/5'>
                  {ad.content?.slice(0, 120) || '暂无内容'}
                </p>
                <FluentButton
                  variant='secondary'
                  size='sm'
                  onClick={() => handleAdEdit(activeAdSlot, ad)}
                >
                  编辑广告
                </FluentButton>
              </FluentCard>
            ))}
          {[adSettings[activeAdSlot]].flat().filter(Boolean).length === 0 && (
            <FluentCard padding='0'>
              <div className='py-8 text-center text-sm text-[#9ca3af]'>
                该位置暂无广告
              </div>
            </FluentCard>
          )}
        </div>

        {/* Save bar */}
        <div className='flex items-center gap-3 pt-2 sticky bottom-0 bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur rounded-xl p-3 border border-gray-200 dark:border-white/5 shadow-sm'>
          <FluentButton
            variant='primary'
            size='md'
            icon={<Save className='h-4 w-4' />}
            loading={isLoading('saveSiteConfig')}
            onClick={handleSiteSave}
          >
            保存广告配置
          </FluentButton>
          {hasChanges && (
            <span
              className='text-xs'
              style={{ color: 'var(--color-foreground-muted)' }}
            >
              有未保存的更改
            </span>
          )}
          <span className='hidden' aria-hidden>
            {alertModal.isOpen ? 'open' : 'closed'} {String(openAsDialog)}
          </span>
        </div>

        {editDialog.isOpen && (
          <div className='fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4'>
            <FluentCard
              padding='20px'
              className='max-w-lg w-full space-y-4 !bg-white dark:!bg-[#1a1a1a] shadow-2xl max-h-[85vh] overflow-y-auto'
            >
              <div className='flex items-center justify-between'>
                <h3 className='text-[15px] font-semibold text-gray-900 dark:text-white'>
                  编辑广告
                </h3>
                <FluentBadge variant='info' size='sm' rounded>
                  {editDialog.slot}
                </FluentBadge>
              </div>
              <FluentInput
                label='广告名称'
                placeholder='广告名称'
                value={editDialog.ad?.name || ''}
                onChange={(e) =>
                  setEditDialog({
                    ...editDialog,
                    ad: { ...editDialog.ad, name: e.target.value },
                  })
                }
              />
              <FluentTextArea
                label='广告内容 (HTML)'
                placeholder='广告内容 (HTML)'
                rows={6}
                value={editDialog.ad?.content || ''}
                onChange={(e) =>
                  setEditDialog({
                    ...editDialog,
                    ad: { ...editDialog.ad, content: e.target.value },
                  })
                }
              />
              <label className='flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors'>
                <input
                  type='checkbox'
                  checked={editDialog.ad?.enabled || false}
                  onChange={(e) =>
                    setEditDialog({
                      ...editDialog,
                      ad: { ...editDialog.ad, enabled: e.target.checked },
                    })
                  }
                  className='w-4 h-4 rounded border-gray-300 text-[#f4c24d] focus:ring-[#f4c24d]'
                />
                <span className='text-sm font-medium text-gray-900 dark:text-white'>
                  启用此广告
                </span>
                <FluentBadge
                  variant={editDialog.ad?.enabled ? 'success' : 'default'}
                  size='sm'
                  rounded
                  className='ml-auto'
                >
                  {editDialog.ad?.enabled ? '已启用' : '已禁用'}
                </FluentBadge>
              </label>
              <div className='flex justify-end gap-2 pt-2'>
                <FluentButton
                  variant='ghost'
                  size='sm'
                  onClick={() =>
                    setEditDialog({ isOpen: false, slot: '', ad: null })
                  }
                >
                  取消
                </FluentButton>
                <FluentButton
                  variant='primary'
                  size='sm'
                  icon={<Save className='h-3.5 w-3.5' />}
                  onClick={handleAdSave}
                >
                  保存
                </FluentButton>
              </div>
            </FluentCard>
          </div>
        )}
      </div>
    );
  }

  const S = siteSettings;
  const setS = (key: string, value: any) => {
    setSiteSettings((prev: any) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  return (
    <div className='space-y-4'>
      {/* Header */}
      <div className='flex items-center justify-between gap-3'>
        <div>
          <h3
            className='text-[15px] font-semibold'
            style={{ color: 'var(--color-foreground)' }}
          >
            站点配置
          </h3>
          <p
            className='text-xs mt-0.5'
            style={{ color: 'var(--color-foreground-muted)' }}
          >
            品牌、公告、代理与播放器设置
          </p>
        </div>
        <FluentBadge variant='default' size='sm' rounded>
          <Settings2 className='w-3 h-3' /> 基础设置
        </FluentBadge>
      </div>

      {/* 基础信息 */}
      <FluentCard padding='16px' className='space-y-4'>
        <div className='flex items-center gap-2'>
          <span className='w-7 h-7 rounded-lg bg-[#f4c24d]/15 flex items-center justify-center'>
            <Globe className='w-3.5 h-3.5 text-[#f4c24d]' />
          </span>
          <h4 className='text-sm font-semibold text-gray-900 dark:text-white'>
            基础信息
          </h4>
          <FluentBadge variant='info' size='sm' rounded>
            品牌与公告
          </FluentBadge>
        </div>
        <div className='grid gap-4'>
          <FluentInput
            label='站点名称'
            value={S.SiteName}
            onChange={(e) => setS('SiteName', e.target.value)}
            placeholder='例如：5572TV'
          />
          <FluentInput
            label='公告标题'
            value={S.AnnouncementTitle}
            onChange={(e) => setS('AnnouncementTitle', e.target.value)}
            placeholder='站点公告'
          />
          <FluentTextArea
            label='公告内容'
            value={S.Announcement}
            onChange={(e) => setS('Announcement', e.target.value)}
            rows={4}
            placeholder='输入公告内容，支持换行...'
          />
        </div>
      </FluentCard>

      {/* 搜索与缓存 */}
      <FluentCard padding='16px' className='space-y-4'>
        <div className='flex items-center gap-2'>
          <span className='w-7 h-7 rounded-lg bg-[#3b82f6]/15 flex items-center justify-center'>
            <Settings2 className='w-3.5 h-3.5 text-[#3b82f6]' />
          </span>
          <h4 className='text-sm font-semibold text-gray-900 dark:text-white'>
            搜索与缓存
          </h4>
        </div>
        <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
          <FluentInput
            label='搜索最大页数'
            type='number'
            min={1}
            value={String(S.SearchDownstreamMaxPage)}
            onChange={(e) =>
              setS('SearchDownstreamMaxPage', parseInt(e.target.value) || 1)
            }
            placeholder='1'
          />
          <FluentInput
            label='接口缓存时间（秒）'
            type='number'
            min={0}
            value={String(S.SiteInterfaceCacheTime)}
            onChange={(e) =>
              setS('SiteInterfaceCacheTime', parseInt(e.target.value) || 7200)
            }
            placeholder='7200'
          />
        </div>
        <p className='text-xs text-[#9ca3af]'>
          搜索页数越大覆盖越全但速度越慢；缓存时间影响采集源接口的刷新频率。
        </p>
      </FluentCard>

      {/* 代理设置 */}
      <FluentCard padding='16px' className='space-y-4'>
        <div className='flex items-center gap-2'>
          <span className='w-7 h-7 rounded-lg bg-[#22c55e]/15 flex items-center justify-center'>
            <Shield className='w-3.5 h-3.5 text-[#22c55e]' />
          </span>
          <h4 className='text-sm font-semibold text-gray-900 dark:text-white'>
            豆瓣代理
          </h4>
          <FluentBadge variant='default' size='sm' rounded>
            可选代理
          </FluentBadge>
        </div>

        <div className='space-y-4'>
          <FluentSelect
            label='豆瓣数据代理类型'
            value={S.DoubanProxyType}
            onChange={(e) => setS('DoubanProxyType', e.target.value)}
            options={[
              { value: 'direct', label: '直连' },
              { value: 'proxy', label: '代理' },
            ]}
          />
          {S.DoubanProxyType === 'proxy' && (
            <FluentInput
              label='豆瓣代理地址'
              value={S.DoubanProxy}
              onChange={(e) => setS('DoubanProxy', e.target.value)}
              placeholder='https://your-proxy.com'
            />
          )}
          <FluentSelect
            label='豆瓣图片代理类型'
            value={S.DoubanImageProxyType}
            onChange={(e) => setS('DoubanImageProxyType', e.target.value)}
            options={[
              { value: 'direct', label: '直连' },
              { value: 'proxy', label: '代理' },
            ]}
          />
          {S.DoubanImageProxyType === 'proxy' && (
            <FluentInput
              label='图片代理地址'
              value={S.DoubanImageProxy}
              onChange={(e) => setS('DoubanImageProxy', e.target.value)}
              placeholder='https://img-proxy.example.com'
            />
          )}
        </div>
      </FluentCard>

      {/* 播放器 */}
      <FluentCard padding='16px'>
        <div className='flex items-center justify-between gap-4'>
          <div className='flex items-start gap-3'>
            <span className='w-7 h-7 rounded-lg bg-[#f59e0b]/15 flex items-center justify-center shrink-0 mt-0.5'>
              <ExternalLink className='w-3.5 h-3.5 text-[#f59e0b]' />
            </span>
            <div>
              <div className='flex items-center gap-2'>
                <span className='text-sm font-medium text-gray-900 dark:text-white'>
                  外部播放器
                </span>
                <FluentBadge
                  variant={S.EnableExternalPlayer ? 'success' : 'default'}
                  size='sm'
                  rounded
                >
                  {S.EnableExternalPlayer ? '已开启' : '已关闭'}
                </FluentBadge>
              </div>
              <p className='text-xs text-[#9ca3af] mt-1 leading-relaxed max-w-[36rem]'>
                开启后，用户可在播放页面使用外部播放器（PotPlayer、VLC、MPV
                等）打开视频，提升大屏与本地播放体验。
              </p>
            </div>
          </div>
          <Toggle
            checked={S.EnableExternalPlayer}
            onChange={(v) => setS('EnableExternalPlayer', v)}
          />
        </div>
      </FluentCard>

      {/* 额外公告卡片点缀 */}
      <FluentCard
        padding='12px'
        className='flex items-center gap-3 bg-gradient-to-r from-[#f4c24d]/10 to-transparent dark:from-[#f4c24d]/5'
      >
        <span className='w-8 h-8 rounded-xl bg-[#f4c24d]/20 flex items-center justify-center shrink-0'>
          <Megaphone className='w-4 h-4 text-[#f4c24d]' />
        </span>
        <div className='flex-1 min-w-0'>
          <p className='text-xs font-medium text-gray-900 dark:text-white truncate'>
            公告将展示在首页顶部
          </p>
          <p className='text-xs text-[#9ca3af] truncate'>
            标题：{S.AnnouncementTitle || '站点公告'} · 内容长度
            {S.Announcement?.length || 0} 字符
          </p>
        </div>
        <FluentBadge variant='warning' size='sm' rounded>
          预览
        </FluentBadge>
      </FluentCard>

      {/* Save bar */}
      <div className='flex items-center gap-3 pt-1 sticky bottom-0 bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur rounded-xl p-3 border border-gray-200 dark:border-white/5 shadow-sm'>
        <FluentButton
          variant='primary'
          size='md'
          icon={<Save className='h-4 w-4' />}
          loading={isLoading('saveSiteConfig')}
          onClick={handleSiteSave}
        >
          {isLoading('saveSiteConfig') ? '保存中…' : '保存配置'}
        </FluentButton>
        {hasChanges ? (
          <span
            className='text-xs'
            style={{ color: 'var(--color-foreground-muted)' }}
          >
            有未保存的更改
          </span>
        ) : (
          <span className='text-xs text-[#22c55e] flex items-center gap-1'>
            <span className='w-1.5 h-1.5 rounded-full bg-[#22c55e] inline-block' />
            已同步
          </span>
        )}
        <span className='hidden' aria-hidden>
          {alertModal.isOpen ? 'open' : 'closed'} {String(openAsDialog)}
        </span>
      </div>
    </div>
  );
}
