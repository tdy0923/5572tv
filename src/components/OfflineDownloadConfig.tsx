'use client';

import { Download, HardDrive, ShieldCheck } from 'lucide-react';
import React, { useEffect, useState } from 'react';

import { AdminConfig } from '@/lib/admin.types';
import { useConfigMessage } from '@/hooks/useConfigMessage';

import {
  FluentBadge,
  FluentButton,
  FluentCard,
} from '@/components/FluentUI';

interface DownloadConfigProps {
  config: AdminConfig | null;
  refreshConfig: () => Promise<void>;
}

const DownloadConfig: React.FC<DownloadConfigProps> = ({
  config,
  refreshConfig,
}) => {
  const [enabled, setEnabled] = useState(true);
  const {
    message,
    isLoading: isSaving,
    setIsLoading: setIsSaving,
    showMessage,
  } = useConfigMessage();

  useEffect(() => {
    if (config?.DownloadConfig) {
      setEnabled(config.DownloadConfig.enabled ?? true);
    }
  }, [config]);

  const handleSave = async () => {
    setIsSaving(true);

    try {
      const response = await fetch('/api/admin/download-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '保存失败');
      }

      showMessage('success', '下载配置保存成功！');
      await refreshConfig();
    } catch (err) {
      showMessage('error', err instanceof Error ? err.message : '保存失败');
    } finally {
      setIsSaving(false);
    }
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
            离线下载配置
          </h3>
          <p
            className='text-xs mt-0.5'
            style={{ color: 'var(--color-foreground-muted)' }}
          >
            M3U8 客户端下载 · {enabled ? '已开启' : '已关闭'} · 浏览器端合并
          </p>
        </div>
        <FluentBadge variant={enabled ? 'success' : 'default'} size='sm' rounded>
          <span
            className={`w-1.5 h-1.5 rounded-full inline-block ${enabled ? 'bg-[#22c55e]' : 'bg-[#9ca3af]'}`}
          />
          {enabled ? '已启用' : '已禁用'}
        </FluentBadge>
      </div>

      {/* 消息提示 */}
      {message && (
        <FluentCard
          padding='12px'
          className={`flex items-center gap-2 text-sm ${
            message.type === 'success'
              ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
              : 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
          }`}
        >
          <FluentBadge
            variant={message.type === 'success' ? 'success' : 'error'}
            size='sm'
            rounded
          >
            {message.type === 'success' ? '成功' : '错误'}
          </FluentBadge>
          <span className='flex-1'>{message.text}</span>
        </FluentCard>
      )}

      {/* 功能说明 */}
      <FluentCard padding='16px' className='space-y-3'>
        <div className='flex items-center gap-2'>
          <span className='w-7 h-7 rounded-lg bg-[#3b82f6]/15 flex items-center justify-center'>
            <Download className='w-3.5 h-3.5 text-[#3b82f6]' />
          </span>
          <h4 className='text-sm font-semibold text-gray-900 dark:text-white'>
            M3U8 客户端下载功能
          </h4>
          <FluentBadge variant='info' size='sm' rounded>
            浏览器端
          </FluentBadge>
        </div>
        <div className='bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-xl px-3 py-3'>
          <ul className='text-xs text-gray-600 dark:text-gray-400 space-y-1.5 leading-relaxed'>
            <li className='flex items-center gap-2'>
              <span className='w-1 h-1 rounded-full bg-[#3b82f6] shrink-0' />
              用户在浏览器中直接下载视频到本地
            </li>
            <li className='flex items-center gap-2'>
              <span className='w-1 h-1 rounded-full bg-[#3b82f6] shrink-0' />
              支持 M3U8 格式视频的 TS 片段合并
            </li>
            <li className='flex items-center gap-2'>
              <span className='w-1 h-1 rounded-full bg-[#3b82f6] shrink-0' />
              支持 AES 加密视频解密
            </li>
            <li className='flex items-center gap-2'>
              <span className='w-1 h-1 rounded-full bg-[#3b82f6] shrink-0' />
              不占用服务器存储空间和带宽
            </li>
            <li className='flex items-center gap-2'>
              <span className='w-1 h-1 rounded-full bg-[#3b82f6] shrink-0' />
              支持并发下载和自动重试
            </li>
          </ul>
        </div>
        <div className='flex items-center gap-2 text-xs text-[#9ca3af]'>
          <HardDrive className='w-3.5 h-3.5' />
          <span>本地合并 · 无需服务端转储</span>
          <FluentBadge variant='default' size='sm' rounded className='ml-auto'>
            客户端
          </FluentBadge>
        </div>
      </FluentCard>

      {/* 功能开关 */}
      <FluentCard padding='16px'>
        <div className='flex items-center justify-between gap-4'>
          <div className='flex items-start gap-3'>
            <span className='w-7 h-7 rounded-lg bg-[#22c55e]/15 flex items-center justify-center shrink-0 mt-0.5'>
              <ShieldCheck className='w-3.5 h-3.5 text-[#22c55e]' />
            </span>
            <div>
              <div className='flex items-center gap-2'>
                <span className='text-sm font-medium text-gray-900 dark:text-white'>
                  启用下载功能
                </span>
                <FluentBadge variant={enabled ? 'success' : 'default'} size='sm' rounded>
                  {enabled ? '已开启' : '已关闭'}
                </FluentBadge>
              </div>
              <p className='text-xs text-[#9ca3af] mt-1 leading-relaxed'>
                开启后，播放页面将显示下载按钮，用户可一键下载当前视频
              </p>
            </div>
          </div>
          <button
            onClick={() => setEnabled(!enabled)}
            className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-200 shrink-0 ${
              enabled
                ? 'bg-green-600 dark:bg-green-600'
                : 'bg-gray-200 dark:bg-gray-700'
            }`}
            aria-pressed={enabled}
            aria-label='切换下载功能'
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200 ${
                enabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </FluentCard>

      {/* 保存栏 */}
      <div className='flex items-center gap-3 pt-1 sticky bottom-0 bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur rounded-xl p-3 border border-gray-200 dark:border-white/5 shadow-sm'>
        <FluentButton
          variant='primary'
          size='md'
          icon={<Download className='h-4 w-4' />}
          loading={isSaving}
          onClick={handleSave}
        >
          {isSaving ? '保存中…' : '保存配置'}
        </FluentButton>
        {!isSaving && (
          <span
            className='text-xs'
            style={{ color: 'var(--color-foreground-muted)' }}
          >
            {enabled ? '播放页将展示下载入口' : '播放页将隐藏下载入口'}
          </span>
        )}
        {isSaving && (
          <span className='text-xs text-[#3b82f6]'>保存中...</span>
        )}
      </div>
    </div>
  );
};

export default DownloadConfig;
