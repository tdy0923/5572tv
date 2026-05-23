'use client';

import { useEffect, useState } from 'react';

import { AdminConfig } from '@/lib/admin.types';

import {
  AlertModal,
  buttonStyles,
  showError,
  showSuccess,
  useAlertModal,
  useLoadingState,
} from '../admin-utils';

const CLOUD_TYPE_OPTIONS = [
  { key: 'baidu', name: '百度网盘', icon: '📁' },
  { key: 'aliyun', name: '阿里云盘', icon: '☁️' },
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

  const buttonCls = (loading: boolean) =>
    loading ? buttonStyles.disabled : buttonStyles.success;

  return (
    <div className='space-y-6'>
      <div className='bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 shadow-sm'>
        <div className='mb-6'>
          <h3 className='text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2'>
            基础设置
          </h3>
          <div className='flex items-center space-x-2 text-sm text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-3 py-2 rounded-lg'>
            <span>
              📡 集成开源项目 <strong>PanSou</strong> 提供网盘资源搜索功能
            </span>
            <a
              href='https://github.com/fish2018/pansou'
              target='_blank'
              rel='noopener noreferrer'
              className='text-blue-700 dark:text-blue-300 hover:underline font-medium'
            >
              查看项目
            </a>
          </div>
        </div>
        <div className='space-y-4'>
          <label className='flex items-center cursor-pointer'>
            <input
              type='checkbox'
              checked={netDiskSettings.enabled}
              onChange={(e) =>
                setNetDiskSettings((p) => ({ ...p, enabled: e.target.checked }))
              }
              className='w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500'
            />
            <span className='ml-2 text-sm font-medium'>启用网盘搜索功能</span>
          </label>
          <div className='space-y-2'>
            <label className='block text-sm font-medium text-gray-700 dark:text-gray-300'>
              PanSou服务地址
            </label>
            <input
              type='url'
              value={netDiskSettings.pansouUrl}
              onChange={(e) =>
                setNetDiskSettings((p) => ({ ...p, pansouUrl: e.target.value }))
              }
              placeholder='https://so.252035.xyz'
              className='w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-700 focus:ring-blue-500'
            />
          </div>
          <div className='space-y-2'>
            <label className='block text-sm font-medium text-gray-700 dark:text-gray-300'>
              请求超时时间（秒）
            </label>
            <input
              type='number'
              min='10'
              max='120'
              value={netDiskSettings.timeout}
              onChange={(e) =>
                setNetDiskSettings((p) => ({
                  ...p,
                  timeout: parseInt(e.target.value) || 30,
                }))
              }
              className='w-32 px-3 py-2 border rounded-md bg-white dark:bg-gray-700'
            />
          </div>
        </div>
      </div>

      <div className='bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 shadow-sm'>
        <div className='flex items-center justify-between mb-4'>
          <h3 className='text-lg font-semibold'>支持的网盘类型</h3>
          <div className='space-x-2'>
            <button
              onClick={() => handleSelectAll(true)}
              className={buttonStyles.quickAction}
            >
              全选
            </button>
            <button
              onClick={() => handleSelectAll(false)}
              className={buttonStyles.quickAction}
            >
              清空
            </button>
          </div>
        </div>
        <div className='grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4'>
          {CLOUD_TYPE_OPTIONS.map((option) => (
            <label
              key={option.key}
              className='flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors'
            >
              <input
                type='checkbox'
                checked={netDiskSettings.enabledCloudTypes.includes(option.key)}
                onChange={(e) =>
                  handleCloudTypeChange(option.key, e.target.checked)
                }
                className='w-4 h-4 text-blue-600 border-gray-300 rounded'
              />
              <span className='text-lg'>{option.icon}</span>
              <span className='text-sm font-medium'>{option.name}</span>
            </label>
          ))}
        </div>
      </div>

      <div className='flex justify-end'>
        <button
          onClick={handleSave}
          disabled={isLoading('saveNetDiskConfig')}
          className={`px-4 py-2 ${buttonCls(isLoading('saveNetDiskConfig'))} rounded-lg transition-colors`}
        >
          {isLoading('saveNetDiskConfig') ? '保存中…' : '保存配置'}
        </button>
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
    </div>
  );
}
