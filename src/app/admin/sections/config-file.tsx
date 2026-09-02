/* eslint-disable unused-imports/no-unused-vars */

'use client';

import { Download, FileJson, Upload } from 'lucide-react';
import { useState } from 'react';

import { AdminConfig } from '@/lib/admin.types';

import {
  FluentBadge,
  FluentButton,
  FluentCard,
  FluentSelect,
  FluentTextArea,
} from '@/components/FluentUI';

import {
  showError,
  showSuccess,
  useAlertModal,
  useLoadingState,
} from '../admin-utils';

interface ConfigFileProps {
  config: AdminConfig | null;
  refreshConfig?: () => Promise<void>;
}

export default function ConfigFileComponent({
  config,
  refreshConfig,
}: ConfigFileProps) {
  const { showAlert } = useAlertModal();
  const { isLoading, withLoading } = useLoadingState();
  const [showImportForm, setShowImportForm] = useState(false);
  const [importData, setImportData] = useState('');
  const [exportFormat, setExportFormat] = useState<'array' | 'config'>(
    'config',
  );

  const handleExportConfig = async (format: 'array' | 'config' = 'config') => {
    await withLoading('exportConfig', async () => {
      try {
        const response = await fetch('/api/admin/config/export');
        if (!response.ok) throw new Error('导出失败');
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `5572tv-config-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        window.URL.revokeObjectURL(url);
        showSuccess('配置已导出', showAlert);
      } catch (err) {
        showError('导出配置失败: ' + (err as Error).message, showAlert);
      }
    });
  };

  const handleImportConfig = async () => {
    await withLoading('importConfig', async () => {
      try {
        if (!window.confirm('将覆盖全站配置，确定？')) return;
        const data = JSON.parse(importData);
        if (
          !data ||
          typeof data !== 'object' ||
          !('SiteConfig' in data) ||
          !data.SiteConfig ||
          typeof data.SiteConfig !== 'object'
        ) {
          throw new Error('配置格式错误：缺少 SiteConfig');
        }
        const response = await fetch('/api/admin/config/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ config: data, format: exportFormat }),
        });
        if (!response.ok) throw new Error('导入失败');
        setShowImportForm(false);
        setImportData('');
        showSuccess('配置已导入', showAlert);
        if (refreshConfig) await refreshConfig();
      } catch (err) {
        showError('导入失败: ' + (err as Error).message, showAlert);
      }
    });
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
            配置文件
          </h3>
          <p
            className='text-xs mt-0.5'
            style={{ color: 'var(--color-foreground-muted)' }}
          >
            导入 · 导出 · 备份与迁移
          </p>
        </div>
        <FluentBadge variant='info' size='sm' rounded>
          <FileJson className='w-3 h-3' /> JSON
        </FluentBadge>
      </div>

      {/* Actions */}
      <FluentCard padding='16px' className='space-y-4'>
        <div className='flex items-center gap-2'>
          <span className='w-7 h-7 rounded-lg bg-[#3b82f6]/15 flex items-center justify-center'>
            <FileJson className='w-3.5 h-3.5 text-[#3b82f6]' />
          </span>
          <h4 className='text-sm font-semibold text-gray-900 dark:text-white'>备份与恢复</h4>
          <FluentBadge variant='default' size='sm' rounded>
            本地文件
          </FluentBadge>
        </div>

        <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
          <FluentCard padding='12px' className='flex flex-col gap-3 bg-gray-50 dark:!bg-white/[0.02]'>
            <div className='flex items-center gap-2'>
              <span className='w-7 h-7 rounded-lg bg-[#22c55e]/15 flex items-center justify-center'>
                <Download className='w-3.5 h-3.5 text-[#22c55e]' />
              </span>
              <span className='text-sm font-medium text-gray-900 dark:text-white'>导出配置</span>
            </div>
            <p className='text-xs text-[#9ca3af] leading-relaxed'>
              将当前所有配置导出为 JSON 文件，便于备份或迁移到其他实例
            </p>
            <FluentSelect
              label='导出格式'
              value={exportFormat}
              onChange={(e) => setExportFormat(e.target.value as 'array' | 'config')}
              options={[
                { value: 'config', label: '完整配置' },
                { value: 'array', label: '数组格式' },
              ]}
            />
            <FluentButton
              variant='primary'
              size='sm'
              icon={<Download className='h-3.5 w-3.5' />}
              loading={isLoading('exportConfig')}
              onClick={() => handleExportConfig(exportFormat)}
              fullWidth
            >
              {isLoading('exportConfig') ? '导出中…' : '导出配置'}
            </FluentButton>
          </FluentCard>

          <FluentCard padding='12px' className='flex flex-col gap-3 bg-gray-50 dark:!bg-white/[0.02]'>
            <div className='flex items-center gap-2'>
              <span className='w-7 h-7 rounded-lg bg-[#f59e0b]/15 flex items-center justify-center'>
                <Upload className='w-3.5 h-3.5 text-[#f59e0b]' />
              </span>
              <span className='text-sm font-medium text-gray-900 dark:text-white'>导入配置</span>
              {showImportForm && (
                <FluentBadge variant='warning' size='sm' rounded>
                  编辑中
                </FluentBadge>
              )}
            </div>
            <p className='text-xs text-[#9ca3af] leading-relaxed'>
              从 JSON 文件恢复配置，导入后将覆盖当前设置，请谨慎操作
            </p>
            <FluentButton
              variant={showImportForm ? 'secondary' : 'primary'}
              size='sm'
              icon={<Upload className='h-3.5 w-3.5' />}
              onClick={() => setShowImportForm(!showImportForm)}
              fullWidth
            >
              {showImportForm ? '取消导入' : '导入配置'}
            </FluentButton>
          </FluentCard>
        </div>
      </FluentCard>

      {showImportForm && (
        <FluentCard padding='16px' className='space-y-4'>
          <div className='flex items-center gap-2'>
            <span className='w-7 h-7 rounded-lg bg-[#f4c24d]/15 flex items-center justify-center'>
              <Upload className='w-3.5 h-3.5 text-[#f4c24d]' />
            </span>
            <h4 className='text-sm font-semibold text-gray-900 dark:text-white'>导入配置</h4>
            <FluentBadge variant='warning' size='sm' rounded>
              粘贴 JSON
            </FluentBadge>
          </div>
          <FluentTextArea
            label='配置 JSON'
            value={importData}
            onChange={(e) => setImportData(e.target.value)}
            rows={10}
            placeholder='粘贴配置 JSON...'
            className='font-mono'
          />
          <div className='flex justify-end gap-2'>
            <FluentButton
              variant='ghost'
              size='sm'
              onClick={() => {
                setShowImportForm(false);
                setImportData('');
              }}
            >
              取消
            </FluentButton>
            <FluentButton
              variant='primary'
              size='sm'
              icon={<Upload className='h-3.5 w-3.5' />}
              onClick={handleImportConfig}
              disabled={!importData.trim()}
              loading={isLoading('importConfig')}
            >
              {isLoading('importConfig') ? '导入中…' : '导入'}
            </FluentButton>
          </div>
        </FluentCard>
      )}

      <span className='hidden' aria-hidden>
        {config ? 'has-config' : 'no-config'}
      </span>
    </div>
  );
}
