/* eslint-disable unused-imports/no-unused-vars */

'use client';

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
  buttonStyles,
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
    setEditDialog({ isOpen: false, slot: '', ad: null });
  };

  const adSlotTabs = AD_POSITIONS.map((key) => ({
    key,
    label: AD_POSITION_META[key].label,
  }));

  if (section === 'ads') {
    return (
      <div className='space-y-6'>
        <div className='flex flex-wrap gap-2'>
          {adSlotTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveAdSlot(tab.key as any)}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${activeAdSlot === tab.key ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <p className='text-sm text-gray-500'>
          位置: {activeAdMeta.description}
        </p>
        <div className='space-y-3'>
          {[adSettings[activeAdSlot]]
            .flat()
            .filter(Boolean)
            .map((ad: any, i: number) => (
              <div
                key={ad.id || i}
                className='p-4 border rounded-lg bg-white dark:bg-gray-800 space-y-2'
              >
                <div className='flex items-center justify-between'>
                  <span className='text-sm font-medium'>
                    {ad.name || `广告 ${i + 1}`}
                  </span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded ${ad.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}
                  >
                    {ad.enabled ? '启用' : '禁用'}
                  </span>
                </div>
                <p className='text-xs text-gray-500'>
                  {ad.content?.slice(0, 80)}...
                </p>
                <button
                  onClick={() => handleAdEdit(activeAdSlot, ad)}
                  className={buttonStyles.primarySmall}
                >
                  编辑
                </button>
              </div>
            ))}
        </div>
        <button
          onClick={handleSiteSave}
          className={`px-4 py-2 ${buttonStyles.success} rounded-lg`}
        >
          保存广告配置
        </button>

        {editDialog.isOpen && (
          <div className='fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4'>
            <div className='bg-white dark:bg-gray-800 rounded-lg max-w-lg w-full p-6 space-y-3'>
              <h3 className='text-lg font-semibold'>编辑广告</h3>
              <input
                className='w-full px-3 py-2 border rounded text-sm'
                placeholder='广告名称'
                value={editDialog.ad?.name || ''}
                onChange={(e) =>
                  setEditDialog({
                    ...editDialog,
                    ad: { ...editDialog.ad, name: e.target.value },
                  })
                }
              />
              <textarea
                className='w-full h-24 px-3 py-2 border rounded text-sm font-mono'
                placeholder='广告内容 (HTML)'
                value={editDialog.ad?.content || ''}
                onChange={(e) =>
                  setEditDialog({
                    ...editDialog,
                    ad: { ...editDialog.ad, content: e.target.value },
                  })
                }
              />
              <label className='flex items-center gap-2 text-sm'>
                <input
                  type='checkbox'
                  checked={editDialog.ad?.enabled || false}
                  onChange={(e) =>
                    setEditDialog({
                      ...editDialog,
                      ad: { ...editDialog.ad, enabled: e.target.checked },
                    })
                  }
                />
                启用
              </label>
              <div className='flex justify-end gap-2'>
                <button
                  onClick={() =>
                    setEditDialog({ isOpen: false, slot: '', ad: null })
                  }
                  className={buttonStyles.secondarySmall}
                >
                  取消
                </button>
                <button
                  onClick={handleAdSave}
                  className={buttonStyles.primarySmall}
                >
                  保存
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  const S = siteSettings;
  const setS = (key: string, value: any) =>
    setSiteSettings((prev: any) => ({ ...prev, [key]: value }));
  const inp =
    'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm';
  const lbl = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1';

  return (
    <div className='space-y-6'>
      <div className='space-y-4'>
        <div>
          <label className={lbl}>站点名称</label>
          <input
            value={S.SiteName}
            onChange={(e) => setS('SiteName', e.target.value)}
            className={inp}
          />
        </div>
        <div>
          <label className={lbl}>公告标题</label>
          <input
            value={S.AnnouncementTitle}
            onChange={(e) => setS('AnnouncementTitle', e.target.value)}
            className={inp}
          />
        </div>
        <div>
          <label className={lbl}>公告内容</label>
          <textarea
            value={S.Announcement}
            onChange={(e) => setS('Announcement', e.target.value)}
            rows={4}
            className={inp}
          />
        </div>
        <div className='grid grid-cols-2 gap-4'>
          <div>
            <label className={lbl}>搜索最大页数</label>
            <input
              type='number'
              value={S.SearchDownstreamMaxPage}
              onChange={(e) =>
                setS('SearchDownstreamMaxPage', parseInt(e.target.value) || 1)
              }
              className={inp}
            />
          </div>
          <div>
            <label className={lbl}>接口缓存时间（秒）</label>
            <input
              type='number'
              value={S.SiteInterfaceCacheTime}
              onChange={(e) =>
                setS('SiteInterfaceCacheTime', parseInt(e.target.value) || 7200)
              }
              className={inp}
            />
          </div>
        </div>
        <div>
          <label className={lbl}>豆瓣数据代理类型</label>
          <select
            value={S.DoubanProxyType}
            onChange={(e) => setS('DoubanProxyType', e.target.value)}
            className={inp}
          >
            <option value='direct'>直连</option>
            <option value='proxy'>代理</option>
          </select>
        </div>
        {S.DoubanProxyType === 'proxy' && (
          <div>
            <label className={lbl}>豆瓣代理地址</label>
            <input
              value={S.DoubanProxy}
              onChange={(e) => setS('DoubanProxy', e.target.value)}
              className={inp}
              placeholder='https://your-proxy.com'
            />
          </div>
        )}
        <div>
          <label className={lbl}>豆瓣图片代理类型</label>
          <select
            value={S.DoubanImageProxyType}
            onChange={(e) => setS('DoubanImageProxyType', e.target.value)}
            className={inp}
          >
            <option value='direct'>直连</option>
            <option value='proxy'>代理</option>
          </select>
        </div>
        {S.DoubanImageProxyType === 'proxy' && (
          <div>
            <label className={lbl}>图片代理地址</label>
            <input
              value={S.DoubanImageProxy}
              onChange={(e) => setS('DoubanImageProxy', e.target.value)}
              className={inp}
            />
          </div>
        )}
        <div className='flex items-center justify-between py-2'>
          <div>
            <label className='text-sm font-medium text-gray-700 dark:text-gray-300'>
              外部播放器
            </label>
            <p className='text-xs text-gray-500 dark:text-gray-400 mt-1'>
              开启后，用户可在播放页面使用外部播放器（PotPlayer、VLC、MPV等）打开视频
            </p>
          </div>
          <button
            onClick={() =>
              setS('EnableExternalPlayer', !S.EnableExternalPlayer)
            }
            className='relative inline-flex h-6 w-11 items-center rounded-full transition-colors'
            style={{
              backgroundColor: S.EnableExternalPlayer ? '#22c55e' : '#d1d5db',
            }}
          >
            <span
              className='inline-block h-4 w-4 transform rounded-full bg-white transition-transform'
              style={{
                transform: S.EnableExternalPlayer
                  ? 'translateX(22px)'
                  : 'translateX(2px)',
              }}
            />
          </button>
        </div>
      </div>
      <button
        onClick={handleSiteSave}
        disabled={isLoading('saveSiteConfig')}
        className={`px-4 py-2 ${isLoading('saveSiteConfig') ? buttonStyles.disabled : buttonStyles.success} rounded-lg transition-colors`}
      >
        {isLoading('saveSiteConfig') ? '保存中…' : '保存配置'}
      </button>
    </div>
  );
}
