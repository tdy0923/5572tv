/* eslint-disable unused-imports/no-unused-vars */

'use client';

import { useState } from 'react';

import { AdminConfig } from '@/lib/admin.types';

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
  refreshConfig: _refreshConfig,
}: ConfigFileProps) {
  const { showAlert } = useAlertModal();
  const { withLoading } = useLoadingState();
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
        const data = JSON.parse(importData);
        const response = await fetch('/api/admin/config/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ config: data, format: exportFormat }),
        });
        if (!response.ok) throw new Error('导入失败');
        setShowImportForm(false);
        setImportData('');
        showSuccess('配置已导入', showAlert);
      } catch (err) {
        showError('导入失败: ' + (err as Error).message, showAlert);
      }
    });
  };

  return (
    <div className='space-y-4'>
      <div className='flex gap-2'>
        <button
          onClick={() => handleExportConfig(exportFormat)}
          className='px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors'
        >
          导出配置
        </button>
        <button
          onClick={() => setShowImportForm(!showImportForm)}
          className='px-4 py-2 bg-gray-600 text-white rounded-lg text-sm hover:bg-gray-700 transition-colors'
        >
          {showImportForm ? '取消导入' : '导入配置'}
        </button>
      </div>

      {showImportForm && (
        <div className='p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600'>
          <h4 className='text-sm font-semibold mb-3'>导入配置</h4>
          <textarea
            value={importData}
            onChange={(e) => setImportData(e.target.value)}
            className='w-full h-48 p-3 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-mono bg-white dark:bg-gray-800'
            placeholder='粘贴配置 JSON...'
          />
          <div className='flex justify-end gap-2 mt-3'>
            <button
              onClick={() => {
                setShowImportForm(false);
                setImportData('');
              }}
              className='px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
            >
              取消
            </button>
            <button
              onClick={handleImportConfig}
              disabled={!importData.trim()}
              className='px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50'
            >
              导入
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
