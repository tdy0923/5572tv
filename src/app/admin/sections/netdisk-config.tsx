/* eslint-disable unused-imports/no-unused-vars */

'use client';

import { Cloud, Folder, HardDrive, Save } from 'lucide-react';
import { useEffect, useState } from 'react';

import { AdminConfig } from '@/lib/admin.types';

import {
  FluentBadge,
  FluentButton,
  FluentCard,
  FluentCheckbox,
  FluentEmptyState,
  FluentInput,
  FluentSpinner,
} from '@/components/FluentUI';

import {
  AlertModal,
  showError,
  showSuccess,
  useAlertModal,
  useLoadingState,
} from '../admin-utils';

const CLOUD_TYPE_OPTIONS = [
  { key: 'baidu', name: '百度网盘', icon: 'Folder' },
  { key: 'aliyun', name: '阿里云盘', icon: 'Cloud' },
  { key: 'quark', name: '夸克网盘', icon: '⚡' },
  { key: 'tianyi', name: '天翼云盘', icon: '📱' },
  { key: 'uc', name: 'UC网盘', icon: '🌐' },
  { key: 'mobile', name: '移动云盘', icon: '📲' },
  { key: '115', name: '115网盘', icon: '💾' },
  { key: 'pikpak', name: 'PikPak', icon: '📦' },
  { key: 'xunlei', name: '迅雷网盘', icon: '⚡' },
  { key: '123', name: '123网盘', icon: '🔢' },
  { key: 'magnet', name: '磁力链接', icon: '🧲' },
  { key: 'ed2k', name: '电驴链接', icon: '🐴' },
];

interface NetDiskConfigProps {
  config: AdminConfig | null;
  refreshConfig: () => Promise<void>;
}

