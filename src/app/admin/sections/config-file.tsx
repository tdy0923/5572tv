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
  const { showAlert, hideAlert } = useAlertModal();
  const { withLoading } = useLoadingState();
  const [showImportModal, setShowImportModal] = useState(false);
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
        setShowImportModal(false);
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
          onClick={() => setShowImportModal(true)}
          className='px-4 py-2 bg-gray-600 text-white rounded-lg text-sm hover:bg-gray-700 transition-colors'
        >
          导入配置
        </button>
      </div>

      {showImportModal && (
        <div className='fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4'>
          <div className='bg-white dark:bg-gray-800 rounded-lg max-w-lg w-full p-6'>
            <h3 className='text-lg font-semibold mb-4'>导入配置</h3>
            <textarea
              value={importData}
              onChange={(e) => setImportData(e.target.value)}
              className='w-full h-48 p-2 border rounded-lg text-sm font-mono'
              placeholder='粘贴配置 JSON...'
            />
            <div className='flex justify-end gap-2 mt-4'>
              <button
                onClick={() => setShowImportModal(false)}
                className='px-4 py-2 text-sm text-gray-600 hover:text-gray-800'
              >
                取消
              </button>
              <button
                onClick={handleImportConfig}
                className='px-4 py-2 bg-blue-600 text-white rounded-lg text-sm'
              >
                导入
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