export default function NetDiskConfig({
  config,
  refreshConfig,
}: NetDiskConfigProps) {
  const { alertModal, showAlert, hideAlert } = useAlertModal();
  const { isLoading, withLoading } = useLoadingState();

  const [netDiskSettings, setNetDiskSettings] = useState({
    enabled: true,
    pansouUrl: 'https://so.252035.xyz',
    timeout: 30,
    enabledCloudTypes: [
      'baidu',
      'aliyun',
      'quark',
      'tianyi',
      'uc',
      'mobile',
      '115',
      'pikpak',
      'xunlei',
      '123',
      'magnet',
      'ed2k',
    ],
  });

  useEffect(() => {
    if ((config as any)?.NetDiskConfig) {
      const c = (config as any).NetDiskConfig;
      setNetDiskSettings({
        enabled: c.enabled ?? true,
        pansouUrl: c.pansouUrl || 'https://so.252035.xyz',
        timeout: c.timeout || 30,
        enabledCloudTypes: c.enabledCloudTypes || [
          'baidu',
          'aliyun',
          'quark',
          'tianyi',
          'uc',
        ],
      });
    }
  }, [config]);

  const handleSave = async () => {
    await withLoading('saveNetDiskConfig', async () => {
      try {
        const response = await fetch('/api/admin/netdisk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(netDiskSettings),
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || '保存失败');
        }
        showSuccess('网盘搜索配置保存成功', showAlert);
        await refreshConfig();
      } catch (err) {
        showError(err instanceof Error ? err.message : '保存失败', showAlert);
      }
    });
  };

  const handleCloudTypeChange = (type: string, enabled: boolean) => {
    setNetDiskSettings((prev) => ({
      ...prev,
      enabledCloudTypes: enabled
        ? [...prev.enabledCloudTypes, type]
        : prev.enabledCloudTypes.filter((t) => t !== type),
    }));
  };

  const handleSelectAll = (selectAll: boolean) => {
    setNetDiskSettings((prev) => ({
      ...prev,
      enabledCloudTypes: selectAll ? CLOUD_TYPE_OPTIONS.map((o) => o.key) : [],
    }));
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
            网盘搜索配置
          </h3>
          <p
            className='text-xs mt-0.5'
            style={{ color: 'var(--color-foreground-muted)' }}
          >
            集成 PanSou · {netDiskSettings.enabledCloudTypes.length} /{' '}
            {CLOUD_TYPE_OPTIONS.length} 已启用 ·{' '}
            {netDiskSettings.enabled ? '已开启' : '已关闭'}
          </p>
        </div>
        <div className='flex items-center gap-2'>
          <FluentBadge
            variant={netDiskSettings.enabled ? 'success' : 'default'}
            size='sm'
            rounded
          >
            <span
              className={`w-1.5 h-1.5 rounded-full inline-block ${netDiskSettings.enabled ? 'bg-[#22c55e]' : 'bg-[#9ca3af]'}`}
            />
            {netDiskSettings.enabled ? '启用' : '禁用'}
          </FluentBadge>
          <FluentButton
            variant='secondary'
            size='sm'
            onClick={() => handleSelectAll(true)}
          >
            全选
          </FluentButton>
          <FluentButton
            variant='ghost'
            size='sm'
            onClick={() => handleSelectAll(false)}
          >
            清空
          </FluentButton>
        </div>
      </div>

      {/* Basic settings */}
      <FluentCard padding='16px' className='space-y-4'>
        <div className='flex items-center gap-2'>
          <span className='w-7 h-7 rounded-lg bg-[#3b82f6]/15 flex items-center justify-center'>
            <HardDrive className='w-3.5 h-3.5 text-[#3b82f6]' />
          </span>
          <h4 className='text-sm font-semibold text-gray-900 dark:text-white'>
            基础设置
          </h4>
          <FluentBadge variant='info' size='sm' rounded>
            PanSou
          </FluentBadge>
        </div>

        <div className='flex items-center gap-3 text-xs leading-relaxed bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 px-3 py-2.5 rounded-xl'>
          <span className='text-gray-700 dark:text-gray-300'>
            📡 集成开源项目 <strong>PanSou</strong> 提供网盘资源搜索功能
          </span>
          <a
            href='https://github.com/fish2018/pansou'
            target='_blank'
            rel='noopener noreferrer'
            className='text-blue-600 dark:text-blue-400 hover:underline font-medium shrink-0'
          >
            查看项目
          </a>
        </div>

        <div className='space-y-4'>
          <label className='flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors'>
            <FluentCheckbox
              checked={netDiskSettings.enabled}
              onCheckedChange={(checked) =>
                setNetDiskSettings((p) => ({ ...p, enabled: checked }))
              }
            />
            <span className='text-sm font-medium text-gray-900 dark:text-white'>
              启用网盘搜索功能
            </span>
            <FluentBadge
              variant={netDiskSettings.enabled ? 'success' : 'default'}
              size='sm'
              rounded
              className='ml-auto'
            >
              {netDiskSettings.enabled ? '已启用' : '已禁用'}
            </FluentBadge>
          </label>

          <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
            <FluentInput
              label='PanSou 服务地址'
              type='url'
              value={netDiskSettings.pansouUrl}
              onChange={(e) =>
                setNetDiskSettings((p) => ({ ...p, pansouUrl: e.target.value }))
              }
              placeholder='https://so.252035.xyz'
            />
            <FluentInput
              label='请求超时时间（秒）'
              type='number'
              min={10}
              max={120}
              value={String(netDiskSettings.timeout)}
              onChange={(e) =>
                setNetDiskSettings((p) => ({
                  ...p,
                  timeout: parseInt(e.target.value) || 30,
                }))
              }
              placeholder='30'
            />
          </div>
        </div>
      </FluentCard>

      {/* Cloud types */}
      <FluentCard padding='16px' className='space-y-3'>
        <div className='flex items-center justify-between gap-3'>
          <div className='flex items-center gap-2'>
            <span className='w-7 h-7 rounded-lg bg-[#f4c24d]/15 flex items-center justify-center'>
              <Cloud className='w-3.5 h-3.5 text-[#f4c24d]' />
            </span>
            <h4 className='text-sm font-semibold text-gray-900 dark:text-white'>
              支持的网盘类型
            </h4>
            <FluentBadge variant='default' size='sm' rounded>
              {netDiskSettings.enabledCloudTypes.length} / {CLOUD_TYPE_OPTIONS.length}
            </FluentBadge>
          </div>
          <div className='flex items-center gap-2'>
            <FluentButton
              variant='secondary'
              size='sm'
              onClick={() => handleSelectAll(true)}
            >
              全选
            </FluentButton>
            <FluentButton
              variant='ghost'
              size='sm'
              onClick={() => handleSelectAll(false)}
            >
              清空
            </FluentButton>
          </div>
        </div>

        {netDiskSettings.enabledCloudTypes.length === 0 ? (
          <FluentEmptyState
            icon={<HardDrive className='h-6 w-6 text-[#9ca3af]' />}
            title='暂无选中的网盘类型'
            description='至少选择一个网盘类型以启用搜索，或点击“全选”一键启用全部'
            action={
              <FluentButton
                variant='primary'
                size='sm'
                onClick={() => handleSelectAll(true)}
              >
                全选全部类型
              </FluentButton>
            }
          />
        ) : (
          <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5'>
            {CLOUD_TYPE_OPTIONS.map((option) => {
              const enabled = netDiskSettings.enabledCloudTypes.includes(option.key);
              return (
                <FluentCard
                  key={option.key}
                  hoverable
                  padding='12px'
                  className={`flex items-center gap-3 transition-all duration-250 ease-out ${enabled ? 'border-[#f4c24d]/30 bg-[#f4c24d]/5 dark:bg-[#f4c24d]/10' : 'opacity-80'}`}
                >
                  <FluentCheckbox
                    checked={enabled}
                    onCheckedChange={(checked) =>
                      handleCloudTypeChange(option.key, checked)
                    }
                  />
                  <span className='w-7 h-7 rounded-lg bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 flex items-center justify-center shrink-0'>
                    {option.icon === 'Folder' ? (
                      <Folder className='w-4 h-4 text-[#f59e0b]' />
                    ) : option.icon === 'Cloud' ? (
                      <Cloud className='w-4 h-4 text-[#3b82f6]' />
                    ) : (
                      <span className='text-sm leading-none'>{option.icon}</span>
                    )}
                  </span>
                  <span className='text-sm font-medium text-gray-900 dark:text-white truncate flex-1'>
                    {option.name}
                  </span>
                  <FluentBadge
                    variant={enabled ? 'success' : 'default'}
                    size='sm'
                    rounded
                  >
                    {enabled ? '已选' : '未选'}
                  </FluentBadge>
                </FluentCard>
              );
            })}
          </div>
        )}

        <div className='flex items-center gap-2 text-xs text-[#9ca3af] pt-1'>
          <span>
            已启用 {netDiskSettings.enabledCloudTypes.length} 个类型，禁用{' '}
            {CLOUD_TYPE_OPTIONS.length - netDiskSettings.enabledCloudTypes.length} 个
          </span>
          <FluentBadge variant='info' size='sm' rounded className='ml-auto'>
            多选生效
          </FluentBadge>
        </div>
      </FluentCard>

      {/* Save bar */}
      <div className='flex items-center gap-3 pt-1 sticky bottom-0 bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur rounded-xl p-3 border border-gray-200 dark:border-white/5 shadow-sm'>
        <FluentButton
          variant='primary'
          size='md'
          icon={<Save className='h-4 w-4' />}
          loading={isLoading('saveNetDiskConfig')}
          onClick={handleSave}
        >
          {isLoading('saveNetDiskConfig') ? '保存中…' : '保存配置'}
        </FluentButton>
        {isLoading('saveNetDiskConfig') && (
          <span className='flex items-center gap-2 text-sm text-[#3b82f6]'>
            <FluentSpinner size='small' />
            <span>保存中...</span>
          </span>
        )}
        {!isLoading('saveNetDiskConfig') && (
          <span
            className='text-xs'
            style={{ color: 'var(--color-foreground-muted)' }}
          >
            集成 PanSou 搜索 · 变更后需保存生效
          </span>
        )}
      </div>

      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={hideAlert}
        type={alertModal.type as any}
        title={alertModal.title}
        message={alertModal.message}
        timer={alertModal.timer}
        showConfirm={alertModal.showConfirm}
      />

      {/* keep refreshConfig reference */}
      <span className='hidden' aria-hidden>
        {alertModal.isOpen ? 'open' : 'closed'}
      </span>
    </div>
  );
}
